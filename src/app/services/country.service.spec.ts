import { TestBed } from '@angular/core/testing';
import { CountryService } from './country.service';
import { LanguageService } from './language.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal, WritableSignal } from '@angular/core';

describe('CountryService', () => {
  let service: CountryService;
  let mockLanguageService: {
    currentLang: WritableSignal<string>;
    translate: ReturnType<typeof vi.fn>;
    translateForLanguage: ReturnType<typeof vi.fn>;
  };
  let mockCurrentLangSignal: WritableSignal<string>;

  beforeEach(() => {
    mockCurrentLangSignal = signal('en');
    mockLanguageService = {
      currentLang: mockCurrentLangSignal,
      translate: vi.fn().mockImplementation((key: string) => {
        // Simple mock translation: keys ending in .GERMANY -> 'Germany'
        if (key === 'COUNTRIES.GERMANY') return 'Germany';
        if (key === 'COUNTRIES.FRANCE') return 'France';
        if (key === 'COUNTRIES.USA') return 'USA';
        return key;
      }),
      translateForLanguage: vi.fn().mockImplementation((key: string, lang: string) => {
        if (lang === 'de') {
          if (key === 'COUNTRIES.GERMANY') return 'Deutschland';
          if (key === 'COUNTRIES.USA') return 'Vereinigte Staaten';
        }
        if (lang === 'en') {
          if (key === 'COUNTRIES.GERMANY') return 'Germany';
          if (key === 'COUNTRIES.USA') return 'USA';
        }
        return key;
      }),
    };

    TestBed.configureTestingModule({
      providers: [CountryService, { provide: LanguageService, useValue: mockLanguageService }],
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
      // 'COUNTRIES.SOUTH_AFRICA' -> 'south africa'
      const info = service.getCountryInfoByNameAnyLanguage('south africa');
      expect(info?.code).toBe('za');
    });
  });
});
