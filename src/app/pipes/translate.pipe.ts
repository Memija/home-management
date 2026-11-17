import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../services/language.service';

function shallowEqualParams(
  a?: Record<string, string | number>,
  b?: Record<string, string | number>,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly languageService = inject(LanguageService);
  private lastKey: string | undefined;
  private lastLang: string | undefined;
  private lastVersion: number | undefined;
  private lastParams: Record<string, string | number> | undefined;
  private lastResult = '';

  transform(key: string, params?: Record<string, string | number>): string {
    // Reading the signal here creates a dependency so the pipe updates when language changes
    const lang = this.languageService.currentLang();
    const version = this.languageService.translationVersion?.() ?? 0;

    if (
      key === this.lastKey &&
      lang === this.lastLang &&
      version === this.lastVersion &&
      shallowEqualParams(params, this.lastParams)
    ) {
      return this.lastResult;
    }

    this.lastKey = key;
    this.lastLang = lang;
    this.lastVersion = version;
    this.lastParams = params ? { ...params } : undefined;
    this.lastResult = this.languageService.translate(key, params);
    return this.lastResult;
  }
}
