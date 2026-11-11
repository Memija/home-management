import { DOCUMENT, registerLocaleData } from '@angular/common';
import { Injectable, signal, inject, ApplicationRef, computed } from '@angular/core';

export type Language = 'en' | 'de' | 'bs' | 'sr' | 'id' | 'pl';

/** All supported languages - update this when adding a new language */
export const SUPPORTED_LANGUAGES: readonly Language[] = [
  'id',
  'bs',
  'de',
  'en',
  'pl',
  'sr',
] as const;

/** Storage key for user's preferred language (hm = homemanagement) */
const LANGUAGE_STORAGE_KEY = 'hm_preferred_language';

/** BCP 47 locale mappings per language */
const LANGUAGE_LOCALES: Record<Language, string | string[]> = {
  de: 'de-DE',
  bs: ['bs-Latn-BA', 'hr-HR', 'sr-Latn-RS'],
  sr: 'sr-RS',
  id: 'id-ID',
  pl: 'pl-PL',
  en: 'en-US',
};

/** Languages that use a dot / period after day numbers and abbreviated dates */
const DOT_LANGUAGES: readonly Language[] = ['de', 'bs', 'sr', 'pl'] as const;
const DOT_LANGUAGES_SET = new Set<Language>(DOT_LANGUAGES);

/** Translation keys for days of the week matching Date.getDay() (0 = Sunday) */
const DAYS_OF_WEEK = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

/** Translation keys for months of the year matching Date.getMonth() (0 = January) */
const MONTHS_OF_YEAR = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
] as const;

/** Dynamic loaders for each supported language (core UI strings without bulky country trivia) */
const LANGUAGE_LOADERS: Record<Language, () => Promise<Record<string, unknown>>> = {
  en: () => import('../i18n/core/en'),
  de: () => import('../i18n/core/de'),
  bs: () => import('../i18n/core/bs'),
  sr: () => import('../i18n/core/sr'),
  id: () => import('../i18n/core/id'),
  pl: () => import('../i18n/core/pl'),
};

export type FactKey =
  'WATER_FACTS' | 'COUNTRY_FACTS' | 'ELECTRICITY_COUNTRY_FACTS' | 'HEATING_COUNTRY_FACTS';

const ALL_FACT_KEYS: readonly FactKey[] = [
  'WATER_FACTS',
  'COUNTRY_FACTS',
  'ELECTRICITY_COUNTRY_FACTS',
  'HEATING_COUNTRY_FACTS',
] as const;

/** Dynamic loaders for country/utility trivia facts per language and domain (lazy-loaded on demand) */
const FACT_KEY_LOADERS: Record<Language, Record<FactKey, () => Promise<unknown>>> = {
  en: {
    WATER_FACTS: () => import('../i18n/modules/en/water-facts').then((m) => m.waterFacts),
    COUNTRY_FACTS: () =>
      import('../i18n/modules/en/country-facts/index').then((m) => m.countryFacts),
    ELECTRICITY_COUNTRY_FACTS: () =>
      import('../i18n/modules/en/electricity-country-facts/index').then(
        (m) => m.electricityCountryFacts,
      ),
    HEATING_COUNTRY_FACTS: () =>
      import('../i18n/modules/en/heating-country-facts/index').then((m) => m.heatingCountryFacts),
  },
  de: {
    WATER_FACTS: () => import('../i18n/modules/de/water-facts').then((m) => m.waterFacts),
    COUNTRY_FACTS: () =>
      import('../i18n/modules/de/country-facts/index').then((m) => m.countryFacts),
    ELECTRICITY_COUNTRY_FACTS: () =>
      import('../i18n/modules/de/electricity-country-facts/index').then(
        (m) => m.electricityCountryFacts,
      ),
    HEATING_COUNTRY_FACTS: () =>
      import('../i18n/modules/de/heating-country-facts/index').then((m) => m.heatingCountryFacts),
  },
  bs: {
    WATER_FACTS: () => import('../i18n/modules/bs/water-facts').then((m) => m.waterFacts),
    COUNTRY_FACTS: () =>
      import('../i18n/modules/bs/country-facts/index').then((m) => m.countryFacts),
    ELECTRICITY_COUNTRY_FACTS: () =>
      import('../i18n/modules/bs/electricity-country-facts/index').then(
        (m) => m.electricityCountryFacts,
      ),
    HEATING_COUNTRY_FACTS: () =>
      import('../i18n/modules/bs/heating-country-facts/index').then((m) => m.heatingCountryFacts),
  },
  sr: {
    WATER_FACTS: () => import('../i18n/modules/sr/water-facts').then((m) => m.waterFacts),
    COUNTRY_FACTS: () =>
      import('../i18n/modules/sr/country-facts/index').then((m) => m.countryFacts),
    ELECTRICITY_COUNTRY_FACTS: () =>
      import('../i18n/modules/sr/electricity-country-facts/index').then(
        (m) => m.electricityCountryFacts,
      ),
    HEATING_COUNTRY_FACTS: () =>
      import('../i18n/modules/sr/heating-country-facts/index').then((m) => m.heatingCountryFacts),
  },
  id: {
    WATER_FACTS: () => import('../i18n/modules/id/water-facts').then((m) => m.waterFacts),
    COUNTRY_FACTS: () =>
      import('../i18n/modules/id/country-facts/index').then((m) => m.countryFacts),
    ELECTRICITY_COUNTRY_FACTS: () =>
      import('../i18n/modules/id/electricity-country-facts/index').then(
        (m) => m.electricityCountryFacts,
      ),
    HEATING_COUNTRY_FACTS: () =>
      import('../i18n/modules/id/heating-country-facts/index').then((m) => m.heatingCountryFacts),
  },
  pl: {
    WATER_FACTS: () => import('../i18n/modules/pl/water-facts').then((m) => m.waterFacts),
    COUNTRY_FACTS: () =>
      import('../i18n/modules/pl/country-facts/index').then((m) => m.countryFacts),
    ELECTRICITY_COUNTRY_FACTS: () =>
      import('../i18n/modules/pl/electricity-country-facts/index').then(
        (m) => m.electricityCountryFacts,
      ),
    HEATING_COUNTRY_FACTS: () =>
      import('../i18n/modules/pl/heating-country-facts/index').then((m) => m.heatingCountryFacts),
  },
};

