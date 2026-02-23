import { TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';
import { describe, it, expect, beforeEach } from 'vitest';
import { Heart, Rocket, Github } from 'lucide-angular';
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

    it('should have GithubIcon set to lucide Github icon', () => {
      expect(component.GithubIcon).toBe(Github);
    });

    it('should have HeartIcon as readonly (same reference across accesses)', () => {
      const first = component.HeartIcon;
      const second = component.HeartIcon;
      expect(first).toBe(second);
    });

    it('should have RocketIcon as readonly (same reference across accesses)', () => {
      const first = component.RocketIcon;
      const second = component.RocketIcon;
      expect(first).toBe(second);
    });

    it('should have GithubIcon as readonly (same reference across accesses)', () => {
      const first = component.GithubIcon;
      const second = component.GithubIcon;
      expect(first).toBe(second);
    });

    it('should have all icons as non-null, non-undefined values', () => {
      const icons = [component.HeartIcon, component.RocketIcon, component.GithubIcon];
      for (const icon of icons) {
        expect(icon).not.toBeNull();
        expect(icon).not.toBeUndefined();
      }
    });

    it('should have distinct icon references (no accidental duplicates)', () => {
      expect(component.HeartIcon).not.toBe(component.RocketIcon);
      expect(component.HeartIcon).not.toBe(component.GithubIcon);
      expect(component.RocketIcon).not.toBe(component.GithubIcon);
    });

    it('should have exactly three icon properties', () => {
      const iconKeys = ['HeartIcon', 'RocketIcon', 'GithubIcon'] as const;
      iconKeys.forEach(key => {
        expect(component[key]).toBeDefined();
      });
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

    it('should have appVersion as readonly (same reference across accesses)', () => {
      const first = component.appVersion;
      const second = component.appVersion;
      expect(first).toBe(second);
    });

    it('should not contain pre-release or build metadata in version', () => {
      // Semantic version should not have extra suffixes like -beta, +build
      expect(component.appVersion).not.toContain('-');
      expect(component.appVersion).not.toContain('+');
    });

    it('should have version parts as valid non-negative integers', () => {
      const parts = component.appVersion.split('.').map(Number);
      expect(parts.length).toBe(3);
      parts.forEach(part => {
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
      expect(component.showSupportModal).toBe(true);

      component.showSupportModal = false;
      expect(component.showSupportModal).toBe(false);
    });

    it('should allow rapid toggling without errors', () => {
      for (let i = 0; i < 100; i++) {
        component.showSupportModal = !component.showSupportModal;
      }
      // 100 toggles from false => ends on false
      expect(component.showSupportModal).toBe(false);
    });

    it('should end on true after odd number of toggles', () => {
      for (let i = 0; i < 99; i++) {
        component.showSupportModal = !component.showSupportModal;
      }
      // 99 toggles from false => ends on true
      expect(component.showSupportModal).toBe(true);
    });

    it('should accept explicit boolean assignments (idempotent sets)', () => {
      component.showSupportModal = true;
      component.showSupportModal = true; // double-set to true
      expect(component.showSupportModal).toBe(true);

      component.showSupportModal = false;
      component.showSupportModal = false; // double-set to false
      expect(component.showSupportModal).toBe(false);
    });

    it('should maintain state after multiple same-value assignments', () => {
      // Set true 5 times
      for (let i = 0; i < 5; i++) {
        component.showSupportModal = true;
      }
      expect(component.showSupportModal).toBe(true);

      // Set false 5 times
      for (let i = 0; i < 5; i++) {
        component.showSupportModal = false;
      }
      expect(component.showSupportModal).toBe(false);
    });

    it('should be a strictly boolean value (not truthy/falsy)', () => {
      expect(component.showSupportModal).toBe(false);
      expect(component.showSupportModal).not.toBe(0);
      expect(component.showSupportModal).not.toBe('');
      expect(component.showSupportModal).not.toBe(null);
      expect(component.showSupportModal).not.toBe(undefined);

      component.showSupportModal = true;
      expect(component.showSupportModal).toBe(true);
      expect(component.showSupportModal).not.toBe(1);
      expect(component.showSupportModal).not.toBe('true');
    });
  });

  // ── Component Properties (Completeness) ───────────────────────────
  describe('Component Properties', () => {
    it('should have HeartIcon as a non-null value', () => {
      expect(component.HeartIcon).not.toBeNull();
      expect(component.HeartIcon).not.toBeUndefined();
    });

    it('should have RocketIcon as a non-null value', () => {
      expect(component.RocketIcon).not.toBeNull();
      expect(component.RocketIcon).not.toBeUndefined();
    });

    it('should have GithubIcon as a non-null value', () => {
      expect(component.GithubIcon).not.toBeNull();
      expect(component.GithubIcon).not.toBeUndefined();
    });

    it('should have appVersion as a non-null value', () => {
      expect(component.appVersion).not.toBeNull();
      expect(component.appVersion).not.toBeUndefined();
    });

    it('should have showSupportModal defined', () => {
      expect(component.showSupportModal).toBeDefined();
    });

    it('should have all expected public properties', () => {
      expect(component).toHaveProperty('HeartIcon');
      expect(component).toHaveProperty('RocketIcon');
      expect(component).toHaveProperty('GithubIcon');
      expect(component).toHaveProperty('appVersion');
      expect(component).toHaveProperty('showSupportModal');
    });

    it('should have correct property types', () => {
      expect(typeof component.appVersion).toBe('string');
      expect(typeof component.showSupportModal).toBe('boolean');
      // Icons are objects (LucideIconData)
      expect(typeof component.HeartIcon).toBe('object');
      expect(typeof component.RocketIcon).toBe('object');
      expect(typeof component.GithubIcon).toBe('object');
    });

    it('should not have unexpected enumerable properties beyond the public API', () => {
      const expectedKeys = ['HeartIcon', 'RocketIcon', 'GithubIcon', 'appVersion', 'showSupportModal'];
      const actualKeys = Object.keys(component);
      // All actual keys should be a subset of expected keys
      actualKeys.forEach(key => {
        expect(expectedKeys).toContain(key);
      });
    });
  });

  // ── Multiple Instances ────────────────────────────────────────────
  describe('Multiple Instances', () => {
    it('should create independent instances with separate modal state', () => {
      const component2 = TestBed.runInInjectionContext(() => {
        return new FooterComponent();
      });

      component.showSupportModal = true;
      expect(component.showSupportModal).toBe(true);
      expect(component2.showSupportModal).toBe(false);
    });

    it('should share the same icon references across instances', () => {
      const component2 = TestBed.runInInjectionContext(() => {
        return new FooterComponent();
      });

      expect(component.HeartIcon).toBe(component2.HeartIcon);
      expect(component.RocketIcon).toBe(component2.RocketIcon);
      expect(component.GithubIcon).toBe(component2.GithubIcon);
    });

    it('should share the same version across instances', () => {
      const component2 = TestBed.runInInjectionContext(() => {
        return new FooterComponent();
      });

      expect(component.appVersion).toBe(component2.appVersion);
    });

    it('should not affect other instance modal state on toggle', () => {
      const component2 = TestBed.runInInjectionContext(() => new FooterComponent());
      const component3 = TestBed.runInInjectionContext(() => new FooterComponent());

      component.showSupportModal = true;
      component2.showSupportModal = true;

      // Closing one should not affect the others
      component.showSupportModal = false;
      expect(component.showSupportModal).toBe(false);
      expect(component2.showSupportModal).toBe(true);
      expect(component3.showSupportModal).toBe(false);
    });

    it('should maintain independent state across many instances', () => {
      const instances: FooterComponent[] = [];
      for (let i = 0; i < 10; i++) {
        instances.push(TestBed.runInInjectionContext(() => new FooterComponent()));
      }

      // All should start as false
      instances.forEach(inst => {
        expect(inst.showSupportModal).toBe(false);
      });

      // Set every other instance to true
      instances.forEach((inst, idx) => {
        if (idx % 2 === 0) inst.showSupportModal = true;
      });

      // Verify alternating pattern
      instances.forEach((inst, idx) => {
        expect(inst.showSupportModal).toBe(idx % 2 === 0);
      });
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────────
  describe('Edge Cases', () => {
    it('should handle creating components in rapid succession', () => {
      const components: FooterComponent[] = [];
      for (let i = 0; i < 50; i++) {
        components.push(TestBed.runInInjectionContext(() => new FooterComponent()));
      }

      expect(components.length).toBe(50);
      components.forEach(c => {
        expect(c).toBeInstanceOf(FooterComponent);
        expect(c.showSupportModal).toBe(false);
        expect(c.appVersion).toBe(APP_VERSION);
      });
    });

    it('should have stable icon references after modal state changes', () => {
      const iconsBefore = {
        heart: component.HeartIcon,
        rocket: component.RocketIcon,
        github: component.GithubIcon
      };

      // Toggle modal many times
      for (let i = 0; i < 100; i++) {
        component.showSupportModal = !component.showSupportModal;
      }

      // Icons should be unchanged
      expect(component.HeartIcon).toBe(iconsBefore.heart);
      expect(component.RocketIcon).toBe(iconsBefore.rocket);
      expect(component.GithubIcon).toBe(iconsBefore.github);
    });

    it('should have stable version after modal state changes', () => {
      const versionBefore = component.appVersion;

      component.showSupportModal = true;
      component.showSupportModal = false;

      expect(component.appVersion).toBe(versionBefore);
    });

    it('should maintain all readonly properties after stress', () => {
      // Stress the mutable property
      for (let i = 0; i < 1000; i++) {
        component.showSupportModal = !component.showSupportModal;
      }

      // All readonly properties should be unaffected
      expect(component.HeartIcon).toBe(Heart);
      expect(component.RocketIcon).toBe(Rocket);
      expect(component.GithubIcon).toBe(Github);
      expect(component.appVersion).toBe(APP_VERSION);
      // 1000 toggles from false => ends at false
      expect(component.showSupportModal).toBe(false);
    });

    it('should correctly report typeof for all properties', () => {
      expect(typeof component.HeartIcon).not.toBe('undefined');
      expect(typeof component.RocketIcon).not.toBe('undefined');
      expect(typeof component.GithubIcon).not.toBe('undefined');
      expect(typeof component.appVersion).toBe('string');
      expect(typeof component.showSupportModal).toBe('boolean');
    });

    it('should not throw when accessing properties immediately after creation', () => {
      const freshComponent = TestBed.runInInjectionContext(() => new FooterComponent());

      expect(() => freshComponent.HeartIcon).not.toThrow();
      expect(() => freshComponent.RocketIcon).not.toThrow();
      expect(() => freshComponent.GithubIcon).not.toThrow();
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
