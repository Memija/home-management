import { TestBed } from '@angular/core/testing';
import { HeatingDataService } from './heating-data.service';
import { STORAGE_SERVICE } from './storage.service';
import { FileStorageService } from './file-storage.service';
import { LanguageService } from './language.service';
import { ExcelService } from './excel.service';
import { PdfService } from './pdf.service';
import { ImportValidationService } from './import-validation.service';
import { NotificationService } from './notification.service';
import { HeatingRoomsService } from './heating-rooms.service';
import { DynamicHeatingRecord } from '../models/records.model';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { signal } from '@angular/core';

describe('HeatingDataService', () => {
  let service: HeatingDataService;
  let mockStorageService: ReturnType<typeof createMockStorageService>;
  let mockFileStorageService: ReturnType<typeof createMockFileStorageService>;
  let mockLanguageService: ReturnType<typeof createMockLanguageService>;
  let mockExcelService: ReturnType<typeof createMockExcelService>;
  let mockPdfService: ReturnType<typeof createMockPdfService>;
  let mockImportValidationService: ReturnType<typeof createMockImportValidationService>;
  let mockNotificationService: ReturnType<typeof createMockNotificationService>;
  let mockRoomsService: ReturnType<typeof createMockRoomsService>;

  // Mock factory functions
  function createMockStorageService() {
    return {
      load: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      exportRecords: vi.fn().mockResolvedValue('[]'),
      importRecords: vi.fn().mockResolvedValue(undefined)
    };
  }

  function createMockFileStorageService() {
    return {
      exportToFile: vi.fn(),
      importFromFile: vi.fn().mockResolvedValue([])
    };
  }

  function createMockLanguageService() {
    return {
      currentLang: signal('en'),
      translate: vi.fn((key: string) => key)
    };
  }

  function createMockExcelService() {
    return {
      exportHeatingToExcel: vi.fn(),
      importHeatingFromExcel: vi.fn().mockResolvedValue({ records: [], missingColumns: [] })
    };
  }

  function createMockPdfService() {
    return {
      exportHeatingToPdf: vi.fn().mockResolvedValue(undefined)
    };
  }

  function createMockImportValidationService() {
    return {
      validateDataArray: vi.fn().mockReturnValue(null),
      validateHeatingJsonImport: vi.fn().mockReturnValue({ validRecords: [], errors: [] }),
      getJsonErrorInstructions: vi.fn().mockReturnValue([]),
      getExcelErrorInstructions: vi.fn().mockReturnValue([])
    };
  }

  function createMockNotificationService() {
    return {
      setHeatingRecords: vi.fn()
    };
  }

  function createMockRoomsService() {
    return {
      rooms: signal([
        { id: 'room_1', name: 'Living Room' },
        { id: 'room_2', name: 'Bedroom' }
      ])
    };
  }

  function createTestRecord(date: Date, rooms: Record<string, number> = { room_1: 100 }): DynamicHeatingRecord {
    return { date, rooms };
  }

  beforeEach(() => {
    mockStorageService = createMockStorageService();
    mockFileStorageService = createMockFileStorageService();
    mockLanguageService = createMockLanguageService();
    mockExcelService = createMockExcelService();
    mockPdfService = createMockPdfService();
    mockImportValidationService = createMockImportValidationService();
    mockNotificationService = createMockNotificationService();
    mockRoomsService = createMockRoomsService();

    TestBed.configureTestingModule({
      providers: [
        HeatingDataService,
        { provide: STORAGE_SERVICE, useValue: mockStorageService },
        { provide: FileStorageService, useValue: mockFileStorageService },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: ExcelService, useValue: mockExcelService },
        { provide: PdfService, useValue: mockPdfService },
        { provide: ImportValidationService, useValue: mockImportValidationService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: HeatingRoomsService, useValue: mockRoomsService }
      ]
    });
    service = TestBed.inject(HeatingDataService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initial state', () => {
    it('should have empty records initially', () => {
      expect(service.records()).toEqual([]);
    });

    it('should not be exporting initially', () => {
      expect(service.isExporting()).toBe(false);
    });

    it('should not be importing initially', () => {
      expect(service.isImporting()).toBe(false);
    });

    it('should not show import confirm modal initially', () => {
      expect(service.showImportConfirmModal()).toBe(false);
    });

    it('should not have pending import file initially', () => {
      expect(service.pendingImportFile()).toBeNull();
    });

    it('should not show error modal initially', () => {
      expect(service.showErrorModal()).toBe(false);
    });

    it('should not show success modal initially', () => {
      expect(service.showSuccessModal()).toBe(false);
    });
  });

  describe('loadData', () => {
    it('should load records from storage', async () => {
      const storedRecords = [
        { date: '2024-01-15T00:00:00.000Z', rooms: { room_1: 100, room_2: 50 } }
      ];
      mockStorageService.load.mockResolvedValue(storedRecords);

      await service.loadData();

      expect(mockStorageService.load).toHaveBeenCalledWith('heating_consumption_records');
      expect(service.records().length).toBe(1);
      expect(service.records()[0].rooms['room_1']).toBe(100);
    });



    it('should update notification service after loading', async () => {
      const storedRecords = [{ date: '2024-01-15T00:00:00.000Z', rooms: { room_1: 100 } }];
      mockStorageService.load.mockResolvedValue(storedRecords);

      await service.loadData();

      expect(mockNotificationService.setHeatingRecords).toHaveBeenCalled();
    });

    it('should handle null storage response', async () => {
      mockStorageService.load.mockResolvedValue(null);

      await service.loadData();

      expect(service.records()).toEqual([]);
    });

    it('should parse date strings to Date objects', async () => {
      const storedRecords = [
        { date: '2024-01-15T00:00:00.000Z', rooms: { room_1: 100 } }
      ];
      mockStorageService.load.mockResolvedValue(storedRecords);

      await service.loadData();

      expect(service.records()[0].date instanceof Date).toBe(true);
    });
  });

  describe('saveRecord', () => {
    it('should add new record when not editing', async () => {
      const newRecord = createTestRecord(new Date(2024, 0, 15));

      await service.saveRecord(newRecord, null);

      expect(service.records().length).toBe(1);
      expect(service.records()[0]).toBe(newRecord);
    });

    it('should update existing record when editing', async () => {
      const originalRecord = createTestRecord(new Date(2024, 0, 15), { room_1: 100 });
      const updatedRecord = createTestRecord(new Date(2024, 0, 15), { room_1: 200 });

      // Add initial record
      await service.saveRecord(originalRecord, null);
      expect(service.records()[0].rooms['room_1']).toBe(100);

      // Update it
      await service.saveRecord(updatedRecord, originalRecord);

      expect(service.records().length).toBe(1);
      expect(service.records()[0].rooms['room_1']).toBe(200);
    });

    it('should save to storage after adding', async () => {
      const newRecord = createTestRecord(new Date(2024, 0, 15));

      await service.saveRecord(newRecord, null);

      expect(mockStorageService.save).toHaveBeenCalledWith('heating_consumption_records', expect.any(Array));
    });

    it('should update notification service after saving', async () => {
      const newRecord = createTestRecord(new Date(2024, 0, 15));

      await service.saveRecord(newRecord, null);

      expect(mockNotificationService.setHeatingRecords).toHaveBeenCalled();
    });
  });

  describe('deleteRecord', () => {
    it('should remove record by date', async () => {
      const record1 = createTestRecord(new Date(2024, 0, 15));
      const record2 = createTestRecord(new Date(2024, 0, 16));
      await service.saveRecord(record1, null);
      await service.saveRecord(record2, null);

      await service.deleteRecord(record1);

      expect(service.records().length).toBe(1);
      expect(service.records()[0].date.getTime()).toBe(record2.date.getTime());
    });

    it('should save to storage after deletion', async () => {
      const record = createTestRecord(new Date(2024, 0, 15));
      await service.saveRecord(record, null);
      vi.clearAllMocks();

      await service.deleteRecord(record);

      expect(mockStorageService.save).toHaveBeenCalledWith('heating_consumption_records', []);
    });

    it('should update notification service after deletion', async () => {
      const record = createTestRecord(new Date(2024, 0, 15));
      await service.saveRecord(record, null);
      vi.clearAllMocks();

      await service.deleteRecord(record);

      expect(mockNotificationService.setHeatingRecords).toHaveBeenCalled();
    });
  });

  describe('deleteRecords', () => {
    it('should remove multiple records', async () => {
      const record1 = createTestRecord(new Date(2024, 0, 15));
      const record2 = createTestRecord(new Date(2024, 0, 16));
      const record3 = createTestRecord(new Date(2024, 0, 17));
      await service.saveRecord(record1, null);
      await service.saveRecord(record2, null);
      await service.saveRecord(record3, null);

      await service.deleteRecords([record1, record3]);

      expect(service.records().length).toBe(1);
      expect(service.records()[0].date.getTime()).toBe(record2.date.getTime());
    });

    it('should handle empty array', async () => {
      const record = createTestRecord(new Date(2024, 0, 15));
      await service.saveRecord(record, null);

      await service.deleteRecords([]);

      expect(service.records().length).toBe(1);
    });
  });

  describe('exportData', () => {
    it('should set isExporting during export', async () => {
      let exportingDuringCall = false;
      mockStorageService.exportRecords.mockImplementation(async () => {
        exportingDuringCall = service.isExporting();
        return '[]';
      });

      await service.exportData();

      expect(exportingDuringCall).toBe(true);
      expect(service.isExporting()).toBe(false);
    });

    it('should call storage exportRecords', async () => {
      await service.exportData();

      expect(mockStorageService.exportRecords).toHaveBeenCalledWith('heating_consumption_records');
    });

    it('should call fileStorage exportToFile', async () => {
      mockStorageService.exportRecords.mockResolvedValue('{"test": true}');

      await service.exportData();

      expect(mockFileStorageService.exportToFile).toHaveBeenCalledWith('{"test": true}', 'heating-consumption.json');
    });

    it('should reset isExporting even on error', async () => {
      mockStorageService.exportRecords.mockRejectedValue(new Error('Export failed'));

      await expect(service.exportData()).rejects.toThrow();

      expect(service.isExporting()).toBe(false);
    });
  });

  describe('exportToExcel', () => {
    it('should call excelService exportHeatingToExcel', async () => {
      const record = createTestRecord(new Date(2024, 0, 15));
      await service.saveRecord(record, null);

      await service.exportToExcel();

      expect(mockExcelService.exportHeatingToExcel).toHaveBeenCalledWith(
        expect.any(Array),
        'heating-consumption.xlsx'
      );
    });

    it('should show error modal on export failure', async () => {
      mockExcelService.exportHeatingToExcel.mockImplementation(() => {
        throw new Error('Excel failed');
      });

      await service.exportToExcel();

      expect(service.showErrorModal()).toBe(true);
    });

    it('should reset isExporting after error', async () => {
      mockExcelService.exportHeatingToExcel.mockImplementation(() => {
        throw new Error('Excel failed');
      });

      await service.exportToExcel();

      expect(service.isExporting()).toBe(false);
    });
  });

  describe('exportToPdf', () => {
    it('should call pdfService with room names', async () => {
      await service.exportToPdf();

      expect(mockPdfService.exportHeatingToPdf).toHaveBeenCalledWith(
        expect.any(Array),
        ['Living Room', 'Bedroom'],
        'heating-consumption.pdf'
      );
    });

    it('should reset isExporting after completion', async () => {
      await service.exportToPdf();

      expect(service.isExporting()).toBe(false);
    });
  });

  describe('importData', () => {
    it('should set pending import file', () => {
      const mockFile = new File(['test'], 'test.json', { type: 'application/json' });
      const event = createFileInputEvent(mockFile);

      service.importData(event);

      expect(service.pendingImportFile()).toBe(mockFile);
    });

    it('should show import confirm modal', () => {
      const mockFile = new File(['test'], 'test.json', { type: 'application/json' });
      const event = createFileInputEvent(mockFile);

      service.importData(event);

      expect(service.showImportConfirmModal()).toBe(true);
    });

    it('should clear input value after reading', () => {
      const mockFile = new File(['test'], 'test.json', { type: 'application/json' });
      const event = createFileInputEvent(mockFile);
      const input = event.target as HTMLInputElement;

      service.importData(event);

      expect(input.value).toBe('');
    });

    it('should do nothing if no file selected', () => {
      const event = createFileInputEvent(null);

      service.importData(event);

      expect(service.pendingImportFile()).toBeNull();
      expect(service.showImportConfirmModal()).toBe(false);
    });
  });

  describe('confirmImport', () => {
    it('should cancel if no pending file', async () => {
      await service.confirmImport();

      expect(mockFileStorageService.importFromFile).not.toHaveBeenCalled();
    });

    it('should validate imported data as array', async () => {
      setupPendingImport();
      mockFileStorageService.importFromFile.mockResolvedValue([]);

      await service.confirmImport();

      expect(mockImportValidationService.validateDataArray).toHaveBeenCalled();
    });

    it('should show error on array validation failure', async () => {
      setupPendingImport();
      mockFileStorageService.importFromFile.mockResolvedValue('not an array');
      mockImportValidationService.validateDataArray.mockReturnValue('Data must be an array');

      await service.confirmImport();

      expect(service.showErrorModal()).toBe(true);
    });

    it('should validate heating JSON import', async () => {
      setupPendingImport();
      mockFileStorageService.importFromFile.mockResolvedValue([
        { date: '2024-01-15', rooms: { room_1: 100 } }
      ]);
      mockImportValidationService.validateDataArray.mockReturnValue(null);
      mockImportValidationService.validateHeatingJsonImport.mockReturnValue({
        validRecords: [],
        errors: []
      });

      await service.confirmImport();

      expect(mockImportValidationService.validateHeatingJsonImport).toHaveBeenCalled();
    });

    it('should show error on validation errors', async () => {
      setupPendingImport();
      mockFileStorageService.importFromFile.mockResolvedValue([{ invalid: true }]);
      mockImportValidationService.validateDataArray.mockReturnValue(null);
      mockImportValidationService.validateHeatingJsonImport.mockReturnValue({
        validRecords: [],
        errors: ['Invalid record format']
      });

      await service.confirmImport();

      expect(service.showErrorModal()).toBe(true);
    });

    it('should show success modal on successful import', async () => {
      setupPendingImport();
      const importedRecords = [
        { date: new Date(2024, 0, 15), rooms: { room_1: 100 } }
      ];
      mockFileStorageService.importFromFile.mockResolvedValue(importedRecords);
      mockImportValidationService.validateDataArray.mockReturnValue(null);
      mockImportValidationService.validateHeatingJsonImport.mockReturnValue({
        validRecords: importedRecords,
        errors: []
      });

      await service.confirmImport();

      expect(service.showSuccessModal()).toBe(true);
    });

    it('should show warning when placeholders are skipped', async () => {
      setupPendingImport();
      const recordsWithZeros = [
        { date: new Date(2024, 0, 15), rooms: { room_1: 0 } }, // All zero - skipped
        { date: new Date(2024, 0, 16), rooms: { room_1: 100 } } // Valid
      ];
      mockFileStorageService.importFromFile.mockResolvedValue(recordsWithZeros);
      mockImportValidationService.validateDataArray.mockReturnValue(null);
      mockImportValidationService.validateHeatingJsonImport.mockReturnValue({
        validRecords: recordsWithZeros,
        errors: []
      });

      await service.confirmImport();

      expect(service.showErrorModal()).toBe(true);
      expect(service.errorType()).toBe('warning');
    });

    it('should reset importing state after completion', async () => {
      setupPendingImport();

      await service.confirmImport();

      expect(service.isImporting()).toBe(false);
    });

    it('should clear pending file after completion', async () => {
      setupPendingImport();

      await service.confirmImport();

      expect(service.pendingImportFile()).toBeNull();
    });
  });

  describe('cancelImport', () => {
    it('should close import confirm modal', () => {
      setupPendingImport();

      service.cancelImport();

      expect(service.showImportConfirmModal()).toBe(false);
    });

    it('should clear pending file', () => {
      setupPendingImport();

      service.cancelImport();

      expect(service.pendingImportFile()).toBeNull();
    });
  });

  describe('importFromExcel', () => {
    it('should validate file extension', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const event = createFileInputEvent(mockFile);

      await service.importFromExcel(event);

      expect(service.showErrorModal()).toBe(true);
    });

    it('should accept xlsx files', async () => {
      const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const event = createFileInputEvent(mockFile);
      mockExcelService.importHeatingFromExcel.mockResolvedValue({ records: [], missingColumns: [] });

      await service.importFromExcel(event);

      expect(mockExcelService.importHeatingFromExcel).toHaveBeenCalled();
    });

    it('should accept xls files', async () => {
      const mockFile = new File(['test'], 'test.xls', { type: 'application/vnd.ms-excel' });
      const event = createFileInputEvent(mockFile);
      mockExcelService.importHeatingFromExcel.mockResolvedValue({ records: [], missingColumns: [] });

      await service.importFromExcel(event);

      expect(mockExcelService.importHeatingFromExcel).toHaveBeenCalled();
    });

    it('should accept csv files', async () => {
      const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      const event = createFileInputEvent(mockFile);
      mockExcelService.importHeatingFromExcel.mockResolvedValue({ records: [], missingColumns: [] });

      await service.importFromExcel(event);

      expect(mockExcelService.importHeatingFromExcel).toHaveBeenCalled();
    });

    it('should merge imported records with existing', async () => {
      const existingRecord = createTestRecord(new Date(2024, 0, 15), { room_1: 100 });
      await service.saveRecord(existingRecord, null);

      const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const event = createFileInputEvent(mockFile);
      const importedRecords = [createTestRecord(new Date(2024, 0, 16), { room_1: 200 })];
      mockExcelService.importHeatingFromExcel.mockResolvedValue({ records: importedRecords, missingColumns: [] });

      await service.importFromExcel(event);

      expect(service.records().length).toBe(2);
    });

    it('should deduplicate records by date', async () => {
      const existingRecord = createTestRecord(new Date(2024, 0, 15), { room_1: 100 });
      await service.saveRecord(existingRecord, null);

      const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const event = createFileInputEvent(mockFile);
      // Same date, different value
      const importedRecords = [createTestRecord(new Date(2024, 0, 15), { room_1: 200 })];
      mockExcelService.importHeatingFromExcel.mockResolvedValue({ records: importedRecords, missingColumns: [] });

      await service.importFromExcel(event);

      expect(service.records().length).toBe(1);
      expect(service.records()[0].rooms['room_1']).toBe(200); // New value overwrites
    });

    it('should show warning for missing columns', async () => {
      const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const event = createFileInputEvent(mockFile);
      mockExcelService.importHeatingFromExcel.mockResolvedValue({
        records: [createTestRecord(new Date(2024, 0, 15))],
        missingColumns: ['Bedroom', 'Kitchen']
      });

      await service.importFromExcel(event);

      expect(service.showErrorModal()).toBe(true);
      expect(service.errorType()).toBe('warning');
    });

    it('should show success on clean import', async () => {
      const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const event = createFileInputEvent(mockFile);
      mockExcelService.importHeatingFromExcel.mockResolvedValue({
        records: [createTestRecord(new Date(2024, 0, 15))],
        missingColumns: []
      });

      await service.importFromExcel(event);

      expect(service.showSuccessModal()).toBe(true);
    });

    it('should reset isImporting after completion', async () => {
      const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const event = createFileInputEvent(mockFile);

      await service.importFromExcel(event);

      expect(service.isImporting()).toBe(false);
    });

    it('should clear input value after import', async () => {
      const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const event = createFileInputEvent(mockFile);
      const input = event.target as HTMLInputElement;
      mockExcelService.importHeatingFromExcel.mockResolvedValue({ records: [], missingColumns: [] });

      await service.importFromExcel(event);

      expect(input.value).toBe('');
    });

    it('should do nothing if no file selected', async () => {
      const event = createFileInputEvent(null);

      await service.importFromExcel(event);

      expect(mockExcelService.importHeatingFromExcel).not.toHaveBeenCalled();
    });
  });

  describe('Modal management', () => {
    it('should close success modal', () => {
      // Trigger success modal through import
      service['showSuccessModal'].set(true);

      service.closeSuccessModal();

      expect(service.showSuccessModal()).toBe(false);
    });

    it('should close error modal', () => {
      service['showErrorModal'].set(true);

      service.closeErrorModal();

      expect(service.showErrorModal()).toBe(false);
    });
  });

  // Helper functions
  function createFileInputEvent(file: File | null): Event {
    const input = {
      files: file ? [file] : null,
      value: file ? file.name : ''
    } as unknown as HTMLInputElement;
    return { target: input } as unknown as Event;
  }

  function setupPendingImport(): void {
    const mockFile = new File(['test'], 'test.json', { type: 'application/json' });
    const event = createFileInputEvent(mockFile);
    service.importData(event);
  }
});
