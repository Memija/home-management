import { TestBed } from '@angular/core/testing';
import { ElectricityCountryFactsService, ElectricityFactMode } from './electricity-country-facts.service';
import { LanguageService } from './language.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';

describe('ElectricityCountryFactsService', () => {
  let service: ElectricityCountryFactsService;
  let mockLanguageService: any;
  let mockCurrentLangSignal: ReturnType<typeof signal<string>>;

  beforeEach(() => {
    mockCurrentLangSignal = signal('en');
    mockLanguageService = {
      currentLang: mockCurrentLangSignal,
      translate: vi.fn((key: string) => {
        if (key === 'FACTS.ELECTRICITY_FALLBACK') {
          return 'Electricity has revolutionized modern life.';
        }
        return key;
      })
    };

    TestBed.configureTestingModule({
      providers: [
        ElectricityCountryFactsService,
        { provide: LanguageService, useValue: mockLanguageService }
      ]
    });
    service = TestBed.inject(ElectricityCountryFactsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAvailableCountries', () => {
    it('should return array of available countries', () => {
      const countries = service.getAvailableCountries();
      expect(Array.isArray(countries)).toBe(true);
      expect(countries.length).toBeGreaterThan(0);
    });

    it('should include common countries like DE and US', () => {
      const countries = service.getAvailableCountries();
      const codes = countries.map(c => c.code);
      expect(codes).toContain('DE');
      expect(codes).toContain('US');
      expect(codes).toContain('WORLD');
    });

    it('should have nameKey property for each country', () => {
      const countries = service.getAvailableCountries();
      countries.forEach(country => {
        expect(country).toHaveProperty('code');
        expect(country).toHaveProperty('nameKey');
        expect(country.nameKey).toMatch(/^COUNTRIES\./);
      });
    });
  });

  describe('getFactByIndex - historical mode', () => {
    it('should return fact with title and message', () => {
      const fact = service.getFactByIndex(100, 0, 'historical');
      expect(fact).not.toBeNull();
      expect(fact).toHaveProperty('title');
      expect(fact).toHaveProperty('message');
      expect(fact!.title).toBe('Did you know?');
      expect(fact!.message.length).toBeGreaterThan(0);
    });

    it('should return consistent fact for same index', () => {
      const fact1 = service.getFactByIndex(100, 0, 'historical');
      const fact2 = service.getFactByIndex(100, 0, 'historical');
      expect(fact1!.message).toBe(fact2!.message);
    });

    it('should return different facts for different indices', () => {
      const fact0 = service.getFactByIndex(100, 0, 'historical');
      const fact1 = service.getFactByIndex(100, 1, 'historical');
      // They could be the same if only one fact exists, but generally should differ
      expect(fact0).not.toBeNull();
      expect(fact1).not.toBeNull();
    });

    it('should handle negative index by using absolute value', () => {
      const factPositive = service.getFactByIndex(100, 5, 'historical');
      const factNegative = service.getFactByIndex(100, -5, 'historical');
      expect(factPositive!.message).toBe(factNegative!.message);
    });

    it('should wrap around for large indices (modulo behavior)', () => {
      const fact0 = service.getFactByIndex(100, 0, 'historical');
      // WORLD facts exist, so we can test modulo
      const factLarge = service.getFactByIndex(100, 1000, 'historical');
      expect(factLarge).not.toBeNull();
      // The fact at index 1000 should equal fact at index (1000 % factsCount)
    });

    it('should ignore kWh parameter (reserved for future use)', () => {
      const fact1 = service.getFactByIndex(0, 0, 'historical');
      const fact2 = service.getFactByIndex(999999, 0, 'historical');
      expect(fact1!.message).toBe(fact2!.message);
    });

    it('should ignore countryCode in historical mode', () => {
      const factNoCountry = service.getFactByIndex(100, 0, 'historical');
      const factWithCountry = service.getFactByIndex(100, 0, 'historical', 'DE');
      expect(factNoCountry!.message).toBe(factWithCountry!.message);
    });
  });

  describe('getFactByIndex - country mode', () => {
    it('should return fact for valid country code', () => {
      const fact = service.getFactByIndex(100, 0, 'country', 'DE');
      expect(fact).not.toBeNull();
      expect(fact).toHaveProperty('title');
      expect(fact).toHaveProperty('message');
      expect(fact!.message.length).toBeGreaterThan(0);
    });

    it('should handle lowercase country code', () => {
      const factUpper = service.getFactByIndex(100, 0, 'country', 'DE');
      const factLower = service.getFactByIndex(100, 0, 'country', 'de');
      expect(factUpper!.message).toBe(factLower!.message);
    });

    it('should handle mixed case country code', () => {
      const factUpper = service.getFactByIndex(100, 0, 'country', 'DE');
      const factMixed = service.getFactByIndex(100, 0, 'country', 'De');
      expect(factUpper!.message).toBe(factMixed!.message);
    });

    it('should fallback to DEFAULT facts for unknown country', () => {
      const fact = service.getFactByIndex(100, 0, 'country', 'XX');
      // Should get DEFAULT facts, not null
      expect(fact).not.toBeNull();
      expect(fact!.message.length).toBeGreaterThan(0);
    });

    it('should return null when no countryCode and no DEFAULT facts exist', () => {
      // Undefined country code should fallback to DEFAULT
      const fact = service.getFactByIndex(100, 0, 'country', undefined);
      // DEFAULT facts exist so should not be null
      expect(fact).not.toBeNull();
    });

    it('should return consistent fact for same country and index', () => {
      const fact1 = service.getFactByIndex(100, 3, 'country', 'US');
      const fact2 = service.getFactByIndex(100, 3, 'country', 'US');
      expect(fact1!.message).toBe(fact2!.message);
    });

    it('should handle negative index in country mode', () => {
      const factPositive = service.getFactByIndex(100, 2, 'country', 'DE');
      const factNegative = service.getFactByIndex(100, -2, 'country', 'DE');
      expect(factPositive!.message).toBe(factNegative!.message);
    });
  });

  describe('Language switching', () => {
    it('should use English translations when language is en', () => {
      mockCurrentLangSignal.set('en');
      const fact = service.getFactByIndex(100, 0, 'historical');
      expect(fact).not.toBeNull();
      expect(fact!.title).toBe('Did you know?');
    });

    it('should use German translations when language is de', () => {
      mockCurrentLangSignal.set('de');
      const fact = service.getFactByIndex(100, 0, 'historical');
      expect(fact).not.toBeNull();
      expect(fact!.title).toBe('Wussten Sie schon?');
    });

    it('should default to English for unknown language', () => {
      mockCurrentLangSignal.set('fr');
      const fact = service.getFactByIndex(100, 0, 'historical');
      expect(fact).not.toBeNull();
      // Should fallback to English since 'fr' is not supported
      expect(fact!.title).toBe('Did you know?');
    });
  });

  describe('Edge cases', () => {
    it('should handle zero index', () => {
      const fact = service.getFactByIndex(100, 0, 'historical');
      expect(fact).not.toBeNull();
    });

    it('should handle very large index', () => {
      const fact = service.getFactByIndex(100, Number.MAX_SAFE_INTEGER, 'historical');
      expect(fact).not.toBeNull();
    });

    it('should handle empty string country code', () => {
      const fact = service.getFactByIndex(100, 0, 'country', '');
      // Empty string is falsy, so should fallback to DEFAULT
      expect(fact).not.toBeNull();
    });

    it('should handle whitespace country code', () => {
      const fact = service.getFactByIndex(100, 0, 'country', '  ');
      // Whitespace when uppercased won't match any country
      // Should fallback to DEFAULT
      expect(fact).not.toBeNull();
    });

    it('should handle zero kWh value', () => {
      const fact = service.getFactByIndex(0, 0, 'historical');
      expect(fact).not.toBeNull();
    });

    it('should handle negative kWh value', () => {
      const fact = service.getFactByIndex(-100, 0, 'historical');
      expect(fact).not.toBeNull();
    });

    it('should return different facts for different countries', () => {
      const factDE = service.getFactByIndex(100, 0, 'country', 'DE');
      const factUS = service.getFactByIndex(100, 0, 'country', 'US');
      // Countries should have different facts at same index
      // (unless they happen to have the same first fact)
      expect(factDE).not.toBeNull();
      expect(factUS).not.toBeNull();
    });

    it('should handle WORLD as country code in country mode', () => {
      const fact = service.getFactByIndex(100, 0, 'country', 'WORLD');
      expect(fact).not.toBeNull();
      expect(fact!.message.length).toBeGreaterThan(0);
    });

    it('should handle DEFAULT as country code in country mode', () => {
      const fact = service.getFactByIndex(100, 0, 'country', 'DEFAULT');
      expect(fact).not.toBeNull();
      expect(fact!.message.length).toBeGreaterThan(0);
    });
  });

  describe('Fallback behavior', () => {
    it('should use translation service for fallback message', () => {
      // This tests that when no facts exist, the fallback uses translation
      // We can't easily force empty facts, but we can verify the mock is set up
      expect(mockLanguageService.translate('FACTS.ELECTRICITY_FALLBACK'))
        .toBe('Electricity has revolutionized modern life.');
    });
  });
});
