import { Injectable, inject } from '@angular/core';
import { LanguageService } from './language.service';
import { ALL_COUNTRY_INFO, CountryCodeInfo } from '../models/country-codes.data';

export type CountryInfo = CountryCodeInfo;

@Injectable({
  providedIn: 'root',
})
export class CountryService {
  private readonly languageService = inject(LanguageService);

  // Complete list of country codes mapped to translation keys
  private readonly countryData: CountryInfo[] = ALL_COUNTRY_INFO;

  // O(1) lookup index by lowercase ISO country code
  private readonly codeMap = new Map<string, CountryInfo>(
    this.countryData.map((c) => [c.code.toLowerCase(), c]),
  );

  // O(1) lookup index by English key name (e.g. 'COUNTRIES.SOUTH_AFRICA' -> 'south africa')
  private readonly keyNameMap = new Map<string, CountryInfo>(
    this.countryData.map((c) => [
      c.translationKey.replace('COUNTRIES.', '').toLowerCase().replaceAll('_', ' '),
      c,
    ]),
  );

  private cachedLangKey = '';
  private cachedSortedCountries: string[] = [];
  private cachedNameMap = new Map<string, CountryInfo>();
  private cachedOtherLangKey = '';
  private cachedOtherLangNameMap = new Map<string, CountryInfo>();

  private ensureLanguageCache(): void {
    const lang = this.languageService.currentLang?.() ?? '';
    const sampleTranslation = this.languageService.translate('COUNTRIES.GERMANY');
    const cacheKey = `${lang}:${sampleTranslation}`;

    if (this.cachedLangKey === cacheKey) {
      return;
    }

    const nameMap = new Map<string, CountryInfo>();
    const names: string[] = new Array(this.countryData.length);

    for (let i = 0; i < this.countryData.length; i++) {
      const country = this.countryData[i];
      const translated = this.languageService.translate(country.translationKey);
      names[i] = translated;
      nameMap.set(translated.toLowerCase(), country);
    }

    names.sort((a, b) => a.localeCompare(b));

    this.cachedLangKey = cacheKey;
    this.cachedSortedCountries = names;
    this.cachedNameMap = nameMap;
  }

  /**
   * Get all countries with their translated names for the current language
   */
  getCountries(): string[] {
    this.ensureLanguageCache();
    return this.cachedSortedCountries;
  }

  /**
   * Get country info by translated name (for reverse lookup)
   */
  getCountryInfoByName(name: string): CountryInfo | undefined {
    const normalizedName = name.toLowerCase().trim();
    if (!normalizedName) return undefined;
    this.ensureLanguageCache();
    return this.cachedNameMap.get(normalizedName);
  }

  /**
   * Get country info by code
   */
  getCountryInfoByCode(code: string): CountryInfo | undefined {
    if (!code) return undefined;
    return this.codeMap.get(code.toLowerCase());
  }

  /**
   * Get all country data
   */
  getAllCountryData(): CountryInfo[] {
    return this.countryData;
  }

  /**
   * Get country info by name, searching across all languages.
   * First tries current language, then English name from key, then other language translations.
   */
  getCountryInfoByNameAnyLanguage(name: string): CountryInfo | undefined {
    if (!name) return undefined;
    const normalizedName = name.toLowerCase().trim();

    // Try current language first (O(1) via cachedNameMap)
    this.ensureLanguageCache();
    const currentLangMatch = this.cachedNameMap.get(normalizedName);
    if (currentLangMatch) return currentLangMatch;

    // Try matching the English name embedded in the translation key (O(1) via keyNameMap)
    // e.g., 'COUNTRIES.GERMANY' -> 'germany'
    const keyMatch = this.keyNameMap.get(normalizedName);
    if (keyMatch) return keyMatch;

    // Try the other language (if current is 'en', try 'de' and vice versa)
    const currentLang = this.languageService.currentLang();
    const otherLang = currentLang === 'en' ? 'de' : 'en';
    const otherSample = this.languageService.translateForLanguage('COUNTRIES.GERMANY', otherLang);
    const otherCacheKey = `${otherLang}:${otherSample}`;

    if (this.cachedOtherLangKey !== otherCacheKey) {
      const otherMap = new Map<string, CountryInfo>();
      for (const c of this.countryData) {
        const translated = this.languageService
          .translateForLanguage(c.translationKey, otherLang)
          .toLowerCase();
        otherMap.set(translated, c);
      }
      this.cachedOtherLangKey = otherCacheKey;
      this.cachedOtherLangNameMap = otherMap;
    }

    return this.cachedOtherLangNameMap.get(normalizedName);
  }
}
