import { TestBed } from '@angular/core/testing';
import { SettingsComponent } from './settings.component';
import { LanguageService } from '../services/language.service';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { FamilyComponent } from './family/family.component';
import { AddressComponent } from './address/address.component';
import { ExcelSettingsComponent } from './excel-settings/excel-settings.component';

/**
 * Unit tests for SettingsComponent.
 *
 * Uses TestBed.runInInjectionContext to create the component class directly,
 * avoiding the templateUrl/styleUrl resolution issue in Vitest while still
 * satisfying Angular's injection context requirement for inject().
 */

interface MockChildComponent {
  hasUnsavedChanges: Mock<() => boolean>;
  triggerNavigationWarning: Mock<(callback: () => void) => void>;
  stayAndSave: Mock<() => void>;
}

/** Helper to create a mock child component implementing ComponentWithUnsavedChanges */
function createMockChild(overrides: Partial<MockChildComponent> = {}): MockChildComponent {
  return {
    hasUnsavedChanges: vi.fn<() => boolean>().mockReturnValue(false),
    triggerNavigationWarning: vi.fn<(callback: () => void) => void>(),
    stayAndSave: vi.fn<() => void>(),
    ...overrides,
  };
}

describe('SettingsComponent', () => {
  let component: SettingsComponent;

  const mockLanguageService = {
    currentLang: signal('en'),
  };

  beforeEach(() => {
    mockLanguageService.currentLang.set('en');

    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [{ provide: LanguageService, useValue: mockLanguageService }],
    });

    component = TestBed.runInInjectionContext(() => new SettingsComponent());
  });

  // ─── Creation & Initialization ─────────────────────────────────────────

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should inject LanguageService', () => {
      expect(component['languageService']).toBeTruthy();
    });

    it('should initialize showDemoWizard as false', () => {
      expect(component['showDemoWizard']()).toBe(false);
    });

    it('should initialize showDemoTour as false', () => {
      expect(component['showDemoTour']()).toBe(false);
    });
  });

  // ─── onBeforeUnload ────────────────────────────────────────────────────

  describe('onBeforeUnload', () => {
    let mockEvent: BeforeUnloadEvent;

    beforeEach(() => {
      mockEvent = {
        preventDefault: vi.fn(),
        returnValue: '',
      } as unknown as BeforeUnloadEvent;
    });

    it('should allow navigation when child components are undefined', () => {
      const result = component.onBeforeUnload(mockEvent);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should prevent default when familyComponent has unsaved changes', () => {
      component.familyComponent = createMockChild({
        hasUnsavedChanges: vi.fn().mockReturnValue(true),
      }) as unknown as FamilyComponent;
      const result = component.onBeforeUnload(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(result).toBe('');
    });

    it('should prevent default when addressComponent has unsaved changes', () => {
      component.addressComponent = createMockChild({
        hasUnsavedChanges: vi.fn().mockReturnValue(true),
      }) as unknown as AddressComponent;
      const result = component.onBeforeUnload(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(result).toBe('');
    });

    it('should prevent default when excelSettingsComponent has unsaved changes', () => {
      component.excelSettingsComponent = createMockChild({
        hasUnsavedChanges: vi.fn().mockReturnValue(true),
      }) as unknown as ExcelSettingsComponent;
      const result = component.onBeforeUnload(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(result).toBe('');
    });

    it('should prevent default when multiple children have unsaved changes', () => {
      component.familyComponent = createMockChild({
        hasUnsavedChanges: vi.fn().mockReturnValue(true),
      }) as unknown as FamilyComponent;
      component.addressComponent = createMockChild({
        hasUnsavedChanges: vi.fn().mockReturnValue(true),
      }) as unknown as AddressComponent;
      component.excelSettingsComponent = createMockChild({
        hasUnsavedChanges: vi.fn().mockReturnValue(true),
      }) as unknown as ExcelSettingsComponent;
      const result = component.onBeforeUnload(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(result).toBe('');
    });

    it('should not prevent default when all children report no unsaved changes', () => {
      component.familyComponent = createMockChild() as unknown as FamilyComponent;
      component.addressComponent = createMockChild() as unknown as AddressComponent;
      component.excelSettingsComponent = createMockChild() as unknown as ExcelSettingsComponent;
      const result = component.onBeforeUnload(mockEvent);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle some children being null/undefined and others clean', () => {
      component.familyComponent = null as unknown as FamilyComponent;
      component.addressComponent = undefined as unknown as AddressComponent;
      component.excelSettingsComponent = null as unknown as ExcelSettingsComponent;
      const result = component.onBeforeUnload(mockEvent);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  // ─── canDeactivate ─────────────────────────────────────────────────────

  describe('canDeactivate', () => {
    it('should return true when no child components are set', () => {
      const result = component.canDeactivate();
      expect(result).toBe(true);
    });

    it('should return true when all children have no unsaved changes', () => {
      component.familyComponent = createMockChild() as unknown as FamilyComponent;
      component.addressComponent = createMockChild() as unknown as AddressComponent;
      component.excelSettingsComponent = createMockChild() as unknown as ExcelSettingsComponent;
      const result = component.canDeactivate();
      expect(result).toBe(true);
    });

    it('should return a Promise when familyComponent has unsaved changes', () => {
      component.familyComponent = createMockChild({
        hasUnsavedChanges: vi.fn().mockReturnValue(true),
      }) as unknown as FamilyComponent;
      const result = component.canDeactivate();
      expect(result).toBeInstanceOf(Promise);
    });

    it('should return a Promise when excelSettingsComponent has unsaved changes', () => {
      component.familyComponent = createMockChild() as unknown as FamilyComponent;
      component.excelSettingsComponent = createMockChild({
        hasUnsavedChanges: vi.fn().mockReturnValue(true),
      }) as unknown as ExcelSettingsComponent;
      const result = component.canDeactivate();
      expect(result).toBeInstanceOf(Promise);
    });

    it('should return a Promise when addressComponent has unsaved changes', () => {
      component.familyComponent = createMockChild() as unknown as FamilyComponent;
      component.excelSettingsComponent = createMockChild() as unknown as ExcelSettingsComponent;
      component.addressComponent = createMockChild({
        hasUnsavedChanges: vi.fn().mockReturnValue(true),
      }) as unknown as AddressComponent;
      const result = component.canDeactivate();
      expect(result).toBeInstanceOf(Promise);
    });

    it('should check familyComponent first (priority order)', () => {
      const familyMock = createMockChild({ hasUnsavedChanges: vi.fn().mockReturnValue(true) });
      const excelMock = createMockChild({ hasUnsavedChanges: vi.fn().mockReturnValue(true) });
      const addressMock = createMockChild({ hasUnsavedChanges: vi.fn().mockReturnValue(true) });

      component.familyComponent = familyMock as unknown as FamilyComponent;
      component.excelSettingsComponent = excelMock as unknown as ExcelSettingsComponent;
      component.addressComponent = addressMock as unknown as AddressComponent;

      component.canDeactivate();

      expect(familyMock.triggerNavigationWarning).toHaveBeenCalled();
      expect(excelMock.triggerNavigationWarning).not.toHaveBeenCalled();
      expect(addressMock.triggerNavigationWarning).not.toHaveBeenCalled();
    });

    it('should check excelSettingsComponent second when family has no changes', () => {
      const familyMock = createMockChild();
      const excelMock = createMockChild({ hasUnsavedChanges: vi.fn().mockReturnValue(true) });
      const addressMock = createMockChild({ hasUnsavedChanges: vi.fn().mockReturnValue(true) });

      component.familyComponent = familyMock as unknown as FamilyComponent;
      component.excelSettingsComponent = excelMock as unknown as ExcelSettingsComponent;
      component.addressComponent = addressMock as unknown as AddressComponent;

      component.canDeactivate();

      expect(excelMock.triggerNavigationWarning).toHaveBeenCalled();
      expect(addressMock.triggerNavigationWarning).not.toHaveBeenCalled();
    });

    it('should check addressComponent third when family and excel have no changes', () => {
      const familyMock = createMockChild();
      const excelMock = createMockChild();
      const addressMock = createMockChild({ hasUnsavedChanges: vi.fn().mockReturnValue(true) });

      component.familyComponent = familyMock as unknown as FamilyComponent;
      component.excelSettingsComponent = excelMock as unknown as ExcelSettingsComponent;
      component.addressComponent = addressMock as unknown as AddressComponent;

      component.canDeactivate();

      expect(addressMock.triggerNavigationWarning).toHaveBeenCalled();
    });
  });

  // ─── handleComponentUnsavedChanges ─────────────────────────────────────

  describe('handleComponentUnsavedChanges (via canDeactivate)', () => {
    it('should resolve to true when user confirms leaving (callback is invoked)', async () => {
      const mockChild = createMockChild({
        hasUnsavedChanges: vi.fn().mockReturnValue(true),
        triggerNavigationWarning: vi.fn((cb: () => void) => {
          cb();
        }),
      });

      component.familyComponent = mockChild as unknown as FamilyComponent;

      const result = await component.canDeactivate();
      expect(result).toBe(true);
    });

    it('should resolve to false when user clicks "Stay and Save" (monkey-patched stayAndSave)', async () => {
      const originalStayAndSave = vi.fn();
      const mockChild = createMockChild({
        hasUnsavedChanges: vi.fn().mockReturnValue(true),
        stayAndSave: originalStayAndSave,
        triggerNavigationWarning: vi.fn(),
      });

      component.familyComponent = mockChild as unknown as FamilyComponent;

      const promise = component.canDeactivate() as Promise<boolean>;

      mockChild.stayAndSave();

      const result = await promise;
      expect(result).toBe(false);
    });

    it('should call original stayAndSave when monkey-patched version is invoked', async () => {
      const originalStayAndSave = vi.fn();
      const mockChild = createMockChild({
        hasUnsavedChanges: vi.fn().mockReturnValue(true),
        stayAndSave: originalStayAndSave,
        triggerNavigationWarning: vi.fn(),
      });

      component.familyComponent = mockChild as unknown as FamilyComponent;

      const promise = component.canDeactivate() as Promise<boolean>;

      mockChild.stayAndSave();

      await promise;
      expect(originalStayAndSave).toHaveBeenCalledTimes(1);
    });

    it('should restore original stayAndSave after monkey-patched version is called', async () => {
      const originalStayAndSave = vi.fn();
      const mockChild = createMockChild({
        hasUnsavedChanges: vi.fn().mockReturnValue(true),
        stayAndSave: originalStayAndSave,
        triggerNavigationWarning: vi.fn(),
      });

      component.familyComponent = mockChild as unknown as FamilyComponent;

      const promise = component.canDeactivate() as Promise<boolean>;

      mockChild.stayAndSave();
      await promise;

      mockChild.stayAndSave();
      expect(originalStayAndSave).toHaveBeenCalledTimes(2);
    });

    it('should call triggerNavigationWarning with a callback function', () => {
      const mockChild = createMockChild({
        hasUnsavedChanges: vi.fn().mockReturnValue(true),
      });

      component.familyComponent = mockChild as unknown as FamilyComponent;

      component.canDeactivate();

      expect(mockChild.triggerNavigationWarning).toHaveBeenCalledTimes(1);
      expect(typeof (mockChild.triggerNavigationWarning as Mock).mock.calls[0][0]).toBe('function');
    });

    it('should work with addressComponent for unsaved changes', async () => {
      component.familyComponent = createMockChild() as unknown as FamilyComponent;
      component.excelSettingsComponent = createMockChild() as unknown as ExcelSettingsComponent;

      const mockAddress = createMockChild({
        hasUnsavedChanges: vi.fn().mockReturnValue(true),
        triggerNavigationWarning: vi.fn((cb: () => void) => {
          cb();
        }),
      });
      component.addressComponent = mockAddress as unknown as AddressComponent;

      const result = await component.canDeactivate();
      expect(result).toBe(true);
      expect(mockAddress.triggerNavigationWarning).toHaveBeenCalled();
    });

    it('should work with excelSettingsComponent for unsaved changes', async () => {
      component.familyComponent = createMockChild() as unknown as FamilyComponent;

      const mockExcel = createMockChild({
        hasUnsavedChanges: vi.fn().mockReturnValue(true),
        triggerNavigationWarning: vi.fn((cb: () => void) => {
          cb();
        }),
      });
      component.excelSettingsComponent = mockExcel as unknown as ExcelSettingsComponent;

      const result = await component.canDeactivate();
      expect(result).toBe(true);
      expect(mockExcel.triggerNavigationWarning).toHaveBeenCalled();
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle mixed undefined and defined child components', () => {
      component.familyComponent = createMockChild() as unknown as FamilyComponent;
      const result = component.canDeactivate();
      expect(result).toBe(true);
    });

    it('should handle hasUnsavedChanges returning false for all after being true', async () => {
      const mockChild = createMockChild({
        hasUnsavedChanges: vi.fn<() => boolean>().mockReturnValueOnce(true).mockReturnValue(false),
        triggerNavigationWarning: vi.fn((cb: () => void) => cb()),
      });

      component.familyComponent = mockChild as unknown as FamilyComponent;

      const result1 = await component.canDeactivate();
      expect(result1).toBe(true);

      const result2 = component.canDeactivate();
      expect(result2).toBe(true);
    });

    it('should handle onBeforeUnload when only one child exists', () => {
      const event = new Event('beforeunload') as BeforeUnloadEvent;
      vi.spyOn(event, 'preventDefault');

      component.addressComponent = createMockChild({
        hasUnsavedChanges: vi.fn().mockReturnValue(true),
      }) as unknown as AddressComponent;

      const result = component.onBeforeUnload(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(result).toBe('');
    });

    it('should not call hasUnsavedChanges on null child in onBeforeUnload', () => {
      const event = new Event('beforeunload') as BeforeUnloadEvent;
      vi.spyOn(event, 'preventDefault');

      component.familyComponent = null as unknown as FamilyComponent;
      component.addressComponent = null as unknown as AddressComponent;
      component.excelSettingsComponent = null as unknown as ExcelSettingsComponent;

      expect(() => component.onBeforeUnload(event)).not.toThrow();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should handle canDeactivate called multiple times in sequence', () => {
      component.familyComponent = createMockChild() as unknown as FamilyComponent;
      component.addressComponent = createMockChild() as unknown as AddressComponent;
      component.excelSettingsComponent = createMockChild() as unknown as ExcelSettingsComponent;

      expect(component.canDeactivate()).toBe(true);
      expect(component.canDeactivate()).toBe(true);
      expect(component.canDeactivate()).toBe(true);
    });

    it('should handle concurrent canDeactivate calls with unsaved changes', async () => {
      const triggerCallbacks: (() => void)[] = [];

      const mockChild = createMockChild({
        hasUnsavedChanges: vi.fn().mockReturnValue(true),
        triggerNavigationWarning: vi.fn((cb: () => void) => {
          triggerCallbacks.push(cb);
        }),
      });

      component.familyComponent = mockChild as unknown as FamilyComponent;

      const promise1 = component.canDeactivate() as Promise<boolean>;
      const promise2 = component.canDeactivate() as Promise<boolean>;

      triggerCallbacks.forEach((cb) => cb());

      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it('should handle child component where hasUnsavedChanges throws', () => {
      component.familyComponent = {
        hasUnsavedChanges: () => {
          throw new Error('unexpected');
        },
        triggerNavigationWarning: vi.fn(),
        stayAndSave: vi.fn(),
      } as unknown as FamilyComponent;

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
        hasUnsavedChanges: vi.fn().mockReturnValue(true),
        stayAndSave: originalStayAndSave,
        triggerNavigationWarning: vi.fn(),
      });

      component.familyComponent = mockChild as unknown as FamilyComponent;

      const promise = component.canDeactivate() as Promise<boolean>;

      mockChild.stayAndSave();

      const result = await promise;
      expect(result).toBe(false);
      expect(originalStayAndSave).toHaveBeenCalled();
    });

    it('should handle onBeforeUnload with hasUnsavedChanges as computed signal', () => {
      const event = new Event('beforeunload') as BeforeUnloadEvent;
      vi.spyOn(event, 'preventDefault');

      const unsaved = signal(false);
      component.familyComponent = {
        hasUnsavedChanges: () => unsaved(),
        triggerNavigationWarning: vi.fn(),
        stayAndSave: vi.fn(),
      } as unknown as FamilyComponent;

      let result = component.onBeforeUnload(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(result).toBeUndefined();

      unsaved.set(true);
      result = component.onBeforeUnload(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(result).toBe('');
    });
  });
});
