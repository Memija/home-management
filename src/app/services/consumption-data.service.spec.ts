import { TestBed } from '@angular/core/testing';
import { ConsumptionDataService } from './consumption-data.service';
import { STORAGE_SERVICE } from './storage.service';
import { FileStorageService } from './file-storage.service';
import { ExcelService } from './excel.service';
import { PdfService } from './pdf.service';
import { ImportValidationService } from './import-validation.service';
import { LanguageService } from './language.service';
import { HouseholdService } from './household.service';
import { NotificationService } from './notification.service';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ConsumptionRecord } from '../models/records.model';

describe('ConsumptionDataService', () => {
  let service: ConsumptionDataService;
  let storageServiceMock: any;
  let fileStorageServiceMock: any;
  let excelServiceMock: any;
  let pdfServiceMock: any;
  let importValidationServiceMock: any;
  let languageServiceMock: any;
  let householdServiceMock: any;
  let notificationServiceMock: any;

  const mockRecords: ConsumptionRecord[] = [
    {
      date: new Date('2023-01-01'),
      kitchenWarm: 10,
      kitchenCold: 5,
      bathroomWarm: 3,
      bathroomCold: 2,
    },
    {
      date: new Date('2023-01-08'),
      kitchenWarm: 12,
      kitchenCold: 6,
      bathroomWarm: 4,
      bathroomCold: 3,
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
      exportWaterToExcel: vi.fn().mockResolvedValue(undefined),
      importWaterFromExcel: vi.fn().mockResolvedValue({ records: [], missingColumns: [] }),
    };

    pdfServiceMock = {
      exportWaterToPdf: vi.fn().mockResolvedValue(undefined),
    };

    importValidationServiceMock = {
      validateDataArray: vi.fn(),
      validateWaterJsonImport: vi.fn().mockReturnValue({ validRecords: [], errors: [] }),
      getJsonErrorInstructions: vi.fn(),
      getExcelErrorInstructions: vi.fn(),
    };

    languageServiceMock = {
      translate: vi.fn((key: string) => key),
    };

    householdServiceMock = {};

    notificationServiceMock = {
      setWaterRecords: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ConsumptionDataService,
        { provide: STORAGE_SERVICE, useValue: storageServiceMock },
        { provide: FileStorageService, useValue: fileStorageServiceMock },
        { provide: ExcelService, useValue: excelServiceMock },
        { provide: PdfService, useValue: pdfServiceMock },
        { provide: ImportValidationService, useValue: importValidationServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        { provide: HouseholdService, useValue: householdServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
      ],
    });

    service = TestBed.inject(ConsumptionDataService);
  });

  it('should be created and load data', async () => {
    expect(service).toBeTruthy();
    await new Promise(resolve => setTimeout(resolve, 0)); // Wait for loadData promise
    expect(storageServiceMock.load).toHaveBeenCalledWith('water_consumption_records');
    expect(service.records()).toEqual(mockRecords);
  });

  describe('Filter Logic', () => {
    it('should filter records by date range', async () => {
        await new Promise(resolve => setTimeout(resolve, 0)); // ensure initial load finishes
      service.updateFilterState({
        year: null,
        month: null,
        startDate: '2023-01-02',
        endDate: '2023-01-09',
      });

      const filtered = service.filteredRecords();
      expect(filtered.length).toBe(1);
      expect(new Date(filtered[0].date).toISOString().split('T')[0]).toBe('2023-01-08');
    });

    it('should filter records by year', async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      service.updateFilterState({
        year: 2023,
        month: null,
        startDate: null,
        endDate: null,
      });

      const filtered = service.filteredRecords();
      expect(filtered.length).toBe(2);
    });

    it('should check if filter is active', () => {
      expect(service.isFilterActive()).toBe(false);
      service.updateFilterState({
        year: 2023,
        month: null,
        startDate: null,
        endDate: null,
      });
      expect(service.isFilterActive()).toBe(true);
    });
  });

  describe('CRUD Operations', () => {
    it('should save a new record', async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      const newRecord: ConsumptionRecord = {
        date: new Date('2023-01-15'),
        kitchenWarm: 15,
        kitchenCold: 7,
        bathroomWarm: 5,
        bathroomCold: 4,
      };

      await service.saveRecord(newRecord);

      expect(service.records().length).toBe(3);
      expect(storageServiceMock.save).toHaveBeenCalled();
      expect(notificationServiceMock.setWaterRecords).toHaveBeenCalled();
      expect(service.showSuccessModal()).toBe(true);
    });

    it('should update an existing record', async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      const updatedRecord: ConsumptionRecord = {
        ...mockRecords[0],
        kitchenWarm: 99,
      };

      await service.saveRecord(updatedRecord);

      expect(service.records().length).toBe(2);
      expect(service.records()[0].kitchenWarm).toBe(99);
      expect(storageServiceMock.save).toHaveBeenCalled();
    });

    it('should confirm delete record', async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      service.recordToDelete.set(mockRecords[0]);
      service.showDeleteModal.set(true);

      service.confirmDelete();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.records().length).toBe(1);
      expect(storageServiceMock.save).toHaveBeenCalled();
      expect(service.showDeleteModal()).toBe(false);
    });

    it('should confirm delete all records', async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      service.recordsToDelete.set([mockRecords[0]]);
      service.showDeleteAllModal.set(true);

      service.confirmDeleteAll();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(service.records().length).toBe(1);
      expect(storageServiceMock.save).toHaveBeenCalled();
      expect(service.showDeleteAllModal()).toBe(false);
    });
  });

  describe('Export', () => {
    it('should export to JSON', async () => {
      await service.exportData();
      expect(fileStorageServiceMock.exportToFile).toHaveBeenCalled();
    });

    it('should export to Excel', async () => {
      await service.exportToExcel();
      expect(excelServiceMock.exportWaterToExcel).toHaveBeenCalled();
    });

    it('should export to PDF', async () => {
      await service.exportToPdf();
      expect(pdfServiceMock.exportWaterToPdf).toHaveBeenCalled();
    });
  });

  describe('Import', () => {
    it('should handle JSON import confirmation', async () => {
      const file = new File([''], 'test.json', { type: 'application/json' });
      service.pendingImportFile.set(file);

      const importedData = [{ ...mockRecords[0] }];
      fileStorageServiceMock.importFromFile.mockResolvedValue(importedData);
      importValidationServiceMock.validateWaterJsonImport.mockReturnValue({ validRecords: importedData, errors: [] });

      await service.confirmImport();

      expect(storageServiceMock.save).toHaveBeenCalled();
      expect(service.showSuccessModal()).toBe(true);
    });

     it('should handle Excel import', async () => {
        const file = new File([''], 'test.xlsx');
        const event = { target: { files: [file], value: '' } } as unknown as Event;

        const importedRecords = [{ ...mockRecords[0] }];
        excelServiceMock.importWaterFromExcel.mockResolvedValue({ records: importedRecords, missingColumns: [] });

        await service.importFromExcel(event);

        expect(storageServiceMock.save).toHaveBeenCalled();
     });
  });
});
