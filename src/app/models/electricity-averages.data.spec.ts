import { describe, expect, it } from 'vitest';
import { getBenchmarkSourceUrl } from './benchmark-sources.data';
import { ALL_COUNTRY_INFO, CODE_TO_COUNTRY } from './country-codes.data';
import { COUNTRY_ELECTRICITY_DATA, DEFAULT_ELECTRICITY_DATA } from './electricity-averages.data';

describe('electricity-averages.data', () => {
  it('should define a valid default electricity benchmark', () => {
    expect(DEFAULT_ELECTRICITY_DATA.averageKwhPerPersonPerYear).toBeGreaterThan(0);
    expect(DEFAULT_ELECTRICITY_DATA.year).toBeGreaterThanOrEqual(2015);
    expect(getBenchmarkSourceUrl(DEFAULT_ELECTRICITY_DATA.source)).toBeTruthy();
  });

  it('should provide positive electricity consumption data and registered source URLs for every supported country and world', () => {
    for (const { code } of ALL_COUNTRY_INFO) {
      const countryKey = CODE_TO_COUNTRY[code];
      const entry = COUNTRY_ELECTRICITY_DATA[countryKey];
      expect(entry, `Missing electricity data for "${countryKey}" (${code})`).toBeDefined();
      expect(entry.averageKwhPerPersonPerYear).toBeGreaterThan(0);
      expect(entry.year).toBeGreaterThanOrEqual(2015);
      expect(
        getBenchmarkSourceUrl(entry.source),
        `Unregistered electricity source "${entry.source}" for "${countryKey}"`,
      ).toBeTruthy();
    }

    expect(COUNTRY_ELECTRICITY_DATA['world'].averageKwhPerPersonPerYear).toBeGreaterThan(0);
    expect(getBenchmarkSourceUrl(COUNTRY_ELECTRICITY_DATA['world'].source)).toBeTruthy();
  });

  it('should contain only canonical country keys plus world without duplicate aliases', () => {
    expect(Object.keys(COUNTRY_ELECTRICITY_DATA)).toHaveLength(ALL_COUNTRY_INFO.length + 1);
  });
});
