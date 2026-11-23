import { describe, expect, it } from 'vitest';
import {
  CONTACT_CATEGORIES,
  CONTACT_FIELD_LIMITS,
  ContactSubmissionPayload,
  isValidContactEmail,
  validateContactPayload,
} from './contact.model';

describe('contact.model', () => {
  describe('isValidContactEmail', () => {
    it('should accept well-formed email addresses', () => {
      expect(isValidContactEmail('user@example.com')).toBe(true);
      expect(isValidContactEmail('  first.last+tag@sub-domain.co.uk  ')).toBe(true);
    });

    it('should reject empty, whitespace-containing, oversized, or malformed addresses', () => {
      expect(isValidContactEmail('')).toBe(false);
      expect(isValidContactEmail('user @example.com')).toBe(false);
      expect(isValidContactEmail('missing-at.example.com')).toBe(false);
      expect(isValidContactEmail('two@@example.com')).toBe(false);
      expect(isValidContactEmail('@example.com')).toBe(false);
      expect(isValidContactEmail(`${'a'.repeat(65)}@example.com`)).toBe(false);
      expect(isValidContactEmail(`${'a'.repeat(60)}@${'b'.repeat(200)}.com`)).toBe(false);
      expect(isValidContactEmail('user@localhost')).toBe(false);
      expect(isValidContactEmail('user@-bad.com')).toBe(false);
      expect(isValidContactEmail('user@bad-.com')).toBe(false);
      expect(isValidContactEmail('user@bad..com')).toBe(false);
      expect(isValidContactEmail('user@bad_domain.com')).toBe(false);
      expect(isValidContactEmail('user@example.12')).toBe(false);
      expect(isValidContactEmail('user@example.c')).toBe(false);
    });
  });

  describe('validateContactPayload', () => {
    const validPayload: ContactSubmissionPayload = {
      name: 'Ada Lovelace',
      email: 'ada@example.org',
      category: 'feature',
      subject: 'CSV export option',
      message: 'Could you add direct CSV export alongside Excel?',
    };

    it('should return null for valid payloads across all categories', () => {
      for (const category of CONTACT_CATEGORIES) {
        expect(validateContactPayload({ ...validPayload, category })).toBeNull();
      }
    });

    it('should return invalid_input when any field violates length, email, or category constraints', () => {
      expect(validateContactPayload({ ...validPayload, name: '   ' })).toBe('invalid_input');
      expect(
        validateContactPayload({
          ...validPayload,
          name: 'x'.repeat(CONTACT_FIELD_LIMITS.nameMax + 1),
        }),
      ).toBe('invalid_input');
      expect(validateContactPayload({ ...validPayload, email: 'invalid' })).toBe('invalid_input');
      expect(validateContactPayload({ ...validPayload, subject: '' })).toBe('invalid_input');
      expect(validateContactPayload({ ...validPayload, message: 'Too short' })).toBe(
        'invalid_input',
      );
      expect(
        validateContactPayload({
          ...validPayload,
          category: 'unknown' as ContactSubmissionPayload['category'],
        }),
      ).toBe('invalid_input');
    });
  });
});
