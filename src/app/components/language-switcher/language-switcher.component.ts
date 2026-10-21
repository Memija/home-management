import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { LanguageService, Language, SUPPORTED_LANGUAGES } from '../../services/language.service';
import { LucideAngularModule, Globe, ChevronDown, Check } from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.scss',
})
export class LanguageSwitcherComponent {
  protected readonly languageService = inject(LanguageService);
  private readonly elementRef = inject(ElementRef);

  protected readonly languages = SUPPORTED_LANGUAGES;
  protected readonly isDropdownOpen = signal(false);

  // Lucide icons
  protected readonly GlobeIcon = Globe;
  protected readonly ChevronDownIcon = ChevronDown;
  protected readonly CheckIcon = Check;

  protected readonly languageNames: Record<Language, string> = {
    en: 'English',
    de: 'Deutsch',
    bs: 'Bosanski',
    sr: 'Српски',
    id: 'Bahasa Indonesia',
    pl: 'Polski',
  };

  protected readonly flagCodes: Record<Language, string> = {
    en: 'gb',
    de: 'de',
    bs: 'ba',
    sr: 'rs',
    id: 'id',
    pl: 'pl',
  };

  toggleDropdown() {
    this.isDropdownOpen.update((v) => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen.set(false);
    }
  }

  async selectLanguage(lang: Language) {
    await this.languageService.setLanguage(lang);
    this.isDropdownOpen.set(false);
  }

  async setLanguage(lang: Language) {
    await this.languageService.setLanguage(lang);
  }
}
