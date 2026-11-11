import { describe, expect, it } from 'vitest';
import { BENCHMARK_SOURCE_URLS, getBenchmarkSourceUrl } from './benchmark-sources.data';

describe('benchmark-sources.data', () => {
  it('should define valid HTTP(S) URLs for every registered benchmark source', () => {
    const entries = Object.entries(BENCHMARK_SOURCE_URLS);
    expect(entries.length).toBeGreaterThan(50);

    for (const [label, url] of entries) {
      expect(label.trim().length).toBeGreaterThan(0);
      expect(url, `Invalid URL for "${label}"`).toMatch(/^https?:\/\/.+/);
    }
  });

  it('should return the mapped URL for known sources and undefined for unknown sources', () => {
    expect(getBenchmarkSourceUrl('BDEW')).toBe('https://www.bdew.de/energie/');
    expect(getBenchmarkSourceUrl('Umweltbundesamt')).toContain('umweltbundesamt.de');
    expect(getBenchmarkSourceUrl('NonExistentSource')).toBeUndefined();
  });
});
