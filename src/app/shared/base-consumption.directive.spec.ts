import { describe, it, expect, vi } from 'vitest';
import { signal, Component } from '@angular/core';
import {
  BaseDropdownComponent,
  BaseConsumptionComponent,
  ConsumptionDataServiceContract,
} from './base-consumption.directive';

interface TestRecord {
  id: string;
}

@Component({
  template: '',
  standalone: true,
})
class TestDropdownComponent extends BaseDropdownComponent {}

@Component({
  template: '',
  standalone: true,
})
class TestConsumptionComponent extends BaseConsumptionComponent<TestRecord> {
  mockService: ConsumptionDataServiceContract<TestRecord> = {
    importData: vi.fn(),
    importFromExcel: vi.fn(),
    confirmImport: vi.fn(),
    cancelImport: vi.fn(),
    confirmFilterWarningImport: vi.fn(),
    cancelFilterWarningImport: vi.fn(),
    exportData: vi.fn(),
    exportToExcel: vi.fn(),
    exportToPdf: vi.fn(),
    confirmDelete: vi.fn(),
    showDeleteModal: signal(false),
    recordToDelete: signal<TestRecord | null>(null),
    confirmDeleteAll: vi.fn(),
    showDeleteAllModal: signal(false),
    recordsToDelete: signal<TestRecord[]>([]),
  };

  get baseDataService(): ConsumptionDataServiceContract<TestRecord> {
    return this.mockService;
  }
}

describe('BaseDropdownComponent', () => {
  it('should toggle and close menus', () => {
    const comp = new TestDropdownComponent();
    expect(comp['isExportMenuOpen']()).toBe(false);
    expect(comp['isImportMenuOpen']()).toBe(false);

    const mockEvent = { stopPropagation: vi.fn() } as unknown as MouseEvent;
    comp.toggleExportMenu(mockEvent);
    expect(comp['isExportMenuOpen']()).toBe(true);

    comp.toggleImportMenu(mockEvent);
    expect(comp['isExportMenuOpen']()).toBe(false);
    expect(comp['isImportMenuOpen']()).toBe(true);

    comp.closeMenus();
    expect(comp['isImportMenuOpen']()).toBe(false);
  });

  it('should delegate document click', () => {
    const comp = new TestDropdownComponent();
    comp['isExportMenuOpen'].set(true);

    const mockElement = { closest: vi.fn().mockReturnValue(null) } as unknown as HTMLElement;
    comp.onDocumentClick({ target: mockElement } as unknown as MouseEvent);

    expect(comp['isExportMenuOpen']()).toBe(false);
  });
});

describe('BaseConsumptionComponent', () => {
  it('should delegate data operations to baseDataService', () => {
    const comp = new TestConsumptionComponent();
    const event = new Event('change');

    comp['importData'](event);
    expect(comp.mockService.importData).toHaveBeenCalledWith(event);

    comp['importFromExcel'](event);
    expect(comp.mockService.importFromExcel).toHaveBeenCalledWith(event);

    comp['confirmImport']();
    expect(comp.mockService.confirmImport).toHaveBeenCalled();

    comp['cancelImport']();
    expect(comp.mockService.cancelImport).toHaveBeenCalled();

    comp['confirmFilterWarningImport']();
    expect(comp.mockService.confirmFilterWarningImport).toHaveBeenCalled();

    comp['cancelFilterWarningImport']();
    expect(comp.mockService.cancelFilterWarningImport).toHaveBeenCalled();

    comp['exportData']();
    expect(comp.mockService.exportData).toHaveBeenCalled();

    comp['exportToExcel']();
    expect(comp.mockService.exportToExcel).toHaveBeenCalled();

    comp['exportToPdf']();
    expect(comp.mockService.exportToPdf).toHaveBeenCalled();

    comp['confirmDelete']();
    expect(comp.mockService.confirmDelete).toHaveBeenCalled();

    comp.mockService.showDeleteModal.set(true);
    comp.mockService.recordToDelete.set({ id: '1' });
    comp['cancelDelete']();
    expect(comp.mockService.showDeleteModal()).toBe(false);
    expect(comp.mockService.recordToDelete()).toBeNull();

    comp['confirmDeleteAll']();
    expect(comp.mockService.confirmDeleteAll).toHaveBeenCalled();

    comp.mockService.showDeleteAllModal.set(true);
    comp.mockService.recordsToDelete.set([{ id: '1' }]);
    comp['cancelDeleteAll']();
    expect(comp.mockService.showDeleteAllModal()).toBe(false);
    expect(comp.mockService.recordsToDelete()).toEqual([]);
  });
});
