import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { ElectricityComponent } from './electricity.component';
import { ElectricityDataService } from '../services/electricity-data.service';
import { ElectricityFormService } from '../services/electricity-form.service';
import { HouseholdService } from '../services/household.service';
import { ElectricityCountryFactsService } from '../services/electricity-country-facts.service';
import {
  ConsumptionPreferencesService,
  ChartView,
  DisplayMode,
} from '../services/consumption-preferences.service';
import { ChartCalculationService } from '../services/chart-calculation.service';
import { LanguageService } from '../services/language.service';
import { ElectricityMeterService } from '../services/electricity-meter.service';
import { ExcelSettingsService } from '../services/excel-settings.service';
import { ElectricityRecord } from '../models/records.model';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

interface MockElectricityDataService {
  records: WritableSignal<ElectricityRecord[]>;
  filteredRecords: WritableSignal<ElectricityRecord[]>;
  isExporting: WritableSignal<boolean>;
  isImporting: WritableSignal<boolean>;
  showImportConfirmModal: WritableSignal<boolean>;
  showFilterWarningModal: WritableSignal<boolean>;
  showSuccessModal: WritableSignal<boolean>;
  successTitle: WritableSignal<string>;
  successMessage: WritableSignal<string>;
  showErrorModal: WritableSignal<boolean>;
  errorTitle: WritableSignal<string>;
  errorMessage: WritableSignal<string>;
  errorDetails: WritableSignal<string>;
  errorInstructions: WritableSignal<string[]>;
  errorType: WritableSignal<'error' | 'warning'>;
  showDeleteModal: WritableSignal<boolean>;
  showDeleteAllModal: WritableSignal<boolean>;
  recordToDelete: WritableSignal<ElectricityRecord | null>;
  recordsToDelete: WritableSignal<ElectricityRecord[]>;

  importData: ReturnType<typeof vi.fn>;
  confirmImport: ReturnType<typeof vi.fn>;
  cancelImport: ReturnType<typeof vi.fn>;
  importFromExcel: ReturnType<typeof vi.fn>;
  confirmFilterWarningImport: ReturnType<typeof vi.fn>;
  cancelFilterWarningImport: ReturnType<typeof vi.fn>;
  exportData: ReturnType<typeof vi.fn>;
  exportToExcel: ReturnType<typeof vi.fn>;
  exportToPdf: ReturnType<typeof vi.fn>;
  saveRecord: ReturnType<typeof vi.fn>;
  confirmDelete: ReturnType<typeof vi.fn>;
  confirmDeleteAll: ReturnType<typeof vi.fn>;
  updateFilterState: ReturnType<typeof vi.fn>;
}

interface MockElectricityFormService {
  selectedDate: WritableSignal<string>;
  editingRecord: WritableSignal<ElectricityRecord | null>;
  value: WritableSignal<number | null>;
  hasValidInput: ReturnType<typeof vi.fn>;
  isDateDuplicate: ReturnType<typeof vi.fn>;
  createRecordFromState: ReturnType<typeof vi.fn>;
  updateDate: ReturnType<typeof vi.fn>;
  updateValue: ReturnType<typeof vi.fn>;
  startEdit: ReturnType<typeof vi.fn>;
  cancelEdit: ReturnType<typeof vi.fn>;
}

interface MockMeterService {
  detectMeterChanges: ReturnType<typeof vi.fn>;
  filterUnconfirmed: ReturnType<typeof vi.fn>;
  confirmMeterChange: ReturnType<typeof vi.fn>;
  dismissMeterChange: ReturnType<typeof vi.fn>;
}

