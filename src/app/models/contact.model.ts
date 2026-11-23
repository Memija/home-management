export type ContactCategory = 'question' | 'bug' | 'feature' | 'feedback';

export const CONTACT_CATEGORIES: readonly ContactCategory[] = [
  'question',
  'bug',
  'feature',
  'feedback',
] as const;

export const SUPPORT_EMAIL = 'support@home-management.dev';
export const CONTACT_API_ENDPOINT = '/api/contact';

export const CONTACT_FIELD_LIMITS = {
  nameMax: 100,
  emailMax: 254,
  subjectMax: 150,
  messageMin: 10,
  messageMax: 5000,
} as const;

export type ContactErrorCode =
  'invalid_input' | 'captcha_failed' | 'rate_limited' | 'network_error' | 'server_error';

export interface ContactSubmissionPayload {
  readonly name: string;
  readonly email: string;
  readonly category: ContactCategory;
  readonly subject: string;
  readonly message: string;
  readonly turnstileToken?: string;
  readonly website?: string;
}

export interface ContactSubmissionResult {
  readonly ok: boolean;
  readonly errorCode?: ContactErrorCode;
}

function isAsciiLetter(code: number): boolean {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isDomainLabelChar(code: number): boolean {
  return isAsciiLetter(code) || (code >= 48 && code <= 57) || code === 45;
}

function isValidDomainLabel(label: string): boolean {
  if (!label || label.length > 63 || label.startsWith('-') || label.endsWith('-')) {
    return false;
  }
  for (let i = 0; i < label.length; i++) {
    if (!isDomainLabelChar(label.charCodeAt(i))) {
      return false;
    }
  }
  return true;
}

function isValidTld(tld: string): boolean {
  if (tld.length < 2 || tld.length > 63) {
    return false;
  }
  for (let i = 0; i < tld.length; i++) {
    if (!isAsciiLetter(tld.charCodeAt(i))) {
      return false;
    }
  }
  return true;
}

/**
 * Linear-time O(N) email syntax check without regex backtracking.
 */
export function isValidContactEmail(rawEmail: string): boolean {
  const email = rawEmail.trim();
  if (!email || email.length > CONTACT_FIELD_LIMITS.emailMax || /\s/.test(email)) {
    return false;
  }

  const atIndex = email.indexOf('@');
  if (atIndex <= 0 || atIndex > 64 || email.indexOf('@', atIndex + 1) !== -1) {
    return false;
  }

  const domain = email.slice(atIndex + 1);
  const labels = domain.split('.');
  if (labels.length < 2) {
    return false;
  }

  const tld = labels.at(-1) ?? '';
  return labels.every(isValidDomainLabel) && isValidTld(tld);
}

/**
 * Validates a normalized contact submission payload.
 * Returns null when valid, or `'invalid_input'` when any field violates constraints.
 */
export function validateContactPayload(payload: ContactSubmissionPayload): ContactErrorCode | null {
  const name = payload.name.trim();
  const subject = payload.subject.trim();
  const message = payload.message.trim();

  const hasValidLengths =
    name.length >= 1 &&
    name.length <= CONTACT_FIELD_LIMITS.nameMax &&
    subject.length >= 1 &&
    subject.length <= CONTACT_FIELD_LIMITS.subjectMax &&
    message.length >= CONTACT_FIELD_LIMITS.messageMin &&
    message.length <= CONTACT_FIELD_LIMITS.messageMax;

  if (
    !hasValidLengths ||
    !CONTACT_CATEGORIES.includes(payload.category) ||
    !isValidContactEmail(payload.email)
  ) {
    return 'invalid_input';
  }

  return null;
}
