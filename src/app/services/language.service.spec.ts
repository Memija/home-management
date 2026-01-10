import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ApplicationRef } from '@angular/core';

describe('LanguageService', () => {
  let service: LanguageService;
  let mockLocalStorage: any;
  let mockApplicationRef: any;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    Object.defineProperty(window, 'navigator', {
        value: { language: 'en-US' },
        writable: true
    });

    // Mock document
    document.documentElement.lang = '';

    mockApplicationRef = {};

    TestBed.configureTestingModule({
      providers: [
        LanguageService,
        { provide: ApplicationRef, useValue: mockApplicationRef }
      ]
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
        writable: true
    });
    service = TestBed.inject(LanguageService);
    expect(service.currentLang()).toBe('de');
  });

  it('should set language and update storage and document', async () => {
    service = TestBed.inject(LanguageService);

    // Mock loadLanguage to avoid actual import
    vi.spyOn(service as any, 'loadLanguage').mockResolvedValue(undefined);

    await service.setLanguage('de');

    expect(service.currentLang()).toBe('de');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('hm_preferred_language', 'de');
    expect(document.documentElement.lang).toBe('de-DE');
  });

  it('should create meta tag if not exists', async () => {
      service = TestBed.inject(LanguageService);
      vi.spyOn(service as any, 'loadLanguage').mockResolvedValue(undefined);
      document.head.innerHTML = ''; // Clear head
      await service.setLanguage('de');
      const meta = document.querySelector('meta[http-equiv="Content-Language"]');
      expect(meta).toBeTruthy();
      expect(meta?.getAttribute('content')).toBe('de-DE');
  });

  it('should update existing meta tag', async () => {
      service = TestBed.inject(LanguageService);
      vi.spyOn(service as any, 'loadLanguage').mockResolvedValue(undefined);
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
    (service as any).translations['en'] = {
        TEST: { KEY: 'Test Value' }
    };

    expect(service.translate('TEST.KEY')).toBe('Test Value');
  });

  it('should translate with params', () => {
      service = TestBed.inject(LanguageService);
      (service as any).translations['en'] = {
        TEST: { PARAM: 'Value: {{value}}' }
      };

      expect(service.translate('TEST.PARAM', { value: 123 })).toBe('Value: 123');
  });

  it('should return key if translation missing', () => {
      service = TestBed.inject(LanguageService);
      expect(service.translate('MISSING.KEY')).toBe('MISSING.KEY');
  });

  it('should translate for specific language', () => {
      service = TestBed.inject(LanguageService);
      (service as any).translations['en'] = { KEY: 'Value EN' };
      (service as any).translations['de'] = { KEY: 'Value DE' };

      expect(service.translateForLanguage('KEY', 'en')).toBe('Value EN');
      expect(service.translateForLanguage('KEY', 'de')).toBe('Value DE');
  });
});
