import { Injectable, signal, inject, ApplicationRef } from '@angular/core';
import { en } from '../i18n/en';
import { de } from '../i18n/de';

export type Language = 'en' | 'de';

@Injectable({
    providedIn: 'root'
})
export class LanguageService {
    private appRef = inject(ApplicationRef);
    readonly currentLang = signal<Language>('en');

    private translations: Record<Language, any> = {
        en,
        de
    };

    setLanguage(lang: Language) {
        this.currentLang.set(lang);
        document.documentElement.lang = lang;
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
