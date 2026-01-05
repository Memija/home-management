import { Injectable, signal, inject, ApplicationRef } from '@angular/core';


export type Language = 'en' | 'de';

/** Storage key for user's preferred language (hm = homemanagement) */
const LANGUAGE_STORAGE_KEY = 'hm_preferred_language';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private appRef = inject(ApplicationRef);
  readonly currentLang = signal<Language>(this.getStoredLanguage());
  readonly isLoading = signal<boolean>(false);

  // Store loaded translations
  private translations: Record<string, Record<string, unknown>> = {
    en: {},
    de: {}
  };

  // Signal to notify when translations are loaded/updated
  private readonly translationChanged = signal(0);

  constructor() {
    // Load initial language
    this.loadLanguage(this.currentLang());
  }

  private getStoredLanguage(): Language {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      // 1. Check local storage (explicit user preference)
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === 'en' || stored === 'de') {
        return stored;
      }

      // 2. Check browser language
      const browserLang = navigator.language;
      if (browserLang.startsWith('de')) {
        return 'de';
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
    const locale = lang === 'de' ? 'de-DE' : 'en-US';
    document.documentElement.lang = locale;

    // Update meta tag for browser localization hints
    let meta = document.querySelector('meta[http-equiv="Content-Language"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('http-equiv', 'Content-Language');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', locale);
  }

  private async loadLanguage(lang: Language) {
    // If already loaded (check a key usually present), skip
    if (this.translations[lang] && Object.keys(this.translations[lang]).length > 0) {
      return;
    }

    this.isLoading.set(true);
    try {
      let module;
      if (lang === 'de') {
        module = await import('../i18n/de');
        this.translations['de'] = module.de as Record<string, unknown>;
      } else {
        module = await import('../i18n/en');
        this.translations['en'] = module.en as Record<string, unknown>;
      }

      // Notify signals that translations have changed
      this.translationChanged.update(v => v + 1);
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
      Object.keys(params).forEach(param => {
        translation = translation.replace(`{${param}}`, String(params[param]));
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
