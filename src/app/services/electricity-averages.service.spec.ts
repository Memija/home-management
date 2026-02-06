import { TestBed } from '@angular/core/testing';
import { ElectricityAveragesService } from './electricity-averages.service';
import { describe, it, expect, beforeEach } from 'vitest';

describe('ElectricityAveragesService', () => {
  let service: ElectricityAveragesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ElectricityAveragesService]
    });
    service = TestBed.inject(ElectricityAveragesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCountryData', () => {
    describe('known countries by name', () => {
      it('should return data for Germany', () => {
        const data = service.getCountryData('Germany');
        expect(data.averageKwhPerPersonPerYear).toBe(1500);
        expect(data.source).toBe('BDEW');
        expect(data.year).toBe(2022);
      });

      it('should return data for Germany in German (Deutschland)', () => {
        const data = service.getCountryData('Deutschland');
        expect(data.averageKwhPerPersonPerYear).toBe(1500);
      });

      it('should return data for Austria', () => {
        const data = service.getCountryData('Austria');
        expect(data.averageKwhPerPersonPerYear).toBe(1600);
      });

      it('should return data for Austria in German (Österreich)', () => {
        const data = service.getCountryData('Österreich');
        expect(data.averageKwhPerPersonPerYear).toBe(1600);
      });

      it('should return data for Switzerland', () => {
        const data = service.getCountryData('Switzerland');
        expect(data.averageKwhPerPersonPerYear).toBe(1800);
      });

      it('should return data for United Kingdom', () => {
        const data = service.getCountryData('United Kingdom');
        expect(data.averageKwhPerPersonPerYear).toBe(1400);
      });

      it('should return data for USA', () => {
        const data = service.getCountryData('USA');
        expect(data.averageKwhPerPersonPerYear).toBe(4500);
      });

      it('should return data for World average', () => {
        const data = service.getCountryData('world');
        expect(data.averageKwhPerPersonPerYear).toBe(2700);
        expect(data.source).toBe('IEA World Average');
      });
    });

    describe('known countries by country code', () => {
      it('should return data for DE', () => {
        const data = service.getCountryData('de');
        expect(data.averageKwhPerPersonPerYear).toBe(1500);
      });

      it('should return data for AT', () => {
        const data = service.getCountryData('at');
        expect(data.averageKwhPerPersonPerYear).toBe(1600);
      });

      it('should return data for CH', () => {
        const data = service.getCountryData('ch');
        expect(data.averageKwhPerPersonPerYear).toBe(1800);
      });

      it('should return data for GB', () => {
        const data = service.getCountryData('gb');
        expect(data.averageKwhPerPersonPerYear).toBe(1400);
      });

      it('should return data for UK (alias for GB)', () => {
        const data = service.getCountryData('uk');
        expect(data.averageKwhPerPersonPerYear).toBe(1400);
      });

      it('should return data for US', () => {
        const data = service.getCountryData('us');
        expect(data.averageKwhPerPersonPerYear).toBe(4500);
      });

      it('should return data for FR', () => {
        const data = service.getCountryData('fr');
        expect(data.averageKwhPerPersonPerYear).toBe(2200);
      });

      it('should return data for IT', () => {
        const data = service.getCountryData('it');
        expect(data.averageKwhPerPersonPerYear).toBe(1200);
      });

      it('should return data for JP', () => {
        const data = service.getCountryData('jp');
        expect(data.averageKwhPerPersonPerYear).toBe(2000);
      });

      it('should return data for IN (India)', () => {
        const data = service.getCountryData('in');
        expect(data.averageKwhPerPersonPerYear).toBe(400);
      });
    });

    describe('case insensitivity', () => {
      it('should handle uppercase country name', () => {
        const data = service.getCountryData('GERMANY');
        expect(data.averageKwhPerPersonPerYear).toBe(1500);
      });

      it('should handle mixed case country name', () => {
        const data = service.getCountryData('GeRmAnY');
        expect(data.averageKwhPerPersonPerYear).toBe(1500);
      });

      it('should handle uppercase country code', () => {
        const data = service.getCountryData('DE');
        expect(data.averageKwhPerPersonPerYear).toBe(1500);
      });

      it('should handle mixed case country code', () => {
        const data = service.getCountryData('De');
        expect(data.averageKwhPerPersonPerYear).toBe(1500);
      });
    });

    describe('whitespace handling', () => {
      it('should trim leading whitespace', () => {
        const data = service.getCountryData('  Germany');
        expect(data.averageKwhPerPersonPerYear).toBe(1500);
      });

      it('should trim trailing whitespace', () => {
        const data = service.getCountryData('Germany  ');
        expect(data.averageKwhPerPersonPerYear).toBe(1500);
      });

      it('should trim whitespace from country code', () => {
        const data = service.getCountryData('  de  ');
        expect(data.averageKwhPerPersonPerYear).toBe(1500);
      });
    });

    describe('default/fallback behavior', () => {
      it('should return default data for unknown country name', () => {
        const data = service.getCountryData('Atlantis');
        expect(data.averageKwhPerPersonPerYear).toBe(1500);
        expect(data.source).toContain('European Average Estimate');
        expect(data.year).toBe(2022);
      });

      it('should return default data for unknown country code', () => {
        const data = service.getCountryData('xx');
        expect(data.averageKwhPerPersonPerYear).toBe(1500);
        expect(data.source).toContain('European Average Estimate');
      });

      it('should return default data for empty string', () => {
        const data = service.getCountryData('');
        expect(data.averageKwhPerPersonPerYear).toBe(1500);
        expect(data.source).toContain('European Average Estimate');
      });

      it('should return default data for whitespace only', () => {
        const data = service.getCountryData('   ');
        expect(data.source).toContain('European Average Estimate');
      });
    });

    describe('data integrity', () => {
      it('should return complete CountryElectricityData object', () => {
        const data = service.getCountryData('de');
        expect(data).toHaveProperty('averageKwhPerPersonPerYear');
        expect(data).toHaveProperty('source');
        expect(data).toHaveProperty('year');
        expect(typeof data.averageKwhPerPersonPerYear).toBe('number');
        expect(typeof data.source).toBe('string');
        expect(typeof data.year).toBe('number');
      });

      it('should return positive kWh values', () => {
        const data = service.getCountryData('de');
        expect(data.averageKwhPerPersonPerYear).toBeGreaterThan(0);
      });

      it('should return reasonable year values', () => {
        const data = service.getCountryData('de');
        expect(data.year).toBeGreaterThanOrEqual(2020);
        expect(data.year).toBeLessThanOrEqual(2025);
      });
    });

    describe('Scandinavian high consumption countries', () => {
      it('should return high consumption for Norway', () => {
        const data = service.getCountryData('no');
        expect(data.averageKwhPerPersonPerYear).toBe(7000);
      });

      it('should return high consumption for Sweden', () => {
        const data = service.getCountryData('se');
        expect(data.averageKwhPerPersonPerYear).toBe(4000);
      });

      it('should return high consumption for Finland', () => {
        const data = service.getCountryData('fi');
        expect(data.averageKwhPerPersonPerYear).toBe(3500);
      });
    });
  });

  describe('getAverageKwhPerPersonPerYear', () => {
    it('should return kWh for known country code', () => {
      const kwh = service.getAverageKwhPerPersonPerYear('de');
      expect(kwh).toBe(1500);
    });

    it('should return kWh for known country name', () => {
      const kwh = service.getAverageKwhPerPersonPerYear('Germany');
      expect(kwh).toBe(1500);
    });

    it('should return default kWh for unknown country', () => {
      const kwh = service.getAverageKwhPerPersonPerYear('Unknown');
      expect(kwh).toBe(1500);
    });

    it('should return default kWh for empty input', () => {
      const kwh = service.getAverageKwhPerPersonPerYear('');
      expect(kwh).toBe(1500);
    });

    it('should be case insensitive', () => {
      const kwhLower = service.getAverageKwhPerPersonPerYear('de');
      const kwhUpper = service.getAverageKwhPerPersonPerYear('DE');
      expect(kwhLower).toBe(kwhUpper);
    });

    it('should return same value as getCountryData().averageKwhPerPersonPerYear', () => {
      const kwh = service.getAverageKwhPerPersonPerYear('de');
      const data = service.getCountryData('de');
      expect(kwh).toBe(data.averageKwhPerPersonPerYear);
    });
  });

  describe('consistency checks', () => {
    it('should return same data for DE code and Germany name', () => {
      const dataByCode = service.getCountryData('de');
      const dataByName = service.getCountryData('Germany');
      expect(dataByCode.averageKwhPerPersonPerYear).toBe(dataByName.averageKwhPerPersonPerYear);
    });

    it('should return same data for GB and UK codes', () => {
      const dataGB = service.getCountryData('gb');
      const dataUK = service.getCountryData('uk');
      expect(dataGB.averageKwhPerPersonPerYear).toBe(dataUK.averageKwhPerPersonPerYear);
    });

    it('should return same data for Germany and Deutschland', () => {
      const dataEn = service.getCountryData('Germany');
      const dataDe = service.getCountryData('Deutschland');
      expect(dataEn.averageKwhPerPersonPerYear).toBe(dataDe.averageKwhPerPersonPerYear);
    });
  });
});
