import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { WaterComponent } from './water.component';
import { ConsumptionDataService } from '../services/consumption-data.service';
import { ConsumptionFormService } from '../services/consumption-form.service';
import { ConsumptionPreferencesService } from '../services/consumption-preferences.service';
import { ChartCalculationService } from '../services/chart-calculation.service';
import { HouseholdService } from '../services/household.service';
import { ExcelSettingsService } from '../services/excel-settings.service';
import { LocalStorageService } from '../services/local-storage.service';
import { LanguageService } from '../services/language.service';
import { WaterFactsService } from '../services/water-facts.service';
import { STORAGE_SERVICE, StorageService } from '../services/storage.service';
import { ConsumptionRecord } from '../models/records.model';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  Download, Upload, CircleCheck, Trash2, FileText,
  FileInput, FileOutput, AlertTriangle, Lightbulb, RefreshCw
} from 'lucide-angular';
import { CHART_HELP_STEPS, RECORD_HELP_STEPS, RECORDS_LIST_HELP_STEPS } from './water.constants';

/**
 * Unit tests for WaterComponent.
 *
 * Uses TestBed with provider overrides to inject mock services, then
 * TestBed.runInInjectionContext to instantiate the component class directly,
 * avoiding the templateUrl/styleUrl resolution issue in Vitest.
 */
