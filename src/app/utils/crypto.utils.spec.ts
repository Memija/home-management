import { describe, expect, it, vi } from 'vitest';
import { secureRandom, secureRandomItem } from './crypto.utils';

describe('crypto.utils', () => {
  describe('secureRandom', () => {
    it('should return a number in the range [0, 1)', () => {
      for (let i = 0; i < 50; i++) {
        const val = secureRandom();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it('should return 0 when buffer value is 0', () => {
      vi.spyOn(crypto, 'getRandomValues').mockImplementation((arr) => {
        const uintArr = arr as Uint32Array;
        uintArr[0] = 0;
        return arr;
      });

      expect(secureRandom()).toBe(0);
      vi.restoreAllMocks();
    });

    it('should return approximately 0.5 when buffer is half max', () => {
      vi.spyOn(crypto, 'getRandomValues').mockImplementation((arr) => {
        const uintArr = arr as Uint32Array;
        uintArr[0] = 0x80000000; // 2^31
        return arr;
      });

      expect(secureRandom()).toBe(0.5);
      vi.restoreAllMocks();
    });

    it('should return strictly less than 1 when buffer is 0xffffffff', () => {
      vi.spyOn(crypto, 'getRandomValues').mockImplementation((arr) => {
        const uintArr = arr as Uint32Array;
        uintArr[0] = 0xffffffff;
        return arr;
      });

      const val = secureRandom();
      expect(val).toBeLessThan(1);
      expect(val).toBeCloseTo(0.999999999, 5);
      vi.restoreAllMocks();
    });
  });

  describe('secureRandomItem', () => {
    it('should return undefined for empty array', () => {
      expect(secureRandomItem([])).toBeUndefined();
    });

    it('should return undefined for falsy or empty list', () => {
      expect(secureRandomItem(null as unknown as string[])).toBeUndefined();
      expect(secureRandomItem(undefined as unknown as string[])).toBeUndefined();
    });

    it('should return the only element for single-item array', () => {
      expect(secureRandomItem(['only'])).toBe('only');
    });

    it('should return an element contained in the array', () => {
      const items = ['apple', 'banana', 'cherry', 'date'];
      for (let i = 0; i < 20; i++) {
        const picked = secureRandomItem(items);
        expect(items).toContain(picked);
      }
    });

    it('should select first or last item based on random boundary values', () => {
      const items = ['first', 'second', 'third'];

      vi.spyOn(crypto, 'getRandomValues').mockImplementation((arr) => {
        const uintArr = arr as Uint32Array;
        uintArr[0] = 0;
        return arr;
      });
      expect(secureRandomItem(items)).toBe('first');

      vi.spyOn(crypto, 'getRandomValues').mockImplementation((arr) => {
        const uintArr = arr as Uint32Array;
        uintArr[0] = 0xffffffff;
        return arr;
      });
      expect(secureRandomItem(items)).toBe('third');

      vi.restoreAllMocks();
    });
  });
});
