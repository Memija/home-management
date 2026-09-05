import { TestBed } from '@angular/core/testing';
import { TranslatePipe } from './translate.pipe';
import { LanguageService } from '../services/language.service';
import { signal, WritableSignal } from '@angular/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('TranslatePipe', () => {
  let pipe: TranslatePipe;
  let languageServiceMock: {
    currentLang: WritableSignal<string>;
    translate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Mock LanguageService
    languageServiceMock = {
      currentLang: signal('en'),
      translate: vi.fn((key: string, params?: Record<string, unknown>) => {
        if (key === 'hello') return 'Hello';
        if (key === 'welcome') return `Welcome ${params?.['name']}`;
        return key;
      }),
    };

    TestBed.configureTestingModule({
      providers: [TranslatePipe, { provide: LanguageService, useValue: languageServiceMock }],
    });

    pipe = TestBed.inject(TranslatePipe);
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should translate a key', () => {
    const result = pipe.transform('hello');
    expect(result).toBe('Hello');
    expect(languageServiceMock.translate).toHaveBeenCalledWith('hello', undefined);
  });

  it('should translate a key with parameters', () => {
    const params = { name: 'John' };
    const result = pipe.transform('welcome', params);
    expect(result).toBe('Welcome John');
    expect(languageServiceMock.translate).toHaveBeenCalledWith('welcome', params);
  });

  it('should call currentLang to register dependency', () => {
    const result = pipe.transform('hello');
    expect(result).toBe('Hello');
  });
});
