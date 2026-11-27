import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { firebaseConfig } from '../config/firebase.config';
import { ContactSubmissionPayload } from '../models/contact.model';
import { ContactService, TurnstileApi } from './contact.service';

describe('ContactService', () => {
  let service: ContactService;
  let originalTurnstileKey: string | undefined;

  const validPayload: ContactSubmissionPayload = {
    name: '  Jane Doe  ',
    email: '  jane@example.com  ',
    category: 'bug',
    subject: '  Chart tooltip issue  ',
    message: '  Tooltip overlaps legend on narrow mobile screens.  ',
  };

  beforeEach(() => {
    originalTurnstileKey = (firebaseConfig as { turnstileSiteKey?: string }).turnstileSiteKey;
    TestBed.configureTestingModule({
      providers: [ContactService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });
    service = TestBed.inject(ContactService);
  });

  afterEach(() => {
    (firebaseConfig as { turnstileSiteKey?: string }).turnstileSiteKey = originalTurnstileKey;
    delete (window as Window & { turnstile?: TurnstileApi }).turnstile;
    vi.restoreAllMocks();
  });

  describe('submitInquiry', () => {
    it('should return invalid_input without calling fetch when payload is invalid', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const result = await service.submitInquiry({ ...validPayload, email: 'not-an-email' });

      expect(result).toEqual({ ok: false, errorCode: 'invalid_input' });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should POST trimmed JSON to /api/contact and return ok: true on 2xx JSON response', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }),
      );

      const result = await service.submitInquiry({
        ...validPayload,
        turnstileToken: 'tok_123',
      });

      expect(result).toEqual({ ok: true });
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('/api/contact');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init?.body as string)).toEqual({
        name: 'Jane Doe',
        email: 'jane@example.com',
        category: 'bug',
        subject: 'Chart tooltip issue',
        message: 'Tooltip overlaps legend on narrow mobile screens.',
        turnstileToken: 'tok_123',
      });
    });

    it('should return server_error when dev-server SPA fallback returns 200 text/html instead of JSON', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('<!doctype html><html></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }),
      );

      await expect(service.submitInquiry(validPayload)).resolves.toEqual({
        ok: false,
        errorCode: 'server_error',
      });
    });

    it('should map 400, 403, 429, and 500 HTTP responses to structured error codes', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      fetchSpy.mockResolvedValueOnce(new Response('{}', { status: 400 }));
      await expect(service.submitInquiry(validPayload)).resolves.toEqual({
        ok: false,
        errorCode: 'invalid_input',
      });

      fetchSpy.mockResolvedValueOnce(new Response('{}', { status: 403 }));
      await expect(service.submitInquiry(validPayload)).resolves.toEqual({
        ok: false,
        errorCode: 'captcha_failed',
      });

      fetchSpy.mockResolvedValueOnce(new Response('{}', { status: 429 }));
      await expect(service.submitInquiry(validPayload)).resolves.toEqual({
        ok: false,
        errorCode: 'rate_limited',
      });

      fetchSpy.mockResolvedValueOnce(new Response('{}', { status: 502 }));
      await expect(service.submitInquiry(validPayload)).resolves.toEqual({
        ok: false,
        errorCode: 'server_error',
      });
    });

    it('should return network_error when fetch throws', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(service.submitInquiry(validPayload)).resolves.toEqual({
        ok: false,
        errorCode: 'network_error',
      });
    });
  });

  describe('Turnstile integration', () => {
    it('should return empty site key on SSR, empty config, placeholder config, or production key on localhost', () => {
      (firebaseConfig as { turnstileSiteKey?: string }).turnstileSiteKey = '';
      expect(service.getTurnstileSiteKey()).toBe('');

      (firebaseConfig as { turnstileSiteKey?: string }).turnstileSiteKey = 'YOUR_TURNSTILE_KEY';
      expect(service.getTurnstileSiteKey()).toBe('');

      // jsdom defaults to localhost, so non-test keys stay disabled to prevent console errors
      (firebaseConfig as { turnstileSiteKey?: string }).turnstileSiteKey = '0x4AAAAAA_real_key';
      expect(service.getTurnstileSiteKey()).toBe('');

      // Cloudflare official test key is allowed on localhost
      (firebaseConfig as { turnstileSiteKey?: string }).turnstileSiteKey =
        '1x00000000000000000000AA';
      expect(service.getTurnstileSiteKey()).toBe('1x00000000000000000000AA');

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [ContactService, { provide: PLATFORM_ID, useValue: 'server' }],
      });
      const ssrService = TestBed.inject(ContactService);
      expect(ssrService.getTurnstileSiteKey()).toBe('');
    });

    it('should render and dispose Turnstile widget when window.turnstile is available', async () => {
      (firebaseConfig as { turnstileSiteKey?: string }).turnstileSiteKey =
        '1x00000000000000000000AA';
      const removeSpy = vi.fn();
      const renderSpy = vi.fn((_el: HTMLElement, opts: { callback?: (t: string) => void }) => {
        opts.callback?.('verified-token');
        return 'widget-1';
      });
      (window as Window & { turnstile?: TurnstileApi }).turnstile = {
        render: renderSpy,
        remove: removeSpy,
      };

      const tokens: string[] = [];
      const doc = TestBed.inject(DOCUMENT);
      const container = doc.createElement('div');

      const dispose = await service.mountTurnstile(container, (token) => tokens.push(token));

      expect(tokens).toEqual(['verified-token']);
      expect(dispose).toBeTypeOf('function');
      dispose?.();
      expect(removeSpy).toHaveBeenCalledWith('widget-1');
    });
  });
});
