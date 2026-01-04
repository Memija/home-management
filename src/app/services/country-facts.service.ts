import { Injectable, inject } from '@angular/core';
import { LanguageService, Language } from './language.service';
import { en } from '../i18n/en';
import { de } from '../i18n/de';

type CountryFactsMap = Record<string, string[]>;

@Injectable({
    providedIn: 'root'
})
export class CountryFactsService {
    private languageService = inject(LanguageService);

    /**
     * Get a random fact for a specific country
     * @param countryCode The ISO country code (e.g., 'DE', 'US')
     * @returns A random fact string for the country
     */
    getRandomFact(countryCode: string): string {
        const lang = this.languageService.currentLang();
        const facts = this.getFactsForCountry(countryCode.toUpperCase(), lang);

        if (facts.length === 0) {
            return '';
        }

        const randomIndex = Math.floor(Math.random() * facts.length);
        return facts[randomIndex];
    }

    /**
     * Get a fact by index for a specific country (useful for consistent display)
     * @param countryCode The ISO country code
     * @param index The index of the fact to get
     * @returns The fact at the given index, or a random fact if index is out of bounds
     */
    getFactByIndex(countryCode: string, index: number): string {
        const lang = this.languageService.currentLang();
        const facts = this.getFactsForCountry(countryCode.toUpperCase(), lang);

        if (facts.length === 0) {
            return '';
        }

        const safeIndex = Math.abs(index) % facts.length;
        return facts[safeIndex];
    }

    /**
     * Get all facts for a country
     * @param countryCode The ISO country code
     * @param lang The language to use
     * @returns Array of facts for the country
     */
    private getFactsForCountry(countryCode: string, lang: Language): string[] {
        const translations = lang === 'de' ? de : en;
        const countryFacts = translations.COUNTRY_FACTS as CountryFactsMap;

        // Try to get country-specific facts, fall back to DEFAULT
        if (countryFacts[countryCode] && countryFacts[countryCode].length > 0) {
            return countryFacts[countryCode];
        }

        return countryFacts['DEFAULT'] || [];
    }

    /**
     * Get the number of facts available for a country
     * @param countryCode The ISO country code
     * @returns The number of facts available
     */
    getFactCount(countryCode: string): number {
        const lang = this.languageService.currentLang();
        return this.getFactsForCountry(countryCode.toUpperCase(), lang).length;
    }
}
