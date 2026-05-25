import { TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';
import { describe, it, expect, beforeEach } from 'vitest';
import { Heart, Rocket, History, Github, Shield } from 'lucide-angular';
import { APP_VERSION } from '../../app.constants';

/**
 * Unit tests for FooterComponent.
 *
 * Uses TestBed.runInInjectionContext to create the component class directly,
 * avoiding the templateUrl/styleUrl resolution issue in Vitest.
 *
 * Test categories:
 * - Component creation and identity
 * - Icon initialization and immutability
 * - App version validation
 * - Support modal state management
 * - Multiple instance isolation
 * - Property completeness and types
 * - Edge cases (rapid toggling, boolean coercion, state after stress)
 */
describe('FooterComponent', () => {
  let component: FooterComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({});

    component = TestBed.runInInjectionContext(() => {
      return new FooterComponent();
    });
  });

  // ── Creation ──────────────────────────────────────────────────────
  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should be an instance of FooterComponent', () => {
      expect(component).toBeInstanceOf(FooterComponent);
    });

    it('should not be null or undefined', () => {
      expect(component).not.toBeNull();
      expect(component).not.toBeUndefined();
    });
  });

  // ── Icon Initialization ───────────────────────────────────────────
  describe('Icon Initialization', () => {
    it('should have HeartIcon set to lucide Heart icon', () => {
      expect(component.HeartIcon).toBe(Heart);
    });

    it('should have RocketIcon set to lucide Rocket icon', () => {
      expect(component.RocketIcon).toBe(Rocket);
    });

    it('should have HistoryIcon set to lucide History icon', () => {
      expect(component.HistoryIcon).toBe(History);
    });

    it('should have GithubIcon set to lucide Github icon', () => {
      expect(component.GithubIcon).toBe(Github);
    });

    it('should have ShieldIcon set to lucide Shield icon', () => {
      expect(component.ShieldIcon).toBe(Shield);
    });

    it('should have all icons as non-null, non-undefined values', () => {
      const icons = [
        component.HeartIcon,
        component.RocketIcon,
        component.HistoryIcon,
        component.GithubIcon,
        component.ShieldIcon,
      ];
      for (const icon of icons) {
        expect(icon).not.toBeNull();
        expect(icon).not.toBeUndefined();
      }
    });

    it('should have distinct icon references (no accidental duplicates)', () => {
      expect(component.HeartIcon).not.toBe(component.RocketIcon);
      expect(component.HeartIcon).not.toBe(component.HistoryIcon);
      expect(component.HeartIcon).not.toBe(component.GithubIcon);
      expect(component.HeartIcon).not.toBe(component.ShieldIcon);
      expect(component.RocketIcon).not.toBe(component.HistoryIcon);
      expect(component.RocketIcon).not.toBe(component.GithubIcon);
      expect(component.RocketIcon).not.toBe(component.ShieldIcon);
      expect(component.HistoryIcon).not.toBe(component.GithubIcon);
      expect(component.HistoryIcon).not.toBe(component.ShieldIcon);
      expect(component.GithubIcon).not.toBe(component.ShieldIcon);
    });

    it('should have exactly five icon properties', () => {
      const iconKeys = [
        'HeartIcon',
        'RocketIcon',
        'HistoryIcon',
        'GithubIcon',
        'ShieldIcon',
      ] as const;
      iconKeys.forEach((key) => {
        expect(component[key]).toBeDefined();
      });
      const keys = Object.keys(component).filter((k) => k.endsWith('Icon'));
      expect(keys.length).toBe(5);
    });
  });

  // ── App Version ───────────────────────────────────────────────────
  describe('App Version', () => {
    it('should have appVersion set to APP_VERSION constant', () => {
      expect(component.appVersion).toBe(APP_VERSION);
    });

    it('should have appVersion as a non-empty string', () => {
      expect(component.appVersion).toBeTruthy();
      expect(typeof component.appVersion).toBe('string');
      expect(component.appVersion.length).toBeGreaterThan(0);
    });

    it('should have appVersion matching semantic version format (X.Y.Z)', () => {
      expect(component.appVersion).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should not contain pre-release or build metadata in version', () => {
      expect(component.appVersion).not.toContain('-');
      expect(component.appVersion).not.toContain('+');
    });

    it('should have version parts as valid non-negative integers', () => {
      const parts = component.appVersion.split('.').map(Number);
      expect(parts.length).toBe(3);
      parts.forEach((part) => {
        expect(Number.isInteger(part)).toBe(true);
        expect(part).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // ── Support Modal State ───────────────────────────────────────────
  describe('Support Modal State', () => {
    it('should have showSupportModal initially set to false', () => {
      expect(component.showSupportModal).toBe(false);
    });

    it('should allow showSupportModal to be set to true', () => {
      component.showSupportModal = true;
      expect(component.showSupportModal).toBe(true);
    });

    it('should allow showSupportModal to be toggled back to false', () => {
      component.showSupportModal = true;
      component.showSupportModal = false;
      expect(component.showSupportModal).toBe(false);
    });

    it('should allow rapid toggling without errors', () => {
      for (let i = 0; i < 100; i++) {
        component.showSupportModal = !component.showSupportModal;
      }
      expect(component.showSupportModal).toBe(false);
    });

    it('should be a strictly boolean value (not truthy/falsy)', () => {
      expect(component.showSupportModal).toBe(false);
      expect(component.showSupportModal).not.toBe(0);
      expect(component.showSupportModal).not.toBe(null);
      expect(component.showSupportModal).not.toBe(undefined);

      component.showSupportModal = true;
      expect(component.showSupportModal).toBe(true);
      expect(component.showSupportModal).not.toBe(1);
    });
  });

  // ── Component Properties (Completeness) ───────────────────────────
  describe('Component Properties', () => {
    it('should have all expected public properties', () => {
      expect(component).toHaveProperty('HeartIcon');
      expect(component).toHaveProperty('RocketIcon');
      expect(component).toHaveProperty('HistoryIcon');
      expect(component).toHaveProperty('GithubIcon');
      expect(component).toHaveProperty('ShieldIcon');
      expect(component).toHaveProperty('appVersion');
      expect(component).toHaveProperty('showSupportModal');
    });

    it('should have correct property types', () => {
      expect(typeof component.appVersion).toBe('string');
      expect(typeof component.showSupportModal).toBe('boolean');
      expect(typeof component.HeartIcon).toBe('object');
      expect(typeof component.RocketIcon).toBe('object');
      expect(typeof component.HistoryIcon).toBe('object');
      expect(typeof component.GithubIcon).toBe('object');
      expect(typeof component.ShieldIcon).toBe('object');
    });

    it('should not have unexpected enumerable properties beyond the public API', () => {
      const expectedKeys = [
        'HeartIcon',
        'RocketIcon',
        'HistoryIcon',
        'GithubIcon',
        'ShieldIcon',
        'appVersion',
        'showSupportModal',
      ];
      const actualKeys = Object.keys(component);
      actualKeys.forEach((key) => {
        expect(expectedKeys).toContain(key);
      });
    });
  });

  // ── Multiple Instances ────────────────────────────────────────────
  describe('Multiple Instances', () => {
    it('should create independent instances with separate modal state', () => {
      const component2 = TestBed.runInInjectionContext(() => new FooterComponent());

      component.showSupportModal = true;
      expect(component.showSupportModal).toBe(true);
      expect(component2.showSupportModal).toBe(false);
    });

    it('should share the same icon references across instances', () => {
      const component2 = TestBed.runInInjectionContext(() => new FooterComponent());

      expect(component.HeartIcon).toBe(component2.HeartIcon);
      expect(component.RocketIcon).toBe(component2.RocketIcon);
      expect(component.HistoryIcon).toBe(component2.HistoryIcon);
      expect(component.GithubIcon).toBe(component2.GithubIcon);
      expect(component.ShieldIcon).toBe(component2.ShieldIcon);
    });

    it('should share the same version across instances', () => {
      const component2 = TestBed.runInInjectionContext(() => new FooterComponent());
      expect(component.appVersion).toBe(component2.appVersion);
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────────
  describe('Edge Cases', () => {
    it('should maintain all readonly properties after stress', () => {
      for (let i = 0; i < 1000; i++) {
        component.showSupportModal = !component.showSupportModal;
      }

      expect(component.HeartIcon).toBe(Heart);
      expect(component.RocketIcon).toBe(Rocket);
      expect(component.HistoryIcon).toBe(History);
      expect(component.GithubIcon).toBe(Github);
      expect(component.ShieldIcon).toBe(Shield);
      expect(component.appVersion).toBe(APP_VERSION);
      expect(component.showSupportModal).toBe(false);
    });

    it('should not throw when accessing properties immediately after creation', () => {
      const freshComponent = TestBed.runInInjectionContext(() => new FooterComponent());

      expect(() => freshComponent.HeartIcon).not.toThrow();
      expect(() => freshComponent.RocketIcon).not.toThrow();
      expect(() => freshComponent.HistoryIcon).not.toThrow();
      expect(() => freshComponent.GithubIcon).not.toThrow();
      expect(() => freshComponent.ShieldIcon).not.toThrow();
      expect(() => freshComponent.appVersion).not.toThrow();
      expect(() => freshComponent.showSupportModal).not.toThrow();
    });

    it('should JSON.stringify showSupportModal without issues', () => {
      expect(JSON.stringify(component.showSupportModal)).toBe('false');
      component.showSupportModal = true;
      expect(JSON.stringify(component.showSupportModal)).toBe('true');
    });
  });
});
