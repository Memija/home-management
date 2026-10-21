import { signal, WritableSignal } from '@angular/core';

/**
 * Reusable helper class to manage open/close state of export and import action dropdown menus.
 */
export class ActionDropdownState {
  readonly isExportOpen: WritableSignal<boolean> = signal(false);
  readonly isImportOpen: WritableSignal<boolean> = signal(false);

  /**
   * Closes dropdown menus if a click occurs outside of any .action-dropdown element.
   */
  handleDocumentClick(target: HTMLElement | null): void {
    if (!target?.closest('.action-dropdown')) {
      this.closeAll();
    }
  }

  /**
   * Toggles the export menu while ensuring the import menu is closed.
   */
  toggleExport(event?: MouseEvent): void {
    event?.stopPropagation();
    const next = !this.isExportOpen();
    this.isExportOpen.set(next);
    this.isImportOpen.set(false);
  }

  /**
   * Toggles the import menu while ensuring the export menu is closed.
   */
  toggleImport(event?: MouseEvent): void {
    event?.stopPropagation();
    const next = !this.isImportOpen();
    this.isImportOpen.set(next);
    this.isExportOpen.set(false);
  }

  /**
   * Closes all dropdown menus.
   */
  closeAll(): void {
    this.isExportOpen.set(false);
    this.isImportOpen.set(false);
  }
}
