import { Pipe, PipeTransform, signal, WritableSignal } from '@angular/core';
import { vi } from 'vitest';

@Pipe({
  name: 'translate',
  standalone: true,
})
export class MockTranslatePipe implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

export interface MockLanguageService {
  currentLang: WritableSignal<string>;
  translate: ReturnType<typeof vi.fn>;
  setLanguage: ReturnType<typeof vi.fn>;
}

export function createMockLanguageService(
  initialLang = 'en',
  customTranslations: Record<string, string> = {},
): MockLanguageService {
  const langSignal = signal(initialLang);
  const translateFn = vi.fn((key: string, params?: Record<string, unknown>) => {
    let result = customTranslations[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        result = result.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(val));
      });
    }
    return result;
  });

  return {
    currentLang: langSignal,
    translate: translateFn,
    setLanguage: vi.fn((lang: string) => langSignal.set(lang)),
  };
}
