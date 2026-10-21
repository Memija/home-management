import { describe, it, expect, vi } from 'vitest';
import { ActionDropdownState } from './action-dropdown.utils';

describe('ActionDropdownState', () => {
  it('should initialize with both export and import menus closed', () => {
    const state = new ActionDropdownState();
    expect(state.isExportOpen()).toBe(false);
    expect(state.isImportOpen()).toBe(false);
  });

  describe('toggleExport', () => {
    it('should open export menu and close import menu', () => {
      const state = new ActionDropdownState();
      state.isImportOpen.set(true);

      const stopPropagation = vi.fn();
      state.toggleExport({ stopPropagation } as unknown as MouseEvent);

      expect(stopPropagation).toHaveBeenCalled();
      expect(state.isExportOpen()).toBe(true);
      expect(state.isImportOpen()).toBe(false);
    });

    it('should toggle export menu closed when already open', () => {
      const state = new ActionDropdownState();
      state.isExportOpen.set(true);

      state.toggleExport();

      expect(state.isExportOpen()).toBe(false);
    });
  });

  describe('toggleImport', () => {
    it('should open import menu and close export menu', () => {
      const state = new ActionDropdownState();
      state.isExportOpen.set(true);

      const stopPropagation = vi.fn();
      state.toggleImport({ stopPropagation } as unknown as MouseEvent);

      expect(stopPropagation).toHaveBeenCalled();
      expect(state.isImportOpen()).toBe(true);
      expect(state.isExportOpen()).toBe(false);
    });

    it('should toggle import menu closed when already open', () => {
      const state = new ActionDropdownState();
      state.isImportOpen.set(true);

      state.toggleImport();

      expect(state.isImportOpen()).toBe(false);
    });
  });

  describe('closeAll', () => {
    it('should close both export and import menus', () => {
      const state = new ActionDropdownState();
      state.isExportOpen.set(true);
      state.isImportOpen.set(true);

      state.closeAll();

      expect(state.isExportOpen()).toBe(false);
      expect(state.isImportOpen()).toBe(false);
    });
  });

  describe('handleDocumentClick', () => {
    it('should close menus when target does not match .action-dropdown', () => {
      const state = new ActionDropdownState();
      state.isExportOpen.set(true);

      const mockElement = { closest: vi.fn().mockReturnValue(null) } as unknown as HTMLElement;
      state.handleDocumentClick(mockElement);

      expect(state.isExportOpen()).toBe(false);
      expect(state.isImportOpen()).toBe(false);
    });

    it('should keep menus open when click is within .action-dropdown', () => {
      const state = new ActionDropdownState();
      state.isExportOpen.set(true);

      const mockElement = {
        closest: vi.fn().mockReturnValue({}),
      } as unknown as HTMLElement;
      state.handleDocumentClick(mockElement);

      expect(state.isExportOpen()).toBe(true);
    });

    it('should handle null target gracefully', () => {
      const state = new ActionDropdownState();
      state.isExportOpen.set(true);

      state.handleDocumentClick(null);

      expect(state.isExportOpen()).toBe(false);
    });
  });
});
