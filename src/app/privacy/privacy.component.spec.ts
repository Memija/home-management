import { TestBed } from '@angular/core/testing';
import { PrivacyComponent } from './privacy.component';
import { LanguageService } from '../services/language.service';
import { signal, PLATFORM_ID } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Shield, Database, Lock, Cookie } from 'lucide-angular';

/**
 * Unit tests for PrivacyComponent.
 *
 * Uses TestBed.runInInjectionContext to create the component class directly,
 * bypassing external template/style resolution issues in the Vitest environment.
 */
describe('PrivacyComponent', () => {
  let component: PrivacyComponent;
  let languageServiceMock: any;

  beforeEach(() => {
    languageServiceMock = {
      translate: vi.fn().mockImplementation((key: string) => `translated_${key}`),
      currentLang: signal('en'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: LanguageService, useValue: languageServiceMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    component = TestBed.runInInjectionContext(() => {
      return new PrivacyComponent();
    });
  });

  // ── Creation ──────────────────────────────────────────────────────
  describe('Component Creation', () => {
    it('should create the component instance', () => {
      expect(component).toBeTruthy();
    });

    it('should be an instance of PrivacyComponent', () => {
      expect(component).toBeInstanceOf(PrivacyComponent);
    });
  });

  // ── Icon Initialization ───────────────────────────────────────────
  describe('Icon Initialization', () => {
    it('should have ShieldIcon set to lucide Shield icon', () => {
      expect(component.ShieldIcon).toBe(Shield);
    });

    it('should have DatabaseIcon set to lucide Database icon', () => {
      expect(component.DatabaseIcon).toBe(Database);
    });

    it('should have LockIcon set to lucide Lock icon', () => {
      expect(component.LockIcon).toBe(Lock);
    });

    it('should have CookieIcon set to lucide Cookie icon', () => {
      expect(component.CookieIcon).toBe(Cookie);
    });

    it('should have all icons defined as non-null references', () => {
      const icons = [
        component.ShieldIcon,
        component.DatabaseIcon,
        component.LockIcon,
        component.CookieIcon,
      ];
      icons.forEach((icon) => {
        expect(icon).toBeDefined();
        expect(icon).not.toBeNull();
      });
    });

    it('should maintain distinct references for different icons', () => {
      expect(component.ShieldIcon).not.toBe(component.DatabaseIcon);
      expect(component.LockIcon).not.toBe(component.CookieIcon);
    });
  });

  // ── Multiple Instances ────────────────────────────────────────────
  describe('Multiple Instances', () => {
    it('should create independent instances with identical icons', () => {
      const component2 = TestBed.runInInjectionContext(() => new PrivacyComponent());

      expect(component2).not.toBe(component); // Different objects
      expect(component2.ShieldIcon).toBe(component.ShieldIcon); // Same icon references
    });
  });

  // ── Logic Edge Cases ──────────────────────────────────────────────
  describe('Edge Cases', () => {
    it('should behave correctly in non-browser environment (SSR ready)', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          { provide: LanguageService, useValue: languageServiceMock },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });

      const ssrComponent = TestBed.runInInjectionContext(() => new PrivacyComponent());
      expect(ssrComponent).toBeTruthy();
      expect(ssrComponent.ShieldIcon).toBe(Shield);
    });

    it('should not throw when properties are accessed immediately', () => {
      expect(() => component.ShieldIcon).not.toThrow();
      expect(() => component.DatabaseIcon).not.toThrow();
    });

    it('should treat icons as readonly properties', () => {
      // Logic check: ensure they don't change ref if accessed multiple times
      const ref1 = component.ShieldIcon;
      const ref2 = component.ShieldIcon;
      expect(ref1).toBe(ref2);
    });
  });
});
