import { Component, inject } from '@angular/core';
import { LanguageService, Language } from '../../services/language.service';

@Component({
    selector: 'app-language-switcher',
    standalone: true,
    template: `
    <div class="language-switcher">
      <button 
        [class.active]="languageService.currentLang() === 'en'"
        (click)="setLanguage('en')">
        EN
      </button>
      <button 
        [class.active]="languageService.currentLang() === 'de'"
        (click)="setLanguage('de')">
        DE
      </button>
    </div>
  `,
    styles: [`
    .language-switcher {
      display: flex;
      gap: 0.5rem;
    }

    button {
      padding: 0.25rem 0.5rem;
      border: 1px solid #ced4da;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 500;
      color: #495057;

      &:hover {
        background: #e9ecef;
      }

      &.active {
        background: #007bff;
        color: white;
        border-color: #007bff;
      }
    }
  `]
})
export class LanguageSwitcherComponent {
    protected languageService = inject(LanguageService);

    setLanguage(lang: Language) {
        this.languageService.setLanguage(lang);
    }
}
