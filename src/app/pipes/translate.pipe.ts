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
    // Reading the signal here creates a dependency so the pipe updates when language changes
    this.languageService.currentLang();
    return this.languageService.translate(key, params);
  }
}
