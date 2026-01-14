import { Injectable, inject } from '@angular/core';
import { LanguageService } from './language.service';
import { heatingCountryFacts as enHeatingFacts, availableHeatingCountries } from '../i18n/modules/en/heating-country-facts';
import { heatingCountryFacts as deHeatingFacts } from '../i18n/modules/de/heating-country-facts';
import { en } from '../i18n/en';
import { de } from '../i18n/de';

export interface HeatingFact {
  title: string;
  message: string;
}

export type HeatingFactMode = 'historical' | 'country';

/**
 * Service providing interesting facts about heating
 * - Historical facts: evolution of heating technology (for total mode)
 * - Country facts: country-specific energy information (for incremental mode)
 */
@Injectable({
  providedIn: 'root'
})
export class HeatingFactsService {
  private languageService = inject(LanguageService);

  /**
   * Get available countries for heating facts
   */
  getAvailableCountries() {
    return availableHeatingCountries;
  }

  /**
   * Get a heating fact by index
   * @param kWh - Energy amount in kWh (for potential future dynamic calculations)
   * @param index - Random index to select a fact
   * @param mode - 'historical' for total mode, 'country' for incremental mode
   * @param countryCode - Optional country code for country-specific facts
   */
  getFactByIndex(kWh: number, index: number, mode: HeatingFactMode, countryCode?: string): HeatingFact | null {
    const lang = this.languageService.currentLang();
    const translations = lang === 'de' ? de : en;
    const countryFacts = lang === 'de' ? deHeatingFacts : enHeatingFacts;
    const didYouKnow = translations.FACTS?.DID_YOU_KNOW || 'Did you know?';

    if (mode === 'historical') {
      return this.getHistoricalFact(didYouKnow, index, countryFacts);
    } else {
      return this.getCountryFact(didYouKnow, index, countryCode, countryFacts);
    }
  }

  private getHistoricalFact(title: string, index: number, countryFacts: Record<string, string[]>): HeatingFact {
    // Use WORLD historical facts
    const facts = countryFacts['WORLD'] || countryFacts['DEFAULT'] || [];
    if (facts.length === 0) {
      return {
        title,
        message: 'Heating technology has evolved significantly over thousands of years.'
      };
    }

    const safeIndex = Math.abs(index) % facts.length;
    return {
      title,
      message: facts[safeIndex]
    };
  }

  private getCountryFact(title: string, index: number, countryCode: string | undefined, countryFacts: Record<string, string[]>): HeatingFact | null {
    // Try to get country-specific fact
    if (countryCode) {
      const facts = countryFacts[countryCode.toUpperCase()];
      if (facts && facts.length > 0) {
        const safeIndex = Math.abs(index) % facts.length;
        return {
          title,
          message: facts[safeIndex]
        };
      }
    }

    // Fallback to DEFAULT facts if no country-specific ones
    const defaultFacts = countryFacts['DEFAULT'];
    if (defaultFacts && defaultFacts.length > 0) {
      const safeIndex = Math.abs(index) % defaultFacts.length;
      return {
        title,
        message: defaultFacts[safeIndex]
      };
    }

    return null;
  }
}
