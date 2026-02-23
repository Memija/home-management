import { TestBed } from '@angular/core/testing';
import { SettingsComponent } from './settings.component';
import { LanguageService } from '../services/language.service';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

/**
 * Unit tests for SettingsComponent.
 *
 * Uses TestBed.runInInjectionContext to create the component class directly,
 * avoiding the templateUrl/styleUrl resolution issue in Vitest while still
 * satisfying Angular's injection context requirement for inject().
 */

/** Helper to create a mock child component implementing ComponentWithUnsavedChanges */
function createMockChild(overrides: Partial<{
  hasUnsavedChanges: () => boolean;
  triggerNavigationWarning: (cb: () => void) => void;
  stayAndSave: () => void;
}> = {}) {
  return {
    hasUnsavedChanges: vi.fn().mockReturnValue(false),
    triggerNavigationWarning: vi.fn(),
    stayAndSave: vi.fn(),
    ...overrides,
  };
}

describe('SettingsComponent', () => {
  let component: SettingsComponent;

  const mockLanguageService = {
    currentLang: signal('en'),
  };

  beforeEach(() => {
    // Reset signals
    mockLanguageService.currentLang.set('en');

    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        { provide: LanguageService, useValue: mockLanguageService },
      ],
    });

    component = TestBed.runInInjectionContext(() => {
      return new SettingsComponent();
    });
  });

  // ─── Creation ──────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── Language Service ──────────────────────────────────────────────────

  describe('Language Service', () => {
    it('should inject the language service', () => {
      expect(component['languageService']).toBeDefined();
    });

    it('should reflect current language from service', () => {
      expect(component['languageService'].currentLang()).toBe('en');
      mockLanguageService.currentLang.set('de');
      expect(component['languageService'].currentLang()).toBe('de');
    });
  });

  // ─── onBeforeUnload ────────────────────────────────────────────────────

  describe('onBeforeUnload', () => {
    let mockEvent: BeforeUnloadEvent;

    beforeEach(() => {
      mockEvent = new Event('beforeunload') as BeforeUnloadEvent;
      vi.spyOn(mockEvent, 'preventDefault');
    });

    it('should not prevent default when no children have unsaved changes', () => {
      // ViewChild refs are undefined by default (no template rendering)
      const result = component.onBeforeUnload(mockEvent);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should prevent default when familyComponent has unsaved changes', () => {
      (component as any).familyComponent = createMockChild({
        hasUnsavedChanges: () => true,
      });
      const result = component.onBeforeUnload(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(result).toBe('');
    });

    it('should prevent default when addressComponent has unsaved changes', () => {
      (component as any).addressComponent = createMockChild({
        hasUnsavedChanges: () => true,
      });
      const result = component.onBeforeUnload(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(result).toBe('');
    });

    it('should prevent default when excelSettingsComponent has unsaved changes', () => {
      (component as any).excelSettingsComponent = createMockChild({
        hasUnsavedChanges: () => true,
      });
      const result = component.onBeforeUnload(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(result).toBe('');
    });

    it('should prevent default when multiple children have unsaved changes', () => {
      (component as any).familyComponent = createMockChild({
        hasUnsavedChanges: () => true,
      });
      (component as any).addressComponent = createMockChild({
        hasUnsavedChanges: () => true,
      });
      (component as any).excelSettingsComponent = createMockChild({
        hasUnsavedChanges: () => true,
      });
      const result = component.onBeforeUnload(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(result).toBe('');
    });

    it('should not prevent default when all children report no unsaved changes', () => {
      (component as any).familyComponent = createMockChild();
      (component as any).addressComponent = createMockChild();
      (component as any).excelSettingsComponent = createMockChild();
      const result = component.onBeforeUnload(mockEvent);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle null/undefined child components gracefully via optional chaining', () => {
      (component as any).familyComponent = null;
      (component as any).addressComponent = undefined;
      (component as any).excelSettingsComponent = null;
      expect(() => component.onBeforeUnload(mockEvent)).not.toThrow();
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });
  });

  // ─── canDeactivate ─────────────────────────────────────────────────────

  describe('canDeactivate', () => {
    it('should return true when no children have unsaved changes', () => {
      (component as any).familyComponent = createMockChild();
      (component as any).addressComponent = createMockChild();
      (component as any).excelSettingsComponent = createMockChild();
      expect(component.canDeactivate()).toBe(true);
    });

    it('should return true when all ViewChild refs are undefined', () => {
      // No child components set – optional chaining returns undefined
      expect(component.canDeactivate()).toBe(true);
    });

    it('should return a Promise when familyComponent has unsaved changes', () => {
      (component as any).familyComponent = createMockChild({
        hasUnsavedChanges: () => true,
      });
      const result = component.canDeactivate();
      expect(result).toBeInstanceOf(Promise);
    });

    it('should return a Promise when excelSettingsComponent has unsaved changes', () => {
      (component as any).familyComponent = createMockChild();
      (component as any).excelSettingsComponent = createMockChild({
        hasUnsavedChanges: () => true,
      });
      const result = component.canDeactivate();
      expect(result).toBeInstanceOf(Promise);
    });

    it('should return a Promise when addressComponent has unsaved changes', () => {
      (component as any).familyComponent = createMockChild();
      (component as any).excelSettingsComponent = createMockChild();
      (component as any).addressComponent = createMockChild({
        hasUnsavedChanges: () => true,
      });
      const result = component.canDeactivate();
      expect(result).toBeInstanceOf(Promise);
    });

    it('should check familyComponent first (priority order)', () => {
      const familyMock = createMockChild({ hasUnsavedChanges: () => true });
      const excelMock = createMockChild({ hasUnsavedChanges: () => true });
      const addressMock = createMockChild({ hasUnsavedChanges: () => true });

      (component as any).familyComponent = familyMock;
      (component as any).excelSettingsComponent = excelMock;
      (component as any).addressComponent = addressMock;

      component.canDeactivate();

      // Only the first match should trigger
      expect(familyMock.triggerNavigationWarning).toHaveBeenCalled();
      expect(excelMock.triggerNavigationWarning).not.toHaveBeenCalled();
      expect(addressMock.triggerNavigationWarning).not.toHaveBeenCalled();
    });

    it('should check excelSettingsComponent second when family has no changes', () => {
      const familyMock = createMockChild();
      const excelMock = createMockChild({ hasUnsavedChanges: () => true });
      const addressMock = createMockChild({ hasUnsavedChanges: () => true });

      (component as any).familyComponent = familyMock;
      (component as any).excelSettingsComponent = excelMock;
      (component as any).addressComponent = addressMock;

      component.canDeactivate();

      expect(excelMock.triggerNavigationWarning).toHaveBeenCalled();
      expect(addressMock.triggerNavigationWarning).not.toHaveBeenCalled();
    });

    it('should check addressComponent third when family and excel have no changes', () => {
      const familyMock = createMockChild();
      const excelMock = createMockChild();
      const addressMock = createMockChild({ hasUnsavedChanges: () => true });

      (component as any).familyComponent = familyMock;
      (component as any).excelSettingsComponent = excelMock;
      (component as any).addressComponent = addressMock;

      component.canDeactivate();

      expect(addressMock.triggerNavigationWarning).toHaveBeenCalled();
    });
  });

  // ─── handleComponentUnsavedChanges ─────────────────────────────────────

  describe('handleComponentUnsavedChanges (via canDeactivate)', () => {
    it('should resolve to true when user confirms leaving (callback is invoked)', async () => {
      const mockChild = createMockChild({
        hasUnsavedChanges: () => true,
        triggerNavigationWarning: vi.fn((cb: () => void) => {
          // Simulate user clicking "Leave" — invoke the callback
          cb();
        }),
      });

      (component as any).familyComponent = mockChild;

      const result = await component.canDeactivate();
      expect(result).toBe(true);
    });

    it('should resolve to false when user clicks "Stay and Save" (monkey-patched stayAndSave)', async () => {
      const originalStayAndSave = vi.fn();
      const mockChild = createMockChild({
        hasUnsavedChanges: () => true,
        stayAndSave: originalStayAndSave,
        triggerNavigationWarning: vi.fn(),
      });

      (component as any).familyComponent = mockChild;

      const promise = component.canDeactivate() as Promise<boolean>;

      // At this point, handleComponentUnsavedChanges has monkey-patched stayAndSave
      // Calling stayAndSave should resolve the promise with false
      mockChild.stayAndSave();

      const result = await promise;
      expect(result).toBe(false);
    });

    it('should call original stayAndSave when monkey-patched version is invoked', async () => {
      const originalStayAndSave = vi.fn();
      const mockChild = createMockChild({
        hasUnsavedChanges: () => true,
        stayAndSave: originalStayAndSave,
        triggerNavigationWarning: vi.fn(),
      });

      (component as any).familyComponent = mockChild;

      const promise = component.canDeactivate() as Promise<boolean>;

      // The monkey-patched stayAndSave should call the original
      mockChild.stayAndSave();

      await promise;
      expect(originalStayAndSave).toHaveBeenCalledTimes(1);
    });

    it('should restore original stayAndSave after monkey-patched version is called', async () => {
      const originalStayAndSave = vi.fn();
      const mockChild = createMockChild({
        hasUnsavedChanges: () => true,
        stayAndSave: originalStayAndSave,
        triggerNavigationWarning: vi.fn(),
      });

      (component as any).familyComponent = mockChild;

      const promise = component.canDeactivate() as Promise<boolean>;

      // Call the monkey-patched version
      mockChild.stayAndSave();
      await promise;

      // After resolution, stayAndSave should be restored to original (or bound version)
      // Verify behavior instead of strict identity since .bind() creates a new function
      mockChild.stayAndSave();
      expect(originalStayAndSave).toHaveBeenCalledTimes(2);
    });

    it('should call triggerNavigationWarning with a callback function', () => {
      const mockChild = createMockChild({
        hasUnsavedChanges: () => true,
      });

      (component as any).familyComponent = mockChild;

      component.canDeactivate();

      expect(mockChild.triggerNavigationWarning).toHaveBeenCalledTimes(1);
      expect(typeof (mockChild.triggerNavigationWarning as Mock).mock.calls[0][0]).toBe('function');
    });

    it('should work with addressComponent for unsaved changes', async () => {
      (component as any).familyComponent = createMockChild();
      (component as any).excelSettingsComponent = createMockChild();

      const mockAddress = createMockChild({
        hasUnsavedChanges: () => true,
        triggerNavigationWarning: vi.fn((cb: () => void) => {
          cb();
        }),
      });
      (component as any).addressComponent = mockAddress;

      const result = await component.canDeactivate();
      expect(result).toBe(true);
      expect(mockAddress.triggerNavigationWarning).toHaveBeenCalled();
    });

    it('should work with excelSettingsComponent for unsaved changes', async () => {
      (component as any).familyComponent = createMockChild();

      const mockExcel = createMockChild({
        hasUnsavedChanges: () => true,
        triggerNavigationWarning: vi.fn((cb: () => void) => {
          cb();
        }),
      });
      (component as any).excelSettingsComponent = mockExcel;

      const result = await component.canDeactivate();
      expect(result).toBe(true);
      expect(mockExcel.triggerNavigationWarning).toHaveBeenCalled();
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle mixed undefined and defined child components', () => {
      // Only family defined, others undefined
      (component as any).familyComponent = createMockChild();
      const result = component.canDeactivate();
      expect(result).toBe(true);
    });

    it('should handle hasUnsavedChanges returning false for all after being true', async () => {
      const mockChild = createMockChild({
        hasUnsavedChanges: vi.fn()
          .mockReturnValueOnce(true)
          .mockReturnValue(false) as any,
        triggerNavigationWarning: vi.fn((cb: () => void) => cb()),
      });

      (component as any).familyComponent = mockChild;

      // First call: has unsaved changes
      const result1 = await component.canDeactivate();
      expect(result1).toBe(true);

      // Second call: no unsaved changes anymore
      const result2 = component.canDeactivate();
      expect(result2).toBe(true); // synchronous true
    });

    it('should handle onBeforeUnload when only one child exists', () => {
      const event = new Event('beforeunload') as BeforeUnloadEvent;
      vi.spyOn(event, 'preventDefault');

      // Only addressComponent exists and has changes
      (component as any).addressComponent = createMockChild({
        hasUnsavedChanges: () => true,
      });

      const result = component.onBeforeUnload(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(result).toBe('');
    });

    it('should not call hasUnsavedChanges on null child in onBeforeUnload', () => {
      const event = new Event('beforeunload') as BeforeUnloadEvent;
      vi.spyOn(event, 'preventDefault');

      (component as any).familyComponent = null;
      (component as any).addressComponent = null;
      (component as any).excelSettingsComponent = null;

      expect(() => component.onBeforeUnload(event)).not.toThrow();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should handle canDeactivate called multiple times in sequence', () => {
      (component as any).familyComponent = createMockChild();
      (component as any).addressComponent = createMockChild();
      (component as any).excelSettingsComponent = createMockChild();

      expect(component.canDeactivate()).toBe(true);
      expect(component.canDeactivate()).toBe(true);
      expect(component.canDeactivate()).toBe(true);
    });

    it('should handle concurrent canDeactivate calls with unsaved changes', async () => {
      let triggerCallbacks: (() => void)[] = [];

      const mockChild = createMockChild({
        hasUnsavedChanges: () => true,
        triggerNavigationWarning: vi.fn((cb: () => void) => {
          triggerCallbacks.push(cb);
        }),
      });

      (component as any).familyComponent = mockChild;

      const promise1 = component.canDeactivate() as Promise<boolean>;
      const promise2 = component.canDeactivate() as Promise<boolean>;

      // Resolve both
      triggerCallbacks.forEach(cb => cb());

      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it('should handle child component where hasUnsavedChanges throws', () => {
      (component as any).familyComponent = {
        hasUnsavedChanges: () => { throw new Error('unexpected'); },
        triggerNavigationWarning: vi.fn(),
        stayAndSave: vi.fn(),
      };

      expect(() => component.canDeactivate()).toThrow('unexpected');
    });

    it('should handle language service returning different locales', () => {
      mockLanguageService.currentLang.set('bs');
      expect(component['languageService'].currentLang()).toBe('bs');

      mockLanguageService.currentLang.set('fr');
      expect(component['languageService'].currentLang()).toBe('fr');
    });

    it('should handle stayAndSave being called before triggerNavigationWarning callback', async () => {
      const originalStayAndSave = vi.fn();
      const mockChild = createMockChild({
        hasUnsavedChanges: () => true,
        stayAndSave: originalStayAndSave,
        triggerNavigationWarning: vi.fn(),
      });

      (component as any).familyComponent = mockChild;

      const promise = component.canDeactivate() as Promise<boolean>;

      // User clicks "Stay" first
      mockChild.stayAndSave();

      const result = await promise;
      expect(result).toBe(false);
      expect(originalStayAndSave).toHaveBeenCalled();
    });

    it('should handle onBeforeUnload with hasUnsavedChanges as computed signal', () => {
      const event = new Event('beforeunload') as BeforeUnloadEvent;
      vi.spyOn(event, 'preventDefault');

      // Simulate a component with a computed-like hasUnsavedChanges
      const unsaved = signal(false);
      (component as any).familyComponent = {
        hasUnsavedChanges: () => unsaved(),
        triggerNavigationWarning: vi.fn(),
        stayAndSave: vi.fn(),
      };

      // Start with no unsaved changes
      let result = component.onBeforeUnload(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(result).toBeUndefined();

      // Signal changes to true
      unsaved.set(true);
      result = component.onBeforeUnload(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(result).toBe('');
    });
  });
});
