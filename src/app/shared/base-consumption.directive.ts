import { Directive, HostListener, WritableSignal } from '@angular/core';
import { ActionDropdownState } from '../utils/action-dropdown.utils';

/**
 * Common contract for consumption data services handling data import, export, and deletion.
 */
export interface ConsumptionDataServiceContract<TRecord> {
  importData(event: Event): Promise<void> | void;
  importFromExcel(event: Event): Promise<void> | void;
  confirmImport(): Promise<void> | void;
  cancelImport(): void;
  confirmFilterWarningImport(): Promise<void> | void;
  cancelFilterWarningImport(): void;
  exportData(): Promise<void> | void;
  exportToExcel(): Promise<void> | void;
  exportToPdf(): Promise<void> | void;
  confirmDelete(): Promise<void> | void;
  showDeleteModal: WritableSignal<boolean>;
  recordToDelete: WritableSignal<TRecord | null>;
  confirmDeleteAll(): Promise<void> | void;
  showDeleteAllModal: WritableSignal<boolean>;
  recordsToDelete: WritableSignal<TRecord[]>;
}

/**
 * Base directive that encapsulates action dropdown open/close behavior for consumption components.
 */
@Directive()
export abstract class BaseDropdownComponent {
  protected readonly dropdownState = new ActionDropdownState();
  protected readonly isExportMenuOpen = this.dropdownState.isExportOpen;
  protected readonly isImportMenuOpen = this.dropdownState.isImportOpen;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    this.dropdownState.handleDocumentClick(event.target as HTMLElement | null);
  }

  toggleExportMenu(event: MouseEvent): void {
    this.dropdownState.toggleExport(event);
  }

  toggleImportMenu(event: MouseEvent): void {
    this.dropdownState.toggleImport(event);
  }

  closeMenus(): void {
    this.dropdownState.closeAll();
  }
}

/**
 * Base directive that encapsulates shared data service delegation (import, export, delete)
 * and dropdown state across consumption feature components (water, electricity).
 */
@Directive()
export abstract class BaseConsumptionComponent<TRecord> extends BaseDropdownComponent {
  abstract get baseDataService(): ConsumptionDataServiceContract<TRecord>;

  protected importData(event: Event): void {
    this.closeMenus();
    void this.baseDataService.importData(event);
  }

  protected importFromExcel(event: Event): void {
    this.closeMenus();
    void this.baseDataService.importFromExcel(event);
  }

  protected confirmImport(): void {
    void this.baseDataService.confirmImport();
  }

  protected cancelImport(): void {
    this.baseDataService.cancelImport();
  }

  protected confirmFilterWarningImport(): void {
    void this.baseDataService.confirmFilterWarningImport();
  }

  protected cancelFilterWarningImport(): void {
    this.baseDataService.cancelFilterWarningImport();
  }

  protected exportData(): void {
    void this.baseDataService.exportData();
  }

  protected exportToExcel(): void {
    void this.baseDataService.exportToExcel();
  }

  protected exportToPdf(): void {
    void this.baseDataService.exportToPdf();
  }

  protected confirmDelete(): void {
    void this.baseDataService.confirmDelete();
  }

  protected cancelDelete(): void {
    this.baseDataService.showDeleteModal.set(false);
    this.baseDataService.recordToDelete.set(null);
  }

  protected confirmDeleteAll(): void {
    void this.baseDataService.confirmDeleteAll();
  }

  protected cancelDeleteAll(): void {
    this.baseDataService.showDeleteAllModal.set(false);
    this.baseDataService.recordsToDelete.set([]);
  }
}
