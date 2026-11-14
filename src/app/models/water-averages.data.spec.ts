import { describe, expect, it } from 'vitest';
import { getBenchmarkSourceUrl } from './benchmark-sources.data';
import { ALL_COUNTRY_INFO, CODE_TO_COUNTRY } from './country-codes.data';
import {
  AVAILABLE_WATER_COUNTRIES,
  COUNTRY_WATER_DATA,
  DEFAULT_WATER_DATA,
  WORLD_WATER_DATA,
} from './water-averages.data';

describe('water-averages.data', () => {
  it('should define valid default and world water benchmarks', () => {
    expect(DEFAULT_WATER_DATA.averageLitersPerPersonPerDay).toBeGreaterThan(0);
    expect(WORLD_WATER_DATA.averageLitersPerPersonPerDay).toBe(
      DEFAULT_WATER_DATA.averageLitersPerPersonPerDay,
    );
    expect(getBenchmarkSourceUrl(DEFAULT_WATER_DATA.source)).toBeTruthy();
    expect(getBenchmarkSourceUrl(WORLD_WATER_DATA.source)).toBeTruthy();
  });

  it('should provide positive water consumption data and registered source URLs for every supported country', () => {
    for (const { code } of ALL_COUNTRY_INFO) {
      const countryKey = CODE_TO_COUNTRY[code];
      const entry = COUNTRY_WATER_DATA[countryKey];
      expect(entry, `Missing water data for "${countryKey}" (${code})`).toBeDefined();
      expect(entry.averageLitersPerPersonPerDay).toBeGreaterThan(0);
      expect(entry.year).toBeGreaterThanOrEqual(2010);
      expect(
        getBenchmarkSourceUrl(entry.source),
        `Unregistered water source "${entry.source}" for "${countryKey}"`,
      ).toBeTruthy();
    }
  });

  it('should keep AVAILABLE_WATER_COUNTRIES aligned with COUNTRY_WATER_DATA and WORLD_WATER_DATA without duplicate aliases', () => {
    expect(Object.keys(COUNTRY_WATER_DATA)).toHaveLength(ALL_COUNTRY_INFO.length);
    expect(AVAILABLE_WATER_COUNTRIES).toHaveLength(ALL_COUNTRY_INFO.length + 1);

    for (const option of AVAILABLE_WATER_COUNTRIES) {
      if (option.code === 'world') {
        expect(option.average).toBe(WORLD_WATER_DATA.averageLitersPerPersonPerDay);
      } else {
        const countryKey = CODE_TO_COUNTRY[option.code];
        expect(option.average).toBe(COUNTRY_WATER_DATA[countryKey].averageLitersPerPersonPerDay);
      }
    }
  });
});
