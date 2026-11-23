import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker, { resetRateLimiterForTests } from './worker.mjs';

function buildRequest(body, options = {}) {
  const method = options.method || 'POST';
  const url = options.url || 'https://home-management.dev/api/contact';
  const headers = {
    'Content-Type': 'application/json',
    Origin: 'https://home-management.dev',
    'CF-Connecting-IP': options.ip || '203.0.113.10',
    ...(options.headers || {}),
  };

  return new Request(url, {
    method,
    headers,
    body: method === 'OPTIONS' || method === 'GET' ? undefined : body,
  });
}

describe('contact-api Cloudflare Worker', () => {
  let sendSpy;
  let env;

  const validBody = {
    name: 'Ada <Admin>',
    email: 'ada@example.org',
    category: 'bug',
    subject: 'Dark mode contrast',
    message: 'Found a small contrast issue on the chart legend.',
  };

  beforeEach(() => {
    resetRateLimiterForTests();
    sendSpy = vi.fn().mockResolvedValue(undefined);
    env = {
      SEND_EMAIL: { send: sendSpy },
      ALLOWED_ORIGIN: 'https://home-management.dev',
      CONTACT_FROM_NAME: 'Home Management',
      CONTACT_FROM_ADDRESS: 'support@home-management.dev',
      CONTACT_TO_EMAIL: 'homemngdev@gmail.com',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle OPTIONS preflight and reject unknown paths, wrong methods, and foreign origins', async () => {
    const preflight = await worker.fetch(buildRequest(null, { method: 'OPTIONS' }), env);
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://home-management.dev',
    );

    const notFound = await worker.fetch(
      buildRequest('{}', { url: 'https://home-management.dev/api/other' }),
      env,
    );
    expect(notFound.status).toBe(404);

    const badMethod = await worker.fetch(buildRequest(null, { method: 'GET' }), env);
    expect(badMethod.status).toBe(405);

    const badOrigin = await worker.fetch(
      buildRequest(JSON.stringify(validBody), { headers: { Origin: 'https://evil.example' } }),
      env,
    );
    expect(badOrigin.status).toBe(403);

    const localhostOnProd = await worker.fetch(
      buildRequest(JSON.stringify(validBody), { headers: { Origin: 'http://localhost:4200' } }),
      env,
    );
    expect(localhostOnProd.status).toBe(403);

    const localhostOnDev = await worker.fetch(
      buildRequest(JSON.stringify(validBody), {
        url: 'http://127.0.0.1:8787/api/contact',
        headers: { Origin: 'http://localhost:4200' },
      }),
      env,
    );
    expect(localhostOnDev.status).toBe(200);

    const localhostOnRemoteDev = await worker.fetch(
      buildRequest(JSON.stringify(validBody), {
        url: 'https://home-management.dev/api/contact',
        headers: { Origin: 'http://localhost:4200' },
      }),
      { ...env, ALLOW_LOCALHOST_ORIGIN: 'true' },
    );
    expect(localhostOnRemoteDev.status).toBe(200);
  });

  it('should silently accept honeypot submissions without sending email', async () => {
    const res = await worker.fetch(
      buildRequest(JSON.stringify({ ...validBody, website: 'https://spam.bot' })),
      env,
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('should reject malformed JSON, oversized bodies, and invalid fields with 400', async () => {
    const badJson = await worker.fetch(buildRequest('{not-json'), env);
    expect(badJson.status).toBe(400);

    const hugeBody = await worker.fetch(buildRequest('x'.repeat(17_000)), env);
    expect(hugeBody.status).toBe(400);

    const invalidEmail = await worker.fetch(
      buildRequest(JSON.stringify({ ...validBody, email: 'bad-email' })),
      env,
    );
    expect(invalidEmail.status).toBe(400);
  });

  it('should deliver via native Cloudflare SEND_EMAIL EmailMessage with Reply-To and escaped HTML', async () => {
    const res = await worker.fetch(buildRequest(JSON.stringify(validBody)), env);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(sendSpy).toHaveBeenCalledTimes(1);

    const sentMsg = sendSpy.mock.calls[0][0];
    expect(sentMsg.from).toBe('support@home-management.dev');
    expect(sentMsg.to).toBe('homemngdev@gmail.com');
    expect(sentMsg.raw).toContain('From: "Home Management" <support@home-management.dev>');
    expect(sentMsg.raw).toContain('Reply-To: ada@example.org');
    expect(sentMsg.raw).toContain('Content-Type: multipart/alternative;');

    const htmlPartHeader =
      'Content-Type: text/html; charset="UTF-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n';
    const htmlSection = sentMsg.raw.split(htmlPartHeader)[1].split('\r\n------=_Part_')[0];
    const decodedHtml = atob(htmlSection.replaceAll('\r\n', ''));
    expect(decodedHtml).toContain('Ada &lt;Admin&gt;');
    expect(decodedHtml).not.toContain('<Admin>');
  });

  it('should also support optional RESEND_API_KEY fallback when SEND_EMAIL binding is absent', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ id: 'email_1' }), { status: 200 }));

    const resendEnv = {
      RESEND_API_KEY: 'mock-resend-key',
      ALLOWED_ORIGIN: 'https://home-management.dev',
    };

    const res = await worker.fetch(buildRequest(JSON.stringify(validBody)), resendEnv);
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const sentPayload = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sentPayload.reply_to).toBe('ada@example.org');
  });

  it('should enforce per-IP rate limiting after 5 requests within the window', async () => {
    for (let i = 0; i < 5; i++) {
      const okRes = await worker.fetch(
        buildRequest(JSON.stringify(validBody), { ip: '198.51.100.7' }),
        env,
      );
      expect(okRes.status).toBe(200);
    }

    const blockedRes = await worker.fetch(
      buildRequest(JSON.stringify(validBody), { ip: '198.51.100.7' }),
      env,
    );
    expect(blockedRes.status).toBe(429);
  });

  it('should verify Turnstile token when TURNSTILE_SECRET_KEY is configured and handle send errors', async () => {
    const envWithTurnstile = { ...env, TURNSTILE_SECRET_KEY: 'ts_secret' };

    const missingTokenRes = await worker.fetch(
      buildRequest(JSON.stringify(validBody)),
      envWithTurnstile,
    );
    expect(missingTokenRes.status).toBe(403);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    sendSpy.mockRejectedValueOnce(new Error('Binding send error'));

    const upstreamFail = await worker.fetch(
      buildRequest(JSON.stringify({ ...validBody, turnstileToken: 'tok_valid' })),
      envWithTurnstile,
    );
    expect(upstreamFail.status).toBe(502);
  });
});
