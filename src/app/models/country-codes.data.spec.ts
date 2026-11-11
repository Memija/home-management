import { describe, expect, it } from 'vitest';
import {
  ALL_COUNTRY_INFO,
  AVAILABLE_COUNTRIES_WITH_WORLD,
  CODE_TO_COUNTRY,
  COUNTRY_TO_CODE,
} from './country-codes.data';

describe('country-codes.data', () => {
  it('should list 198 unique two-letter lowercase country codes in ALL_COUNTRY_INFO', () => {
    expect(ALL_COUNTRY_INFO).toHaveLength(198);

    const codes = new Set<string>();
    const translationKeys = new Set<string>();
    for (const item of ALL_COUNTRY_INFO) {
      expect(item.code).toMatch(/^[a-z]{2}$/);
      expect(item.translationKey).toMatch(/^COUNTRIES\.[A-Z_]+$/);
      codes.add(item.code);
      translationKeys.add(item.translationKey);
    }

    expect(codes.size).toBe(198);
    expect(translationKeys.size).toBe(198);
  });

  it('should include all 198 countries in uppercase plus WORLD in AVAILABLE_COUNTRIES_WITH_WORLD', () => {
    expect(AVAILABLE_COUNTRIES_WITH_WORLD).toHaveLength(199);

    const availableSet = new Set(AVAILABLE_COUNTRIES_WITH_WORLD.map((c) => c.code));
    expect(availableSet.has('WORLD')).toBe(true);

    for (const { code } of ALL_COUNTRY_INFO) {
      expect(availableSet.has(code.toUpperCase())).toBe(true);
    }
  });

  it('should maintain round-trip consistency between CODE_TO_COUNTRY and COUNTRY_TO_CODE', () => {
    for (const { code } of ALL_COUNTRY_INFO) {
      const countryName = CODE_TO_COUNTRY[code];
      expect(countryName, `Missing CODE_TO_COUNTRY entry for "${code}"`).toBeTruthy();
      expect(COUNTRY_TO_CODE[countryName]).toBe(code);
    }

    expect(CODE_TO_COUNTRY['uk']).toBe('united kingdom');
    expect(CODE_TO_COUNTRY['world']).toBe('world');
  });

  it('should map localized German and common alias names to valid ISO country codes', () => {
    const validCodes = new Set(ALL_COUNTRY_INFO.map((c) => c.code));

    for (const [alias, code] of Object.entries(COUNTRY_TO_CODE)) {
      expect(alias.length).toBeGreaterThan(0);
      expect(validCodes.has(code), `Alias "${alias}" points to unknown code "${code}"`).toBe(true);
    }

    expect(COUNTRY_TO_CODE['deutschland']).toBe('de');
    expect(COUNTRY_TO_CODE['österreich']).toBe('at');
    expect(COUNTRY_TO_CODE['schweiz']).toBe('ch');
    expect(COUNTRY_TO_CODE['united states of america']).toBe('us');
  });
});
