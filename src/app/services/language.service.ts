import { Injectable, signal, inject, ApplicationRef } from '@angular/core';
import { en } from '../i18n/en';
import { de } from '../i18n/de';

export type Language = 'en' | 'de';

const LANGUAGE_STORAGE_KEY = 'preferred_language';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private appRef = inject(ApplicationRef);
  readonly currentLang = signal<Language>(this.getStoredLanguage());

  private translations: Record<Language, any> = {
    en,
    de
  };

  private getStoredLanguage(): Language {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === 'en' || stored === 'de') {
        return stored;
      }
    }
    return 'en';
  }

  setLanguage(lang: Language) {
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

    // Force change detection to ensure all components update
    this.appRef.tick();
  }

  translate(key: string): string {
    const lang = this.currentLang();
    const keys = key.split('.');
    let value: any = this.translations[lang];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key;
      }
    }

    return typeof value === 'string' ? value : key;
  }
}
