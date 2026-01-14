import { TestBed } from '@angular/core/testing';
import { HeatingFactsService, HeatingFact } from './heating-facts.service';
import { LanguageService } from './language.service';
import { describe, it, expect, beforeEach } from 'vitest';
import { signal } from '@angular/core';

describe('HeatingFactsService', () => {
    let service: HeatingFactsService;
    let mockLanguageService: { currentLang: ReturnType<typeof signal<string>> };
    let mockCurrentLangSignal: ReturnType<typeof signal<string>>;

    beforeEach(() => {
        mockCurrentLangSignal = signal('en');
        mockLanguageService = {
            currentLang: mockCurrentLangSignal
        };

        TestBed.configureTestingModule({
            providers: [
                HeatingFactsService,
                { provide: LanguageService, useValue: mockLanguageService }
            ]
        });
        service = TestBed.inject(HeatingFactsService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('getAvailableCountries', () => {
        it('should return an array of countries', () => {
            const countries = service.getAvailableCountries();
            expect(Array.isArray(countries)).toBe(true);
            expect(countries.length).toBeGreaterThan(0);
        });

        it('should return countries with code and nameKey properties', () => {
            const countries = service.getAvailableCountries();
            countries.forEach(country => {
                expect(country).toHaveProperty('code');
                expect(country).toHaveProperty('nameKey');
                expect(typeof country.code).toBe('string');
                expect(typeof country.nameKey).toBe('string');
            });
        });

        it('should include common European countries', () => {
            const countries = service.getAvailableCountries();
            const codes = countries.map(c => c.code);
            expect(codes).toContain('DE');
            expect(codes).toContain('AT');
            expect(codes).toContain('CH');
            expect(codes).toContain('GB');
            expect(codes).toContain('FR');
        });

        it('should include countries from all regions', () => {
            const countries = service.getAvailableCountries();
            const codes = countries.map(c => c.code);
            // Americas
            expect(codes).toContain('US');
            expect(codes).toContain('CA');
            expect(codes).toContain('BR');
            // Asia-Pacific
            expect(codes).toContain('JP');
            expect(codes).toContain('AU');
            expect(codes).toContain('IN');
            // Middle East
            expect(codes).toContain('SA');
            expect(codes).toContain('TR');
            // Africa
            expect(codes).toContain('ZA');
            expect(codes).toContain('EG');
        });
    });

    describe('getFactByIndex - Historical Mode', () => {
        it('should return a fact in historical mode', () => {
            const fact = service.getFactByIndex(100, 0, 'historical');
            expect(fact).toBeDefined();
            expect(fact).not.toBeNull();
            expect(fact?.title).toBeTruthy();
            expect(fact?.message).toBeTruthy();
        });

        it('should return English title in historical mode', () => {
            mockCurrentLangSignal.set('en');
            const fact = service.getFactByIndex(100, 0, 'historical');
            expect(fact?.title).toBe('Did you know?');
        });

        it('should return German title when language is German', () => {
            mockCurrentLangSignal.set('de');
            const fact = service.getFactByIndex(100, 0, 'historical');
            expect(fact?.title).toBe('Wussten Sie schon?');
        });

        it('should cycle through facts using modulo for positive indices', () => {
            const fact1 = service.getFactByIndex(100, 0, 'historical');
            const fact2 = service.getFactByIndex(100, 1, 'historical');
            const fact3 = service.getFactByIndex(100, 1000, 'historical');
            expect(fact1).toBeTruthy();
            expect(fact2).toBeTruthy();
            expect(fact3).toBeTruthy();
            // Different indices should potentially give different facts (unless modulo wraps)
            expect(fact1?.message).not.toBe(fact2?.message);
        });

        it('should handle negative indices safely using Math.abs', () => {
            const factPositive = service.getFactByIndex(100, 5, 'historical');
            const factNegative = service.getFactByIndex(100, -5, 'historical');
            // Math.abs(-5) = 5, so should get same fact
            expect(factPositive?.message).toBe(factNegative?.message);
        });

        it('should return different messages in English vs German', () => {
            mockCurrentLangSignal.set('en');
            const factEn = service.getFactByIndex(100, 0, 'historical');

            mockCurrentLangSignal.set('de');
            const factDe = service.getFactByIndex(100, 0, 'historical');

            expect(factEn?.message).not.toBe(factDe?.message);
        });

        it('should ignore kWh parameter in current implementation', () => {
            const fact1 = service.getFactByIndex(0, 0, 'historical');
            const fact2 = service.getFactByIndex(1000000, 0, 'historical');
            // Same index should return same fact regardless of kWh
            expect(fact1?.message).toBe(fact2?.message);
        });
    });

    describe('getFactByIndex - Country Mode', () => {
        it('should return a country-specific fact when country code provided', () => {
            const fact = service.getFactByIndex(100, 0, 'country', 'DE');
            expect(fact).toBeDefined();
            expect(fact).not.toBeNull();
            expect(fact?.title).toBeTruthy();
            expect(fact?.message).toBeTruthy();
        });

        it('should handle lowercase country codes', () => {
            const factUpper = service.getFactByIndex(100, 0, 'country', 'DE');
            const factLower = service.getFactByIndex(100, 0, 'country', 'de');
            expect(factUpper?.message).toBe(factLower?.message);
        });

        it('should handle mixed case country codes', () => {
            const factUpper = service.getFactByIndex(100, 0, 'country', 'DE');
            const factMixed = service.getFactByIndex(100, 0, 'country', 'De');
            expect(factUpper?.message).toBe(factMixed?.message);
        });

        it('should return different facts for different countries', () => {
            const factDE = service.getFactByIndex(100, 0, 'country', 'DE');
            const factUS = service.getFactByIndex(100, 0, 'country', 'US');
            const factJP = service.getFactByIndex(100, 0, 'country', 'JP');
            // Different countries should have different facts (at index 0)
            expect(factDE?.message).not.toBe(factUS?.message);
            expect(factDE?.message).not.toBe(factJP?.message);
        });

        it('should cycle through country facts using modulo', () => {
            const fact1 = service.getFactByIndex(100, 0, 'country', 'DE');
            const fact2 = service.getFactByIndex(100, 1, 'country', 'DE');
            expect(fact1?.message).not.toBe(fact2?.message);
        });

        it('should fallback to DEFAULT facts for unknown country code', () => {
            const fact = service.getFactByIndex(100, 0, 'country', 'XX');
            expect(fact).toBeDefined();
            expect(fact).not.toBeNull();
            // Should return a DEFAULT fact, not null
            expect(fact?.message).toBeTruthy();
        });

        it('should fallback to DEFAULT facts when no country code provided', () => {
            const fact = service.getFactByIndex(100, 0, 'country', undefined);
            expect(fact).toBeDefined();
            expect(fact).not.toBeNull();
            expect(fact?.message).toBeTruthy();
        });

        it('should fallback to DEFAULT facts for empty string country code', () => {
            const fact = service.getFactByIndex(100, 0, 'country', '');
            expect(fact).toBeDefined();
            expect(fact).not.toBeNull();
            expect(fact?.message).toBeTruthy();
        });

        it('should return German country facts when language is German', () => {
            mockCurrentLangSignal.set('en');
            const factEn = service.getFactByIndex(100, 0, 'country', 'DE');

            mockCurrentLangSignal.set('de');
            const factDe = service.getFactByIndex(100, 0, 'country', 'DE');

            // German facts should be different from English facts
            expect(factEn?.message).not.toBe(factDe?.message);
            expect(factDe?.title).toBe('Wussten Sie schon?');
        });

        it('should handle negative indices for country facts', () => {
            const factPositive = service.getFactByIndex(100, 3, 'country', 'US');
            const factNegative = service.getFactByIndex(100, -3, 'country', 'US');
            expect(factPositive?.message).toBe(factNegative?.message);
        });

        it('should handle very large indices', () => {
            const fact = service.getFactByIndex(100, 999999, 'country', 'DE');
            expect(fact).toBeDefined();
            expect(fact).not.toBeNull();
            expect(fact?.message).toBeTruthy();
        });
    });

    describe('Language Switching', () => {
        it('should return English facts by default', () => {
            mockCurrentLangSignal.set('en');
            const fact = service.getFactByIndex(100, 0, 'country', 'DE');
            expect(fact?.title).toBe('Did you know?');
        });

        it('should return German facts when language is de', () => {
            mockCurrentLangSignal.set('de');
            const fact = service.getFactByIndex(100, 0, 'country', 'DE');
            expect(fact?.title).toBe('Wussten Sie schon?');
        });

        it('should fallback to English for unknown language codes', () => {
            mockCurrentLangSignal.set('fr');
            const fact = service.getFactByIndex(100, 0, 'country', 'DE');
            // Should use English as fallback (not de)
            expect(fact?.title).toBe('Did you know?');
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero index', () => {
            const fact = service.getFactByIndex(100, 0, 'historical');
            expect(fact).toBeDefined();
            expect(fact).not.toBeNull();
        });

        it('should handle zero kWh in country mode', () => {
            const fact = service.getFactByIndex(0, 0, 'country', 'DE');
            expect(fact).toBeDefined();
            expect(fact).not.toBeNull();
        });

        it('should handle negative kWh', () => {
            const fact = service.getFactByIndex(-100, 0, 'historical');
            expect(fact).toBeDefined();
            expect(fact).not.toBeNull();
        });

        it('should return consistent results for same inputs', () => {
            const fact1 = service.getFactByIndex(100, 5, 'country', 'FR');
            const fact2 = service.getFactByIndex(100, 5, 'country', 'FR');
            expect(fact1?.message).toBe(fact2?.message);
        });

        it('should include all major European countries', () => {
            const europeanCodes = ['DE', 'AT', 'CH', 'NL', 'FR', 'GB', 'IT', 'ES', 'BE', 'PL'];
            europeanCodes.forEach(code => {
                const fact = service.getFactByIndex(100, 0, 'country', code);
                expect(fact).not.toBeNull();
                expect(fact?.message).toBeTruthy();
            });
        });

        it('should return facts for all available countries', () => {
            const countries = service.getAvailableCountries();
            countries.forEach(country => {
                const fact = service.getFactByIndex(100, 0, 'country', country.code);
                expect(fact).not.toBeNull();
                expect(fact?.message).toBeTruthy();
            });
        });
    });

    describe('HeatingFact Interface', () => {
        it('should return object matching HeatingFact interface', () => {
            const fact = service.getFactByIndex(100, 0, 'historical');
            expect(fact).toHaveProperty('title');
            expect(fact).toHaveProperty('message');
            expect(typeof fact?.title).toBe('string');
            expect(typeof fact?.message).toBe('string');
        });

        it('should have non-empty title and message', () => {
            const fact = service.getFactByIndex(100, 0, 'country', 'DE');
            expect(fact?.title.length).toBeGreaterThan(0);
            expect(fact?.message.length).toBeGreaterThan(0);
        });
    });
});
