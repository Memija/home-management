import { Injectable, inject } from '@angular/core';
import { LanguageService } from './language.service';
import { AVAILABLE_COUNTRIES_WITH_WORLD } from '../models/country-codes.data';
import { DID_YOU_KNOW_BY_LANG } from '../i18n/units';

export interface ElectricityFact {
  title: string;
  message: string;
}

export type ElectricityFactMode = 'historical' | 'country';

/**
 * Service providing interesting facts about electricity
 * - Historical facts: evolution of electricity (for total mode)
 * - Country facts: country-specific energy information (for incremental mode)
 */
@Injectable({
  providedIn: 'root',
})
export class ElectricityCountryFactsService {
  private readonly languageService = inject(LanguageService);

  /**
   * Get available countries for electricity facts
   */
  getAvailableCountries() {
    return AVAILABLE_COUNTRIES_WITH_WORLD;
  }

  /**
   * Get all electricity facts for a specific country in the active language.
   * Lazy-loads only ELECTRICITY_COUNTRY_FACTS for the current language on demand.
   * @param countryCode - ISO country code
   */
  getFacts(countryCode: string): readonly string[] {
    const lang = this.languageService.currentLang();
    const translations =
      this.languageService.getTranslations?.(lang, 'ELECTRICITY_COUNTRY_FACTS') ?? {};
    const countryFacts =
      (translations['ELECTRICITY_COUNTRY_FACTS'] as Record<string, string[]> | undefined) ?? {};
    const normalized = countryCode.toUpperCase();
    if (countryFacts[normalized] && countryFacts[normalized].length > 0) {
      return countryFacts[normalized];
    }
    return countryFacts['DEFAULT'] ?? [];
  }

  /**
   * Get an electricity fact by index
   * @param kWh - Energy amount in kWh (for potential future dynamic calculations)
   * @param index - Random index to select a fact
   * @param mode - 'historical' for total mode, 'country' for incremental mode
   * @param countryCode - Optional country code for country-specific facts
   */
  getFactByIndex(
    kWh: number,
    index: number,
    mode: ElectricityFactMode,
    countryCode?: string,
  ): ElectricityFact | null {
    const lang = this.languageService.currentLang();
    const translations =
      this.languageService.getTranslations?.(lang, 'ELECTRICITY_COUNTRY_FACTS') ?? {};
    const countryFacts =
      (translations['ELECTRICITY_COUNTRY_FACTS'] as Record<string, string[]> | undefined) ?? {};
    // Fallback title if translation missing
    const didYouKnow = DID_YOU_KNOW_BY_LANG[lang] || 'Did you know?';

    if (mode === 'historical') {
      return this.getHistoricalFact(didYouKnow, index, countryFacts);
    } else {
      return this.getCountryFact(didYouKnow, index, countryCode, countryFacts);
    }
  }

  private getHistoricalFact(
    title: string,
    index: number,
    countryFacts: Record<string, string[]>,
  ): ElectricityFact {
    // Use WORLD historical facts
    const facts = countryFacts['WORLD'] || countryFacts['DEFAULT'] || [];
    if (facts.length === 0) {
      return {
        title,
        message: this.languageService.translate('FACTS.ELECTRICITY_FALLBACK'),
      };
    }

    const safeIndex = Math.abs(index) % facts.length;
    return {
      title,
      message: facts[safeIndex],
    };
  }

  private getCountryFact(
    title: string,
    index: number,
    countryCode: string | undefined,
    countryFacts: Record<string, string[]>,
  ): ElectricityFact | null {
    // Try to get country-specific fact
    if (countryCode) {
      const facts = countryFacts[countryCode.toUpperCase()];
      if (facts && facts.length > 0) {
        const safeIndex = Math.abs(index) % facts.length;
        return {
          title,
          message: facts[safeIndex],
        };
      }
    }

    // Fallback to DEFAULT facts if no country-specific ones
    const defaultFacts = countryFacts['DEFAULT'];
    if (defaultFacts && defaultFacts.length > 0) {
      const safeIndex = Math.abs(index) % defaultFacts.length;
      return {
        title,
        message: defaultFacts[safeIndex],
      };
    }

    return null;
  }
}
