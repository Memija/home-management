import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LanguageSwitcherComponent } from './language-switcher.component';
import { LanguageService, Language } from '../../services/language.service';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import * as fs from 'node:fs';
import * as path from 'node:path';

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
      setLanguage: vi.fn(),
    };

    // Manually resolve resources for Vitest environment
    // Use project root relative paths to be super explicit
    const templatePath = path.resolve(process.cwd(), 'src/app/components/language-switcher/language-switcher.component.html');
    const stylePath = path.resolve(process.cwd(), 'src/app/components/language-switcher/language-switcher.component.scss');

    const template = fs.readFileSync(templatePath, 'utf8');
    const styles = fs.readFileSync(stylePath, 'utf8');

    TestBed.configureTestingModule({
      imports: [LanguageSwitcherComponent],
      providers: [{ provide: LanguageService, useValue: languageServiceMock }],
    }).overrideComponent(LanguageSwitcherComponent, {
      set: {
        template: template,
        styles: [styles],
        templateUrl: '',
        styleUrl: '',
      },
    });

    await TestBed.compileComponents();

    fixture = TestBed.createComponent(LanguageSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('HTML Structure', () => {
    it('should have a container with class "language-switcher"', () => {
      const container = fixture.debugElement.query(By.css('.language-switcher'));
      expect(container).toBeTruthy();
      expect(container.name).toBe('div');
    });

    it('should display EN, DE and BS buttons within the container', () => {
      const container = fixture.debugElement.query(By.css('.language-switcher'));
      const buttons = container.queryAll(By.css('button'));

      // Check strict structure
      expect(container.children.length).toBe(3);
      expect(container.children[0].name).toBe('button');
      expect(container.children[1].name).toBe('button');
      expect(container.children[2].name).toBe('button');

      expect(buttons.length).toBe(3);
      expect(buttons[0].nativeElement.textContent.trim()).toBe('EN');
      expect(buttons[1].nativeElement.textContent.trim()).toBe('DE');
      expect(buttons[2].nativeElement.textContent.trim()).toBe('BS');
    });
  });

  describe('CSS Styling & Classes', () => {
    it('should apply "active" class to EN button when current language is en', () => {
      currentLangSignal.set('en');
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.css('button'));
      expect(buttons[0].nativeElement.classList.contains('active')).toBe(true);
      expect(buttons[1].nativeElement.classList.contains('active')).toBe(false);
      expect(buttons[2].nativeElement.classList.contains('active')).toBe(false);
    });

    it('should apply "active" class to DE button when current language is de', () => {
      currentLangSignal.set('de');
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.css('button'));
      expect(buttons[0].nativeElement.classList.contains('active')).toBe(false);
      expect(buttons[1].nativeElement.classList.contains('active')).toBe(true);
      expect(buttons[2].nativeElement.classList.contains('active')).toBe(false);
    });

    it('should apply "active" class to BS button when current language is bs', () => {
      currentLangSignal.set('bs');
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.css('button'));
      expect(buttons[0].nativeElement.classList.contains('active')).toBe(false);
      expect(buttons[1].nativeElement.classList.contains('active')).toBe(false);
      expect(buttons[2].nativeElement.classList.contains('active')).toBe(true);
    });

    it('should ensure "active" class is mutually exclusive', () => {
      // Test transition from EN to DE
      currentLangSignal.set('en');
      fixture.detectChanges();
      let buttons = fixture.debugElement.queryAll(By.css('button'));
      expect(buttons[0].classes['active']).toBe(true);
      expect(buttons[1].classes['active']).toBeFalsy();
      expect(buttons[2].classes['active']).toBeFalsy();

      currentLangSignal.set('de');
      fixture.detectChanges();
      buttons = fixture.debugElement.queryAll(By.css('button'));
      expect(buttons[0].classes['active']).toBeFalsy();
      expect(buttons[1].classes['active']).toBe(true);
      expect(buttons[2].classes['active']).toBeFalsy();

      currentLangSignal.set('bs');
      fixture.detectChanges();
      buttons = fixture.debugElement.queryAll(By.css('button'));
      expect(buttons[0].classes['active']).toBeFalsy();
      expect(buttons[1].classes['active']).toBeFalsy();
      expect(buttons[2].classes['active']).toBe(true);
    });
  });

  describe('User Interaction', () => {
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

    it('should call setLanguage with "bs" when BS button is clicked', () => {
      const buttons = fixture.debugElement.queryAll(By.css('button'));
      buttons[2].triggerEventHandler('click', null);

      expect(languageServiceMock.setLanguage).toHaveBeenCalledWith('bs');
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
});
