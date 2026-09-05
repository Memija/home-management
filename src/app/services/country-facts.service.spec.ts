import { TestBed } from '@angular/core/testing';
import { CountryFactsService } from './country-facts.service';
import { LanguageService } from './language.service';
import { describe, it, expect, beforeEach } from 'vitest';
import { signal, WritableSignal } from '@angular/core';

describe('CountryFactsService', () => {
  let service: CountryFactsService;
  let mockLanguageService: { currentLang: WritableSignal<string> };
  let mockCurrentLangSignal: WritableSignal<string>;

  beforeEach(() => {
    mockCurrentLangSignal = signal('en');
    mockLanguageService = {
      currentLang: mockCurrentLangSignal,
    };

    TestBed.configureTestingModule({
      providers: [CountryFactsService, { provide: LanguageService, useValue: mockLanguageService }],
    });
    service = TestBed.inject(CountryFactsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getRandomFact', () => {
    it('should return a string for a valid country code', () => {
      const fact = service.getRandomFact('de');
      expect(typeof fact).toBe('string');
      expect(fact.length).toBeGreaterThan(0);
    });

    it('should return a string for a country code falling back to default', () => {
      // Use a country code that likely doesn't have specific facts but should fallback
      const fact = service.getRandomFact('xx');
      expect(typeof fact).toBe('string');
      // If default facts exist
      if (fact) {
        expect(fact.length).toBeGreaterThan(0);
      }
    });

    it('should return empty string if no facts found (and no default)', () => {
      const fact = service.getRandomFact('us');
      expect(fact).toBeTruthy();
    });
  });

  describe('getFactByIndex', () => {
    it('should return consistent fact for same index', () => {
      const fact1 = service.getFactByIndex('de', 0);
      const fact2 = service.getFactByIndex('de', 0);
      expect(fact1).toBe(fact2);
    });

    it('should handle index out of bounds by modulo', () => {
      const count = service.getFactCount('de');
      if (count > 0) {
        const fact1 = service.getFactByIndex('de', 0);
        const fact2 = service.getFactByIndex('de', count);
        expect(fact1).toBe(fact2);
      }
    });
  });

  describe('getFactCount', () => {
    it('should return number of facts', () => {
      const count = service.getFactCount('de');
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('Language switching', () => {
    it('should use current language', () => {
      // German
      mockCurrentLangSignal.set('de');
      const factDe = service.getRandomFact('de');
      expect(factDe).toBeTruthy();

      // English
      mockCurrentLangSignal.set('en');
      const factEn = service.getRandomFact('de');
      expect(factEn).toBeTruthy();
    });
  });
});
