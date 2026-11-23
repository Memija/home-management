/**
 * Cloudflare Worker — Home Management Contact API (`/api/contact`)
 *
 * Delivery modes (automatic):
 *   1. Native Cloudflare Email Routing (`env.SEND_EMAIL` binding in `wrangler.toml`) — 100% free,
 *      zero external accounts, zero API keys required!
 *   2. Optional Resend fallback (`env.RESEND_API_KEY`) — convenient for local `wrangler dev` if needed.
 *
 * Optional secret:
 *   - TURNSTILE_SECRET_KEY: Cloudflare Turnstile secret key for bot verification
 */

import { EmailMessage } from 'cloudflare:email';

const MAX_BODY_BYTES = 16_384;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

const CATEGORY_LABELS = Object.freeze({
  question: 'General Question',
  bug: 'Bug Report',
  feature: 'Feature Request',
  feedback: 'Feedback',
});

/** Per-isolate sliding-window IP rate limiter */
const ipRequestTimestamps = new Map();

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function encodeUtf8Base64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function wrapBase64Lines(b64) {
  const chunks = [];
  for (let i = 0; i < b64.length; i += 76) {
    chunks.push(b64.slice(i, i + 76));
  }
  return chunks.join('\r\n');
}

function isAsciiLetter(code) {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isDomainChar(code) {
  return isAsciiLetter(code) || (code >= 48 && code <= 57) || code === 45;
}

function isValidEmail(raw) {
  const email = String(raw || '').trim();
  if (!email || email.length > 254 || /\s/.test(email)) return false;
  const at = email.indexOf('@');
  if (at <= 0 || at > 64 || email.indexOf('@', at + 1) !== -1) return false;
  const labels = email.slice(at + 1).split('.');
  if (labels.length < 2) return false;
  const tld = labels.at(-1) || '';
  if (tld.length < 2 || tld.length > 63) return false;
  for (let i = 0; i < tld.length; i++) {
    if (!isAsciiLetter(tld.charCodeAt(i))) return false;
  }
  return labels.every((lbl) => {
    if (!lbl || lbl.length > 63 || lbl.startsWith('-') || lbl.endsWith('-')) return false;
    for (let i = 0; i < lbl.length; i++) {
      if (!isDomainChar(lbl.charCodeAt(i))) return false;
    }
    return true;
  });
}

function checkRateLimit(ip, now = Date.now()) {
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const recent = (ipRequestTimestamps.get(ip) || []).filter((ts) => ts > cutoff);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    ipRequestTimestamps.set(ip, recent);
    return false;
  }
  recent.push(now);
  ipRequestTimestamps.set(ip, recent);
  return true;
}

function isOriginPermitted(allowedOrigin, requestOrigin, workerHostname, allowLocalhostOrigin) {
  if (!requestOrigin || requestOrigin === allowedOrigin) {
    return true;
  }
  const isLocalDev =
    workerHostname === '127.0.0.1' ||
    workerHostname === 'localhost' ||
    allowLocalhostOrigin === true ||
    allowLocalhostOrigin === 'true';
  return (
    isLocalDev &&
    (requestOrigin === 'http://localhost:4200' || requestOrigin === 'http://127.0.0.1:4200')
  );
}

