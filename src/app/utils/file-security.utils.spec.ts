import { describe, it, expect } from 'vitest';
import { FILE_SECURITY_LIMITS, validateFileSize, sanitizeParsedJson } from './file-security.utils';

describe('file-security.utils', () => {
  it('should accept files under the size limit', () => {
    const smallFile = new File(['content'], 'test.json');
    expect(validateFileSize(smallFile, FILE_SECURITY_LIMITS.MAX_JSON_FILE_SIZE_BYTES)).toBe(true);
  });

  it('should reject files exceeding the size limit', () => {
    const largeFile = { size: 20 * 1024 * 1024 } as unknown as File;
    expect(validateFileSize(largeFile, FILE_SECURITY_LIMITS.MAX_JSON_FILE_SIZE_BYTES)).toBe(false);
  });

  describe('sanitizeParsedJson', () => {
    it('should strip prototype pollution keys', () => {
      const malicious = JSON.parse('{"valid": 1, "__proto__": {"polluted": true}}');
      const sanitized = sanitizeParsedJson(malicious) as Record<string, unknown>;

      expect(sanitized['valid']).toBe(1);
      expect(Object.prototype.hasOwnProperty.call(sanitized, '__proto__')).toBe(false);
      expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    });

    it('should strip constructor and prototype keys', () => {
      const malicious = { valid: 'ok', constructor: 'bad', prototype: 'bad' };
      const sanitized = sanitizeParsedJson(malicious) as Record<string, unknown>;

      expect(sanitized['valid']).toBe('ok');
      expect(sanitized['constructor']).toBeUndefined();
      expect(sanitized['prototype']).toBeUndefined();
    });

    it('should handle primitives and arrays correctly', () => {
      expect(sanitizeParsedJson(null)).toBe(null);
      expect(sanitizeParsedJson(42)).toBe(42);
      expect(sanitizeParsedJson('hello')).toBe('hello');

      const arr: Record<string, unknown>[] = [{ a: 1 }, { constructor: 2, b: 3 }];
      const sanitizedArr = sanitizeParsedJson(arr) as Record<string, unknown>[];
      expect(sanitizedArr[0]['a']).toBe(1);
      expect(sanitizedArr[1]['b']).toBe(3);
      expect(sanitizedArr[1]['constructor']).toBeUndefined();
    });
  });
});
