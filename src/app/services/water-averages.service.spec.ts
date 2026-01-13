import { TestBed } from '@angular/core/testing';
import { WaterAveragesService } from './water-averages.service';
import { describe, it, expect, beforeEach } from 'vitest';

describe('WaterAveragesService', () => {
  let service: WaterAveragesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WaterAveragesService]
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

    it('should return data for known country code', () => {
      const data = service.getCountryData('de');
      expect(data.averageLitersPerPersonPerDay).toBe(128);
    });

    it('should return data for known country name', () => {
      const data = service.getCountryData('Germany');
      expect(data.averageLitersPerPersonPerDay).toBe(128);
    });

    it('should return data for World', () => {
      const data = service.getCountryData('world');
      expect(data.source).toContain('World Average');
    });

    it('should be case insensitive', () => {
      const data = service.getCountryData('GERMANY');
      expect(data.averageLitersPerPersonPerDay).toBe(128);
    });
  });

  describe('getAverageLitersPerPersonPerDay', () => {
    it('should return liters', () => {
      const liters = service.getAverageLitersPerPersonPerDay('de');
      expect(liters).toBe(128);
    });
  });

  describe('getCountryCode', () => {
    it('should return code if passed a code', () => {
      expect(service.getCountryCode('de')).toBe('de');
    });

    it('should return code if passed an English name', () => {
      expect(service.getCountryCode('Germany')).toBe('de');
    });

    it('should return code if passed a German name', () => {
      expect(service.getCountryCode('Deutschland')).toBe('de');
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
      expect(countries.find(c => c.code === 'de')).toBeDefined();
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
