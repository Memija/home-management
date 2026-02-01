import { TestBed } from '@angular/core/testing';
import { ElectricityDataService } from './electricity-data.service';
import { STORAGE_SERVICE } from './storage.service';
import { FileStorageService } from './file-storage.service';
import { ExcelService } from './excel.service';
import { PdfService } from './pdf.service';
import { ImportValidationService } from './import-validation.service';
import { LanguageService } from './language.service';
import { NotificationService } from './notification.service';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ElectricityRecord } from '../models/records.model';

describe('ElectricityDataService', () => {
    let service: ElectricityDataService;
    let storageServiceMock: any;
    let fileStorageServiceMock: any;
    let excelServiceMock: any;
    let pdfServiceMock: any;
    let importValidationServiceMock: any;
    let languageServiceMock: any;
    let notificationServiceMock: any;

    const mockRecords: ElectricityRecord[] = [
        {
            date: new Date('2023-01-01'),
            value: 100,
        },
        {
            date: new Date('2023-01-08'),
            value: 150,
        },
        {
            date: new Date('2023-02-15'),
            value: 200,
        },
    ];

    beforeEach(() => {
        storageServiceMock = {
            load: vi.fn().mockResolvedValue(mockRecords),
            save: vi.fn().mockResolvedValue(undefined),
        };

        fileStorageServiceMock = {
            exportToFile: vi.fn().mockResolvedValue(undefined),
            importFromFile: vi.fn().mockResolvedValue(undefined),
        };

        excelServiceMock = {
            exportElectricityToExcel: vi.fn().mockResolvedValue(undefined),
            importElectricityFromExcel: vi.fn().mockResolvedValue({ records: [], missingColumns: [] }),
        };

        pdfServiceMock = {
            exportElectricityToPdf: vi.fn().mockResolvedValue(undefined),
        };

        importValidationServiceMock = {
            validateDataArray: vi.fn(),
            validateElectricityJsonImport: vi.fn().mockReturnValue({ validRecords: [], errors: [] }),
            getJsonErrorInstructions: vi.fn().mockReturnValue([]),
            getExcelErrorInstructions: vi.fn().mockReturnValue([]),
        };

        languageServiceMock = {
            translate: vi.fn((key: string) => key),
        };

        notificationServiceMock = {
            setElectricityRecords: vi.fn(),
            resetElectricityOverdue: vi.fn(),
        };

        TestBed.configureTestingModule({
            providers: [
                ElectricityDataService,
                { provide: STORAGE_SERVICE, useValue: storageServiceMock },
                { provide: FileStorageService, useValue: fileStorageServiceMock },
                { provide: ExcelService, useValue: excelServiceMock },
                { provide: PdfService, useValue: pdfServiceMock },
                { provide: ImportValidationService, useValue: importValidationServiceMock },
                { provide: LanguageService, useValue: languageServiceMock },
                { provide: NotificationService, useValue: notificationServiceMock },
            ],
        });

        service = TestBed.inject(ElectricityDataService);
    });

    describe('Initialization', () => {
        it('should be created', () => {
            expect(service).toBeTruthy();
        });

        it('should load data on construction', async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(storageServiceMock.load).toHaveBeenCalledWith('electricity_consumption_records');
            expect(service.records()).toEqual(mockRecords);
        });

        it('should update notification service after loading data', async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(notificationServiceMock.setElectricityRecords).toHaveBeenCalledWith(mockRecords);
        });

        it('should handle empty storage gracefully', async () => {
            storageServiceMock.load.mockResolvedValue(null);
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                providers: [
                    ElectricityDataService,
                    { provide: STORAGE_SERVICE, useValue: storageServiceMock },
                    { provide: FileStorageService, useValue: fileStorageServiceMock },
                    { provide: ExcelService, useValue: excelServiceMock },
                    { provide: PdfService, useValue: pdfServiceMock },
                    { provide: ImportValidationService, useValue: importValidationServiceMock },
                    { provide: LanguageService, useValue: languageServiceMock },
                    { provide: NotificationService, useValue: notificationServiceMock },
                ],
            });
            const newService = TestBed.inject(ElectricityDataService);
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(newService.records()).toEqual([]);
        });
    });

    describe('Filter Logic', () => {
        beforeEach(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        it('should filter records by start date', () => {
            service.updateFilterState({
                year: null,
                month: null,
                startDate: '2023-01-05',
                endDate: null,
            });

            const filtered = service.filteredRecords();
            expect(filtered.length).toBe(2);
            expect(filtered.every(r => new Date(r.date) >= new Date('2023-01-05'))).toBe(true);
        });

        it('should filter records by end date', () => {
            service.updateFilterState({
                year: null,
                month: null,
                startDate: null,
                endDate: '2023-01-10',
            });

            const filtered = service.filteredRecords();
            expect(filtered.length).toBe(2);
            expect(filtered.every(r => new Date(r.date) <= new Date('2023-01-10'))).toBe(true);
        });

        it('should filter records by date range', () => {
            service.updateFilterState({
                year: null,
                month: null,
                startDate: '2023-01-02',
                endDate: '2023-01-31',
            });

            const filtered = service.filteredRecords();
            expect(filtered.length).toBe(1);
            expect(new Date(filtered[0].date).toISOString().split('T')[0]).toBe('2023-01-08');
        });

        it('should filter records by year', () => {
            service.updateFilterState({
                year: 2023,
                month: null,
                startDate: null,
                endDate: null,
            });

            const filtered = service.filteredRecords();
            expect(filtered.length).toBe(3);
        });

        it('should filter records by month', () => {
            service.updateFilterState({
                year: null,
                month: 0, // January
                startDate: null,
                endDate: null,
            });

            const filtered = service.filteredRecords();
            expect(filtered.length).toBe(2);
        });

        it('should filter records by year and month combined', () => {
            service.updateFilterState({
                year: 2023,
                month: 1, // February
                startDate: null,
                endDate: null,
            });

            const filtered = service.filteredRecords();
            expect(filtered.length).toBe(1);
            expect(filtered[0].value).toBe(200);
        });

        it('should return all records when no filter is active', () => {
            service.updateFilterState({
                year: null,
                month: null,
                startDate: null,
                endDate: null,
            });

            const filtered = service.filteredRecords();
            expect(filtered.length).toBe(3);
        });

        it('should return empty array when no records match filter', () => {
            service.updateFilterState({
                year: 2020,
                month: null,
                startDate: null,
                endDate: null,
            });

            const filtered = service.filteredRecords();
            expect(filtered.length).toBe(0);
        });

        it('should correctly identify when filter is active', () => {
            expect(service.isFilterActive()).toBe(false);

            service.updateFilterState({
                year: 2023,
                month: null,
                startDate: null,
                endDate: null,
            });
            expect(service.isFilterActive()).toBe(true);

            service.updateFilterState({
                year: null,
                month: 0,
                startDate: null,
                endDate: null,
            });
            expect(service.isFilterActive()).toBe(true);

            service.updateFilterState({
                year: null,
                month: null,
                startDate: '2023-01-01',
                endDate: null,
            });
            expect(service.isFilterActive()).toBe(true);

            service.updateFilterState({
                year: null,
                month: null,
                startDate: null,
                endDate: '2023-12-31',
            });
            expect(service.isFilterActive()).toBe(true);
        });
    });

    describe('CRUD Operations', () => {
        beforeEach(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        it('should save a new record', async () => {
            const newRecord: ElectricityRecord = {
                date: new Date('2023-01-20'),
                value: 175,
            };

            await service.saveRecord(newRecord);

            expect(service.records().length).toBe(4);
            expect(storageServiceMock.save).toHaveBeenCalledWith('electricity_consumption_records', expect.any(Array));
            expect(notificationServiceMock.setElectricityRecords).toHaveBeenCalled();
            expect(notificationServiceMock.resetElectricityOverdue).toHaveBeenCalled();
            expect(service.showSuccessModal()).toBe(true);
        });

        it('should update an existing record with the same date', async () => {
            const updatedRecord: ElectricityRecord = {
                date: new Date('2023-01-01'),
                value: 999,
            };

            await service.saveRecord(updatedRecord);

            expect(service.records().length).toBe(3);
            expect(service.records().find(r =>
                new Date(r.date).toISOString().split('T')[0] === '2023-01-01'
            )?.value).toBe(999);
        });

        it('should sort records by date after saving', async () => {
            const newRecord: ElectricityRecord = {
                date: new Date('2023-01-05'),
                value: 125,
            };

            await service.saveRecord(newRecord);

            const dates = service.records().map(r => new Date(r.date).getTime());
            expect(dates).toEqual([...dates].sort((a, b) => a - b));
        });

        it('should set success message after saving', async () => {
            const newRecord: ElectricityRecord = {
                date: new Date('2023-01-20'),
                value: 175,
            };

            await service.saveRecord(newRecord);

            expect(service.successTitle()).toBe('ELECTRICITY.SUCCESS_TITLE');
            expect(service.successMessage()).toBe('ELECTRICITY.RECORD_SAVED');
        });

        it('should confirm delete record', async () => {
            service.recordToDelete.set(mockRecords[0]);
            service.showDeleteModal.set(true);

            service.confirmDelete();
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(service.records().length).toBe(2);
            expect(storageServiceMock.save).toHaveBeenCalled();
            expect(service.showDeleteModal()).toBe(false);
            expect(service.recordToDelete()).toBeNull();
        });

        it('should not delete if recordToDelete is null', async () => {
            const initialLength = service.records().length;
            service.recordToDelete.set(null);
            service.showDeleteModal.set(true);

            service.confirmDelete();

            expect(service.records().length).toBe(initialLength);
            expect(service.showDeleteModal()).toBe(false);
        });

        it('should confirm delete all selected records', async () => {
            service.recordsToDelete.set([mockRecords[0], mockRecords[1]]);
            service.showDeleteAllModal.set(true);

            service.confirmDeleteAll();
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(service.records().length).toBe(1);
            expect(storageServiceMock.save).toHaveBeenCalled();
            expect(service.showDeleteAllModal()).toBe(false);
            expect(service.recordsToDelete()).toEqual([]);
        });

        it('should handle delete all with empty selection', async () => {
            const initialLength = service.records().length;
            service.recordsToDelete.set([]);
            service.showDeleteAllModal.set(true);

            service.confirmDeleteAll();

            expect(service.records().length).toBe(initialLength);
            expect(service.showDeleteAllModal()).toBe(false);
        });
    });

    describe('Export Operations', () => {
        beforeEach(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        it('should export to JSON', async () => {
            await service.exportData();
            expect(fileStorageServiceMock.exportToFile).toHaveBeenCalledWith(
                expect.any(Array),
                'electricity-consumption.json'
            );
            expect(service.isExporting()).toBe(false);
        });

        it('should set isExporting during JSON export', async () => {
            let wasExporting = false;
            fileStorageServiceMock.exportToFile.mockImplementation(async () => {
                wasExporting = service.isExporting();
            });

            await service.exportData();
            expect(wasExporting).toBe(true);
            expect(service.isExporting()).toBe(false);
        });

        it('should handle JSON export error gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            fileStorageServiceMock.exportToFile.mockRejectedValue(new Error('Export failed'));

            await service.exportData();

            expect(consoleSpy).toHaveBeenCalled();
            expect(service.isExporting()).toBe(false);
            consoleSpy.mockRestore();
        });

        it('should export to Excel', async () => {
            await service.exportToExcel();
            expect(excelServiceMock.exportElectricityToExcel).toHaveBeenCalledWith(
                expect.any(Array),
                'electricity-consumption.xlsx'
            );
            expect(service.isExporting()).toBe(false);
        });

        it('should handle Excel export error gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            excelServiceMock.exportElectricityToExcel.mockRejectedValue(new Error('Export failed'));

            await service.exportToExcel();

            expect(consoleSpy).toHaveBeenCalled();
            expect(service.isExporting()).toBe(false);
            consoleSpy.mockRestore();
        });

        it('should export to PDF', async () => {
            await service.exportToPdf();
            expect(pdfServiceMock.exportElectricityToPdf).toHaveBeenCalledWith(
                expect.any(Array),
                'electricity-consumption.pdf'
            );
            expect(service.isExporting()).toBe(false);
        });

        it('should handle PDF export error gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            pdfServiceMock.exportElectricityToPdf.mockRejectedValue(new Error('Export failed'));

            await service.exportToPdf();

            expect(consoleSpy).toHaveBeenCalled();
            expect(service.isExporting()).toBe(false);
            consoleSpy.mockRestore();
        });

        it('should export only filtered records', async () => {
            service.updateFilterState({
                year: null,
                month: 0, // January only
                startDate: null,
                endDate: null,
            });

            await service.exportData();

            expect(fileStorageServiceMock.exportToFile).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ value: 100 }),
                    expect.objectContaining({ value: 150 }),
                ]),
                'electricity-consumption.json'
            );
        });
    });

    describe('JSON Import', () => {
        beforeEach(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        it('should set pending file on import data event', async () => {
            const file = new File([''], 'test.json', { type: 'application/json' });
            const event = { target: { files: [file], value: '' } } as unknown as Event;

            await service.importData(event);

            expect(service.pendingImportFile()).toBe(file);
            expect(service.showImportConfirmModal()).toBe(true);
        });

        it('should clear input value after selecting file', async () => {
            const file = new File([''], 'test.json', { type: 'application/json' });
            const input = { files: [file], value: 'test.json' };
            const event = { target: input } as unknown as Event;

            await service.importData(event);

            expect(input.value).toBe('');
        });

        it('should handle JSON import confirmation', async () => {
            const file = new File([''], 'test.json', { type: 'application/json' });
            service.pendingImportFile.set(file);

            const importedData = [{ date: new Date('2023-03-01'), value: 300 }];
            fileStorageServiceMock.importFromFile.mockResolvedValue(importedData);
            importValidationServiceMock.validateDataArray.mockReturnValue(null);
            importValidationServiceMock.validateElectricityJsonImport.mockReturnValue({
                validRecords: importedData,
                errors: []
            });

            await service.confirmImport();

            expect(storageServiceMock.save).toHaveBeenCalled();
            expect(service.showSuccessModal()).toBe(true);
            expect(service.showImportConfirmModal()).toBe(false);
            expect(service.pendingImportFile()).toBeNull();
        });

        it('should handle JSON import with validation errors', async () => {
            const file = new File([''], 'test.json', { type: 'application/json' });
            service.pendingImportFile.set(file);

            fileStorageServiceMock.importFromFile.mockResolvedValue([]);
            importValidationServiceMock.validateDataArray.mockReturnValue(null);
            importValidationServiceMock.validateElectricityJsonImport.mockReturnValue({
                validRecords: [],
                errors: ['Invalid record format']
            });

            await service.confirmImport();

            expect(service.showErrorModal()).toBe(true);
            expect(service.errorType()).toBe('error');
        });

        it('should handle JSON import with array validation error', async () => {
            const file = new File([''], 'test.json', { type: 'application/json' });
            service.pendingImportFile.set(file);

            fileStorageServiceMock.importFromFile.mockResolvedValue({});
            importValidationServiceMock.validateDataArray.mockReturnValue('Data is not an array');

            await service.confirmImport();

            expect(service.showErrorModal()).toBe(true);
            expect(service.errorType()).toBe('error');
        });

        it('should cancel import', () => {
            const file = new File([''], 'test.json', { type: 'application/json' });
            service.pendingImportFile.set(file);
            service.showImportConfirmModal.set(true);

            service.cancelImport();

            expect(service.showImportConfirmModal()).toBe(false);
            expect(service.pendingImportFile()).toBeNull();
        });

        it('should not proceed if no pending file', async () => {
            service.pendingImportFile.set(null);

            await service.confirmImport();

            expect(fileStorageServiceMock.importFromFile).not.toHaveBeenCalled();
        });
    });

    describe('Excel Import', () => {
        beforeEach(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        it('should handle Excel import', async () => {
            const file = new File([''], 'test.xlsx');
            const event = { target: { files: [file], value: '' } } as unknown as Event;

            const importedRecords = [{ date: new Date('2023-03-01'), value: 300 }];
            excelServiceMock.importElectricityFromExcel.mockResolvedValue({
                records: importedRecords,
                missingColumns: []
            });

            await service.importFromExcel(event);

            expect(storageServiceMock.save).toHaveBeenCalled();
            expect(service.isImporting()).toBe(false);
        });

        it('should reject invalid file extensions', async () => {
            const file = new File([''], 'test.txt');
            const event = { target: { files: [file], value: '' } } as unknown as Event;

            await service.importFromExcel(event);

            expect(service.showErrorModal()).toBe(true);
            expect(excelServiceMock.importElectricityFromExcel).not.toHaveBeenCalled();
        });

        it('should accept .xlsx files', async () => {
            const file = new File([''], 'test.xlsx');
            const event = { target: { files: [file], value: '' } } as unknown as Event;

            excelServiceMock.importElectricityFromExcel.mockResolvedValue({
                records: [],
                missingColumns: []
            });

            await service.importFromExcel(event);

            expect(excelServiceMock.importElectricityFromExcel).toHaveBeenCalled();
        });

        it('should accept .xls files', async () => {
            const file = new File([''], 'test.xls');
            const event = { target: { files: [file], value: '' } } as unknown as Event;

            excelServiceMock.importElectricityFromExcel.mockResolvedValue({
                records: [],
                missingColumns: []
            });

            await service.importFromExcel(event);

            expect(excelServiceMock.importElectricityFromExcel).toHaveBeenCalled();
        });

        it('should accept .csv files', async () => {
            const file = new File([''], 'test.csv');
            const event = { target: { files: [file], value: '' } } as unknown as Event;

            excelServiceMock.importElectricityFromExcel.mockResolvedValue({
                records: [],
                missingColumns: []
            });

            await service.importFromExcel(event);

            expect(excelServiceMock.importElectricityFromExcel).toHaveBeenCalled();
        });

        it('should handle Excel import error', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const file = new File([''], 'test.xlsx');
            const event = { target: { files: [file], value: '' } } as unknown as Event;

            excelServiceMock.importElectricityFromExcel.mockRejectedValue(new Error('Parse error'));

            await service.importFromExcel(event);

            expect(service.showErrorModal()).toBe(true);
            expect(service.isImporting()).toBe(false);
            consoleSpy.mockRestore();
        });

        it('should show warnings for missing columns', async () => {
            const file = new File([''], 'test.xlsx');
            const event = { target: { files: [file], value: '' } } as unknown as Event;

            const importedRecords = [{ date: new Date('2023-03-01'), value: 300 }];
            excelServiceMock.importElectricityFromExcel.mockResolvedValue({
                records: importedRecords,
                missingColumns: ['Some column missing']
            });

            await service.importFromExcel(event);

            expect(service.showErrorModal()).toBe(true);
            expect(service.errorType()).toBe('warning');
        });
    });

    describe('Filter Warning Modal', () => {
        beforeEach(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        it('should show filter warning when importing records outside filter', async () => {
            // Set a filter that excludes March records
            service.updateFilterState({
                year: null,
                month: 0, // January only
                startDate: null,
                endDate: null,
            });

            const recordsToImport = [{ date: new Date('2023-03-01'), value: 300 }];
            await service.processImport(recordsToImport, [], 'IMPORT.JSON_SUCCESS');

            expect(service.showFilterWarningModal()).toBe(true);
            expect(service.pendingImportRecords()).toEqual(recordsToImport);
        });

        it('should proceed with import without warning when filter matches', async () => {
            // Set a filter that includes January records
            service.updateFilterState({
                year: 2023,
                month: null,
                startDate: null,
                endDate: null,
            });

            const recordsToImport = [{ date: new Date('2023-01-20'), value: 175 }];
            await service.processImport(recordsToImport, [], 'IMPORT.JSON_SUCCESS');

            expect(service.showFilterWarningModal()).toBe(false);
            expect(storageServiceMock.save).toHaveBeenCalled();
        });

        it('should confirm filter warning import', async () => {
            const recordsToImport = [{ date: new Date('2023-03-01'), value: 300 }];
            service.pendingImportRecords.set(recordsToImport);
            service.pendingImportWarnings.set([]);
            service.pendingImportSuccessKey.set('IMPORT.JSON_SUCCESS');

            await service.confirmFilterWarningImport();

            expect(storageServiceMock.save).toHaveBeenCalled();
            expect(service.showFilterWarningModal()).toBe(false);
        });

        it('should cancel filter warning import', () => {
            const recordsToImport = [{ date: new Date('2023-03-01'), value: 300 }];
            service.pendingImportRecords.set(recordsToImport);
            service.pendingImportWarnings.set(['warning']);
            service.pendingImportSuccessKey.set('IMPORT.JSON_SUCCESS');
            service.showFilterWarningModal.set(true);

            service.cancelFilterWarningImport();

            expect(service.showFilterWarningModal()).toBe(false);
            expect(service.pendingImportRecords()).toEqual([]);
            expect(service.pendingImportWarnings()).toEqual([]);
            expect(service.pendingImportSuccessKey()).toBe('');
        });
    });

    describe('finishImport', () => {
        beforeEach(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        it('should merge records and save', async () => {
            const recordsToImport = [{ date: new Date('2023-03-01'), value: 300 }];

            await service.finishImport(recordsToImport, [], 'IMPORT.JSON_SUCCESS');

            expect(service.records().length).toBe(4);
            expect(storageServiceMock.save).toHaveBeenCalled();
        });

        it('should update notifications after import', async () => {
            const recordsToImport = [{ date: new Date('2023-03-01'), value: 300 }];

            await service.finishImport(recordsToImport, [], 'IMPORT.JSON_SUCCESS');

            expect(notificationServiceMock.setElectricityRecords).toHaveBeenCalled();
            expect(notificationServiceMock.resetElectricityOverdue).toHaveBeenCalled();
        });

        it('should show success modal when no warnings', async () => {
            const recordsToImport = [{ date: new Date('2023-03-01'), value: 300 }];

            await service.finishImport(recordsToImport, [], 'IMPORT.JSON_SUCCESS');

            expect(service.showSuccessModal()).toBe(true);
            expect(service.successTitle()).toBe('IMPORT.SUCCESS_TITLE');
            expect(service.successMessage()).toBe('IMPORT.JSON_SUCCESS');
        });

        it('should show warning modal when warnings exist', async () => {
            const recordsToImport = [{ date: new Date('2023-03-01'), value: 300 }];

            await service.finishImport(recordsToImport, ['Missing column'], 'IMPORT.JSON_SUCCESS');

            expect(service.showErrorModal()).toBe(true);
            expect(service.errorType()).toBe('warning');
        });

        it('should reset import state in finally block', async () => {
            const recordsToImport = [{ date: new Date('2023-03-01'), value: 300 }];
            service.pendingImportRecords.set(recordsToImport);
            service.pendingImportWarnings.set(['warning']);
            service.pendingImportSuccessKey.set('key');
            service.isImporting.set(true);

            await service.finishImport(recordsToImport, [], 'IMPORT.JSON_SUCCESS');

            expect(service.isImporting()).toBe(false);
            expect(service.showFilterWarningModal()).toBe(false);
            expect(service.pendingImportRecords()).toEqual([]);
            expect(service.pendingImportWarnings()).toEqual([]);
            expect(service.pendingImportSuccessKey()).toBe('');
        });

        it('should handle errors during import', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            storageServiceMock.save.mockRejectedValue(new Error('Save failed'));

            const recordsToImport = [{ date: new Date('2023-03-01'), value: 300 }];
            await service.finishImport(recordsToImport, [], 'IMPORT.JSON_SUCCESS');

            expect(service.showErrorModal()).toBe(true);
            expect(service.errorType()).toBe('error');
            consoleSpy.mockRestore();
        });
    });

    describe('Error Handling', () => {
        it('should set error modal state on import error', async () => {
            const file = new File([''], 'test.json', { type: 'application/json' });
            service.pendingImportFile.set(file);

            fileStorageServiceMock.importFromFile.mockRejectedValue(new Error('Parse error'));

            await service.confirmImport();

            expect(service.showErrorModal()).toBe(true);
            expect(service.errorType()).toBe('error');
            expect(languageServiceMock.translate).toHaveBeenCalledWith('ELECTRICITY.JSON_IMPORT_ERROR_TITLE');
            expect(languageServiceMock.translate).toHaveBeenCalledWith('ELECTRICITY.JSON_IMPORT_ERROR');
        });

        it('should extract error message from Error object', async () => {
            const file = new File([''], 'test.json', { type: 'application/json' });
            service.pendingImportFile.set(file);

            const errorMessage = 'Specific parse error';
            fileStorageServiceMock.importFromFile.mockRejectedValue(new Error(errorMessage));

            await service.confirmImport();

            expect(service.errorDetails()).toBe(errorMessage);
        });

        it('should handle non-Error thrown values', async () => {
            const file = new File([''], 'test.json', { type: 'application/json' });
            service.pendingImportFile.set(file);

            fileStorageServiceMock.importFromFile.mockRejectedValue('String error');

            await service.confirmImport();

            expect(service.errorDetails()).toBe('Unknown error');
        });

        it('should get JSON error instructions', async () => {
            const file = new File([''], 'test.json', { type: 'application/json' });
            service.pendingImportFile.set(file);

            fileStorageServiceMock.importFromFile.mockRejectedValue(new Error('Parse error'));
            importValidationServiceMock.getJsonErrorInstructions.mockReturnValue(['Instruction 1', 'Instruction 2']);

            await service.confirmImport();

            expect(importValidationServiceMock.getJsonErrorInstructions).toHaveBeenCalled();
        });

        it('should get Excel error instructions for Excel import error', async () => {
            const file = new File([''], 'test.xlsx');
            const event = { target: { files: [file], value: '' } } as unknown as Event;

            excelServiceMock.importElectricityFromExcel.mockRejectedValue(new Error('Parse error'));
            importValidationServiceMock.getExcelErrorInstructions.mockReturnValue(['Excel instruction']);

            await service.importFromExcel(event);

            expect(importValidationServiceMock.getExcelErrorInstructions).toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        beforeEach(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        it('should handle records with same date but different times', async () => {
            const record1: ElectricityRecord = {
                date: new Date('2023-01-01T10:00:00'),
                value: 100,
            };
            const record2: ElectricityRecord = {
                date: new Date('2023-01-01T15:00:00'),
                value: 200,
            };

            await service.saveRecord(record1);
            await service.saveRecord(record2);

            // Should be treated as same date, second should overwrite first
            const recordsOnDate = service.records().filter(r =>
                new Date(r.date).toISOString().split('T')[0] === '2023-01-01'
            );
            expect(recordsOnDate.length).toBe(1);
            expect(recordsOnDate[0].value).toBe(200);
        });

        it('should handle import event with no files', async () => {
            const event = { target: { files: [], value: '' } } as unknown as Event;

            await service.importData(event);

            expect(service.pendingImportFile()).toBeNull();
            expect(service.showImportConfirmModal()).toBe(false);
        });

        it('should handle import event with undefined files', async () => {
            const event = { target: { files: undefined, value: '' } } as unknown as Event;

            await service.importData(event);

            expect(service.pendingImportFile()).toBeNull();
            expect(service.showImportConfirmModal()).toBe(false);
        });

        it('should handle Excel import with no files', async () => {
            const event = { target: { files: [], value: '' } } as unknown as Event;

            await service.importFromExcel(event);

            expect(excelServiceMock.importElectricityFromExcel).not.toHaveBeenCalled();
        });

        it('should properly format dates in filter comparison', () => {
            // Test edge case where month is single digit
            service.updateFilterState({
                year: null,
                month: null,
                startDate: '2023-01-01',
                endDate: '2023-01-01',
            });

            const filtered = service.filteredRecords();
            expect(filtered.length).toBe(1);
            expect(new Date(filtered[0].date).toISOString().split('T')[0]).toBe('2023-01-01');
        });

        it('should handle maxDate property', () => {
            const today = new Date().toISOString().split('T')[0];
            expect(service.maxDate).toBe(today);
        });
    });
});
