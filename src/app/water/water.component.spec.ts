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
import { STORAGE_SERVICE } from '../services/storage.service';
import { ConsumptionRecord } from '../models/records.model';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  Download,
  Upload,
  CircleCheck,
  Trash2,
  FileText,
  FileInput,
  FileOutput,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
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

  // Mock services — strongly typed to avoid unknown index signature access errors
  let mockDataService: {
    records: WritableSignal<ConsumptionRecord[]>;
    filteredRecords: WritableSignal<ConsumptionRecord[]>;
    isExporting: WritableSignal<boolean>;
    isImporting: WritableSignal<boolean>;
    showImportConfirmModal: WritableSignal<boolean>;
    showFilterWarningModal: WritableSignal<boolean>;
    showSuccessModal: WritableSignal<boolean>;
    showErrorModal: WritableSignal<boolean>;
    showDeleteModal: WritableSignal<boolean>;
    showDeleteAllModal: WritableSignal<boolean>;
    errorTitle: WritableSignal<string>;
    errorMessage: WritableSignal<string>;
    errorDetails: WritableSignal<string>;
    errorInstructions: WritableSignal<string[]>;
    errorType: WritableSignal<'error' | 'warning'>;
    successTitle: WritableSignal<string>;
    successMessage: WritableSignal<string>;
    recordToDelete: WritableSignal<ConsumptionRecord | null>;
    recordsToDelete: WritableSignal<ConsumptionRecord[]>;
    importData: ReturnType<typeof vi.fn>;
    importFromExcel: ReturnType<typeof vi.fn>;
    confirmImport: ReturnType<typeof vi.fn>;
    cancelImport: ReturnType<typeof vi.fn>;
    confirmFilterWarningImport: ReturnType<typeof vi.fn>;
    cancelFilterWarningImport: ReturnType<typeof vi.fn>;
    exportData: ReturnType<typeof vi.fn>;
    exportToExcel: ReturnType<typeof vi.fn>;
    exportToPdf: ReturnType<typeof vi.fn>;
    confirmDelete: ReturnType<typeof vi.fn>;
    confirmDeleteAll: ReturnType<typeof vi.fn>;
    saveRecord: ReturnType<typeof vi.fn>;
    updateFilterState: ReturnType<typeof vi.fn>;
  };
  let mockFormService: {
    selectedDate: WritableSignal<string>;
    editingRecord: WritableSignal<ConsumptionRecord | null>;
    kitchenWarm: WritableSignal<number | null>;
    kitchenCold: WritableSignal<number | null>;
    bathroomWarm: WritableSignal<number | null>;
    bathroomCold: WritableSignal<number | null>;
    hasValidInput: ReturnType<typeof vi.fn>;
    isDateDuplicate: ReturnType<typeof vi.fn>;
    createRecordFromState: ReturnType<typeof vi.fn>;
    startEdit: ReturnType<typeof vi.fn>;
    cancelEdit: ReturnType<typeof vi.fn>;
    updateField: ReturnType<typeof vi.fn>;
  };
  let mockPreferencesService: {
    chartView: WritableSignal<string>;
    displayMode: WritableSignal<string>;
    coldWaterOnlyMode: WritableSignal<boolean>;
    confirmedMeterChanges: WritableSignal<string[]>;
    dismissedMeterChanges: WritableSignal<string[]>;
    setChartView: ReturnType<typeof vi.fn>;
    setDisplayMode: ReturnType<typeof vi.fn>;
    setMeterChangeConfirmed: ReturnType<typeof vi.fn>;
    setMeterChangeDismissed: ReturnType<typeof vi.fn>;
    setColdWaterOnlyMode: ReturnType<typeof vi.fn>;
  };
  let mockChartCalculationService: {
    detectMeterChanges: ReturnType<typeof vi.fn>;
    adjustForMeterChanges: ReturnType<typeof vi.fn>;
  };
  let mockHouseholdService: {
    members: WritableSignal<{ id: string; name: string }[]>;
  };
  let mockExcelSettingsService: {
    settings: WritableSignal<{
      enabled: boolean;
      waterMapping: Record<string, string>;
      heatingMapping: Record<string, string>;
      electricityMapping: Record<string, string>;
    }>;
  };
  let mockLanguageService: {
    currentLang: WritableSignal<string>;
  };
  let mockWaterFactsService: {
    getFactByIndex: ReturnType<typeof vi.fn>;
  };
  let mockLocalStorageService: {
    load: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let mockStorageService: {
    load: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
    exportAll: ReturnType<typeof vi.fn>;
    importAll: ReturnType<typeof vi.fn>;
    exportRecords: ReturnType<typeof vi.fn>;
    importRecords: ReturnType<typeof vi.fn>;
  };

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
    };

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
      successTitle: signal('HOME.SUCCESS_TITLE'),
      successMessage: signal('HOME.RECORD_SAVED'),
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
    };

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
    };

    mockPreferencesService = {
      chartView: signal('total'),
      displayMode: signal('incremental'),
      coldWaterOnlyMode: signal(false),
      confirmedMeterChanges: signal<string[]>([]),
      dismissedMeterChanges: signal<string[]>([]),
      setChartView: vi.fn(),
      setDisplayMode: vi.fn(),
      setMeterChangeConfirmed: vi.fn(),
      setMeterChangeDismissed: vi.fn(),
      setColdWaterOnlyMode: vi.fn(),
    };

    mockChartCalculationService = {
      detectMeterChanges: vi.fn().mockReturnValue([]),
      adjustForMeterChanges: vi.fn().mockImplementation((recs: ConsumptionRecord[]) => recs),
    };

    mockHouseholdService = {
      members: signal<{ id: string; name: string }[]>([]),
    };

    mockExcelSettingsService = {
      settings: signal({
        enabled: false,
        waterMapping: {},
        heatingMapping: {},
        electricityMapping: {},
      }),
    };

    mockLanguageService = {
      currentLang: signal('en'),
    };

    mockWaterFactsService = {
      getFactByIndex: vi.fn().mockReturnValue(null),
    };

    mockLocalStorageService = {
      load: vi.fn().mockReturnValue(null),
      save: vi.fn(),
    };

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
      expect(component['DownloadIcon']).toBe(Download);
    });

    it('should have UploadIcon set to lucide Upload icon', () => {
      expect(component['UploadIcon']).toBe(Upload);
    });

    it('should have FileOutputIcon set to lucide FileOutput icon', () => {
      expect(component['FileOutputIcon']).toBe(FileOutput);
    });

    it('should have FileInputIcon set to lucide FileInput icon', () => {
      expect(component['FileInputIcon']).toBe(FileInput);
    });

    it('should have FileTextIcon set to lucide FileText icon', () => {
      expect(component['FileTextIcon']).toBe(FileText);
    });

    it('should have CheckCircleIcon set to lucide CircleCheck icon', () => {
      expect(component['CheckCircleIcon']).toBe(CircleCheck);
    });

    it('should have TrashIcon set to lucide Trash2 icon', () => {
      expect(component['TrashIcon']).toBe(Trash2);
    });

    it('should have AlertTriangleIcon set to lucide AlertTriangle icon', () => {
      expect(component['AlertTriangleIcon']).toBe(AlertTriangle);
    });

    it('should have LightbulbIcon set to lucide Lightbulb icon', () => {
      expect(component['LightbulbIcon']).toBe(Lightbulb);
    });

    it('should have RefreshCwIcon set to lucide RefreshCw icon', () => {
      expect(component['RefreshCwIcon']).toBe(RefreshCw);
    });
  });

  // ============ Signal Initialization ============

  describe('Signal Initialization', () => {
    it('should initialize records as empty array', () => {
      expect(component['records']()).toEqual([]);
    });

    it('should initialize chartView from preferences service', () => {
      expect(component['chartView']()).toBe('total');
    });

    it('should initialize displayMode from preferences service', () => {
      expect(component['displayMode']()).toBe('incremental');
    });

    it('should initialize effectiveComparisonCountryCode to DE', () => {
      expect(component['effectiveComparisonCountryCode']()).toBe('DE');
    });

    it('should initialize maxDate to today in YYYY-MM-DD format', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(component['maxDate']).toBe(today);
    });

    it('should have helpSteps set to RECORD_HELP_STEPS', () => {
      expect(component['helpSteps']).toBe(RECORD_HELP_STEPS);
    });

    it('should have chartHelpSteps set to CHART_HELP_STEPS', () => {
      expect(component['chartHelpSteps']).toBe(CHART_HELP_STEPS);
    });

    it('should have recordsHelpSteps set to RECORDS_LIST_HELP_STEPS', () => {
      expect(component['recordsHelpSteps']).toBe(RECORDS_LIST_HELP_STEPS);
    });

    it('should delegate successTitle to data service', () => {
      expect(component['successTitle']()).toBe('HOME.SUCCESS_TITLE');
    });

    it('should delegate successMessage to data service', () => {
      expect(component['successMessage']()).toBe('HOME.RECORD_SAVED');
    });

    it('should initialize isExporting from data service', () => {
      expect(component['isExporting']()).toBe(false);
    });

    it('should initialize isImporting from data service', () => {
      expect(component['isImporting']()).toBe(false);
    });
  });

  // ============ Computed Values ============

  describe('Computed Values', () => {
    it('should compute consumptionGroups with two groups', () => {
      const groups = component['consumptionGroups']();
      expect(groups).toHaveLength(2);
      expect(groups[0].title).toBe('WATER.KITCHEN');
      expect(groups[1].title).toBe('WATER.BATHROOM');
    });

    it('should compute consumptionGroups with correct kitchen fields', () => {
      const groups = component['consumptionGroups']();
      const kitchen = groups[0];
      expect(kitchen.fields).toHaveLength(2);
      expect(kitchen.fields[0].key).toBe('kitchenWarm');
      expect(kitchen.fields[0].label).toBe('WATER.WARM');
      expect(kitchen.fields[1].key).toBe('kitchenCold');
      expect(kitchen.fields[1].label).toBe('WATER.COLD');
    });

    it('should compute consumptionGroups with correct bathroom fields', () => {
      const groups = component['consumptionGroups']();
      const bathroom = groups[1];
      expect(bathroom.fields).toHaveLength(2);
      expect(bathroom.fields[0].key).toBe('bathroomWarm');
      expect(bathroom.fields[0].label).toBe('WATER.WARM');
      expect(bathroom.fields[1].key).toBe('bathroomCold');
      expect(bathroom.fields[1].label).toBe('WATER.COLD');
    });

    it('should compute consumptionGroups with only cold fields when coldWaterOnlyMode is true', () => {
      mockPreferencesService.coldWaterOnlyMode.set(true);
      const groups = component['consumptionGroups']();

      const kitchen = groups[0];
      expect(kitchen.fields).toHaveLength(1);
      expect(kitchen.fields[0].key).toBe('kitchenCold');
      expect(kitchen.fields[0].label).toBe('WATER.TOTAL_LABEL');

      const bathroom = groups[1];
      expect(bathroom.fields).toHaveLength(1);
      expect(bathroom.fields[0].key).toBe('bathroomCold');
      expect(bathroom.fields[0].label).toBe('WATER.TOTAL_LABEL');
    });

    it('should compute familySize from household members count', () => {
      expect(component['familySize']()).toBe(0);
    });

    it('should update familySize when members change', () => {
      mockHouseholdService.members.set([
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ]);
      expect(component['familySize']()).toBe(2);
    });

    it('should compute adjustedRecords as empty when no records', () => {
      expect(component['adjustedRecords']()).toEqual([]);
    });

    it('should compute adjustedRecords without adjustments when no confirmed meter changes', () => {
      const records = [createMockRecord()];
      mockDataService.records.set(records);
      expect(component['adjustedRecords']()).toEqual(records);
    });

    it('should compute adjustedRecords with chart calculation adjustments for confirmed meter changes', () => {
      const records = [createMockRecord(), createMockRecord({ date: new Date('2025-02-15') })];
      const adjustedRecords = [createMockRecord({ kitchenWarm: 500 })];
      mockDataService.records.set(records);
      mockPreferencesService.confirmedMeterChanges.set(['2025-02-15']);
      mockChartCalculationService.adjustForMeterChanges.mockReturnValue(adjustedRecords);

      expect(component['adjustedRecords']()).toEqual(adjustedRecords);
      expect(mockChartCalculationService.adjustForMeterChanges).toHaveBeenCalledWith(records, [
        '2025-02-15',
      ]);
    });

    it('should compute deleteAllMessageKey as HOME.DELETE_ALL_CONFIRM_MESSAGE', () => {
      expect(component['deleteAllMessageKey']()).toBe('HOME.DELETE_ALL_CONFIRM_MESSAGE');
    });

    it('should compute deleteAllMessageParams with records count', () => {
      expect(component['deleteAllMessageParams']()).toEqual({ count: '0' });
    });

    it('should update deleteAllMessageParams when recordsToDelete changes', () => {
      mockDataService.recordsToDelete.set([createMockRecord(), createMockRecord()]);
      expect(component['deleteAllMessageParams']()).toEqual({ count: '2' });
    });
  });

  // ============ Meter Change Detection ============

  describe('Meter Change Detection', () => {
    it('should return empty unconfirmedMeterChanges when less than 2 records', () => {
      mockDataService.records.set([createMockRecord()]);
      expect(component['unconfirmedMeterChanges']()).toEqual([]);
    });

    it('should return empty unconfirmedMeterChanges when no meter changes detected', () => {
      mockDataService.records.set([
        createMockRecord(),
        createMockRecord({ date: new Date('2025-02-15') }),
      ]);
      mockChartCalculationService.detectMeterChanges.mockReturnValue([]);
      expect(component['unconfirmedMeterChanges']()).toEqual([]);
    });

    it('should return detected meter changes that are not confirmed or dismissed', () => {
      mockDataService.records.set([
        createMockRecord(),
        createMockRecord({ date: new Date('2025-02-15') }),
      ]);
      mockChartCalculationService.detectMeterChanges.mockReturnValue(['2025-02-15']);
      expect(component['unconfirmedMeterChanges']()).toEqual(['2025-02-15']);
    });

    it('should exclude confirmed meter changes', () => {
      mockDataService.records.set([
        createMockRecord(),
        createMockRecord({ date: new Date('2025-02-15') }),
      ]);
      mockChartCalculationService.detectMeterChanges.mockReturnValue(['2025-02-15']);
      mockPreferencesService.confirmedMeterChanges.set(['2025-02-15']);
      expect(component['unconfirmedMeterChanges']()).toEqual([]);
    });

    it('should exclude dismissed meter changes', () => {
      mockDataService.records.set([
        createMockRecord(),
        createMockRecord({ date: new Date('2025-02-15') }),
      ]);
      mockChartCalculationService.detectMeterChanges.mockReturnValue(['2025-02-15']);
      mockPreferencesService.dismissedMeterChanges.set(['2025-02-15']);
      expect(component['unconfirmedMeterChanges']()).toEqual([]);
    });

    it('should return empty formattedMeterChangeDate when no unconfirmed changes', () => {
      expect(component['formattedMeterChangeDate']()).toBe('');
    });
  });

  // ============ UI Handlers (Delegation) ============

  describe('UI Handlers', () => {
    it('should delegate onChartViewChange to preferences service', () => {
      component['onChartViewChange']('by-room');
      expect(mockPreferencesService.setChartView).toHaveBeenCalledWith('by-room');
    });

    it('should refresh fact when chart view changes', () => {
      component['onChartViewChange']('by-type');
      expect(mockPreferencesService.setChartView).toHaveBeenCalledWith('by-type');
    });

    it('should delegate onDisplayModeChange to preferences service', () => {
      component['onDisplayModeChange']('total');
      expect(mockPreferencesService.setDisplayMode).toHaveBeenCalledWith('total');
    });

    it('should delegate toggleColdWaterOnlyMode to preferences service', () => {
      component['toggleColdWaterOnlyMode']();
      expect(mockPreferencesService.setColdWaterOnlyMode).toHaveBeenCalledWith(true);
    });

    it('should delegate onFilterStateChange to data service', () => {
      const filterState = { year: 2025, month: 1, startDate: null, endDate: null };
      component['onFilterStateChange'](filterState);
      expect(mockDataService.updateFilterState).toHaveBeenCalledWith(filterState);
    });

    it('should delegate importData to data service', () => {
      const mockEvent = {} as Event;
      component['importData'](mockEvent);
      expect(mockDataService.importData).toHaveBeenCalledWith(mockEvent);
    });

    it('should delegate importFromExcel to data service', () => {
      const mockEvent = {} as Event;
      component['importFromExcel'](mockEvent);
      expect(mockDataService.importFromExcel).toHaveBeenCalledWith(mockEvent);
    });

    it('should delegate confirmImport to data service', () => {
      component['confirmImport']();
      expect(mockDataService.confirmImport).toHaveBeenCalled();
    });

    it('should delegate cancelImport to data service', () => {
      component['cancelImport']();
      expect(mockDataService.cancelImport).toHaveBeenCalled();
    });

    it('should delegate confirmFilterWarningImport to data service', () => {
      component['confirmFilterWarningImport']();
      expect(mockDataService.confirmFilterWarningImport).toHaveBeenCalled();
    });

    it('should delegate cancelFilterWarningImport to data service', () => {
      component['cancelFilterWarningImport']();
      expect(mockDataService.cancelFilterWarningImport).toHaveBeenCalled();
    });

    it('should delegate exportData to data service', () => {
      component['exportData']();
      expect(mockDataService.exportData).toHaveBeenCalled();
    });

    it('should delegate exportToExcel to data service', () => {
      component['exportToExcel']();
      expect(mockDataService.exportToExcel).toHaveBeenCalled();
    });

    it('should delegate exportToPdf to data service', () => {
      component['exportToPdf']();
      expect(mockDataService.exportToPdf).toHaveBeenCalled();
    });

    it('should delegate confirmDelete to data service', () => {
      component['confirmDelete']();
      expect(mockDataService.confirmDelete).toHaveBeenCalled();
    });

    it('should delegate confirmDeleteAll to data service', () => {
      component['confirmDeleteAll']();
      expect(mockDataService.confirmDeleteAll).toHaveBeenCalled();
    });

    it('should update effectiveComparisonCountryCode on handleCountryCodeChange', () => {
      component['handleCountryCodeChange']('US');
      expect(component['effectiveComparisonCountryCode']()).toBe('US');
    });
  });

  // ============ Modal Controls ============

  describe('Modal Controls', () => {
    it('should close success modal by setting showSuccessModal to false', () => {
      mockDataService.showSuccessModal.set(true);
      component['closeSuccessModal']();
      expect(mockDataService.showSuccessModal()).toBe(false);
    });

    it('should close error modal by setting showErrorModal to false', () => {
      mockDataService.showErrorModal.set(true);
      component['closeErrorModal']();
      expect(mockDataService.showErrorModal()).toBe(false);
    });

    it('should cancel delete by resetting modal and recordToDelete', () => {
      mockDataService.showDeleteModal.set(true);
      mockDataService.recordToDelete.set(createMockRecord());
      component['cancelDelete']();
      expect(mockDataService.showDeleteModal()).toBe(false);
      expect(mockDataService.recordToDelete()).toBeNull();
    });

    it('should cancel deleteAll by resetting modal and recordsToDelete', () => {
      mockDataService.showDeleteAllModal.set(true);
      mockDataService.recordsToDelete.set([createMockRecord()]);
      component['cancelDeleteAll']();
      expect(mockDataService.showDeleteAllModal()).toBe(false);
      expect(mockDataService.recordsToDelete()).toEqual([]);
    });

    it('should set recordsToDelete and open deleteAll modal on deleteAllRecords', () => {
      const records = [createMockRecord(), createMockRecord({ date: new Date('2025-02-15') })];
      component['deleteAllRecords'](records);
      expect(mockDataService.recordsToDelete()).toEqual(records);
      expect(mockDataService.showDeleteAllModal()).toBe(true);
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

      component['editRecord'](record);

      expect(mockFormService.startEdit).toHaveBeenCalledWith(record);
      expect(mockQuerySelector).toHaveBeenCalledWith('.input-section');
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

      mockQuerySelector.mockRestore();
    });

    it('should handle editRecord gracefully when .input-section element not found', () => {
      const record = createMockRecord();
      vi.spyOn(document, 'querySelector').mockReturnValue(null);

      expect(() => component['editRecord'](record)).not.toThrow();
      expect(mockFormService.startEdit).toHaveBeenCalledWith(record);
    });

    it('should set recordToDelete and show delete modal on deleteRecord', () => {
      const record = createMockRecord();
      component['deleteRecord'](record);
      expect(mockDataService.recordToDelete()).toEqual(record);
      expect(mockDataService.showDeleteModal()).toBe(true);
    });
  });

  // ============ Form Interactions ============

  describe('Form Interactions', () => {
    it('should return hasValidInput from form service', () => {
      mockFormService.hasValidInput.mockReturnValue(true);
      expect(component['hasValidInput']).toBe(true);
    });

    it('should return false for hasValidInput when form has no values', () => {
      mockFormService.hasValidInput.mockReturnValue(false);
      expect(component['hasValidInput']).toBe(false);
    });

    it('should return dateExists from form service', () => {
      mockFormService.isDateDuplicate.mockReturnValue(true);
      expect(component['dateExists']).toBe(true);
    });

    it('should return false for dateExists when no duplicate date', () => {
      mockFormService.isDateDuplicate.mockReturnValue(false);
      expect(component['dateExists']).toBe(false);
    });

    it('should save record when input is valid and date does not exist', () => {
      const record = createMockRecord();
      mockFormService.hasValidInput.mockReturnValue(true);
      mockFormService.isDateDuplicate.mockReturnValue(false);
      mockFormService.createRecordFromState.mockReturnValue(record);

      component['saveRecord']();

      expect(mockDataService.saveRecord).toHaveBeenCalledWith(record);
      expect(mockFormService.cancelEdit).toHaveBeenCalled();
    });

    it('should not save record when input is invalid', () => {
      mockFormService.hasValidInput.mockReturnValue(false);
      mockFormService.isDateDuplicate.mockReturnValue(false);

      component['saveRecord']();

      expect(mockDataService.saveRecord).not.toHaveBeenCalled();
    });

    it('should not save record when date already exists', () => {
      mockFormService.hasValidInput.mockReturnValue(true);
      mockFormService.isDateDuplicate.mockReturnValue(true);

      component['saveRecord']();

      expect(mockDataService.saveRecord).not.toHaveBeenCalled();
    });

    it('should not save record when createRecordFromState returns null', () => {
      mockFormService.hasValidInput.mockReturnValue(true);
      mockFormService.isDateDuplicate.mockReturnValue(false);
      mockFormService.createRecordFromState.mockReturnValue(null);

      component['saveRecord']();

      expect(mockDataService.saveRecord).not.toHaveBeenCalled();
      expect(mockFormService.cancelEdit).not.toHaveBeenCalled();
    });

    it('should save record on onConsumptionSave when createRecordFromState returns a record', () => {
      const record = createMockRecord();
      mockFormService.createRecordFromState.mockReturnValue(record);

      component['onConsumptionSave']();

      expect(mockDataService.saveRecord).toHaveBeenCalledWith(record);
      expect(mockFormService.cancelEdit).toHaveBeenCalled();
    });

    it('should not save record on onConsumptionSave when createRecordFromState returns null', () => {
      mockFormService.createRecordFromState.mockReturnValue(null);

      component['onConsumptionSave']();

      expect(mockDataService.saveRecord).not.toHaveBeenCalled();
      expect(mockFormService.cancelEdit).not.toHaveBeenCalled();
    });

    it('should delegate cancelEdit to form service', () => {
      component['cancelEdit']();
      expect(mockFormService.cancelEdit).toHaveBeenCalled();
    });

    it('should delegate onFieldChange to form service', () => {
      component['onFieldChange']({ key: 'kitchenWarm', value: 42 });
      expect(mockFormService.updateField).toHaveBeenCalledWith('kitchenWarm', 42);
    });

    it('should handle null value in onFieldChange', () => {
      component['onFieldChange']({ key: 'bathroomCold', value: null });
      expect(mockFormService.updateField).toHaveBeenCalledWith('bathroomCold', null);
    });
  });

  // ============ Calculation Helpers ============

  describe('Calculation Helpers', () => {
    it('should calculate total water consumption', () => {
      const record = createMockRecord({
        kitchenWarm: 10,
        kitchenCold: 20,
        bathroomWarm: 30,
        bathroomCold: 40,
      });
      expect(component['calculateTotal'](record)).toBe(100);
    });

    it('should calculate kitchen total', () => {
      const record = createMockRecord({ kitchenWarm: 15, kitchenCold: 25 });
      expect(component['calculateKitchenTotal'](record)).toBe(40);
    });

    it('should calculate bathroom total', () => {
      const record = createMockRecord({ bathroomWarm: 35, bathroomCold: 45 });
      expect(component['calculateBathroomTotal'](record)).toBe(80);
    });

    it('should calculate total as 0 for zero-value record', () => {
      const record = createMockRecord({
        kitchenWarm: 0,
        kitchenCold: 0,
        bathroomWarm: 0,
        bathroomCold: 0,
      });
      expect(component['calculateTotal'](record)).toBe(0);
    });
  });

  // ============ Meter Change Methods ============

  describe('Meter Change Methods', () => {
    it('should delegate confirmMeterChange to preferences service', () => {
      component['confirmMeterChange']('2025-02-15');
      expect(mockPreferencesService.setMeterChangeConfirmed).toHaveBeenCalledWith('2025-02-15');
    });

    it('should not call service for empty date on confirmMeterChange', () => {
      component['confirmMeterChange']('');
      expect(mockPreferencesService.setMeterChangeConfirmed).not.toHaveBeenCalled();
    });

    it('should delegate dismissMeterChange to preferences service', () => {
      component['dismissMeterChange']('2025-02-15');
      expect(mockPreferencesService.setMeterChangeDismissed).toHaveBeenCalledWith('2025-02-15');
    });

    it('should not call service for empty date on dismissMeterChange', () => {
      component['dismissMeterChange']('');
      expect(mockPreferencesService.setMeterChangeDismissed).not.toHaveBeenCalled();
    });
  });

  // ============ Water Fun Fact ============

  describe('Water Fun Fact', () => {
    it('should return null when no records', () => {
      expect(component['waterFact']()).toBeNull();
    });

    it('should return null when display mode is not total', () => {
      mockDataService.records.set([createMockRecord()]);
      mockPreferencesService.displayMode.set('incremental');
      expect(component['waterFact']()).toBeNull();
    });

    it('should call waterFactsService.getFactByIndex when display mode is total and records exist', () => {
      mockDataService.records.set([createMockRecord()]);
      mockPreferencesService.displayMode.set('total');
      mockWaterFactsService.getFactByIndex.mockReturnValue({
        title: 'Fun Fact',
        message: 'Water is wet',
      });

      const fact = component['waterFact']();

      expect(mockWaterFactsService.getFactByIndex).toHaveBeenCalled();
      expect(fact).toEqual({ title: 'Fun Fact', message: 'Water is wet' });
    });

    it('should change factRandomSeed when refreshFact is called', () => {
      // Mock Math.random to return a known value
      vi.spyOn(Math, 'random').mockReturnValue(0.42);
      component['refreshFact']();
      expect(component['factRandomSeed']()).toBe(0.42);
    });
  });

  // ============ Filtered Records / Delegation Signals ============

  describe('Delegation Signals', () => {
    it('should expose showImportConfirmModal from data service', () => {
      expect(component['showImportConfirmModal']()).toBe(false);
      mockDataService.showImportConfirmModal.set(true);
      expect(component['showImportConfirmModal']()).toBe(true);
    });

    it('should expose showFilterWarningModal from data service', () => {
      expect(component['showFilterWarningModal']()).toBe(false);
      mockDataService.showFilterWarningModal.set(true);
      expect(component['showFilterWarningModal']()).toBe(true);
    });

    it('should expose errorTitle from data service', () => {
      mockDataService.errorTitle.set('Error Title');
      expect(component['errorTitle']()).toBe('Error Title');
    });

    it('should expose errorMessage from data service', () => {
      mockDataService.errorMessage.set('Error Message');
      expect(component['errorMessage']()).toBe('Error Message');
    });

    it('should expose errorDetails from data service', () => {
      mockDataService.errorDetails.set('Some details');
      expect(component['errorDetails']()).toBe('Some details');
    });

    it('should expose errorInstructions from data service', () => {
      mockDataService.errorInstructions.set(['Step 1', 'Step 2']);
      expect(component['errorInstructions']()).toEqual(['Step 1', 'Step 2']);
    });

    it('should expose errorType from data service', () => {
      mockDataService.errorType.set('warning');
      expect(component['errorType']()).toBe('warning');
    });
  });
});
