import { TestBed } from '@angular/core/testing';
import { HeatingAveragesService } from './heating-averages.service';
import { describe, it, expect, beforeEach } from 'vitest';

describe('HeatingAveragesService', () => {
  let service: HeatingAveragesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HeatingAveragesService]
    });
    service = TestBed.inject(HeatingAveragesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCountryData', () => {
    it('should return default data for unknown country', () => {
      const data = service.getCountryData('Atlantis');
      expect(data.averageKwhPerYear).toBe(10000); // Default temperate climate estimate
      expect(data.source).toBe('Temperate climate estimate');
    });

    it('should return data for known country code', () => {
      const data = service.getCountryData('de');
      expect(data.averageKwhPerYear).toBe(13500);
    });

    it('should return data for known country name', () => {
      const data = service.getCountryData('Germany');
      expect(data.averageKwhPerYear).toBe(13500);
    });

    it('should return default data for world (no special case)', () => {
      const data = service.getCountryData('world');
      expect(data.averageKwhPerYear).toBe(10000); // Falls back to default
    });

    it('should be case insensitive', () => {
      const data = service.getCountryData('GERMANY');
      expect(data.averageKwhPerYear).toBe(13500);
    });

    it('should return default for empty string', () => {
      const data = service.getCountryData('');
      expect(data.averageKwhPerYear).toBe(10000);
    });

    // Climate zone tests
    it('should return high values for cold climate countries', () => {
      const finland = service.getCountryData('finland');
      expect(finland.averageKwhPerYear).toBe(18000);

      const canada = service.getCountryData('ca');
      expect(canada.averageKwhPerYear).toBe(22000);
    });

    it('should return low values for hot climate countries', () => {
      const ethiopia = service.getCountryData('ethiopia');
      expect(ethiopia.averageKwhPerYear).toBe(400);

      const singapore = service.getCountryData('sg');
      expect(singapore.averageKwhPerYear).toBe(200);
    });

    it('should return medium values for mediterranean climate', () => {
      const spain = service.getCountryData('es');
      expect(spain.averageKwhPerYear).toBe(8500);
    });
  });

  describe('getAverageKwhPerYear', () => {
    it('should return kwh value', () => {
      const kwh = service.getAverageKwhPerYear('de');
      expect(kwh).toBe(13500);
    });

    it('should return different values for different climates', () => {
      const finlandKwh = service.getAverageKwhPerYear('fi');
      const ethiopiaKwh = service.getAverageKwhPerYear('et');

      // Finland should use ~45x more heating than Ethiopia
      expect(finlandKwh).toBeGreaterThan(ethiopiaKwh * 40);
    });
  });
});