function buildCorsHeaders(allowedOrigin, requestOrigin, workerHostname, allowLocalhostOrigin) {
  const origin = isOriginPermitted(
    allowedOrigin,
    requestOrigin,
    workerHostname,
    allowLocalhostOrigin,
  )
    ? requestOrigin
    : '';
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

async function verifyTurnstile(secretKey, token, ip) {
  if (!token || typeof token !== 'string' || token.length > 2048) {
    return false;
  }
  const form = new URLSearchParams();
  form.set('secret', secretKey);
  form.set('response', token);
  if (ip) form.set('remoteip', ip);

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return Boolean(data && data.success === true);
}

function parseAndValidatePayload(raw) {
  if (!raw || typeof raw !== 'object') return { error: 'invalid_input' };

  // Honeypot triggered — silently pretend success without sending email
  if (typeof raw.website === 'string' && raw.website.trim().length > 0) {
    return { honeypot: true };
  }

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const email = typeof raw.email === 'string' ? raw.email.trim() : '';
  const category = typeof raw.category === 'string' ? raw.category.trim() : '';
  const subject = typeof raw.subject === 'string' ? raw.subject.trim() : '';
  const message = typeof raw.message === 'string' ? raw.message.trim() : '';
  const turnstileToken = typeof raw.turnstileToken === 'string' ? raw.turnstileToken.trim() : '';

  if (
    name.length < 1 ||
    name.length > 100 ||
    !isValidEmail(email) ||
    !Object.hasOwn(CATEGORY_LABELS, category) ||
    subject.length < 1 ||
    subject.length > 150 ||
    message.length < 10 ||
    message.length > 5000
  ) {
    return { error: 'invalid_input' };
  }

  const cleanName = name.replace(/[\r\n]+/g, ' ');
  const cleanSubject = subject.replace(/[\r\n]+/g, ' ');

  return {
    data: {
      name: cleanName,
      email,
      category,
      categoryLabel: CATEGORY_LABELS[category],
      subject: cleanSubject,
      message,
      turnstileToken,
    },
  };
}

function buildEmailHtml({ name, email, categoryLabel, subject, message }) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeCategory = escapeHtml(categoryLabel);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replaceAll('\n', '<br />');

  return `<!DOCTYPE html>
<html lang="en">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; line-height: 1.6; max-width: 640px; margin: 0 auto; padding: 24px;">
    <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #0f766e, #0369a1); color: #ffffff; padding: 18px 24px;">
        <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.9;">Home Management Inquiry</div>
        <h2 style="margin: 6px 0 0; font-size: 18px;">[${safeCategory}] ${safeSubject}</h2>
      </div>
      <div style="padding: 24px; background: #ffffff;">
        <p style="margin: 0 0 12px;"><strong>From:</strong> ${safeName} &lt;<a href="mailto:${safeEmail}" style="color: #0369a1;">${safeEmail}</a>&gt;</p>
        <p style="margin: 0 0 16px;"><strong>Category:</strong> ${safeCategory}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
        <div style="white-space: normal; color: #1e293b;">${safeMessage}</div>
      </div>
    </div>
  </body>
</html>`;
}

function encodeMimeHeaderIfNeeded(value, quoteIfAscii = false) {
  const clean = String(value)
    .replace(/[\r\n]+/g, ' ')
    .trim();
  if (/^[\x20-\x7E]*$/.test(clean)) {
    return quoteIfAscii ? `"${clean.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"` : clean;
  }
  return `=?UTF-8?B?${encodeUtf8Base64(clean)}?=`;
}

export function buildRawMimeEmail({
  fromName,
  fromAddress,
  toEmail,
  replyTo,
  subjectLine,
  text = '',
  html,
}) {
  const encodedSubject = encodeMimeHeaderIfNeeded(subjectLine);
  const encodedFromName = encodeMimeHeaderIfNeeded(fromName, true);
  const domain = fromAddress.split('@')[1] || 'home-management.dev';
  const uuid = crypto.randomUUID();
  const messageId = `<${uuid}@${domain}>`;
  const boundary = `----=_Part_${uuid.replaceAll('-', '')}`;
  const dateHeader = new Date().toUTCString();
  const base64Text = wrapBase64Lines(encodeUtf8Base64(text));
  const base64Html = wrapBase64Lines(encodeUtf8Base64(html));

  return [
    `From: ${encodedFromName} <${fromAddress}>`,
    `To: ${toEmail}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${encodedSubject}`,
    `Message-ID: ${messageId}`,
    `Date: ${dateHeader}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    base64Text,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    base64Html,
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

async function sendViaCloudflareBinding(sendEmailBinding, options) {
  const rawMime = buildRawMimeEmail(options);
  const message = new EmailMessage(options.fromAddress, options.toEmail, rawMime);
  await sendEmailBinding.send(message);
}

async function sendViaResend(
  apiKey,
  { fromName, fromAddress, toEmail, replyTo, subjectLine, text, html },
) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromAddress}>`,
      to: [toEmail],
      reply_to: replyTo,
      subject: subjectLine,
      text,
      html,
    }),
  });
  return res.ok;
}