describe('ElectricityComponent', () => {
  let component: ElectricityComponent;

  // Mock services
  let mockDataService: MockElectricityDataService;
  let mockFormService: MockElectricityFormService;
  let mockHouseholdService: {
    members: WritableSignal<{ id: string; name: string }[]>;
  };
  let mockFactsService: {
    getFactByIndex: ReturnType<typeof vi.fn>;
  };
  let mockPreferencesService: {
    electricityChartView: WritableSignal<ChartView>;
    electricityDisplayMode: WritableSignal<DisplayMode>;
    setChartView: ReturnType<typeof vi.fn>;
    setDisplayMode: ReturnType<typeof vi.fn>;
  };
  let mockChartCalculationService: Record<string, unknown>;
  let mockLanguageService: {
    currentLang: WritableSignal<string>;
    translate: ReturnType<typeof vi.fn>;
  };
  let mockMeterService: MockMeterService;
  let mockExcelSettingsService: {
    settings: WritableSignal<{ enabled: boolean }>;
  };

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
    };

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
    };

    mockHouseholdService = {
      members: signal([
        { id: '1', name: 'Member 1' },
        { id: '2', name: 'Member 2' },
      ]),
    };

    mockFactsService = {
      getFactByIndex: vi.fn().mockReturnValue({ title: 'Fact', message: 'Message' }),
    };

    mockPreferencesService = {
      electricityChartView: signal<ChartView>('total'),
      electricityDisplayMode: signal<DisplayMode>('incremental'),
      setChartView: vi.fn(),
      setDisplayMode: vi.fn(),
    };

    mockChartCalculationService = {};

    mockLanguageService = {
      currentLang: signal('en'),
      translate: vi.fn().mockImplementation((key: string) => key),
    };

    mockMeterService = {
      detectMeterChanges: vi.fn().mockReturnValue([]),
      filterUnconfirmed: vi.fn().mockReturnValue([]),
      confirmMeterChange: vi.fn(),
      dismissMeterChange: vi.fn(),
    };

    mockExcelSettingsService = {
      settings: signal({ enabled: false }),
    };

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
      expect(component['familySize']()).toBe(2);
    });

    it('should compute consumptionGroups', () => {
      mockFormService.value.set(150);
      const groups = component['consumptionGroups']();
      expect(groups).toHaveLength(1);
      expect(groups[0].title).toBe('ELECTRICITY.CONSUMPTION');
      expect(groups[0].fields).toHaveLength(1);
      expect(groups[0].fields[0].key).toBe('value');
      expect(groups[0].fields[0].value).toBe(150);
    });

    it('should compute sortOptions', () => {
      const options = component['sortOptions']();
      expect(options).toHaveLength(4);
      expect(options[0].value).toBe('date-desc');
      expect(options[2].value).toBe('value-desc');
    });

    it('should pass value for get hasValidInput', () => {
      mockFormService.hasValidInput.mockReturnValue(true);
      expect(component['hasValidInput']).toBe(true);
    });

    it('should pass value for dateExists', () => {
      mockFormService.isDateDuplicate.mockReturnValue(true);
      expect(component['dateExists']).toBe(true);
    });
  });

  describe('Country and Facts', () => {
    it('should compute electricityFact based on current records and mode', () => {
      mockDataService.records.set([createMockRecord({ value: 300 })]);
      const fact = component['electricityFact']();
      expect(fact).toEqual({ title: 'Fact', message: 'Message' });
      expect(mockFactsService.getFactByIndex).toHaveBeenCalled();
    });

    it('should update country code and refresh fact on handleCountryCodeChange', () => {
      component['handleCountryCodeChange']('US');
      expect(component['effectiveComparisonCountryCode']()).toBe('US');
    });

    it('should compute electricityFact as null if no records', () => {
      mockDataService.records.set([]);
      expect(component['electricityFact']()).toBeNull();
    });

    it('should refresh fact on refreshFact()', () => {
      component['refreshFact']();
      expect(component['factRandomSeed']()).toBeDefined();
    });
  });

  describe('Meter Detection', () => {
    it('should return empty for unconfirmedMeterChanges if less than 2 records', () => {
      mockDataService.records.set([createMockRecord()]);
      expect(component['unconfirmedMeterChanges']()).toEqual([]);
    });

    it('should detect meter changes', () => {
      mockDataService.records.set([createMockRecord(), createMockRecord()]);
      mockMeterService.detectMeterChanges.mockReturnValue(['2025-01-01']);
      mockMeterService.filterUnconfirmed.mockReturnValue(['2025-01-01']);

      expect(component['unconfirmedMeterChanges']()).toEqual(['2025-01-01']);
    });

    it('should format first meter change date', () => {
      mockDataService.records.set([createMockRecord(), createMockRecord()]);
      mockMeterService.detectMeterChanges.mockReturnValue(['2025-01-01']);
      mockMeterService.filterUnconfirmed.mockReturnValue(['2025-01-01']);

      expect(component['formattedMeterChangeDate']()).toBeTruthy();
    });

    it('should confirm meter change via service', () => {
      component['confirmMeterChange']('2025-01-01');
      expect(mockMeterService.confirmMeterChange).toHaveBeenCalledWith('2025-01-01');
    });

    it('should dismiss meter change via service', () => {
      component['dismissMeterChange']('2025-01-01');
      expect(mockMeterService.dismissMeterChange).toHaveBeenCalledWith('2025-01-01');
    });
  });

  describe('Form Actions & Data', () => {
    it('should save record', () => {
      const mockRecord = createMockRecord();
      mockFormService.createRecordFromState.mockReturnValue(mockRecord);
      component['onConsumptionSave']({ date: '2025-01-01', fields: { value: 100 } });

      expect(mockFormService.updateDate).toHaveBeenCalledWith('2025-01-01');
      expect(mockFormService.updateValue).toHaveBeenCalledWith(100);
      expect(mockDataService.saveRecord).toHaveBeenCalledWith(mockRecord);
      expect(mockFormService.cancelEdit).toHaveBeenCalled();
    });

    it('should delegate to onFieldChange', () => {
      component['onFieldChange']({ key: 'value', value: 150 });
      expect(mockFormService.updateValue).toHaveBeenCalledWith(150);
    });

    it('should close Modals', () => {
      mockDataService.showSuccessModal.set(true);
      mockDataService.showErrorModal.set(true);

      component['closeSuccessModal']();
      component['closeErrorModal']();

      expect(mockDataService.showSuccessModal()).toBe(false);
      expect(mockDataService.showErrorModal()).toBe(false);
    });

    it('should call startEdit and scroll when editRecord is triggered', () => {
      const mockScrollIntoView = vi.fn();
      const documentSpy = vi
        .spyOn(document, 'querySelector')
        .mockReturnValue({ scrollIntoView: mockScrollIntoView } as unknown as Element);

      const record = createMockRecord();
      component['editRecord'](record);

      expect(mockFormService.startEdit).toHaveBeenCalledWith(record);
      expect(documentSpy).toHaveBeenCalledWith('.input-section');
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('should set record to delete and show confirm modal on deleteRecord', () => {
      const record = createMockRecord();
      component['deleteRecord'](record);
      expect(mockDataService.recordToDelete()).toEqual(record);
      expect(mockDataService.showDeleteModal()).toBe(true);
    });

    it('should cancel delete process', () => {
      component['cancelDelete']();
      expect(mockDataService.showDeleteModal()).toBe(false);
      expect(mockDataService.recordToDelete()).toBe(null);
    });
  });

  describe('Bulk Delete', () => {
    it('should set records to delete and show confirm modal on deleteAllRecords', () => {
      const records = [createMockRecord()];
      component['deleteAllRecords'](records);
      expect(mockDataService.recordsToDelete()).toEqual(records);
      expect(mockDataService.showDeleteAllModal()).toBe(true);
    });

    it('should confirm delete all records', () => {
      component['confirmDeleteAll']();
      expect(mockDataService.confirmDeleteAll).toHaveBeenCalled();
    });

    it('should cancel delete all records', () => {
      component['cancelDeleteAll']();
      expect(mockDataService.showDeleteAllModal()).toBe(false);
      expect(mockDataService.recordsToDelete()).toEqual([]);
    });
  });

  describe('Delegations', () => {
    it('should delegate onChartViewChange', () => {
      component['onChartViewChange']('total');
      expect(mockPreferencesService.setChartView).toHaveBeenCalledWith('total', 'electricity');
    });

    it('should delegate onDisplayModeChange', () => {
      component['onDisplayModeChange']('total');
      expect(mockPreferencesService.setDisplayMode).toHaveBeenCalledWith('total', 'electricity');
    });

    it('should delegate updateFilterState', () => {
      const filterState = { year: 2025, month: null, startDate: null, endDate: null };
      component['onFilterStateChange'](filterState);
      expect(mockDataService.updateFilterState).toHaveBeenCalledWith(filterState);
    });

    it('should forward methods to DataService', () => {
      const mockEvent = {} as Event;

      component['importData'](mockEvent);
      expect(mockDataService.importData).toHaveBeenCalledWith(mockEvent);

      component['importFromExcel'](mockEvent);
      expect(mockDataService.importFromExcel).toHaveBeenCalledWith(mockEvent);

      component['confirmImport']();
      expect(mockDataService.confirmImport).toHaveBeenCalled();

      component['cancelImport']();
      expect(mockDataService.cancelImport).toHaveBeenCalled();

      component['confirmFilterWarningImport']();
      expect(mockDataService.confirmFilterWarningImport).toHaveBeenCalled();

      component['cancelFilterWarningImport']();
      expect(mockDataService.cancelFilterWarningImport).toHaveBeenCalled();

      component['exportData']();
      expect(mockDataService.exportData).toHaveBeenCalled();

      component['exportToExcel']();
      expect(mockDataService.exportToExcel).toHaveBeenCalled();

      component['exportToPdf']();
      expect(mockDataService.exportToPdf).toHaveBeenCalled();

      component['confirmDelete']();
      expect(mockDataService.confirmDelete).toHaveBeenCalled();
    });
  });

  describe('Smart Import Logic', () => {
    it('should open smart import modal', () => {
      component['openSmartImport']();
      expect(component['showSmartImportModal']()).toBe(true);
    });

    it('should perform smart import and save records', () => {
      const records = [
        { date: new Date('2025-01-01'), value: 100 },
        { date: new Date('2025-02-01'), value: 200 },
      ];
      component['showSuccessModal'].set(false);
      component['onSmartImport'](records);

      expect(mockDataService.saveRecord).toHaveBeenCalledTimes(2);
      expect(component['showSuccessModal']()).toBe(true);
    });

    it('should handle empty list for smart import', () => {
      component['onSmartImport']([]);
      expect(mockDataService.saveRecord).not.toHaveBeenCalled();
    });
  });
});