/** Dynamic Angular locale loaders so non-active locales are not bundled in main.ts */
const LOCALE_LOADERS: Partial<Record<Language, () => Promise<{ default: unknown }>>> = {
  de: () => import('@angular/common/locales/de'),
  bs: () => import('@angular/common/locales/bs'),
  sr: () => import('@angular/common/locales/sr'),
  id: () => import('@angular/common/locales/id'),
  pl: () => import('@angular/common/locales/pl'),
};

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly appRef = inject(ApplicationRef);
  private readonly document = inject(DOCUMENT);
  readonly currentLang = signal<Language>(this.getStoredLanguage());
  readonly currentLocale = computed(() => this.getLocale(this.currentLang()));
  readonly isLoading = signal<boolean>(false);

  // Store loaded translations
  private translations: Record<string, Record<string, unknown>> = Object.fromEntries(
    SUPPORTED_LANGUAGES.map((lang) => [lang, {}]),
  );

  // Cache resolved dot-path lookups per translation dictionary reference
  private readonly lookupCache = new WeakMap<Record<string, unknown>, Map<string, string>>();
  private readonly coreLoaded = new WeakSet<Record<string, unknown>>();

  // Track lazy-loaded country trivia facts per language and domain key
  private readonly factsLoaded = new Set<string>();
  private readonly factsLoading = new Set<string>();

  // Signal to notify when translations are loaded/updated
  private readonly translationChanged = signal(0);
  readonly translationVersion = this.translationChanged.asReadonly();
  private readonly dateTimeFormatCache = new Map<string, Intl.DateTimeFormat>();

  /**
   * Resolves once the initial language's translations have been loaded (or failed to load).
   * Awaited by an app initializer so server-prerendered HTML contains real text instead of keys.
   */
  readonly ready: Promise<void>;

  constructor() {
    const initialLang = this.currentLang();
    this.syncDocumentLocale(initialLang);
    // Load initial language
    this.ready = new Promise<void>((resolve) => {
      queueMicrotask(() => {
        void this.loadLanguage(initialLang).then(resolve);
      });
    });
  }

  private getStoredLanguage(): Language {
    // 1. Check URL path prefix (e.g. /de, /bs, /sr, /id, /pl) so localized routes
    // prerender on the server and hydrate in the browser in the matching language.
    const pathname = this.document?.location?.pathname ?? '';
    const pathSegment = pathname.split('/').filter(Boolean)[0] as Language | undefined;
    if (pathSegment && (SUPPORTED_LANGUAGES as readonly string[]).includes(pathSegment)) {
      return pathSegment;
    }

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      // 2. Check local storage (explicit user preference)
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
      if (stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
        return stored;
      }

      // 3. Check browser language (sr-RS, sr-Cyrl, etc)
      const browserLang =
        typeof navigator !== 'undefined' && navigator?.language ? navigator.language : '';
      const matchedLang = SUPPORTED_LANGUAGES.find((lang) => browserLang.startsWith(lang));
      if (matchedLang) {
        return matchedLang;
      }
    }
    // 4. Default to English
    return 'en';
  }

  async setLanguage(lang: Language) {
    if (lang === this.currentLang()) return;

    await this.loadLanguage(lang);
    this.currentLang.set(lang);

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
    this.syncDocumentLocale(lang);
  }

  private syncDocumentLocale(lang: Language): void {
    if (!this.document?.documentElement) {
      return;
    }
    const locale = this.getLocale(lang);
    const localeStr = Array.isArray(locale) ? locale[0] : locale;
    this.document.documentElement.lang = localeStr;

    if (!this.document.head) {
      return;
    }
    let meta = this.document.head.querySelector('meta[http-equiv="Content-Language"]');
    if (!meta) {
      meta = this.document.createElement('meta');
      meta.setAttribute('http-equiv', 'Content-Language');
      this.document.head.appendChild(meta);
    }
    meta.setAttribute('content', localeStr);
  }

  /**
   * Gets the BCP 47 locale for a given language.
   * Returns an array for Bosnian to ensure Latin Slavic fallback if browser data is missing.
   */
  getLocale(lang: Language): string | string[] {
    return LANGUAGE_LOCALES[lang] ?? LANGUAGE_LOCALES.en;
  }

  /** Capitalizes the first letter of a string */
  capitalize(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  /**
   * Formats a date using translated day and month names.
   * Ensures consistency across browsers and handles environments with incomplete locale data.
   */
  formatDate(
    date: Date,
    options: {
      weekday?: 'long' | 'short';
      month?: 'long' | 'short';
      day?: 'numeric';
      year?: 'numeric';
    } = {},
  ): string {
    const lang = this.currentLang();
    const locale = this.currentLocale();

    // If not using weekday or month names, use native locale formatting for numbers/order
    if (!options.weekday && !options.month) {
      const localeKey = Array.isArray(locale) ? locale.join(',') : locale;
      const cacheKey = `${localeKey}:${options.day ?? ''}:${options.year ?? ''}`;
      let formatter = this.dateTimeFormatCache.get(cacheKey);
      if (!formatter) {
        formatter = new Intl.DateTimeFormat(locale, options);
        this.dateTimeFormatCache.set(cacheKey, formatter);
      }
      return formatter.format(date);
    }

    let result = '';
    const needsDot = DOT_LANGUAGES_SET.has(lang);

    if (options.weekday) {
      result += this.formatWeekday(date, options.weekday, needsDot);
    }
    if (options.day === 'numeric') {
      result += this.formatDay(date, needsDot);
    }
    if (options.month) {
      result += this.formatMonth(date, options.month, needsDot);
    }
    if (options.year === 'numeric') {
      result += date.getFullYear();
    }

    return result.trim();
  }

  private formatWeekday(date: Date, weekday: 'long' | 'short', needsDot: boolean): string {
    const dayName = this.translate(`DAYS.${DAYS_OF_WEEK[date.getDay()]}`);
    if (weekday === 'long') {
      return `${this.capitalize(dayName)}, `;
    }
    const dot = needsDot ? '.' : '';
    return `${this.capitalize(dayName.substring(0, 3))}${dot}, `;
  }

  private formatDay(date: Date, needsDot: boolean): string {
    return `${date.getDate()}${needsDot ? '. ' : ' '}`;
  }

  private formatMonth(date: Date, month: 'long' | 'short', needsDot: boolean): string {
    const monthName = this.translate(`MONTHS.${MONTHS_OF_YEAR[date.getMonth()]}`);
    if (month === 'long') {
      return `${monthName} `;
    }
    const dot = needsDot ? '.' : '';
    return `${monthName.substring(0, 3)}${dot} `;
  }

  private hasCoreTranslations(dict: Record<string, unknown> | undefined): boolean {
    if (!dict) return false;
    if (this.coreLoaded.has(dict)) return true;
    for (const key in dict) {
      if (!key.endsWith('_FACTS')) {
        this.coreLoaded.add(dict);
        return true;
      }
    }
    return false;
  }

  private async loadLanguage(lang: Language) {
    // If already loaded (check a non-facts key usually present), skip
    if (this.hasCoreTranslations(this.translations[lang])) {
      return;
    }

    this.isLoading.set(true);
    try {
      const loader = LANGUAGE_LOADERS[lang];
      if (!loader) {
        throw new Error(`Unsupported language: ${lang}`);
      }
      const [module, localeModule] = await Promise.all([
        loader(),
        LOCALE_LOADERS[lang]?.() ?? Promise.resolve(null),
      ]);
      if (localeModule?.default) {
        registerLocaleData(localeModule.default);
      }
      const merged = {
        ...this.translations[lang],
        ...((module[lang] ?? module['en']) as Record<string, unknown>),
      };
      this.translations[lang] = merged;
      this.coreLoaded.add(merged);

      // Notify signals that translations have changed
      this.translationChanged.update((v) => v + 1);
    } catch (error) {
      console.error(`Failed to load language ${lang}:`, error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Returns the raw translation dictionary for a language (defaulting to currentLang),
   * and triggers on-demand loading of trivia facts (scoped to `factKey` when provided).
   */
  getTranslations(lang: Language = this.currentLang(), factKey?: FactKey): Record<string, unknown> {
    this.translationChanged();
    const dict = this.translations[lang] ?? {};
    if (factKey) {
      const cacheId = `${lang}:${factKey}`;
      if (
        !dict[factKey] &&
        !this.factsLoaded.has(cacheId) &&
        !this.factsLoading.has(cacheId) &&
        FACT_KEY_LOADERS[lang]?.[factKey]
      ) {
        void this.loadFacts(lang, factKey);
      }
    } else if (
      ALL_FACT_KEYS.some(
        (key) =>
          !dict[key] &&
          !this.factsLoaded.has(`${lang}:${key}`) &&
          !this.factsLoading.has(`${lang}:${key}`),
      ) &&
      FACT_KEY_LOADERS[lang]
    ) {
      void this.loadFacts(lang);
    }
    return dict;
  }

  /**
   * Lazy-loads country/utility trivia facts for the specified language (and optional domain key).
   */
  async loadFacts(lang: Language = this.currentLang(), factKey?: FactKey): Promise<void> {
    const langLoaders = FACT_KEY_LOADERS[lang];
    if (!langLoaders) {
      return;
    }
    const keysToLoad = (factKey ? [factKey] : ALL_FACT_KEYS).filter((key) => {
      const cacheId = `${lang}:${key}`;
      return (
        !this.translations[lang]?.[key] &&
        !this.factsLoaded.has(cacheId) &&
        !this.factsLoading.has(cacheId) &&
        Boolean(langLoaders[key])
      );
    });
    if (keysToLoad.length === 0) {
      return;
    }
    for (const key of keysToLoad) {
      this.factsLoading.add(`${lang}:${key}`);
    }
    try {
      const entries = await Promise.all(
        keysToLoad.map(async (key) => [key, await langLoaders[key]()] as const),
      );
      const wasCoreLoaded = this.hasCoreTranslations(this.translations[lang]);
      const merged = {
        ...this.translations[lang],
        ...Object.fromEntries(entries),
      };
      this.translations[lang] = merged;
      if (wasCoreLoaded) {
        this.coreLoaded.add(merged);
      }
      for (const key of keysToLoad) {
        this.factsLoaded.add(`${lang}:${key}`);
      }
      this.translationChanged.update((v) => v + 1);
    } catch (error) {
      console.error(`Failed to load facts for ${lang}:`, error);
    } finally {
      for (const key of keysToLoad) {
        this.factsLoading.delete(`${lang}:${key}`);
      }
    }
  }

  translate(key: string, params?: Record<string, string | number>): string {
    // Depend on the signal to trigger updates when translations load
    this.translationChanged();

    let translation = this.translateForLanguage(key, this.currentLang());

    // Replace parameters in the translation if provided
    if (params) {
      for (const param in params) {
        if (Object.hasOwn(params, param)) {
          translation = translation.replace(`{{${param}}}`, String(params[param]));
        }
      }
    }

    return translation;
  }

  /**
   * Translate a key for a specific language without changing the current language.
   * Useful for looking up translations across languages.
   */
  translateForLanguage(key: string, lang: Language): string {
    const langDict = this.translations[lang];
    if (!langDict) return key;

    let dictCache = this.lookupCache.get(langDict);
    if (dictCache) {
      const cached = dictCache.get(key);
      if (cached !== undefined) {
        return cached;
      }
    }

    const keys = key.split('.');
    let value: unknown = langDict;

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }

    if (typeof value === 'string') {
      if (!dictCache) {
        dictCache = new Map<string, string>();
        this.lookupCache.set(langDict, dictCache);
      }
      dictCache.set(key, value);
      return value;
    }

    return key;
  }
}