export function resetRateLimiterForTests() {
  ipRequestTimestamps.clear();
}

export default {
  async fetch(request, env = {}) {
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://home-management.dev';
    const allowLocalhostOrigin = env.ALLOW_LOCALHOST_ORIGIN;
    const requestOrigin = request.headers.get('Origin') || '';
    const url = new URL(request.url);
    const corsHeaders = buildCorsHeaders(
      allowedOrigin,
      requestOrigin,
      url.hostname,
      allowLocalhostOrigin,
    );

    if (url.pathname !== '/api/contact') {
      return jsonResponse({ ok: false, error: 'not_found' }, 404, corsHeaders);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405, corsHeaders);
    }

    if (!isOriginPermitted(allowedOrigin, requestOrigin, url.hostname, allowLocalhostOrigin)) {
      return jsonResponse({ ok: false, error: 'forbidden_origin' }, 403, corsHeaders);
    }

    const rawText = await request.text();
    if (rawText.length > MAX_BODY_BYTES) {
      return jsonResponse({ ok: false, error: 'invalid_input' }, 400, corsHeaders);
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      return jsonResponse({ ok: false, error: 'invalid_input' }, 400, corsHeaders);
    }

    const validation = parseAndValidatePayload(parsedJson);
    if (validation.honeypot) {
      return jsonResponse({ ok: true }, 200, corsHeaders);
    }
    if (validation.error) {
      return jsonResponse({ ok: false, error: validation.error }, 400, corsHeaders);
    }

    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return jsonResponse({ ok: false, error: 'rate_limited' }, 429, corsHeaders);
    }

    if (env.TURNSTILE_SECRET_KEY) {
      const turnstileValid = await verifyTurnstile(
        env.TURNSTILE_SECRET_KEY,
        validation.data.turnstileToken,
        clientIp,
      );
      if (!turnstileValid) {
        return jsonResponse({ ok: false, error: 'captcha_failed' }, 403, corsHeaders);
      }
    }

    const { name, email, categoryLabel, subject, message } = validation.data;
    const fromName = env.CONTACT_FROM_NAME || 'Home Management';
    const fromAddress = env.CONTACT_FROM_ADDRESS || 'support@home-management.dev';
    const toEmail = env.CONTACT_TO_EMAIL || 'homemngdev@gmail.com';
    const subjectLine = `[${categoryLabel}] ${subject} — ${name}`;
    const html = buildEmailHtml(validation.data);
    const text = `From: ${name} <${email}>\nCategory: ${categoryLabel}\nSubject: ${subject}\n\n${message}`;

    if (env.SEND_EMAIL && typeof env.SEND_EMAIL.send === 'function') {
      try {
        await sendViaCloudflareBinding(env.SEND_EMAIL, {
          fromName,
          fromAddress,
          toEmail,
          replyTo: email,
          subjectLine,
          text,
          html,
        });
        return jsonResponse({ ok: true }, 200, corsHeaders);
      } catch (err) {
        console.error('Cloudflare SEND_EMAIL delivery failed:', err);
        return jsonResponse({ ok: false, error: 'server_error' }, 502, corsHeaders);
      }
    }

    if (env.RESEND_API_KEY) {
      const sent = await sendViaResend(env.RESEND_API_KEY, {
        fromName,
        fromAddress,
        toEmail,
        replyTo: email,
        subjectLine,
        text,
        html,
      });
      return sent
        ? jsonResponse({ ok: true }, 200, corsHeaders)
        : jsonResponse({ ok: false, error: 'server_error' }, 502, corsHeaders);
    }

    return jsonResponse({ ok: false, error: 'server_error' }, 500, corsHeaders);
  },
};
