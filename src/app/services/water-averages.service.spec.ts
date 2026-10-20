import { TestBed } from '@angular/core/testing';
import { WaterAveragesService } from './water-averages.service';
import { describe, it, expect, beforeEach } from 'vitest';

describe('WaterAveragesService', () => {
  let service: WaterAveragesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WaterAveragesService],
    });
    service = TestBed.inject(WaterAveragesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCountryData', () => {
    it('should return default data for unknown country', () => {
      const data = service.getCountryData('Atlantis');
      expect(data.source).toContain('World Average');
    });

    it.each([
      { input: 'de', desc: 'known country code' },
      { input: 'Germany', desc: 'known country name' },
      { input: 'GERMANY', desc: 'uppercase country name' },
    ])('should return data for $desc ($input)', ({ input }) => {
      const data = service.getCountryData(input);
      expect(data.averageLitersPerPersonPerDay).toBe(128);
    });

    it('should return data for World', () => {
      const data = service.getCountryData('world');
      expect(data.source).toContain('World Average');
    });
  });

  describe('getAverageLitersPerPersonPerDay', () => {
    it('should return liters', () => {
      const liters = service.getAverageLitersPerPersonPerDay('de');
      expect(liters).toBe(128);
    });
  });

  describe('getCountryCode', () => {
    it.each([
      { input: 'de', desc: 'a country code' },
      { input: 'Germany', desc: 'an English name' },
      { input: 'Deutschland', desc: 'a German name' },
    ])('should return code if passed $desc ($input)', ({ input }) => {
      expect(service.getCountryCode(input)).toBe('de');
    });

    it('should return null for unknown name', () => {
      expect(service.getCountryCode('Atlantis')).toBeNull();
    });
  });

  describe('hasCountryData', () => {
    it('should return true for known country name', () => {
      expect(service.hasCountryData('Germany')).toBe(true);
    });

    it('should return false for unknown country', () => {
      expect(service.hasCountryData('Atlantis')).toBe(false);
    });
  });

  describe('getAvailableCountries', () => {
    it('should return list of countries', () => {
      const countries = service.getAvailableCountries();
      expect(countries.length).toBeGreaterThan(0);
      expect(countries.find((c) => c.code === 'de')).toBeDefined();
    });
  });

  describe('getFlagUrl', () => {
    it('should return path to flag', () => {
      expect(service.getFlagUrl('de')).toBe('/flags/de.png');
    });

    it('should return path to UN flag for world', () => {
      expect(service.getFlagUrl('world')).toBe('/flags/un.png');
    });
  });
});
