import {
  Component,
  ChangeDetectionStrategy,
  computed,
  effect,
  inject,
  signal,
  ElementRef,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { LANDING_LANGUAGE_PATHS } from '../../models/seo.model';
import { LanguageService, Language, SUPPORTED_LANGUAGES } from '../../services/language.service';
import { LucideAngularModule, Globe, ChevronDown, Check } from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';

const LANDING_PATHS_SET = new Set<string>(Object.values(LANDING_LANGUAGE_PATHS));

export interface LanguageOption {
  readonly code: Language;
  readonly name: string;
  readonly flagSrc: string;
}

const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  de: 'Deutsch',
  bs: 'Bosanski',
  sr: 'Српски',
  id: 'Bahasa Indonesia',
  pl: 'Polski',
};

const FLAG_CODES: Record<Language, string> = {
  en: 'gb',
  de: 'de',
  bs: 'ba',
  sr: 'rs',
  id: 'id',
  pl: 'pl',
};

const LANGUAGE_OPTIONS: readonly LanguageOption[] = SUPPORTED_LANGUAGES.map((code) => ({
  code,
  name: LANGUAGE_NAMES[code],
  flagSrc: `flags/${FLAG_CODES[code]}.png`,
}));

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcherComponent {
  protected readonly languageService = inject(LanguageService);
  private readonly elementRef = inject(ElementRef);
  private readonly router = inject(Router, { optional: true });
  private readonly document = inject(DOCUMENT, { optional: true });

  protected readonly languages = SUPPORTED_LANGUAGES;
  protected readonly languageOptions = LANGUAGE_OPTIONS;
  protected readonly isDropdownOpen = signal(false);

  // Lucide icons
  protected readonly GlobeIcon = Globe;
  protected readonly ChevronDownIcon = ChevronDown;
  protected readonly CheckIcon = Check;

  protected readonly languageNames: Record<Language, string> = LANGUAGE_NAMES;
  protected readonly flagCodes: Record<Language, string> = FLAG_CODES;

  protected readonly currentLangUpper = computed(() =>
    this.languageService.currentLang().toUpperCase(),
  );
  protected readonly currentFlagSrc = computed(
    () => `flags/${this.flagCodes[this.languageService.currentLang()]}.png`,
  );

  constructor() {
    effect((onCleanup) => {
      if (!this.isDropdownOpen() || !this.document) return;
      const handler = (event: MouseEvent) => this.onDocumentClick(event);
      this.document.addEventListener('click', handler);
      onCleanup(() => this.document?.removeEventListener('click', handler));
    });
  }

  toggleDropdown() {
    this.isDropdownOpen.update((v) => !v);
  }

  onDocumentClick(event: MouseEvent) {
    if (!this.isDropdownOpen()) return;
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen.set(false);
    }
  }

  async selectLanguage(lang: Language) {
    await this.setLanguage(lang);
    this.isDropdownOpen.set(false);
  }

  async setLanguage(lang: Language) {
    await this.languageService.setLanguage(lang);
    const currentPath = this.router?.url.split(/[?#]/)[0] ?? '';
    if (LANDING_PATHS_SET.has(currentPath)) {
      const targetPath = LANDING_LANGUAGE_PATHS[lang];
      if (targetPath && targetPath !== currentPath) {
        await this.router?.navigateByUrl(targetPath);
      }
    }
  }
}
