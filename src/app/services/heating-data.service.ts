import { Injectable, inject, signal } from '@angular/core';
import { STORAGE_SERVICE } from './storage.service';
import { FileStorageService } from './file-storage.service';
import { LanguageService } from './language.service';
import { ExcelService } from './excel.service';
import { PdfService } from './pdf.service';
import { ImportValidationService } from './import-validation.service';
import { NotificationService } from './notification.service';
import { HeatingRoomsService } from './heating-rooms.service';
import {
    DynamicHeatingRecord,
    filterZeroPlaceholders,
    isDynamicHeatingRecordAllZero
} from '../models/records.model';

/**
 * Service for heating data management including CRUD, import/export operations.
 * Mirrors the pattern used in ConsumptionDataService for water.
 */
@Injectable({
    providedIn: 'root'
})
export class HeatingDataService {
    private storage = inject(STORAGE_SERVICE);
    private fileStorage = inject(FileStorageService);
    private languageService = inject(LanguageService);
    private excelService = inject(ExcelService);
    private pdfService = inject(PdfService);
    private importValidationService = inject(ImportValidationService);
    private notificationService = inject(NotificationService);
    private roomsService = inject(HeatingRoomsService);

    // State signals
    readonly records = signal<DynamicHeatingRecord[]>([]);
    readonly isExporting = signal(false);
    readonly isImporting = signal(false);
    readonly pendingImportFile = signal<File | null>(null);
    readonly showImportConfirmModal = signal(false);

    // Error state signals
    readonly showErrorModal = signal(false);
    readonly errorTitle = signal('ERROR.TITLE');
    readonly errorMessage = signal('');
    readonly errorDetails = signal('');
    readonly errorInstructions = signal<string[]>([]);
    readonly errorType = signal<'error' | 'warning' | 'success'>('error');

    // Success state signals
    readonly showSuccessModal = signal(false);
    readonly successTitle = signal('HEATING.SUCCESS_TITLE');
    readonly successMessage = signal('HEATING.RECORD_SAVED');

    /**
     * Load records from storage
     */
    async loadData(): Promise<void> {
        const records = await this.storage.load<DynamicHeatingRecord[]>('heating_consumption_records');
        if (records) {
            const parsedRecords = records.map(r => ({ ...r, date: new Date(r.date) }));
            this.records.set(parsedRecords);
            this.notificationService.setHeatingRecords(this.records());
        }
    }

    /**
     * Save a new or updated record
     */
    async saveRecord(newRecord: DynamicHeatingRecord, editingRecord: DynamicHeatingRecord | null): Promise<void> {
        if (editingRecord) {
            this.records.update(records =>
                records.map(r =>
                    r.date.getTime() === editingRecord.date.getTime() ? newRecord : r
                )
            );
        } else {
            this.records.update(records => [...records, newRecord]);
        }
        await this.storage.save('heating_consumption_records', this.records());
        this.notificationService.setHeatingRecords(this.records());
    }

    /**
     * Delete a single record
     */
    async deleteRecord(record: DynamicHeatingRecord): Promise<void> {
        this.records.update(records => records.filter(r => r.date.getTime() !== record.date.getTime()));
        await this.storage.save('heating_consumption_records', this.records());
        this.notificationService.setHeatingRecords(this.records());
    }

    /**
     * Delete multiple records
     */
    async deleteRecords(recordsToDelete: DynamicHeatingRecord[]): Promise<void> {
        const datesToDelete = new Set(recordsToDelete.map(r => r.date.getTime()));
        this.records.update(records => records.filter(r => !datesToDelete.has(r.date.getTime())));
        await this.storage.save('heating_consumption_records', this.records());
        this.notificationService.setHeatingRecords(this.records());
    }

    // ===== EXPORT METHODS =====

    async exportData(): Promise<void> {
        this.isExporting.set(true);
        try {
            const records = await this.storage.exportRecords('heating_consumption_records');
            this.fileStorage.exportToFile(records, 'heating-consumption.json');
        } finally {
            this.isExporting.set(false);
        }
    }

    async exportToExcel(): Promise<void> {
        this.isExporting.set(true);
        try {
            this.excelService.exportHeatingToExcel(this.records(), 'heating-consumption.xlsx');
        } catch (error) {
            console.error('Excel export error:', error);
            this.showError(
                this.languageService.translate('HEATING.EXCEL_IMPORT_ERROR_TITLE'),
                this.languageService.translate('HEATING.EXCEL_IMPORT_ERROR')
            );
        } finally {
            this.isExporting.set(false);
        }
    }

    async exportToPdf(): Promise<void> {
        this.isExporting.set(true);
        try {
            const roomNames = this.roomsService.rooms().map(r => r.name);
            await this.pdfService.exportHeatingToPdf(this.records(), roomNames, 'heating-consumption.pdf');
        } catch (error) {
            console.error('PDF export error:', error);
        } finally {
            this.isExporting.set(false);
        }
    }

    // ===== IMPORT METHODS =====

