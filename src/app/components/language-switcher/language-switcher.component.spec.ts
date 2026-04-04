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

    it('should display all 6 language buttons within the container', () => {
      const container = fixture.debugElement.query(By.css('.language-switcher'));
      const buttons = container.queryAll(By.css('button'));

      // Check strict structure
      expect(container.children.length).toBe(6);
      expect(container.children[0].name).toBe('button');
      expect(container.children[1].name).toBe('button');
      expect(container.children[2].name).toBe('button');
      expect(container.children[3].name).toBe('button');
      expect(container.children[4].name).toBe('button');
      expect(container.children[5].name).toBe('button');

      expect(buttons.length).toBe(6);
      expect(buttons[0].nativeElement.textContent.trim()).toBe('EN');
      expect(buttons[1].nativeElement.textContent.trim()).toBe('DE');
      expect(buttons[2].nativeElement.textContent.trim()).toBe('BS');
      expect(buttons[3].nativeElement.textContent.trim()).toBe('SR');
      expect(buttons[4].nativeElement.textContent.trim()).toBe('ID');
      expect(buttons[5].nativeElement.textContent.trim()).toBe('PL');
    });
  });

  describe('CSS Styling & Classes', () => {
    it('should apply "active" class to the correct button based on current language', () => {
      const languages: Language[] = ['en', 'de', 'bs', 'sr', 'id', 'pl'];
      
      languages.forEach((lang, index) => {
        currentLangSignal.set(lang);
        fixture.detectChanges();
        
        const buttons = fixture.debugElement.queryAll(By.css('button'));
        buttons.forEach((btn, i) => {
          expect(btn.nativeElement.classList.contains('active')).toBe(i === index);
        });
      });
    });

    it('should ensure "active" class is mutually exclusive across all languages', () => {
      // Test a few transitions
      currentLangSignal.set('en');
      fixture.detectChanges();
      let buttons = fixture.debugElement.queryAll(By.css('button'));
      expect(buttons[0].classes['active']).toBe(true);
      expect(buttons.slice(1).every(b => !b.classes['active'])).toBe(true);

      currentLangSignal.set('sr');
      fixture.detectChanges();
      buttons = fixture.debugElement.queryAll(By.css('button'));
      expect(buttons[3].classes['active']).toBe(true);
      expect(buttons.filter((_, i) => i !== 3).every(b => !b.classes['active'])).toBe(true);
    });
  });

  describe('User Interaction', () => {
    it('should call setLanguage with correct code when buttons are clicked', () => {
      const languages: Language[] = ['en', 'de', 'bs', 'sr', 'id', 'pl'];
      const buttons = fixture.debugElement.queryAll(By.css('button'));

      languages.forEach((lang, index) => {
        buttons[index].triggerEventHandler('click', null);
        expect(languageServiceMock.setLanguage).toHaveBeenCalledWith(lang);
      });
    });

    // Edge case: ensure button calls service even if it's already active
    it('should still call setLanguage even if already active', () => {
      currentLangSignal.set('pl');
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.css('button'));
      buttons[5].triggerEventHandler('click', null);

      expect(languageServiceMock.setLanguage).toHaveBeenCalledWith('pl');
    });
  });
});
