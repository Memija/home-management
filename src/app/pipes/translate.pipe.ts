import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../services/language.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  private languageService = inject(LanguageService);

  transform(key: string): string {
    // Reading the signal here creates a dependency
    this.languageService.currentLang();
    return this.languageService.translate(key);
  }
}
