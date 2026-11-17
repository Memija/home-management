import { Directive, effect, inject, WritableSignal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {
  Download,
  Upload,
  FileOutput,
  FileInput,
  FileText,
  CircleCheck,
  Trash2,
  TriangleAlert,
  RefreshCw,
} from 'lucide-angular';
import { ActionDropdownState } from '../utils/action-dropdown.utils';

/**
 * Common contract for consumption data services handling data import, export, and deletion.
 */
export interface ConsumptionDataServiceContract<TRecord> {
  importData(event: Event): Promise<void> | void;
  importFromExcel(event: Event): Promise<void> | void;
  confirmImport(): Promise<void> | void;
  cancelImport(): void;
  confirmFilterWarningImport?(): Promise<void> | void;
  cancelFilterWarningImport?(): void;
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

  constructor() {
    try {
      const doc = inject(DOCUMENT, { optional: true });
      if (doc) {
        effect((onCleanup) => {
          if (!this.dropdownState.isExportOpen() && !this.dropdownState.isImportOpen()) {
            return;
          }
          const handler = (event: MouseEvent) => this.onDocumentClick(event);
          doc.addEventListener('click', handler);
          onCleanup(() => doc.removeEventListener('click', handler));
        });
      }
    } catch {
      // Allow direct instantiation outside an Angular injection context in unit tests
    }
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.dropdownState.isExportOpen() && !this.dropdownState.isImportOpen()) {
      return;
    }
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
 * and dropdown state across consumption feature components (water, heating, electricity).
 */
@Directive()
export abstract class BaseConsumptionComponent<TRecord> extends BaseDropdownComponent {
  protected readonly DownloadIcon = Download;
  protected readonly UploadIcon = Upload;
  protected readonly FileOutputIcon = FileOutput;
  protected readonly FileInputIcon = FileInput;
  protected readonly FileTextIcon = FileText;
  protected readonly CheckCircleIcon = CircleCheck;
  protected readonly TrashIcon = Trash2;
  protected readonly AlertTriangleIcon = TriangleAlert;
  protected readonly RefreshCwIcon = RefreshCw;

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
    void this.baseDataService.confirmFilterWarningImport?.();
  }

  protected cancelFilterWarningImport(): void {
    this.baseDataService.cancelFilterWarningImport?.();
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
