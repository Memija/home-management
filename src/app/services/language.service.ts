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

/** Dynamic loaders for each supported language */
const LANGUAGE_LOADERS: Record<Language, () => Promise<Record<string, unknown>>> = {
  en: () => import('../i18n/en'),
  de: () => import('../i18n/de'),
  bs: () => import('../i18n/bs'),
  sr: () => import('../i18n/sr'),
  id: () => import('../i18n/id'),
  pl: () => import('../i18n/pl'),
};

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private appRef = inject(ApplicationRef);
  readonly currentLang = signal<Language>(this.getStoredLanguage());
  readonly currentLocale = computed(() => this.getLocale(this.currentLang()));
  readonly isLoading = signal<boolean>(false);

  // Store loaded translations
  private translations: Record<string, Record<string, unknown>> = Object.fromEntries(
    SUPPORTED_LANGUAGES.map((lang) => [lang, {}]),
  );

  // Signal to notify when translations are loaded/updated
  private readonly translationChanged = signal(0);

  constructor() {
    // Load initial language
    this.loadLanguage(this.currentLang());
  }

  private getStoredLanguage(): Language {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      // 1. Check local storage (explicit user preference)
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
      if (stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
        return stored;
      }

      // 2. Check browser language (sr-RS, sr-Cyrl, etc)
      const browserLang =
        typeof navigator !== 'undefined' && navigator?.language ? navigator.language : '';
      const matchedLang = SUPPORTED_LANGUAGES.find((lang) => browserLang.startsWith(lang));
      if (matchedLang) {
        return matchedLang;
      }
    }
    // 3. Default to English
    return 'en';
  }

  async setLanguage(lang: Language) {
    if (lang === this.currentLang()) return;

    await this.loadLanguage(lang);
    this.currentLang.set(lang);

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
    const locale = this.getLocale(lang);
    const localeStr = Array.isArray(locale) ? locale[0] : locale;
    document.documentElement.lang = localeStr;

    // Update meta tag for browser localization hints
    let meta = document.querySelector('meta[http-equiv="Content-Language"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('http-equiv', 'Content-Language');
      document.head.appendChild(meta);
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
      return date.toLocaleDateString(locale, options);
    }

    let result = '';
    const needsDot = DOT_LANGUAGES.includes(lang);

    // This is a simplified localized formatter that works for the app's current needs.
    // In a larger app, we might use a library, but here we want to avoid extra weight.
    if (options.weekday) {
      const dayName = this.translate(`DAYS.${DAYS_OF_WEEK[date.getDay()]}`);
      const formattedDay =
        options.weekday === 'long'
          ? this.capitalize(dayName)
          : `${this.capitalize(dayName.substring(0, 3))}${needsDot ? '.' : ''}`;
      result += `${formattedDay}, `;
    }

    if (options.day === 'numeric') {
      const day = date.getDate();
      // Slavic languages often use dot after the day number
      result += `${day}${needsDot ? '. ' : ' '}`;
    }

    if (options.month) {
      const monthName = this.translate(`MONTHS.${MONTHS_OF_YEAR[date.getMonth()]}`);
      const formattedMonth =
        options.month === 'long' ? monthName : `${monthName.substring(0, 3)}${needsDot ? '.' : ''}`;
      result += `${formattedMonth} `;
    }

    if (options.year === 'numeric') {
      result += date.getFullYear();
    }

    return result.trim();
  }

  private async loadLanguage(lang: Language) {
    // If already loaded (check a key usually present), skip
    if (this.translations[lang] && Object.keys(this.translations[lang]).length > 0) {
      return;
    }

    this.isLoading.set(true);
    try {
      const loader = LANGUAGE_LOADERS[lang];
      if (!loader) {
        throw new Error(`Unsupported language: ${lang}`);
      }
      const module = await loader();
      this.translations[lang] = (module[lang] ?? module['en']) as Record<string, unknown>;

      // Notify signals that translations have changed
      this.translationChanged.update((v) => v + 1);
    } catch (error) {
      console.error(`Failed to load language ${lang}:`, error);
    } finally {
      this.isLoading.set(false);
    }
  }

  translate(key: string, params?: Record<string, string | number>): string {
    // Depend on the signal to trigger updates when translations load
    this.translationChanged();

    let translation = this.translateForLanguage(key, this.currentLang());

    // Replace parameters in the translation if provided
    if (params) {
      Object.keys(params).forEach((param) => {
        translation = translation.replace(`{{${param}}}`, String(params[param]));
      });
    }

    return translation;
  }

  /**
   * Translate a key for a specific language without changing the current language.
   * Useful for looking up translations across languages.
   */
  translateForLanguage(key: string, lang: Language): string {
    const keys = key.split('.');
    let value: unknown = this.translations[lang];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }

    return typeof value === 'string' ? value : key;
  }
}