    importData(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) {
            this.pendingImportFile.set(file);
            this.showImportConfirmModal.set(true);
            input.value = '';
        }
    }

    async confirmImport(): Promise<void> {
        const file = this.pendingImportFile();
        if (!file) {
            this.cancelImport();
            return;
        }

        this.isImporting.set(true);
        try {
            const data = await this.fileStorage.importFromFile(file);

            const arrayError = this.importValidationService.validateDataArray(data);
            if (arrayError) {
                throw new Error(arrayError);
            }

            const expectedRoomIds = this.roomsService.rooms().map(r => r.id);
            const result = this.importValidationService.validateHeatingJsonImport(data as unknown[], expectedRoomIds);
            if (result.errors.length > 0) {
                throw new Error(result.errors.join('\n'));
            }

            const validDynamicRecords = result.validRecords as unknown as DynamicHeatingRecord[];
            const { filtered, skippedCount } = filterZeroPlaceholders(validDynamicRecords, isDynamicHeatingRecordAllZero);

            await this.storage.importRecords('heating_consumption_records', filtered);
            await this.loadData();

            if (skippedCount > 0) {
                const key = skippedCount === 1 ? 'HEATING.IMPORT_PLACEHOLDER_SKIPPED_SINGULAR' : 'HEATING.IMPORT_PLACEHOLDER_SKIPPED_PLURAL';
                this.showWarning(
                    this.languageService.translate('HOME.IMPORT_WARNING_TITLE'),
                    this.languageService.translate(key).replace('{{count}}', skippedCount.toString())
                );
            } else {
                this.showSuccess('IMPORT.SUCCESS_TITLE', 'IMPORT.JSON_SUCCESS');
            }
        } catch (error) {
            console.error('Error importing data:', error);
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.showError(
                this.languageService.translate('HEATING.JSON_IMPORT_ERROR_TITLE'),
                this.languageService.translate('HEATING.JSON_IMPORT_ERROR'),
                errorMsg,
                this.importValidationService.getJsonErrorInstructions(errorMsg)
            );
        } finally {
            this.isImporting.set(false);
            this.cancelImport();
        }
    }

    cancelImport(): void {
        this.showImportConfirmModal.set(false);
        this.pendingImportFile.set(null);
    }

    async importFromExcel(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        this.isImporting.set(true);
        try {
            const validExtensions = ['.xlsx', '.xls', '.csv'];
            const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
            if (!validExtensions.includes(fileExtension)) {
                const message = this.languageService.translate('ERROR.IMPORT_INVALID_EXCEL_FILE_TYPE').replace('{{extension}}', fileExtension);
                throw new Error(message);
            }

            const { records, missingColumns } = await this.excelService.importHeatingFromExcel(file);
            const { filtered, skippedCount } = filterZeroPlaceholders(records, isDynamicHeatingRecordAllZero);

            this.records.update(existing => {
                const merged = [...existing, ...filtered];
                const uniqueMap = new Map<number, DynamicHeatingRecord>();
                merged.forEach(r => uniqueMap.set(r.date.getTime(), r));
                return Array.from(uniqueMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
            });

            await this.storage.save('heating_consumption_records', this.records());
            this.notificationService.setHeatingRecords(this.records());

            const warnings: string[] = [];
            if (missingColumns.length > 0) {
                warnings.push(this.languageService.translate('HOME.MISSING_COLUMNS') + ': ' + missingColumns.join(', '));
            }
            if (skippedCount > 0) {
                const key = skippedCount === 1 ? 'HEATING.IMPORT_PLACEHOLDER_SKIPPED_SINGULAR' : 'HEATING.IMPORT_PLACEHOLDER_SKIPPED_PLURAL';
                warnings.push(this.languageService.translate(key).replace('{{count}}', skippedCount.toString()));
            }

            if (warnings.length > 0) {
                this.showWarning(
                    this.languageService.translate('HOME.IMPORT_WARNING_TITLE'),
                    this.languageService.translate('HOME.IMPORT_WARNING_MESSAGE'),
                    warnings.join('\n')
                );
            } else {
                this.showSuccess('IMPORT.SUCCESS_TITLE', 'IMPORT.EXCEL_SUCCESS');
            }
        } catch (error) {
            console.error('Excel import error:', error);
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.showError(
                this.languageService.translate('HEATING.EXCEL_IMPORT_ERROR_TITLE'),
                this.languageService.translate('HEATING.EXCEL_IMPORT_ERROR'),
                errorMsg,
                this.importValidationService.getExcelErrorInstructions(errorMsg)
            );
        } finally {
            this.isImporting.set(false);
            input.value = '';
        }
    }

    // ===== MODAL HELPERS =====

    closeSuccessModal(): void {
        this.showSuccessModal.set(false);
    }

    closeErrorModal(): void {
        this.showErrorModal.set(false);
    }

    private showSuccess(titleKey: string, messageKey: string): void {
        this.successTitle.set(titleKey);
        this.successMessage.set(messageKey);
        this.showSuccessModal.set(true);
    }

    private showWarning(title: string, message: string, details = ''): void {
        this.errorType.set('warning');
        this.errorTitle.set(title);
        this.errorMessage.set(message);
        this.errorDetails.set(details);
        this.errorInstructions.set([]);
        this.showErrorModal.set(true);
    }

    private showError(title: string, message: string, details = '', instructions: string[] = []): void {
        this.errorType.set('error');
        this.errorTitle.set(title);
        this.errorMessage.set(message);
        this.errorDetails.set(details);
        this.errorInstructions.set(instructions);
        this.showErrorModal.set(true);
    }
}
