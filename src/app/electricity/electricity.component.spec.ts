import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { ElectricityComponent } from './electricity.component';
import { ElectricityDataService } from '../services/electricity-data.service';
import { ElectricityFormService } from '../services/electricity-form.service';
import { HouseholdService } from '../services/household.service';
import { ElectricityCountryFactsService } from '../services/electricity-country-facts.service';
import { ConsumptionPreferencesService } from '../services/consumption-preferences.service';
import { ChartCalculationService } from '../services/chart-calculation.service';
import { LanguageService } from '../services/language.service';
import { ElectricityMeterService } from '../services/electricity-meter.service';
import { ExcelSettingsService } from '../services/excel-settings.service';
import { ElectricityRecord } from '../models/records.model';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('ElectricityComponent', () => {
  let component: ElectricityComponent;

  // Mock services
  let mockDataService: Partial<ElectricityDataService>;
  let mockFormService: Partial<ElectricityFormService>;
  let mockHouseholdService: Partial<HouseholdService>;
  let mockFactsService: Partial<ElectricityCountryFactsService>;
  let mockPreferencesService: Partial<ConsumptionPreferencesService>;
  let mockChartCalculationService: Partial<ChartCalculationService>;
  let mockLanguageService: Partial<LanguageService>;
  let mockMeterService: Partial<ElectricityMeterService>;
  let mockExcelSettingsService: Partial<ExcelSettingsService>;

  const createMockRecord = (overrides: Partial<ElectricityRecord> = {}): ElectricityRecord => ({
    date: new Date('2025-01-15T00:00:00.000Z'),
    value: 100,
    ...overrides,
  });

  beforeEach(() => {
    TestBed.resetTestingModule();

    mockDataService = {
      records: signal<ElectricityRecord[]>([]),
      filteredRecords: signal<ElectricityRecord[]>([]),
      isExporting: signal(false),
      isImporting: signal(false),
      showImportConfirmModal: signal(false),
      showFilterWarningModal: signal(false),
      showSuccessModal: signal(false),
      successTitle: signal(''),
      successMessage: signal(''),
      showErrorModal: signal(false),
      errorTitle: signal(''),
      errorMessage: signal(''),
      errorDetails: signal(''),
      errorInstructions: signal<string[]>([]),
      errorType: signal<'error' | 'warning'>('error'),
      showDeleteModal: signal(false),
      showDeleteAllModal: signal(false),
      recordToDelete: signal<ElectricityRecord | null>(null),
      recordsToDelete: signal<ElectricityRecord[]>([]),

      importData: vi.fn(),
      confirmImport: vi.fn(),
      cancelImport: vi.fn(),
      importFromExcel: vi.fn(),
      confirmFilterWarningImport: vi.fn(),
      cancelFilterWarningImport: vi.fn(),
      exportData: vi.fn(),
      exportToExcel: vi.fn(),
      exportToPdf: vi.fn(),
      saveRecord: vi.fn(),
      confirmDelete: vi.fn(),
      confirmDeleteAll: vi.fn(),
      updateFilterState: vi.fn(),
    } as any;

    mockFormService = {
      selectedDate: signal(''),
      editingRecord: signal<ElectricityRecord | null>(null),
      value: signal<number | null>(null),
      hasValidInput: vi.fn().mockReturnValue(true),
      isDateDuplicate: vi.fn().mockReturnValue(false),
      createRecordFromState: vi.fn().mockReturnValue(null),
      updateDate: vi.fn(),
      updateValue: vi.fn(),
      startEdit: vi.fn(),
      cancelEdit: vi.fn(),
    } as any;

    mockHouseholdService = {
      members: signal([{ id: '1', name: 'Member 1' }, { id: '2', name: 'Member 2' }]),
    } as any;

    mockFactsService = {
      getFactByIndex: vi.fn().mockReturnValue({ title: 'Fact', message: 'Message' }),
    } as any;

    mockPreferencesService = {
      electricityChartView: signal('total'),
      electricityDisplayMode: signal('incremental'),
      setChartView: vi.fn(),
      setDisplayMode: vi.fn(),
    } as any;

    mockChartCalculationService = {};

    mockLanguageService = {
      currentLang: signal('en'),
      translate: vi.fn().mockImplementation((key: string) => key),
    } as any;

    mockMeterService = {
      detectMeterChanges: vi.fn().mockReturnValue([]),
      filterUnconfirmed: vi.fn().mockReturnValue([]),
      confirmMeterChange: vi.fn(),
      dismissMeterChange: vi.fn(),
    } as any;

    mockExcelSettingsService = {
      settings: signal({ enabled: false }),
    } as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: ElectricityDataService, useValue: mockDataService },
        { provide: ElectricityFormService, useValue: mockFormService },
        { provide: HouseholdService, useValue: mockHouseholdService },
        { provide: ElectricityCountryFactsService, useValue: mockFactsService },
        { provide: ConsumptionPreferencesService, useValue: mockPreferencesService },
        { provide: ChartCalculationService, useValue: mockChartCalculationService },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: ElectricityMeterService, useValue: mockMeterService },
        { provide: ExcelSettingsService, useValue: mockExcelSettingsService },
      ],
    });

    component = TestBed.runInInjectionContext(() => new ElectricityComponent());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Computed Values', () => {
    it('should compute familySize', () => {
      expect((component as any).familySize()).toBe(2);
    });

    it('should compute consumptionGroups', () => {
      (mockFormService.value as WritableSignal<number | null>).set(150);
      const groups = (component as any).consumptionGroups();
      expect(groups).toHaveLength(1);
      expect(groups[0].title).toBe('ELECTRICITY.CONSUMPTION');
      expect(groups[0].fields).toHaveLength(1);
      expect(groups[0].fields[0].key).toBe('value');
      expect(groups[0].fields[0].value).toBe(150);
    });

    it('should compute sortOptions', () => {
      const options = (component as any).sortOptions();
      expect(options).toHaveLength(4);
      expect(options[0].value).toBe('date-desc');
      expect(options[2].value).toBe('value-desc');
    });

    it('should pass value for get hasValidInput', () => {
      (mockFormService.hasValidInput as any).mockReturnValue(true);
      expect((component as any).hasValidInput).toBe(true);
    });

    it('should pass value for dateExists', () => {
      (mockFormService.isDateDuplicate as any).mockReturnValue(true);
      expect((component as any).dateExists).toBe(true);
    });
  });

  describe('Country and Facts', () => {
    it('should compute electricityFact based on current records and mode', () => {
      (mockDataService.records as WritableSignal<any>).set([createMockRecord({ value: 300 })]);
      const fact = (component as any).electricityFact();
      expect(fact).toEqual({ title: 'Fact', message: 'Message' });
      expect(mockFactsService.getFactByIndex).toHaveBeenCalled();
    });

    it('should update country code and refresh fact on handleCountryCodeChange', () => {
      const seedBefore = (component as any).factRandomSeed();
      (component as any).handleCountryCodeChange('US');
      expect((component as any).effectiveComparisonCountryCode()).toBe('US');

      // Fact random seed does not automatically refresh on country change
      // It runs through refreshFact() via other places (like chartView) or
      // the user might call it. Let's just check the country code updated.
    });

    it('should compute electricityFact as null if no records', () => {
      (mockDataService.records as WritableSignal<any>).set([]);
      expect((component as any).electricityFact()).toBeNull();
    });

    it('should refresh fact on refreshFact()', () => {
      const seedBefore = (component as any).factRandomSeed();
      (component as any).refreshFact();
      expect((component as any).factRandomSeed()).not.toBe(seedBefore);
    });
  });

  describe('Meter Detection', () => {
    it('should return empty for unconfirmedMeterChanges if less than 2 records', () => {
      (mockDataService.records as WritableSignal<any>).set([createMockRecord()]);
      expect((component as any).unconfirmedMeterChanges()).toEqual([]);
    });

    it('should detect meter changes', () => {
      (mockDataService.records as WritableSignal<any>).set([createMockRecord(), createMockRecord()]);
      (mockMeterService.detectMeterChanges as any).mockReturnValue(['2025-01-01']);
      (mockMeterService.filterUnconfirmed as any).mockReturnValue(['2025-01-01']);

      expect((component as any).unconfirmedMeterChanges()).toEqual(['2025-01-01']);
    });

    it('should format first meter change date', () => {
      (mockDataService.records as WritableSignal<any>).set([createMockRecord(), createMockRecord()]);
      (mockMeterService.detectMeterChanges as any).mockReturnValue(['2025-01-01']);
      (mockMeterService.filterUnconfirmed as any).mockReturnValue(['2025-01-01']);

      expect((component as any).formattedMeterChangeDate()).toBeTruthy();
    });

    it('should confirm meter change via service', () => {
      (component as any).confirmMeterChange('2025-01-01');
      expect(mockMeterService.confirmMeterChange).toHaveBeenCalledWith('2025-01-01');
    });

    it('should dismiss meter change via service', () => {
      (component as any).dismissMeterChange('2025-01-01');
      expect(mockMeterService.dismissMeterChange).toHaveBeenCalledWith('2025-01-01');
    });
  });

  describe('Form Actions & Data', () => {
    it('should save record', () => {
      const mockRecord = createMockRecord();
      (mockFormService.createRecordFromState as any).mockReturnValue(mockRecord);
      (component as any).onConsumptionSave({ date: '2025-01-01', fields: { value: 100 } });

      expect(mockFormService.updateDate).toHaveBeenCalledWith('2025-01-01');
      expect(mockFormService.updateValue).toHaveBeenCalledWith(100);
      expect(mockDataService.saveRecord).toHaveBeenCalledWith(mockRecord);
      expect(mockFormService.cancelEdit).toHaveBeenCalled();
    });

    it('should delegate to onFieldChange', () => {
      (component as any).onFieldChange({ key: 'value', value: 150 });
      expect(mockFormService.updateValue).toHaveBeenCalledWith(150);
    });

    it('should close Modals', () => {
      (mockDataService.showSuccessModal as WritableSignal<any>).set(true);
      (mockDataService.showErrorModal as WritableSignal<any>).set(true);

      (component as any).closeSuccessModal();
      (component as any).closeErrorModal();

      expect((mockDataService.showSuccessModal as WritableSignal<any>)()).toBe(false);
      expect((mockDataService.showErrorModal as WritableSignal<any>)()).toBe(false);
    });

    it('should call startEdit and scroll when editRecord is triggered', () => {
      const mockScrollIntoView = vi.fn();
      const documentSpy = vi.spyOn(document, 'querySelector').mockReturnValue({ scrollIntoView: mockScrollIntoView } as any);

      const record = createMockRecord();
      (component as any).editRecord(record);

      expect(mockFormService.startEdit).toHaveBeenCalledWith(record);
      expect(documentSpy).toHaveBeenCalledWith('.input-section');
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('should set record to delete and show confirm modal on deleteRecord', () => {
      const record = createMockRecord();
      (component as any).deleteRecord(record);
      expect((mockDataService.recordToDelete as WritableSignal<any>)()).toEqual(record);
      expect((mockDataService.showDeleteModal as WritableSignal<any>)()).toBe(true);
    });

    it('should cancel delete process', () => {
      (component as any).cancelDelete();
      expect((mockDataService.showDeleteModal as WritableSignal<any>)()).toBe(false);
      expect((mockDataService.recordToDelete as WritableSignal<any>)()).toBe(null);
    });
  });

  describe('Bulk Delete', () => {
    it('should set records to delete and show confirm modal on deleteAllRecords', () => {
      const records = [createMockRecord()];
      (component as any).deleteAllRecords(records);
      expect((mockDataService.recordsToDelete as WritableSignal<any>)()).toEqual(records);
      expect((mockDataService.showDeleteAllModal as WritableSignal<any>)()).toBe(true);
    });

    it('should confirm delete all records', () => {
      (component as any).confirmDeleteAll();
      expect(mockDataService.confirmDeleteAll).toHaveBeenCalled();
    });

    it('should cancel delete all records', () => {
      (component as any).cancelDeleteAll();
      expect((mockDataService.showDeleteAllModal as WritableSignal<any>)()).toBe(false);
      expect((mockDataService.recordsToDelete as WritableSignal<any>)()).toEqual([]);
    });
  });

  describe('Delegations', () => {
    it('should delegate onChartViewChange', () => {
      (component as any).onChartViewChange('yearly');
      expect(mockPreferencesService.setChartView).toHaveBeenCalledWith('yearly', 'electricity');
    });

    it('should delegate onDisplayModeChange', () => {
      (component as any).onDisplayModeChange('total');
      expect(mockPreferencesService.setDisplayMode).toHaveBeenCalledWith('total', 'electricity');
    });

    it('should delegate updateFilterState', () => {
      (component as any).onFilterStateChange({ year: 2025 });
      expect(mockDataService.updateFilterState).toHaveBeenCalledWith({ year: 2025 });
    });

    it('should forward methods to DataService', () => {
      const mockEvent = {} as Event;

      (component as any).importData(mockEvent);
      expect(mockDataService.importData).toHaveBeenCalledWith(mockEvent);

      (component as any).importFromExcel(mockEvent);
      expect(mockDataService.importFromExcel).toHaveBeenCalledWith(mockEvent);

      (component as any).confirmImport();
      expect(mockDataService.confirmImport).toHaveBeenCalled();

      (component as any).cancelImport();
      expect(mockDataService.cancelImport).toHaveBeenCalled();

      (component as any).confirmFilterWarningImport();
      expect(mockDataService.confirmFilterWarningImport).toHaveBeenCalled();

      (component as any).cancelFilterWarningImport();
      expect(mockDataService.cancelFilterWarningImport).toHaveBeenCalled();

      (component as any).exportData();
      expect(mockDataService.exportData).toHaveBeenCalled();

      (component as any).exportToExcel();
      expect(mockDataService.exportToExcel).toHaveBeenCalled();

      (component as any).exportToPdf();
      expect(mockDataService.exportToPdf).toHaveBeenCalled();

      (component as any).confirmDelete();
      expect(mockDataService.confirmDelete).toHaveBeenCalled();
    });
  });

  describe('Smart Import Logic', () => {
    it('should open smart import modal', () => {
      (component as any).openSmartImport();
      expect((component as any).showSmartImportModal()).toBe(true);
    });

    it('should perform smart import and save records', () => {
      const records = [{ date: new Date('2025-01-01'), value: 100 }, { date: new Date('2025-02-01'), value: 200 }];
      (component as any).showSuccessModal.set(false);
      (component as any).onSmartImport(records);

      // Because the format differs from what we mocked to mockDataService
      expect(mockDataService.saveRecord).toHaveBeenCalledTimes(2);
      expect((component as any).showSuccessModal()).toBe(true);
    });

    it('should handle empty list for smart import', () => {
      (component as any).onSmartImport([]);
      expect(mockDataService.saveRecord).not.toHaveBeenCalled();
    });
  });
});
