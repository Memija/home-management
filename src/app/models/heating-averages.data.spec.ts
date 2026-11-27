import { describe, expect, it } from 'vitest';
import { getBenchmarkSourceUrl } from './benchmark-sources.data';
import { ALL_COUNTRY_INFO, CODE_TO_COUNTRY } from './country-codes.data';
import { COUNTRY_HEATING_DATA, DEFAULT_HEATING_DATA } from './heating-averages.data';

describe('heating-averages.data', () => {
  it('should define a valid default heating benchmark', () => {
    expect(DEFAULT_HEATING_DATA.averageKwhPerYear).toBeGreaterThan(0);
    expect(DEFAULT_HEATING_DATA.year).toBeGreaterThanOrEqual(2015);
    expect(getBenchmarkSourceUrl(DEFAULT_HEATING_DATA.source)).toBeTruthy();
  });

  it('should provide valid heating data for every supported country and handle tropical/hot-arid 0 kWh climates', () => {
    for (const { code } of ALL_COUNTRY_INFO) {
      const countryKey = CODE_TO_COUNTRY[code];
      const entry = COUNTRY_HEATING_DATA[countryKey];
      expect(entry, `Missing heating data for "${countryKey}" (${code})`).toBeDefined();
      expect(entry.averageKwhPerYear).toBeGreaterThanOrEqual(0);
      expect(entry.year).toBeGreaterThanOrEqual(2015);

      if (entry.averageKwhPerYear === 0) {
        expect(entry.source).toMatch(/^N\/A \((?:Tropical|Hot arid) climate\)$/);
      } else {
        expect(
          getBenchmarkSourceUrl(entry.source),
          `Unregistered heating source "${entry.source}" for "${countryKey}"`,
        ).toBeTruthy();
      }
    }

    expect(COUNTRY_HEATING_DATA['world'].averageKwhPerYear).toBeGreaterThan(0);
    expect(getBenchmarkSourceUrl(COUNTRY_HEATING_DATA['world'].source)).toBeTruthy();
  });

  it('should contain only canonical country keys plus world without duplicate aliases', () => {
    expect(Object.keys(COUNTRY_HEATING_DATA)).toHaveLength(ALL_COUNTRY_INFO.length + 1);
  });
});
