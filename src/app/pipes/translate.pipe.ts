import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../services/language.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  private languageService = inject(LanguageService);

  transform(key: string, params?: Record<string, any>): string {
    // Reading the signal here creates a dependency
    this.languageService.currentLang();
    let translation = this.languageService.translate(key);

    // Replace parameters in the translation if provided
    if (params) {
      Object.keys(params).forEach(param => {
        translation = translation.replace(`{${param}}`, params[param]);
      });
    }

    return translation;
  }
}
