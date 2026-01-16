import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LanguageSwitcherComponent } from './language-switcher.component';
import { LanguageService, Language } from '../../services/language.service';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { By } from '@angular/platform-browser';

describe('LanguageSwitcherComponent', () => {
  let component: LanguageSwitcherComponent;
  let fixture: ComponentFixture<LanguageSwitcherComponent>;
  let languageServiceMock: any;
  const currentLangSignal = signal<Language>('en');

  beforeEach(async () => {
    // Reset signal
    currentLangSignal.set('en');

    languageServiceMock = {
      currentLang: currentLangSignal,
      setLanguage: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [LanguageSwitcherComponent],
      providers: [
        { provide: LanguageService, useValue: languageServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display EN and DE buttons', () => {
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    expect(buttons.length).toBe(2);
    expect(buttons[0].nativeElement.textContent.trim()).toBe('EN');
    expect(buttons[1].nativeElement.textContent.trim()).toBe('DE');
  });

  it('should highlight EN button when current language is en', () => {
    currentLangSignal.set('en');
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    expect(buttons[0].nativeElement.classList.contains('active')).toBe(true);
    expect(buttons[1].nativeElement.classList.contains('active')).toBe(false);
  });

  it('should highlight DE button when current language is de', () => {
    currentLangSignal.set('de');
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    expect(buttons[0].nativeElement.classList.contains('active')).toBe(false);
    expect(buttons[1].nativeElement.classList.contains('active')).toBe(true);
  });

  it('should call setLanguage with "en" when EN button is clicked', () => {
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    buttons[0].triggerEventHandler('click', null);

    expect(languageServiceMock.setLanguage).toHaveBeenCalledWith('en');
  });

  it('should call setLanguage with "de" when DE button is clicked', () => {
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    buttons[1].triggerEventHandler('click', null);

    expect(languageServiceMock.setLanguage).toHaveBeenCalledWith('de');
  });

  // Edge case: ensure button calls service even if it's already active (the service handles the "no-op" logic usually, but the UI should still pass the command)
  it('should still call setLanguage("en") even if already "en"', () => {
    currentLangSignal.set('en');
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    buttons[0].triggerEventHandler('click', null);

    expect(languageServiceMock.setLanguage).toHaveBeenCalledWith('en');
  });
});
