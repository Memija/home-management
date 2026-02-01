import { Injectable, signal, inject, computed } from '@angular/core';
import { ElectricityRecord, mergeRecords, filterZeroPlaceholders, isElectricityRecordAllZero } from '../models/records.model';
import { STORAGE_SERVICE } from './storage.service';
import { FileStorageService } from './file-storage.service';
import { ExcelService } from './excel.service';
import { PdfService } from './pdf.service';
import { ImportValidationService } from './import-validation.service';
import { LanguageService } from './language.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class ElectricityDataService {
  private storage = inject(STORAGE_SERVICE);
  private fileStorage = inject(FileStorageService);
  private excelService = inject(ExcelService);
  private pdfService = inject(PdfService);
  private importValidationService = inject(ImportValidationService);
  private languageService = inject(LanguageService);
  private notificationService = inject(NotificationService);

  // State
  readonly records = signal<ElectricityRecord[]>([]);

  // Filter State
  readonly filterState = signal<{
    year: number | null;
    month: number | null;
    startDate: string | null;
    endDate: string | null;
  }>({
    year: null,
    month: null,
    startDate: null,
    endDate: null
  });

  readonly filteredRecords = computed(() => {
    const { year, month, startDate, endDate } = this.filterState();
    let records = this.records();

    if (startDate) {
      records = records.filter(r => {
        const date = new Date(r.date);
        const recordDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return recordDate >= startDate;
      });
    }

    if (endDate) {
      records = records.filter(r => {
        const date = new Date(r.date);
        const recordDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return recordDate <= endDate;
      });
    }

    if (year) {
      records = records.filter(r => new Date(r.date).getFullYear() === year);
    }

    if (month !== null) {
      records = records.filter(r => new Date(r.date).getMonth() === month);
    }

    return records;
  });

  readonly isFilterActive = computed(() => {
    const { year, month, startDate, endDate } = this.filterState();
    return year !== null || month !== null || startDate !== null || endDate !== null;
  });

  // Import/Export Signals
  readonly isExporting = signal(false);
  readonly isImporting = signal(false);
  readonly showImportConfirmModal = signal(false);
  readonly pendingImportFile = signal<File | null>(null);
  readonly showFilterWarningModal = signal(false);

  // Unified Import State
  readonly pendingImportRecords = signal<ElectricityRecord[]>([]);
  readonly pendingImportWarnings = signal<string[]>([]);
  readonly pendingImportSuccessKey = signal<string>('');

  // UI Signals
  readonly showSuccessModal = signal(false);
  readonly successTitle = signal('ELECTRICITY.SUCCESS_TITLE');
  readonly successMessage = signal('ELECTRICITY.RECORD_SAVED');
  readonly showErrorModal = signal(false);
  readonly errorTitle = signal('ELECTRICITY.ERROR_TITLE');
  readonly errorMessage = signal('');
  readonly errorDetails = signal('');
  readonly errorInstructions = signal<string[]>([]);
  readonly errorType = signal<'error' | 'warning'>('error');

  readonly showDeleteModal = signal(false);
  readonly showDeleteAllModal = signal(false);
  readonly recordToDelete = signal<ElectricityRecord | null>(null);
  readonly recordsToDelete = signal<ElectricityRecord[]>([]);

  readonly maxDate = new Date().toISOString().split('T')[0];

  constructor() {
    this.loadData();
  }

  async loadData() {
    const data = await this.storage.load<ElectricityRecord[]>('electricity_consumption_records');
    this.records.set(data || []);
    this.notificationService.setElectricityRecords(this.records());
  }

  // --- Filter Helpers ---
  updateFilterState(newState: { year: number | null; month: number | null; startDate: string | null; endDate: string | null }) {
    this.filterState.set(newState);
  }

  private countRecordsOutsideFilter(records: ElectricityRecord[]): number {
    const { year, month, startDate, endDate } = this.filterState();
    let count = 0;

    for (const r of records) {
      let isOutside = false;
      const rDate = new Date(r.date);

      if (year && rDate.getFullYear() !== year) isOutside = true;
      if (month !== null && rDate.getMonth() !== month) isOutside = true;

      if (startDate) {
        const recordDateStr = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}-${String(rDate.getDate()).padStart(2, '0')}`;
        if (recordDateStr < startDate) isOutside = true;
      }

      if (endDate) {
        const recordDateStr = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}-${String(rDate.getDate()).padStart(2, '0')}`;
        if (recordDateStr > endDate) isOutside = true;
      }

      if (isOutside) count++;
    }

    return count;
  }

  // --- CRUD Operations ---
  async saveRecord(newRecord: ElectricityRecord) {
    const existingRecordIndex = this.records().findIndex(r =>
      new Date(r.date).toISOString().split('T')[0] === new Date(newRecord.date).toISOString().split('T')[0]
    );

    this.records.update(records => {
      const updated = [...records];
      if (existingRecordIndex !== -1) {
        updated[existingRecordIndex] = newRecord;
      } else {
        updated.push(newRecord);
      }
      return updated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    await this.storage.save('electricity_consumption_records', this.records());

    // Update notification service with new records
    this.notificationService.setElectricityRecords(this.records());
    this.notificationService.resetElectricityOverdue();

    this.successTitle.set('ELECTRICITY.SUCCESS_TITLE');
    this.successMessage.set('ELECTRICITY.RECORD_SAVED');
    this.showSuccessModal.set(true);
  }

  confirmDelete() {
    const record = this.recordToDelete();
    if (record) {
      this.records.update(records => records.filter(r => new Date(r.date).getTime() !== new Date(record.date).getTime()));
      void this.storage.save('electricity_consumption_records', this.records());
    }
    this.showDeleteModal.set(false);
    this.recordToDelete.set(null);
  }

  confirmDeleteAll() {
    const recordsToDeleteSet = new Set(this.recordsToDelete().map(r => new Date(r.date).getTime()));
    this.records.update(records =>
      records.filter(r => !recordsToDeleteSet.has(new Date(r.date).getTime()))
    );
    void this.storage.save('electricity_consumption_records', this.records());
    this.showDeleteAllModal.set(false);
    this.recordsToDelete.set([]);
  }

  // --- Export ---
  async exportData() {
    try {
      this.isExporting.set(true);
      const filename = 'electricity-consumption.json';
      await this.fileStorage.exportToFile(this.filteredRecords(), filename);
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      this.isExporting.set(false);
    }
  }

  async exportToExcel() {
    try {
      this.isExporting.set(true);
      const filename = 'electricity-consumption.xlsx';
      await this.excelService.exportElectricityToExcel(this.filteredRecords(), filename);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    } finally {
      this.isExporting.set(false);
    }
  }

  async exportToPdf() {
    try {
      this.isExporting.set(true);
      const filename = 'electricity-consumption.pdf';
      // Similar to Excel, PdfService needs update
      await this.pdfService.exportElectricityToPdf(this.filteredRecords(), filename);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    } finally {
      this.isExporting.set(false);
    }
  }

  // --- Import Logic ---

  // JSON
  async importData(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.pendingImportFile.set(file);
      this.showImportConfirmModal.set(true);
    }
    input.value = '';
  }

  async confirmImport() {
    const file = this.pendingImportFile();
    if (file) {
      this.isImporting.set(true);
      try {
        const data = await this.fileStorage.importFromFile(file);

        const arrayError = this.importValidationService.validateDataArray(data);
        if (arrayError) throw new Error(arrayError);

        // Need validateElectricityJsonImport in ImportValidationService
        const result = this.importValidationService.validateElectricityJsonImport(data as unknown[]);
        if (result.errors.length > 0) throw new Error(result.errors.join('\n'));

        const { filtered, skippedCount } = filterZeroPlaceholders(result.validRecords, isElectricityRecordAllZero);
        const warnings: string[] = [];
        if (skippedCount > 0) {
          // Need translation keys
          const key = skippedCount === 1 ? 'ELECTRICITY.IMPORT_PLACEHOLDER_SKIPPED_SINGULAR' : 'ELECTRICITY.IMPORT_PLACEHOLDER_SKIPPED_PLURAL';
          warnings.push(this.languageService.translate(key).replace('{{count}}', skippedCount.toString()));
        }

        await this.processImport(filtered, warnings, 'IMPORT.JSON_SUCCESS');
      } catch (error) {
        this.handleImportError(error, 'ELECTRICITY.JSON_IMPORT_ERROR_TITLE', 'ELECTRICITY.JSON_IMPORT_ERROR', true);
      }
    }
    this.showImportConfirmModal.set(false);
    this.pendingImportFile.set(null);
  }

  // Excel
  async importFromExcel(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.isImporting.set(true);
      try {
        const validExtensions = ['.xlsx', '.xls', '.csv'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        if (!validExtensions.includes(fileExtension)) {
          const message = this.languageService.translate('ERROR.IMPORT_INVALID_EXCEL_FILE_TYPE').replace('{{extension}}', fileExtension);
          throw new Error(message);
        }

        // Need importElectricityFromExcel in ExcelService
        const { records, missingColumns } = await this.excelService.importElectricityFromExcel(file);

        const { filtered, skippedCount } = filterZeroPlaceholders(records, isElectricityRecordAllZero);
        const warnings = [...missingColumns];
        if (skippedCount > 0) {
          const key = skippedCount === 1 ? 'ELECTRICITY.IMPORT_PLACEHOLDER_SKIPPED_SINGULAR' : 'ELECTRICITY.IMPORT_PLACEHOLDER_SKIPPED_PLURAL';
          warnings.push(this.languageService.translate(key).replace('{{count}}', skippedCount.toString()));
        }

        await this.processImport(filtered, warnings, 'IMPORT.EXCEL_SUCCESS');
      } catch (error) {
        this.handleImportError(error, 'ELECTRICITY.EXCEL_IMPORT_ERROR_TITLE', 'ELECTRICITY.EXCEL_IMPORT_ERROR', false);
      } finally {
        this.isImporting.set(false);
        input.value = '';
      }
    }
  }

  // Unified Processing
  async processImport(records: ElectricityRecord[], warnings: string[] = [], successKey: string) {
    if (this.isFilterActive()) {
      const recordsOutsideFilter = this.countRecordsOutsideFilter(records);
      if (recordsOutsideFilter > 0) {
        this.pendingImportRecords.set(records);
        this.pendingImportWarnings.set(warnings);
        this.pendingImportSuccessKey.set(successKey);
        this.showFilterWarningModal.set(true);
        this.showImportConfirmModal.set(false);
        this.pendingImportFile.set(null);
        return;
      }
    }
    await this.finishImport(records, warnings, successKey);
  }

  async finishImport(records: ElectricityRecord[], warnings: string[], successKey: string) {
    try {
      this.records.update(existing => mergeRecords(existing, records));
      await this.storage.save('electricity_consumption_records', this.records());

      // Update notification service with new records
      this.notificationService.setElectricityRecords(this.records());
      this.notificationService.resetElectricityOverdue();

      if (warnings.length > 0) {
        this.errorTitle.set(this.languageService.translate('HOME.IMPORT_WARNING_TITLE'));
        this.errorMessage.set(this.languageService.translate('HOME.IMPORT_WARNING_MESSAGE'));
        this.errorDetails.set(this.languageService.translate('HOME.MISSING_COLUMNS') + ': ' + warnings.join(', '));
        this.errorInstructions.set([]);
        this.errorType.set('warning');
        this.showErrorModal.set(true);
      } else {
        this.successTitle.set('IMPORT.SUCCESS_TITLE');
        this.successMessage.set(successKey);
        this.showSuccessModal.set(true);
      }
    } catch (error) {
      this.handleImportError(error, 'ELECTRICITY.JSON_IMPORT_ERROR_TITLE', 'ELECTRICITY.JSON_IMPORT_ERROR', true);
    } finally {
      this.isImporting.set(false);
      this.showFilterWarningModal.set(false);
      this.pendingImportRecords.set([]);
      this.pendingImportWarnings.set([]);
      this.pendingImportSuccessKey.set('');
    }
  }

  confirmFilterWarningImport() {
    this.finishImport(this.pendingImportRecords(), this.pendingImportWarnings(), this.pendingImportSuccessKey());
  }

  cancelFilterWarningImport() {
    this.showFilterWarningModal.set(false);
    this.pendingImportRecords.set([]);
    this.pendingImportWarnings.set([]);
    this.pendingImportSuccessKey.set('');
  }

  cancelImport() {
    this.showImportConfirmModal.set(false);
    this.pendingImportFile.set(null);
  }

  private handleImportError(error: unknown, titleKey: string, msgKey: string, isJson: boolean) {
    console.error('Import error:', error);
    this.errorType.set('error');
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    this.errorTitle.set(this.languageService.translate(titleKey));
    this.errorMessage.set(this.languageService.translate(msgKey));
    this.errorDetails.set(errorMsg);
    if (isJson) {
      this.errorInstructions.set(this.importValidationService.getJsonErrorInstructions(errorMsg));
    } else {
      this.errorInstructions.set(this.importValidationService.getExcelErrorInstructions(errorMsg));
    }
    this.showErrorModal.set(true);
    this.isImporting.set(false);
  }
}
