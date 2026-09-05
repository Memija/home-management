import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ApplicationRef } from '@angular/core';

describe('LanguageService', () => {
  let service: LanguageService;
  let mockLocalStorage: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
  };
  let mockApplicationRef: Record<string, unknown>;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    Object.defineProperty(window, 'navigator', {
      value: { language: 'en-US' },
      writable: true,
    });

    // Mock document
    document.documentElement.lang = '';

    mockApplicationRef = {};

    vi.spyOn(
      LanguageService.prototype as unknown as { loadLanguage: (lang: string) => Promise<void> },
      'loadLanguage',
    ).mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [LanguageService, { provide: ApplicationRef, useValue: mockApplicationRef }],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created and default to English if no storage or browser match', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    service = TestBed.inject(LanguageService);
    expect(service).toBeTruthy();
    expect(service.currentLang()).toBe('en');
  });

  it('should load language from local storage', () => {
    mockLocalStorage.getItem.mockReturnValue('de');
    service = TestBed.inject(LanguageService);
    expect(service.currentLang()).toBe('de');
  });

  it('should detect browser language', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    Object.defineProperty(window, 'navigator', {
      value: { language: 'de-DE' },
      writable: true,
    });
    service = TestBed.inject(LanguageService);
    expect(service.currentLang()).toBe('de');
  });

  it('should detect other supported browser languages (sr, id, pl, bs)', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    const testCases = [
      { browser: 'sr-RS', expected: 'sr' },
      { browser: 'id-ID', expected: 'id' },
      { browser: 'pl-PL', expected: 'pl' },
      { browser: 'bs-Latn-BA', expected: 'bs' },
    ];

    for (const { browser, expected } of testCases) {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [LanguageService, { provide: ApplicationRef, useValue: mockApplicationRef }],
      });
      Object.defineProperty(window, 'navigator', {
        value: { language: browser },
        writable: true,
      });
      const s = TestBed.inject(LanguageService);
      expect(s.currentLang()).toBe(expected);
    }
  });

  it('should fallback to en if stored language is invalid', () => {
    mockLocalStorage.getItem.mockReturnValue('unsupported-lang');
    service = TestBed.inject(LanguageService);
    expect(service.currentLang()).toBe('en');
  });

  it('should set language and update storage and document', async () => {
    service = TestBed.inject(LanguageService);

    // Mock loadLanguage to avoid actual import
    vi.spyOn(
      service as unknown as { loadLanguage: (lang: string) => Promise<void> },
      'loadLanguage',
    ).mockResolvedValue(undefined);

    await service.setLanguage('de');

    expect(service.currentLang()).toBe('de');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('hm_preferred_language', 'de');
    expect(document.documentElement.lang).toBe('de-DE');
  });

  it('should create meta tag if not exists', async () => {
    service = TestBed.inject(LanguageService);
    vi.spyOn(
      service as unknown as { loadLanguage: (lang: string) => Promise<void> },
      'loadLanguage',
    ).mockResolvedValue(undefined);
    document.head.innerHTML = ''; // Clear head
    await service.setLanguage('de');
    const meta = document.querySelector('meta[http-equiv="Content-Language"]');
    expect(meta).toBeTruthy();
    expect(meta?.getAttribute('content')).toBe('de-DE');
  });

  it('should update existing meta tag', async () => {
    service = TestBed.inject(LanguageService);
    vi.spyOn(
      service as unknown as { loadLanguage: (lang: string) => Promise<void> },
      'loadLanguage',
    ).mockResolvedValue(undefined);
    document.head.innerHTML = '<meta http-equiv="Content-Language" content="en-US">';
    await service.setLanguage('de');
    const meta = document.querySelector('meta[http-equiv="Content-Language"]');
    expect(meta?.getAttribute('content')).toBe('de-DE');
  });

  it('should not reload if language is already current', async () => {
    service = TestBed.inject(LanguageService);
    // Initial is en
    await service.setLanguage('en');
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });

  it('should translate', () => {
    service = TestBed.inject(LanguageService);

    // Manually inject translations
    service['translations']['en'] = {
      TEST: { KEY: 'Test Value' },
    };

    expect(service.translate('TEST.KEY')).toBe('Test Value');
  });

  it('should translate with params', () => {
    service = TestBed.inject(LanguageService);
    service['translations']['en'] = {
      TEST: { PARAM: 'Value: {{value}}' },
    };

    expect(service.translate('TEST.PARAM', { value: 123 })).toBe('Value: 123');
  });

  it('should return key if translation missing', () => {
    service = TestBed.inject(LanguageService);
    expect(service.translate('MISSING.KEY')).toBe('MISSING.KEY');
  });

  it('should translate for specific language', () => {
    service = TestBed.inject(LanguageService);
    service['translations']['en'] = { KEY: 'Value EN' };
    service['translations']['de'] = { KEY: 'Value DE' };

    expect(service.translateForLanguage('KEY', 'en')).toBe('Value EN');
    expect(service.translateForLanguage('KEY', 'de')).toBe('Value DE');
  });

  describe('getLocale', () => {
    it('should return correct locale for German', () => {
      service = TestBed.inject(LanguageService);
      expect(service.getLocale('de')).toBe('de-DE');
    });

    it('should return array of locales for Bosnian', () => {
      service = TestBed.inject(LanguageService);
      const locale = service.getLocale('bs');
      expect(Array.isArray(locale)).toBe(true);
      expect(locale).toContain('bs-Latn-BA');
    });

    it('should return correct locale for Serbian', () => {
      service = TestBed.inject(LanguageService);
      expect(service.getLocale('sr')).toBe('sr-RS');
    });

    it('should return correct locale for Indonesian', () => {
      service = TestBed.inject(LanguageService);
      expect(service.getLocale('id')).toBe('id-ID');
    });

    it('should return correct locale for Polish', () => {
      service = TestBed.inject(LanguageService);
      expect(service.getLocale('pl')).toBe('pl-PL');
    });

    it('should return default locale for English', () => {
      service = TestBed.inject(LanguageService);
      expect(service.getLocale('en')).toBe('en-US');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      service = TestBed.inject(LanguageService);
      expect(service.capitalize('hello')).toBe('Hello');
    });

    it('should not change already capitalized string', () => {
      service = TestBed.inject(LanguageService);
      expect(service.capitalize('Hello')).toBe('Hello');
    });

    it('should return empty string for empty input', () => {
      service = TestBed.inject(LanguageService);
      expect(service.capitalize('')).toBe('');
    });

    it('should handle single character strings', () => {
      service = TestBed.inject(LanguageService);
      expect(service.capitalize('a')).toBe('A');
    });
  });

  describe('formatDate', () => {
    let date: Date;

    beforeEach(() => {
      service = TestBed.inject(LanguageService);
      date = new Date(2026, 0, 5); // Monday, January 5, 2026

      // Mock translations needed for formatDate
      service['translations']['en'] = {
        DAYS: { MONDAY: 'monday' },
        MONTHS: { JANUARY: 'january' },
      };
      service['translations']['de'] = {
        DAYS: { MONDAY: 'Montag' },
        MONTHS: { JANUARY: 'Januar' },
      };
    });

    it('should use native formatting if no weekday or month specified', () => {
      const spy = vi.spyOn(date, 'toLocaleDateString');
      service.formatDate(date, { day: 'numeric', year: 'numeric' });
      expect(spy).toHaveBeenCalled();
    });

    it('should format full date in English', () => {
      service.currentLang.set('en');
      const result = service.formatDate(date, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      expect(result).toBe('Monday, 5 january 2026');
    });

    it('should format short date with dots for German', () => {
      service.currentLang.set('de');
      const result = service.formatDate(date, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      expect(result).toBe('Mon., 5. Jan.');
    });

    it('should format date with dots for Bosnian', () => {
      service.currentLang.set('bs');
      // Mock Bosnian translations
      service['translations']['bs'] = {
        DAYS: { MONDAY: 'ponedjeljak' },
        MONTHS: { JANUARY: 'januar' },
      };

      const result = service.formatDate(date, {
        day: 'numeric',
        month: 'long',
      });
      expect(result).toBe('5. januar');
    });

    it('should handle year only', () => {
      const result = service.formatDate(date, {
        year: 'numeric',
        month: 'long',
      });
      expect(result).toContain('2026');
    });

    it('should capitalize translated day names', () => {
      service.currentLang.set('en');
      const result = service.formatDate(date, { weekday: 'long' });
      expect(result).toBe('Monday,');
    });
  });

  describe('loadLanguage', () => {
    it('should skip loading if translations for language are already loaded', async () => {
      service = TestBed.inject(LanguageService);
      service['translations']['de'] = { ALREADY: 'loaded' };

      // Spy on unmocked loadLanguage by restoring and re-calling
      vi.restoreAllMocks();
      const loadMethod = service['loadLanguage'].bind(service);
      await loadMethod('de');

      expect(service['translations']['de']).toEqual({ ALREADY: 'loaded' });
    });

    it('should successfully load translations from module', async () => {
      service = TestBed.inject(LanguageService);
      service['translations']['de'] = {};

      vi.restoreAllMocks();
      const loadMethod = service['loadLanguage'].bind(service);
      await loadMethod('de');

      expect(Object.keys(service['translations']['de']).length).toBeGreaterThan(0);
    });

    it('should handle error when loading fails gracefully', async () => {
      service = TestBed.inject(LanguageService);
      service['translations']['de'] = {};

      vi.restoreAllMocks();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      // Call with an invalid language to trigger loader catch
      const loadMethod = service['loadLanguage'].bind(service);
      await loadMethod('nonexistent' as unknown as import('./language.service').Language);

      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
