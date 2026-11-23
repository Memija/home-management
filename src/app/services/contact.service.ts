import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { firebaseConfig } from '../config/firebase.config';
import {
  CONTACT_API_ENDPOINT,
  ContactErrorCode,
  ContactSubmissionPayload,
  ContactSubmissionResult,
  validateContactPayload,
} from '../models/contact.model';

const REQUEST_TIMEOUT_MS = 15_000;
const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileRenderOptions {
  readonly sitekey: string;
  readonly theme?: 'light' | 'dark' | 'auto';
  readonly size?: 'normal' | 'compact' | 'flexible';
  readonly callback?: (token: string) => void;
  readonly 'expired-callback'?: () => void;
  readonly 'error-callback'?: () => void;
}

export interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  remove: (widgetId: string) => void;
}

interface WindowWithTurnstile extends Window {
  turnstile?: TurnstileApi;
}

interface ConfigWithTurnstile {
  readonly turnstileSiteKey?: string;
}

function mapStatusToErrorCode(status: number): ContactErrorCode {
  if (status === 400) return 'invalid_input';
  if (status === 403) return 'captcha_failed';
  if (status === 429) return 'rate_limited';
  return 'server_error';
}

@Injectable({
  providedIn: 'root',
})
export class ContactService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private scriptPromise: Promise<TurnstileApi | null> | null = null;

  /**
   * Returns the configured Cloudflare Turnstile site key when usable in the current environment.
   */
  getTurnstileSiteKey(): string {
    if (!this.isBrowser) {
      return '';
    }

    const rawKey = ((firebaseConfig as ConfigWithTurnstile).turnstileSiteKey ?? '').trim();
    if (!rawKey || rawKey.startsWith('YOUR_')) {
      return '';
    }

    const hostname = this.document.defaultView?.location?.hostname ?? '';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    if (isLocalhost && !rawKey.startsWith('1x00000000000000000000')) {
      return '';
    }

    return rawKey;
  }

  /**
   * Mounts a Cloudflare Turnstile widget when configured and returns a cleanup function.
   */
  async mountTurnstile(
    container: HTMLElement,
    onTokenChange: (token: string) => void,
  ): Promise<(() => void) | null> {
    const sitekey = this.getTurnstileSiteKey();
    if (!sitekey) {
      return null;
    }

    const api = await this.loadTurnstileApi();
    if (!api) {
      return null;
    }

    const widgetId = api.render(container, {
      sitekey,
      theme: 'auto',
      size: 'flexible',
      callback: (token: string) => onTokenChange(token),
      'expired-callback': () => onTokenChange(''),
      'error-callback': () => onTokenChange(''),
    });

    return () => {
      api.remove(widgetId);
    };
  }

  /**
   * Validates and submits a contact inquiry directly to the `/api/contact` endpoint.
   */
  async submitInquiry(payload: ContactSubmissionPayload): Promise<ContactSubmissionResult> {
    const normalized: ContactSubmissionPayload = {
      name: payload.name.trim(),
      email: payload.email.trim(),
      category: payload.category,
      subject: payload.subject.trim(),
      message: payload.message.trim(),
      ...(payload.turnstileToken ? { turnstileToken: payload.turnstileToken } : {}),
      ...(payload.website ? { website: payload.website } : {}),
    };

    const validationError = validateContactPayload(normalized);
    if (validationError) {
      return { ok: false, errorCode: validationError };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(CONTACT_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(normalized),
        signal: controller.signal,
      });

      if (!response.ok) {
        return { ok: false, errorCode: mapStatusToErrorCode(response.status) };
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('application/json')) {
        return { ok: false, errorCode: 'server_error' };
      }

      const body = (await response.json()) as { ok?: unknown };
      return body?.ok === true ? { ok: true } : { ok: false, errorCode: 'server_error' };
    } catch {
      return { ok: false, errorCode: 'network_error' };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private loadTurnstileApi(): Promise<TurnstileApi | null> {
    const win = this.document.defaultView as WindowWithTurnstile | null;
    if (!win) {
      return Promise.resolve(null);
    }
    if (win.turnstile) {
      return Promise.resolve(win.turnstile);
    }

    this.scriptPromise ??= new Promise<TurnstileApi | null>((resolve) => {
      const script = this.document.createElement('script');
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(win.turnstile ?? null);
      script.onerror = () => {
        this.scriptPromise = null;
        resolve(null);
      };
      this.document.head.appendChild(script);
    });

    return this.scriptPromise;
  }
}
