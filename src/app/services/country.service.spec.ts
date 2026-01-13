import { TestBed } from '@angular/core/testing';
import { CountryService } from './country.service';
import { LanguageService } from './language.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';

describe('CountryService', () => {
  let service: CountryService;
  let mockLanguageService: any;
  let mockCurrentLangSignal: any;

  beforeEach(() => {
    mockCurrentLangSignal = signal('en');
    mockLanguageService = {
      currentLang: mockCurrentLangSignal,
      translate: vi.fn().mockImplementation((key) => {
          // Simple mock translation: keys ending in .GERMANY -> 'Germany'
          if (key === 'COUNTRIES.GERMANY') return 'Germany';
          if (key === 'COUNTRIES.FRANCE') return 'France';
          if (key === 'COUNTRIES.USA') return 'USA';
          return key;
      }),
      translateForLanguage: vi.fn().mockImplementation((key, lang) => {
          if (lang === 'de') {
              if (key === 'COUNTRIES.GERMANY') return 'Deutschland';
              if (key === 'COUNTRIES.USA') return 'Vereinigte Staaten';
          }
          if (lang === 'en') {
              if (key === 'COUNTRIES.GERMANY') return 'Germany';
              if (key === 'COUNTRIES.USA') return 'USA';
          }
          return key;
      })
    };

    TestBed.configureTestingModule({
      providers: [
        CountryService,
        { provide: LanguageService, useValue: mockLanguageService }
      ]
    });
    service = TestBed.inject(CountryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCountries', () => {
      it('should return sorted list of translated country names', () => {
          const countries = service.getCountries();
          expect(countries.length).toBeGreaterThan(0);
          expect(countries).toContain('Germany');
          expect(countries).toContain('France');

          // Verify sorting (Germany < USA)
          const germanyIndex = countries.indexOf('Germany');
          const usaIndex = countries.indexOf('USA');
          expect(germanyIndex).toBeLessThan(usaIndex);
      });
  });

  describe('getCountryInfoByName', () => {
      it('should find country by name', () => {
          const info = service.getCountryInfoByName('Germany');
          expect(info).toBeDefined();
          expect(info?.code).toBe('de');
      });

      it('should be case insensitive', () => {
          const info = service.getCountryInfoByName('germany');
          expect(info).toBeDefined();
          expect(info?.code).toBe('de');
      });

      it('should return undefined for unknown country', () => {
          const info = service.getCountryInfoByName('Atlantis');
          expect(info).toBeUndefined();
      });
  });

  describe('getCountryInfoByCode', () => {
      it('should find country by code', () => {
          const info = service.getCountryInfoByCode('de');
          expect(info).toBeDefined();
          expect(info?.translationKey).toBe('COUNTRIES.GERMANY');
      });

      it('should be case insensitive', () => {
          const info = service.getCountryInfoByCode('DE');
          expect(info).toBeDefined();
          expect(info?.translationKey).toBe('COUNTRIES.GERMANY');
      });

      it('should return undefined for unknown code', () => {
          const info = service.getCountryInfoByCode('xx');
          expect(info).toBeUndefined();
      });
  });

  describe('getCountryInfoByNameAnyLanguage', () => {
      it('should find country by current language name', () => {
          mockCurrentLangSignal.set('en');
          const info = service.getCountryInfoByNameAnyLanguage('Germany');
          expect(info?.code).toBe('de');
      });

      it('should find country by embedded English key name', () => {
          // Key is COUNTRIES.GERMANY -> should match "germany"
          const info = service.getCountryInfoByNameAnyLanguage('germany');
          expect(info?.code).toBe('de');
      });

      it('should find country by other language name (German when current is English)', () => {
          mockCurrentLangSignal.set('en');
          const info = service.getCountryInfoByNameAnyLanguage('Deutschland');
          expect(info?.code).toBe('de');
      });

      it('should find country by other language name (English when current is German)', () => {
        mockCurrentLangSignal.set('de');
        // Setup mock to return German translation for current lang call
        mockLanguageService.translate.mockImplementation((key: string) => {
            if (key === 'COUNTRIES.GERMANY') return 'Deutschland';
            return key;
        });

        const info = service.getCountryInfoByNameAnyLanguage('Germany');
        expect(info?.code).toBe('de');
      });

      it('should return undefined if not found in any language', () => {
          const info = service.getCountryInfoByNameAnyLanguage('Atlantis');
          expect(info).toBeUndefined();
      });

      it('should handle underscores in key name match', () => {
          // Test a country with underscore in key if any (e.g. SOUTH_AFRICA)
          // We need to ensure we have a test case for it or just trust the logic.
          // Let's add South Africa to our mock translations if needed,
          // or rely on the logic: key.replace('COUNTRIES.', '').toLowerCase().replace(/_/g, ' ')

          // Let's assume SOUTH_AFRICA is in the list (it is in the real service).
          // We don't need to mock translate for this particular check as it checks the key itself.

          // 'COUNTRIES.SOUTH_AFRICA' -> 'south africa'
          const info = service.getCountryInfoByNameAnyLanguage('south africa');
          expect(info?.code).toBe('za');
      });
  });
});