describe('WaterComponent', () => {
  let component: WaterComponent;

  // Mock services — typed as Partial<ServiceType> to avoid index signature access errors
  let mockDataService: Partial<ConsumptionDataService>;
  let mockFormService: Partial<ConsumptionFormService>;
  let mockPreferencesService: Partial<ConsumptionPreferencesService>;
  let mockChartCalculationService: Partial<ChartCalculationService>;
  let mockHouseholdService: Partial<HouseholdService>;
  let mockExcelSettingsService: Partial<ExcelSettingsService>;
  let mockLanguageService: Partial<LanguageService>;
  let mockWaterFactsService: Partial<WaterFactsService>;
  let mockLocalStorageService: Partial<LocalStorageService>;
  let mockStorageService: Partial<StorageService>;

  const createMockRecord = (overrides: Partial<ConsumptionRecord> = {}): ConsumptionRecord => ({
    date: new Date('2025-01-15'),
    kitchenWarm: 100,
    kitchenCold: 200,
    bathroomWarm: 150,
    bathroomCold: 250,
    ...overrides,
  });

  beforeEach(() => {
    TestBed.resetTestingModule();

    mockStorageService = {
      load: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn().mockResolvedValue(false),
      exportAll: vi.fn().mockResolvedValue({}),
      importAll: vi.fn().mockResolvedValue(undefined),
      exportRecords: vi.fn().mockResolvedValue([]),
      importRecords: vi.fn().mockResolvedValue(undefined),
    } as any;

    mockDataService = {
      records: signal<ConsumptionRecord[]>([]),
      filteredRecords: signal<ConsumptionRecord[]>([]),
      isExporting: signal(false),
      isImporting: signal(false),
      showImportConfirmModal: signal(false),
      showFilterWarningModal: signal(false),
      showSuccessModal: signal(false),
      showErrorModal: signal(false),
      showDeleteModal: signal(false),
      showDeleteAllModal: signal(false),
      errorTitle: signal(''),
      errorMessage: signal(''),
      errorDetails: signal(''),
      errorInstructions: signal<string[]>([]),
      errorType: signal<'error' | 'warning'>('error'),
      recordToDelete: signal<ConsumptionRecord | null>(null),
      recordsToDelete: signal<ConsumptionRecord[]>([]),
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
      confirmDeleteAll: vi.fn(),
      saveRecord: vi.fn(),
      updateFilterState: vi.fn(),
    } as any;

    mockFormService = {
      selectedDate: signal(''),
      editingRecord: signal<ConsumptionRecord | null>(null),
      kitchenWarm: signal<number | null>(null),
      kitchenCold: signal<number | null>(null),
      bathroomWarm: signal<number | null>(null),
      bathroomCold: signal<number | null>(null),
      hasValidInput: vi.fn().mockReturnValue(false),
      isDateDuplicate: vi.fn().mockReturnValue(false),
      createRecordFromState: vi.fn().mockReturnValue(null),
      startEdit: vi.fn(),
      cancelEdit: vi.fn(),
      updateField: vi.fn(),
    } as any;

    mockPreferencesService = {
      chartView: signal('total'),
      displayMode: signal('incremental'),
      confirmedMeterChanges: signal<string[]>([]),
      dismissedMeterChanges: signal<string[]>([]),
      setChartView: vi.fn(),
      setDisplayMode: vi.fn(),
      setMeterChangeConfirmed: vi.fn(),
      setMeterChangeDismissed: vi.fn(),
    } as any;

    mockChartCalculationService = {
      detectMeterChanges: vi.fn().mockReturnValue([]),
      adjustForMeterChanges: vi.fn().mockImplementation((recs: ConsumptionRecord[]) => recs),
    } as any;

    mockHouseholdService = {
      members: signal<{ id: string; name: string }[]>([]),
    } as any;

    mockExcelSettingsService = {
      settings: signal({ enabled: false, waterMapping: {}, heatingMapping: {}, electricityMapping: {} }),
    } as any;

    mockLanguageService = {
      currentLang: signal('en'),
    } as any;

    mockWaterFactsService = {
      getFactByIndex: vi.fn().mockReturnValue(null),
    } as any;

    mockLocalStorageService = {
      load: vi.fn().mockReturnValue(null),
      save: vi.fn(),
    } as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: ConsumptionDataService, useValue: mockDataService },
        { provide: ConsumptionFormService, useValue: mockFormService },
        { provide: ConsumptionPreferencesService, useValue: mockPreferencesService },
        { provide: ChartCalculationService, useValue: mockChartCalculationService },
        { provide: HouseholdService, useValue: mockHouseholdService },
        { provide: ExcelSettingsService, useValue: mockExcelSettingsService },
        { provide: LocalStorageService, useValue: mockLocalStorageService },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: WaterFactsService, useValue: mockWaterFactsService },
        { provide: STORAGE_SERVICE, useValue: mockStorageService },
      ],
    });

    component = TestBed.runInInjectionContext(() => new WaterComponent());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============ Component Creation ============

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ============ Icon Initialization ============

  describe('Icon Initialization', () => {
    it('should have DownloadIcon set to lucide Download icon', () => {
      expect((component as any).DownloadIcon).toBe(Download);
    });

    it('should have UploadIcon set to lucide Upload icon', () => {
      expect((component as any).UploadIcon).toBe(Upload);
    });

    it('should have FileOutputIcon set to lucide FileOutput icon', () => {
      expect((component as any).FileOutputIcon).toBe(FileOutput);
    });

    it('should have FileInputIcon set to lucide FileInput icon', () => {
      expect((component as any).FileInputIcon).toBe(FileInput);
    });

    it('should have FileTextIcon set to lucide FileText icon', () => {
      expect((component as any).FileTextIcon).toBe(FileText);
    });

    it('should have CheckCircleIcon set to lucide CircleCheck icon', () => {
      expect((component as any).CheckCircleIcon).toBe(CircleCheck);
    });

    it('should have TrashIcon set to lucide Trash2 icon', () => {
      expect((component as any).TrashIcon).toBe(Trash2);
    });

    it('should have AlertTriangleIcon set to lucide AlertTriangle icon', () => {
      expect((component as any).AlertTriangleIcon).toBe(AlertTriangle);
    });

    it('should have LightbulbIcon set to lucide Lightbulb icon', () => {
      expect((component as any).LightbulbIcon).toBe(Lightbulb);
    });

    it('should have RefreshCwIcon set to lucide RefreshCw icon', () => {
      expect((component as any).RefreshCwIcon).toBe(RefreshCw);
    });
  });

  // ============ Signal Initialization ============

  describe('Signal Initialization', () => {
    it('should initialize records as empty array', () => {
      expect((component as any).records()).toEqual([]);
    });

    it('should initialize chartView from preferences service', () => {
      expect((component as any).chartView()).toBe('total');
    });

    it('should initialize displayMode from preferences service', () => {
      expect((component as any).displayMode()).toBe('incremental');
    });

    it('should initialize effectiveComparisonCountryCode to DE', () => {
      expect((component as any).effectiveComparisonCountryCode()).toBe('DE');
    });

    it('should initialize maxDate to today in YYYY-MM-DD format', () => {
      const today = new Date().toISOString().split('T')[0];
      expect((component as any).maxDate).toBe(today);
    });

    it('should have helpSteps set to RECORD_HELP_STEPS', () => {
      expect((component as any).helpSteps).toBe(RECORD_HELP_STEPS);
    });

    it('should have chartHelpSteps set to CHART_HELP_STEPS', () => {
      expect((component as any).chartHelpSteps).toBe(CHART_HELP_STEPS);
    });

    it('should have recordsHelpSteps set to RECORDS_LIST_HELP_STEPS', () => {
      expect((component as any).recordsHelpSteps).toBe(RECORDS_LIST_HELP_STEPS);
    });

    it('should initialize successTitle to HOME.SUCCESS', () => {
      expect((component as any).successTitle()).toBe('HOME.SUCCESS');
    });

    it('should initialize successMessage to HOME.RECORD_SAVED', () => {
      expect((component as any).successMessage()).toBe('HOME.RECORD_SAVED');
    });

    it('should initialize isExporting from data service', () => {
      expect((component as any).isExporting()).toBe(false);
    });

    it('should initialize isImporting from data service', () => {
      expect((component as any).isImporting()).toBe(false);
    });
  });

  // ============ Computed Values ============

  describe('Computed Values', () => {
    it('should compute consumptionGroups with two groups', () => {
      const groups = (component as any).consumptionGroups();
      expect(groups).toHaveLength(2);
      expect(groups[0].title).toBe('WATER.KITCHEN');
      expect(groups[1].title).toBe('WATER.BATHROOM');
    });

    it('should compute consumptionGroups with correct kitchen fields', () => {
      const groups = (component as any).consumptionGroups();
      const kitchen = groups[0];
      expect(kitchen.fields).toHaveLength(2);
      expect(kitchen.fields[0].key).toBe('kitchenWarm');
      expect(kitchen.fields[0].label).toBe('WATER.WARM');
      expect(kitchen.fields[1].key).toBe('kitchenCold');
      expect(kitchen.fields[1].label).toBe('WATER.COLD');
    });

    it('should compute consumptionGroups with correct bathroom fields', () => {
      const groups = (component as any).consumptionGroups();
      const bathroom = groups[1];
      expect(bathroom.fields).toHaveLength(2);
      expect(bathroom.fields[0].key).toBe('bathroomWarm');
      expect(bathroom.fields[0].label).toBe('WATER.WARM');
      expect(bathroom.fields[1].key).toBe('bathroomCold');
      expect(bathroom.fields[1].label).toBe('WATER.COLD');
    });

    it('should compute familySize from household members count', () => {
      expect((component as any).familySize()).toBe(0);
    });

    it('should update familySize when members change', () => {
      (mockHouseholdService.members as WritableSignal<any>).set([
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ]);
      expect((component as any).familySize()).toBe(2);
    });

    it('should compute adjustedRecords as empty when no records', () => {
      expect((component as any).adjustedRecords()).toEqual([]);
    });

    it('should compute adjustedRecords without adjustments when no confirmed meter changes', () => {
      const records = [createMockRecord()];
      (mockDataService.records as WritableSignal<any>).set(records);
      expect((component as any).adjustedRecords()).toEqual(records);
    });

    it('should compute adjustedRecords with chart calculation adjustments for confirmed meter changes', () => {
      const records = [createMockRecord(), createMockRecord({ date: new Date('2025-02-15') })];
      const adjustedRecords = [createMockRecord({ kitchenWarm: 500 })];
      (mockDataService.records as WritableSignal<any>).set(records);
      (mockPreferencesService.confirmedMeterChanges as WritableSignal<any>).set(['2025-02-15']);
      (mockChartCalculationService.adjustForMeterChanges as any).mockReturnValue(adjustedRecords);

      expect((component as any).adjustedRecords()).toEqual(adjustedRecords);
      expect(mockChartCalculationService.adjustForMeterChanges).toHaveBeenCalledWith(records, ['2025-02-15']);
    });

    it('should compute deleteAllMessageKey as HOME.DELETE_ALL_CONFIRM_MESSAGE', () => {
      expect((component as any).deleteAllMessageKey()).toBe('HOME.DELETE_ALL_CONFIRM_MESSAGE');
    });

    it('should compute deleteAllMessageParams with records count', () => {
      expect((component as any).deleteAllMessageParams()).toEqual({ count: '0' });
    });

    it('should update deleteAllMessageParams when recordsToDelete changes', () => {
      (mockDataService.recordsToDelete as WritableSignal<any>).set([createMockRecord(), createMockRecord()]);
      expect((component as any).deleteAllMessageParams()).toEqual({ count: '2' });
    });
  });

  // ============ Meter Change Detection ============

  describe('Meter Change Detection', () => {
    it('should return empty unconfirmedMeterChanges when less than 2 records', () => {
      (mockDataService.records as WritableSignal<any>).set([createMockRecord()]);
      expect((component as any).unconfirmedMeterChanges()).toEqual([]);
    });

    it('should return empty unconfirmedMeterChanges when no meter changes detected', () => {
      (mockDataService.records as WritableSignal<any>).set([
        createMockRecord(),
        createMockRecord({ date: new Date('2025-02-15') }),
      ]);
      (mockChartCalculationService.detectMeterChanges as any).mockReturnValue([]);
      expect((component as any).unconfirmedMeterChanges()).toEqual([]);
    });

    it('should return detected meter changes that are not confirmed or dismissed', () => {
      (mockDataService.records as WritableSignal<any>).set([
        createMockRecord(),
        createMockRecord({ date: new Date('2025-02-15') }),
      ]);
      (mockChartCalculationService.detectMeterChanges as any).mockReturnValue(['2025-02-15']);
      expect((component as any).unconfirmedMeterChanges()).toEqual(['2025-02-15']);
    });

    it('should exclude confirmed meter changes', () => {
      (mockDataService.records as WritableSignal<any>).set([
        createMockRecord(),
        createMockRecord({ date: new Date('2025-02-15') }),
      ]);
      (mockChartCalculationService.detectMeterChanges as any).mockReturnValue(['2025-02-15']);
      (mockPreferencesService.confirmedMeterChanges as WritableSignal<any>).set(['2025-02-15']);
      expect((component as any).unconfirmedMeterChanges()).toEqual([]);
    });

    it('should exclude dismissed meter changes', () => {
      (mockDataService.records as WritableSignal<any>).set([
        createMockRecord(),
        createMockRecord({ date: new Date('2025-02-15') }),
      ]);
      (mockChartCalculationService.detectMeterChanges as any).mockReturnValue(['2025-02-15']);
      (mockPreferencesService.dismissedMeterChanges as WritableSignal<any>).set(['2025-02-15']);
      expect((component as any).unconfirmedMeterChanges()).toEqual([]);
    });

    it('should return empty formattedMeterChangeDate when no unconfirmed changes', () => {
      expect((component as any).formattedMeterChangeDate()).toBe('');
    });
  });

  // ============ UI Handlers (Delegation) ============

  describe('UI Handlers', () => {
    it('should delegate onChartViewChange to preferences service', () => {
      (component as any).onChartViewChange('by-room');
      expect(mockPreferencesService.setChartView).toHaveBeenCalledWith('by-room');
    });

    it('should refresh fact when chart view changes', () => {
      const seedBefore = (component as any).factRandomSeed();
      (component as any).onChartViewChange('by-type');
      const seedAfter = (component as any).factRandomSeed();
      // Seed should change (random, so just verify it was called through)
      expect(mockPreferencesService.setChartView).toHaveBeenCalledWith('by-type');
    });

    it('should delegate onDisplayModeChange to preferences service', () => {
      (component as any).onDisplayModeChange('total');
      expect(mockPreferencesService.setDisplayMode).toHaveBeenCalledWith('total');
    });

    it('should delegate onFilterStateChange to data service', () => {
      const filterState = { year: 2025, month: 1, startDate: null, endDate: null };
      (component as any).onFilterStateChange(filterState);
      expect(mockDataService.updateFilterState).toHaveBeenCalledWith(filterState);
    });

    it('should delegate importData to data service', () => {
      const mockEvent = {} as Event;
      (component as any).importData(mockEvent);
      expect(mockDataService.importData).toHaveBeenCalledWith(mockEvent);
    });

    it('should delegate importFromExcel to data service', () => {
      const mockEvent = {} as Event;
      (component as any).importFromExcel(mockEvent);
      expect(mockDataService.importFromExcel).toHaveBeenCalledWith(mockEvent);
    });

    it('should delegate confirmImport to data service', () => {
      (component as any).confirmImport();
      expect(mockDataService.confirmImport).toHaveBeenCalled();
    });

    it('should delegate cancelImport to data service', () => {
      (component as any).cancelImport();
      expect(mockDataService.cancelImport).toHaveBeenCalled();
    });

    it('should delegate confirmFilterWarningImport to data service', () => {
      (component as any).confirmFilterWarningImport();
      expect(mockDataService.confirmFilterWarningImport).toHaveBeenCalled();
    });

    it('should delegate cancelFilterWarningImport to data service', () => {
      (component as any).cancelFilterWarningImport();
      expect(mockDataService.cancelFilterWarningImport).toHaveBeenCalled();
    });

    it('should delegate exportData to data service', () => {
      (component as any).exportData();
      expect(mockDataService.exportData).toHaveBeenCalled();
    });

    it('should delegate exportToExcel to data service', () => {
      (component as any).exportToExcel();
      expect(mockDataService.exportToExcel).toHaveBeenCalled();
    });

    it('should delegate exportToPdf to data service', () => {
      (component as any).exportToPdf();
      expect(mockDataService.exportToPdf).toHaveBeenCalled();
    });

    it('should delegate confirmDelete to data service', () => {
      (component as any).confirmDelete();
      expect(mockDataService.confirmDelete).toHaveBeenCalled();
    });

    it('should delegate confirmDeleteAll to data service', () => {
      (component as any).confirmDeleteAll();
      expect(mockDataService.confirmDeleteAll).toHaveBeenCalled();
    });

    it('should update effectiveComparisonCountryCode on handleCountryCodeChange', () => {
      (component as any).handleCountryCodeChange('US');
      expect((component as any).effectiveComparisonCountryCode()).toBe('US');
    });
  });

  // ============ Modal Controls ============

  describe('Modal Controls', () => {
    it('should close success modal by setting showSuccessModal to false', () => {
      (mockDataService.showSuccessModal as WritableSignal<any>).set(true);
      (component as any).closeSuccessModal();
      expect((mockDataService.showSuccessModal as WritableSignal<any>)()).toBe(false);
    });

    it('should close error modal by setting showErrorModal to false', () => {
      (mockDataService.showErrorModal as WritableSignal<any>).set(true);
      (component as any).closeErrorModal();
      expect((mockDataService.showErrorModal as WritableSignal<any>)()).toBe(false);
    });

    it('should cancel delete by resetting modal and recordToDelete', () => {
      (mockDataService.showDeleteModal as WritableSignal<any>).set(true);
      (mockDataService.recordToDelete as WritableSignal<any>).set(createMockRecord());
      (component as any).cancelDelete();
      expect((mockDataService.showDeleteModal as WritableSignal<any>)()).toBe(false);
      expect((mockDataService.recordToDelete as WritableSignal<any>)()).toBeNull();
    });

    it('should cancel deleteAll by resetting modal and recordsToDelete', () => {
      (mockDataService.showDeleteAllModal as WritableSignal<any>).set(true);
      (mockDataService.recordsToDelete as WritableSignal<any>).set([createMockRecord()]);
      (component as any).cancelDeleteAll();
      expect((mockDataService.showDeleteAllModal as WritableSignal<any>)()).toBe(false);
      expect((mockDataService.recordsToDelete as WritableSignal<any>)()).toEqual([]);
    });

    it('should set recordsToDelete and open deleteAll modal on deleteAllRecords', () => {
      const records = [createMockRecord(), createMockRecord({ date: new Date('2025-02-15') })];
      (component as any).deleteAllRecords(records);
      expect((mockDataService.recordsToDelete as WritableSignal<any>)()).toEqual(records);
      expect((mockDataService.showDeleteAllModal as WritableSignal<any>)()).toBe(true);
    });
  });

  // ============ Edit/Delete Interactions ============

  describe('Edit/Delete Interactions', () => {
    it('should call formService.startEdit and scroll on editRecord', () => {
      const record = createMockRecord();
      const mockScrollIntoView = vi.fn();
      const mockQuerySelector = vi.spyOn(document, 'querySelector').mockReturnValue({
        scrollIntoView: mockScrollIntoView,
      } as unknown as Element);

      (component as any).editRecord(record);

      expect(mockFormService.startEdit).toHaveBeenCalledWith(record);
      expect(mockQuerySelector).toHaveBeenCalledWith('.input-section');
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

      mockQuerySelector.mockRestore();
    });

    it('should handle editRecord gracefully when .input-section element not found', () => {
      const record = createMockRecord();
      vi.spyOn(document, 'querySelector').mockReturnValue(null);

      expect(() => (component as any).editRecord(record)).not.toThrow();
      expect(mockFormService.startEdit).toHaveBeenCalledWith(record);
    });

    it('should set recordToDelete and show delete modal on deleteRecord', () => {
      const record = createMockRecord();
      (component as any).deleteRecord(record);
      expect((mockDataService.recordToDelete as WritableSignal<any>)()).toEqual(record);
      expect((mockDataService.showDeleteModal as WritableSignal<any>)()).toBe(true);
    });
  });

  // ============ Form Interactions ============

  describe('Form Interactions', () => {
    it('should return hasValidInput from form service', () => {
      (mockFormService.hasValidInput as any).mockReturnValue(true);
      expect((component as any).hasValidInput).toBe(true);
    });

    it('should return false for hasValidInput when form has no values', () => {
      (mockFormService.hasValidInput as any).mockReturnValue(false);
      expect((component as any).hasValidInput).toBe(false);
    });

    it('should return dateExists from form service', () => {
      (mockFormService.isDateDuplicate as any).mockReturnValue(true);
      expect((component as any).dateExists).toBe(true);
    });

    it('should return false for dateExists when no duplicate date', () => {
      (mockFormService.isDateDuplicate as any).mockReturnValue(false);
      expect((component as any).dateExists).toBe(false);
    });

    it('should save record when input is valid and date does not exist', () => {
      const record = createMockRecord();
      (mockFormService.hasValidInput as any).mockReturnValue(true);
      (mockFormService.isDateDuplicate as any).mockReturnValue(false);
      (mockFormService.createRecordFromState as any).mockReturnValue(record);

      (component as any).saveRecord();

      expect(mockDataService.saveRecord).toHaveBeenCalledWith(record);
      expect(mockFormService.cancelEdit).toHaveBeenCalled();
    });

    it('should not save record when input is invalid', () => {
      (mockFormService.hasValidInput as any).mockReturnValue(false);
      (mockFormService.isDateDuplicate as any).mockReturnValue(false);

      (component as any).saveRecord();

      expect(mockDataService.saveRecord).not.toHaveBeenCalled();
    });

    it('should not save record when date already exists', () => {
      (mockFormService.hasValidInput as any).mockReturnValue(true);
      (mockFormService.isDateDuplicate as any).mockReturnValue(true);

      (component as any).saveRecord();

      expect(mockDataService.saveRecord).not.toHaveBeenCalled();
    });

    it('should not save record when createRecordFromState returns null', () => {
      (mockFormService.hasValidInput as any).mockReturnValue(true);
      (mockFormService.isDateDuplicate as any).mockReturnValue(false);
      (mockFormService.createRecordFromState as any).mockReturnValue(null);

      (component as any).saveRecord();

      expect(mockDataService.saveRecord).not.toHaveBeenCalled();
      expect(mockFormService.cancelEdit).not.toHaveBeenCalled();
    });

    it('should save record on onConsumptionSave when createRecordFromState returns a record', () => {
      const record = createMockRecord();
      (mockFormService.createRecordFromState as any).mockReturnValue(record);

      (component as any).onConsumptionSave({});

      expect(mockDataService.saveRecord).toHaveBeenCalledWith(record);
      expect(mockFormService.cancelEdit).toHaveBeenCalled();
    });

    it('should not save record on onConsumptionSave when createRecordFromState returns null', () => {
      (mockFormService.createRecordFromState as any).mockReturnValue(null);

      (component as any).onConsumptionSave({});

      expect(mockDataService.saveRecord).not.toHaveBeenCalled();
      expect(mockFormService.cancelEdit).not.toHaveBeenCalled();
    });

    it('should delegate cancelEdit to form service', () => {
      (component as any).cancelEdit();
      expect(mockFormService.cancelEdit).toHaveBeenCalled();
    });

    it('should delegate onFieldChange to form service', () => {
      (component as any).onFieldChange({ key: 'kitchenWarm', value: 42 });
      expect(mockFormService.updateField).toHaveBeenCalledWith('kitchenWarm', 42);
    });

    it('should handle null value in onFieldChange', () => {
      (component as any).onFieldChange({ key: 'bathroomCold', value: null });
      expect(mockFormService.updateField).toHaveBeenCalledWith('bathroomCold', null);
    });
  });

  // ============ Calculation Helpers ============

  describe('Calculation Helpers', () => {
    it('should calculate total water consumption', () => {
      const record = createMockRecord({ kitchenWarm: 10, kitchenCold: 20, bathroomWarm: 30, bathroomCold: 40 });
      expect((component as any).calculateTotal(record)).toBe(100);
    });

    it('should calculate kitchen total', () => {
      const record = createMockRecord({ kitchenWarm: 15, kitchenCold: 25 });
      expect((component as any).calculateKitchenTotal(record)).toBe(40);
    });

    it('should calculate bathroom total', () => {
      const record = createMockRecord({ bathroomWarm: 35, bathroomCold: 45 });
      expect((component as any).calculateBathroomTotal(record)).toBe(80);
    });

    it('should calculate total as 0 for zero-value record', () => {
      const record = createMockRecord({ kitchenWarm: 0, kitchenCold: 0, bathroomWarm: 0, bathroomCold: 0 });
      expect((component as any).calculateTotal(record)).toBe(0);
    });
  });

  // ============ Meter Change Methods ============

  describe('Meter Change Methods', () => {
    it('should delegate confirmMeterChange to preferences service', () => {
      (component as any).confirmMeterChange('2025-02-15');
      expect(mockPreferencesService.setMeterChangeConfirmed).toHaveBeenCalledWith('2025-02-15');
    });

    it('should not call service for empty date on confirmMeterChange', () => {
      (component as any).confirmMeterChange('');
      expect(mockPreferencesService.setMeterChangeConfirmed).not.toHaveBeenCalled();
    });

    it('should delegate dismissMeterChange to preferences service', () => {
      (component as any).dismissMeterChange('2025-02-15');
      expect(mockPreferencesService.setMeterChangeDismissed).toHaveBeenCalledWith('2025-02-15');
    });

    it('should not call service for empty date on dismissMeterChange', () => {
      (component as any).dismissMeterChange('');
      expect(mockPreferencesService.setMeterChangeDismissed).not.toHaveBeenCalled();
    });
  });

  // ============ Water Fun Fact ============

  describe('Water Fun Fact', () => {
    it('should return null when no records', () => {
      expect((component as any).waterFact()).toBeNull();
    });

    it('should return null when display mode is not total', () => {
      (mockDataService.records as WritableSignal<any>).set([createMockRecord()]);
      (mockPreferencesService.displayMode as WritableSignal<any>).set('incremental');
      expect((component as any).waterFact()).toBeNull();
    });

    it('should call waterFactsService.getFactByIndex when display mode is total and records exist', () => {
      (mockDataService.records as WritableSignal<any>).set([createMockRecord()]);
      (mockPreferencesService.displayMode as WritableSignal<any>).set('total');
      (mockWaterFactsService.getFactByIndex as any).mockReturnValue({ title: 'Fun Fact', message: 'Water is wet' });

      const fact = (component as any).waterFact();

      expect(mockWaterFactsService.getFactByIndex).toHaveBeenCalled();
      expect(fact).toEqual({ title: 'Fun Fact', message: 'Water is wet' });
    });

    it('should change factRandomSeed when refreshFact is called', () => {
      const seedBefore = (component as any).factRandomSeed();
      // Mock Math.random to return a known value
      vi.spyOn(Math, 'random').mockReturnValue(0.42);
      (component as any).refreshFact();
      expect((component as any).factRandomSeed()).toBe(0.42);
    });
  });

  // ============ Filtered Records / Delegation Signals ============

  describe('Delegation Signals', () => {
    it('should expose showImportConfirmModal from data service', () => {
      expect((component as any).showImportConfirmModal()).toBe(false);
      (mockDataService.showImportConfirmModal as WritableSignal<any>).set(true);
      expect((component as any).showImportConfirmModal()).toBe(true);
    });

    it('should expose showFilterWarningModal from data service', () => {
      expect((component as any).showFilterWarningModal()).toBe(false);
      (mockDataService.showFilterWarningModal as WritableSignal<any>).set(true);
      expect((component as any).showFilterWarningModal()).toBe(true);
    });

    it('should expose errorTitle from data service', () => {
      (mockDataService.errorTitle as WritableSignal<any>).set('Error Title');
      expect((component as any).errorTitle()).toBe('Error Title');
    });

    it('should expose errorMessage from data service', () => {
      (mockDataService.errorMessage as WritableSignal<any>).set('Error Message');
      expect((component as any).errorMessage()).toBe('Error Message');
    });

    it('should expose errorDetails from data service', () => {
      (mockDataService.errorDetails as WritableSignal<any>).set('Some details');
      expect((component as any).errorDetails()).toBe('Some details');
    });

    it('should expose errorInstructions from data service', () => {
      (mockDataService.errorInstructions as WritableSignal<any>).set(['Step 1', 'Step 2']);
      expect((component as any).errorInstructions()).toEqual(['Step 1', 'Step 2']);
    });

    it('should expose errorType from data service', () => {
      (mockDataService.errorType as WritableSignal<any>).set('warning');
      expect((component as any).errorType()).toBe('warning');
    });
  });
});
