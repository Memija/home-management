import { Component, inject } from '@angular/core';
import { LanguageService, Language } from '../../services/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.scss'
})
export class LanguageSwitcherComponent {
  protected languageService = inject(LanguageService);

  setLanguage(lang: Language) {
    this.languageService.setLanguage(lang);
  }
}
