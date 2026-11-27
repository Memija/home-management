import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ElectricityAveragesService } from '../services/electricity-averages.service';
import { HeatingAveragesService } from '../services/heating-averages.service';
import { WaterAveragesService } from '../services/water-averages.service';
import { BENCHMARK_SOURCE_URLS, getBenchmarkSourceUrl } from './benchmark-sources.data';

describe('benchmark-sources.data', () => {
  it('should define well-formed HTTPS URLs for every registered benchmark source', () => {
    const entries = Object.entries(BENCHMARK_SOURCE_URLS);
    expect(entries.length).toBeGreaterThan(50);

    for (const [label, rawUrl] of entries) {
      expect(label.trim(), 'Source label must not be empty or have outer whitespace').toBe(label);
      expect(label.length).toBeGreaterThan(0);
      expect(rawUrl, `Whitespace found in URL for "${label}"`).not.toMatch(/\s/);

      const parsed = new URL(rawUrl);
      expect(parsed.protocol, `URL for "${label}" must use HTTPS`).toBe('https:');
      expect(parsed.hostname, `Invalid hostname for "${label}"`).toMatch(
        /^[a-z0-9.-]+\.[a-z]{2,}$/i,
      );
      expect(parsed.hostname).not.toBe('localhost');
    }
  });

  it('should register a valid URL for every source cited across Water, Electricity, and Heating benchmark services', () => {
    TestBed.configureTestingModule({});
    const waterService = TestBed.inject(WaterAveragesService);
    const electricityService = TestBed.inject(ElectricityAveragesService);
    const heatingService = TestBed.inject(HeatingAveragesService);

    const countryCodes = [
      ...waterService.getAvailableCountries().map((c) => c.code),
      'XX', // Default world/regional fallback entry
    ];

    const missingSources: string[] = [];

    for (const code of countryCodes) {
      const water = waterService.getCountryData(code);
      const electricity = electricityService.getCountryData(code);
      const heating = heatingService.getCountryData(code);

      const cited = [water.source, electricity.source];
      if (heating.averageKwhPerYear > 0) {
        cited.push(heating.source);
      }

      for (const sourceLabel of cited) {
        if (!getBenchmarkSourceUrl(sourceLabel)) {
          missingSources.push(`${code}: "${sourceLabel}"`);
        }
      }
    }

    expect(missingSources, `Unmapped benchmark sources: ${missingSources.join(', ')}`).toEqual([]);
  });

  it('should return the mapped URL for known sources and undefined for unknown sources', () => {
    expect(getBenchmarkSourceUrl('BDEW')).toBe('https://www.bdew.de/energie/');
    expect(getBenchmarkSourceUrl('Umweltbundesamt')).toContain('umweltbundesamt.de');
    expect(getBenchmarkSourceUrl('NonExistentSource')).toBeUndefined();
  });
});
