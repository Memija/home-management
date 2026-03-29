import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { HeatingComponent } from './heating.component';
import { HeatingDataService } from '../services/heating-data.service';
import { HeatingFormService } from '../services/heating-form.service';
import { HeatingRoomsService, HeatingRoomConfig } from '../services/heating-rooms.service';
import { HeatingFactsService } from '../services/heating-facts.service';
import { ConsumptionPreferencesService } from '../services/consumption-preferences.service';
import { ChartCalculationService } from '../services/chart-calculation.service';
import { LocalStorageService } from '../services/local-storage.service';
import { HeatingRoomUtilsService } from '../services/heating-room-utils.service';
import { LanguageService } from '../services/language.service';
import { ExcelSettingsService } from '../services/excel-settings.service';
import { DynamicHeatingRecord } from '../models/records.model';
import { HouseholdService } from '../services/household.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('HeatingComponent', () => {
  let component: HeatingComponent;

  // Mock services
  let mockDataService: Partial<HeatingDataService>;
  let mockFormService: Partial<HeatingFormService>;
  let mockRoomsService: Partial<HeatingRoomsService>;
  let mockFactsService: Partial<HeatingFactsService>;
  let mockPreferencesService: Partial<ConsumptionPreferencesService>;
  let mockChartCalculationService: Partial<ChartCalculationService>;
  let mockLocalStorageService: Partial<LocalStorageService>;
  let mockRoomUtilsService: Partial<HeatingRoomUtilsService>;
  let mockLanguageService: Partial<LanguageService>;
  let mockExcelSettingsService: Partial<ExcelSettingsService>;

  const createMockRecord = (
    overrides: Partial<DynamicHeatingRecord> = {},
  ): DynamicHeatingRecord => ({
    date: new Date('2025-01-15T00:00:00.000Z'),
    rooms: { 'room-1': 100, 'room-2': 50 },
    ...overrides,
  });

  const createMockRoom = (id: string, name: string): HeatingRoomConfig => ({
    id,
    name,
    type: 'LIVING_ROOM',
  });

  beforeEach(() => {
    TestBed.resetTestingModule();

    mockDataService = {
      records: signal<DynamicHeatingRecord[]>([]),
      isExporting: signal(false),
      isImporting: signal(false),
      showImportConfirmModal: signal(false),
      showSuccessModal: signal(false),
      successTitle: signal(''),
      successMessage: signal(''),
      showErrorModal: signal(false),
      errorTitle: signal(''),
      errorMessage: signal(''),
      errorDetails: signal(''),
      errorInstructions: signal<string[]>([]),
      errorType: signal<'error' | 'warning'>('error'),
      loadData: vi.fn(),
      importData: vi.fn(),
      confirmImport: vi.fn(),
      cancelImport: vi.fn(),
      importFromExcel: vi.fn(),
      exportData: vi.fn(),
      exportToExcel: vi.fn(),
      exportToPdf: vi.fn(),
      closeSuccessModal: vi.fn(),
      closeErrorModal: vi.fn(),
      saveRecord: vi.fn(),
      deleteRecord: vi.fn(),
      deleteRecords: vi.fn(),
    } as any;

    mockFormService = {
      selectedDate: signal(''),
      editingRecord: signal<DynamicHeatingRecord | null>(null),
      isDateDuplicate: vi.fn().mockReturnValue(false),
      createRecordFromState: vi.fn().mockReturnValue(null),
      getRoomValue: vi.fn().mockReturnValue(0),
      startEdit: vi.fn(),
      cancelEdit: vi.fn(),
      updateField: vi.fn(),
    } as any;

    mockRoomsService = {
      rooms: signal<HeatingRoomConfig[]>([createMockRoom('room-1', 'Living Room')]),
      setRooms: vi.fn(),
    } as any;

    // Fix: Add mode ('historical' | 'country') as 3rd parameter, country as 4th
    mockFactsService = {
      getAvailableCountries: vi.fn().mockReturnValue([
        { code: 'DE', nameKey: 'COUNTRY.DE' },
        { code: 'US', nameKey: 'COUNTRY.US' },
      ]),
      getFactByIndex: vi.fn().mockReturnValue({ title: 'Fact', message: 'Message' }),
    } as any;

    mockPreferencesService = {
      heatingChartView: signal('total'),
      heatingDisplayMode: signal('incremental'),
      setChartView: vi.fn(),
      setDisplayMode: vi.fn(),
    } as any;

    mockChartCalculationService = {
      detectNewRoomSpikes: vi.fn().mockReturnValue([]),
      adjustForNewRooms: vi.fn().mockImplementation((recs: any) => recs),
    } as any;

    mockLocalStorageService = {
      getPreference: vi.fn().mockReturnValue(null),
      setPreference: vi.fn(),
    } as any;

    mockRoomUtilsService = {
      getRoomIcon: vi.fn().mockReturnValue('sofa'),
      getRoomColor: vi.fn().mockReturnValue('#000000'),
    } as any;

    mockLanguageService = {
      currentLang: signal('en'),
      translate: vi.fn().mockImplementation((key: string) => key),
    } as any;

    mockExcelSettingsService = {
      settings: signal({ enabled: false }),
    } as any;

    const mockHouseholdService = {
      address: signal({ country: 'DE' }),
    } as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: HeatingDataService, useValue: mockDataService },
        { provide: HeatingFormService, useValue: mockFormService },
        { provide: HeatingRoomsService, useValue: mockRoomsService },
        { provide: HeatingFactsService, useValue: mockFactsService },
        { provide: ConsumptionPreferencesService, useValue: mockPreferencesService },
        { provide: ChartCalculationService, useValue: mockChartCalculationService },
        { provide: LocalStorageService, useValue: mockLocalStorageService },
        { provide: HeatingRoomUtilsService, useValue: mockRoomUtilsService },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: ExcelSettingsService, useValue: mockExcelSettingsService },
        { provide: HouseholdService, useValue: mockHouseholdService },
      ],
    });

    component = TestBed.runInInjectionContext(() => new HeatingComponent());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============ Component Creation ============

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call loadData on initialization', () => {
    expect(mockDataService.loadData).toHaveBeenCalled();
  });

  // ============ Computed Values ============

  describe('Computed Values', () => {
    it('should compute consumptionGroups', () => {
      (mockFormService.getRoomValue as any).mockReturnValue(50);
      const groups = (component as any).consumptionGroups();
      expect(groups).toHaveLength(1);
      expect(groups[0].title).toBe('HEATING.ROOMS_SETTINGS_TITLE');
      expect(groups[0].fields).toHaveLength(1);
      expect(groups[0].fields[0].key).toBe('room-1');
      expect(groups[0].fields[0].label).toBe('Living Room');
      expect(groups[0].fields[0].value).toBe(50);
      expect(groups[0].fields[0].icon).toBe('sofa');
    });

    it('should compute selectedCountryName', () => {
      (component as any).selectedCountryCode.set('DE');
      expect((component as any).selectedCountryName()).toBe('COUNTRY.DE');
    });

    it('should fall back to raw selectedCountryCode if country name not found', () => {
      (component as any).selectedCountryCode.set('FR');
      expect((component as any).selectedCountryName()).toBe('FR');
    });

    it('should calculate total for a dynamic heating record', () => {
      const record = createMockRecord({ rooms: { r1: 10, r2: 20 } });
      expect((component as any).calculateTotal(record)).toBe(30);
    });

    it('should compute dateExists from form service', () => {
      (mockFormService.isDateDuplicate as any).mockReturnValue(true);
      expect((component as any).dateExists()).toBe(true);
    });
  });

  // ============ Country and Facts ============

  describe('Country and Facts', () => {
    it('should compute heatingFact based on current records and mode', () => {
      (mockDataService.records as WritableSignal<any>).set([createMockRecord()]);
      const fact = (component as any).heatingFact();
      expect(fact).toEqual({ title: 'Fact', message: 'Message' });
      expect(mockFactsService.getFactByIndex).toHaveBeenCalled();
    });

    it('should update country code and refresh fact onCountryChange', () => {
      const seedBefore = (component as any).factRandomSeed();
      (component as any).onCountryChange('US');
      expect((component as any).selectedCountryCode()).toBe('US');
      expect((component as any).factRandomSeed()).not.toBe(seedBefore);
    });

    it('should compute heatingFact as null if no records', () => {
      (mockDataService.records as WritableSignal<any>).set([]);
      expect((component as any).heatingFact()).toBeNull();
    });
  });

  // ============ Spike Detection ============

  describe('Spike Detection', () => {
    it('should load confirmed/dismissed spikes from local storage', () => {
      (mockLocalStorageService.getPreference as any).mockImplementation((key: string) => {
        if (key === 'heating_confirmed_spikes')
          return JSON.stringify([{ date: '2025-01-01', roomId: 'r1' }]);
        if (key === 'heating_dismissed_spikes')
          return JSON.stringify([{ date: '2025-02-01', roomId: 'r2' }]);
        return null;
      });
      const newComponent = TestBed.runInInjectionContext(() => new HeatingComponent());
      expect((newComponent as any).confirmedSpikes()).toEqual([
        { date: '2025-01-01', roomId: 'r1' },
      ]);
      expect((newComponent as any).dismissedSpikes()).toEqual([
        { date: '2025-02-01', roomId: 'r2' },
      ]);
    });

    it('should detect unconfirmed spikes from calculation service', () => {
      (mockChartCalculationService.detectNewRoomSpikes as any).mockReturnValue([
        { date: '2025-01-01', roomId: 'room-1' },
      ]);
      expect((component as any).unconfirmedSpike()).toEqual({
        date: '2025-01-01',
        roomId: 'room-1',
      });
    });

    it('should exclude confirmed and dismissed spikes from unconfirmedSpike', () => {
      (mockChartCalculationService.detectNewRoomSpikes as any).mockReturnValue([
        { date: '2025-01-01', roomId: 'r1' },
      ]);
      (component as any).confirmedSpikes.set([{ date: '2025-01-01', roomId: 'r1' }]);
      expect((component as any).unconfirmedSpike()).toBeUndefined();
    });

    it('should compute unconfirmedSpikeRoomName using translated type', () => {
      (mockChartCalculationService.detectNewRoomSpikes as any).mockReturnValue([
        { date: '2025-01-01', roomId: 'room-1' },
      ]);
      expect((component as any).unconfirmedSpikeRoomName()).toBe('LIVING_ROOM');
    });

    it('should fallback to roomId if unconfirmedSpikeRoomName not found', () => {
      (mockChartCalculationService.detectNewRoomSpikes as any).mockReturnValue([
        { date: '2025-01-01', roomId: 'non-existent' },
      ]);
      expect((component as any).unconfirmedSpikeRoomName()).toBe('non-existent');
    });

    it('should fallback to room.name if room has no type', () => {
      (mockRoomsService.rooms as WritableSignal<HeatingRoomConfig[]>).set([
        { id: 'room-1', name: 'Custom Room' },
      ]);
      (mockChartCalculationService.detectNewRoomSpikes as any).mockReturnValue([
        { date: '2025-01-01', roomId: 'room-1' },
      ]);
      expect((component as any).unconfirmedSpikeRoomName()).toBe('Custom Room');
    });

    it('should dismiss spike and save to local storage', () => {
      (component as any).dismissSpike({ date: '2025-01-01', roomId: 'r1' });
      expect((component as any).dismissedSpikes()).toContainEqual({
        date: '2025-01-01',
        roomId: 'r1',
      });
      expect(mockLocalStorageService.setPreference).toHaveBeenCalledWith(
        'heating_dismissed_spikes',
        JSON.stringify([{ date: '2025-01-01', roomId: 'r1' }]),
      );
    });

    it('should confirm spike and save to local storage', () => {
      (component as any).confirmSpike({ date: '2025-01-01', roomId: 'r1' });
      expect((component as any).confirmedSpikes()).toContainEqual({
        date: '2025-01-01',
        roomId: 'r1',
      });
      expect(mockLocalStorageService.setPreference).toHaveBeenCalledWith(
        'heating_confirmed_spikes',
        JSON.stringify([{ date: '2025-01-01', roomId: 'r1' }]),
      );
    });
  });

  // ============ Form Actions & Data ============

  describe('Form Actions & Data', () => {
    it('should save record if valid', () => {
      const mockRecord = createMockRecord();
      (mockFormService.createRecordFromState as any).mockReturnValue(mockRecord);
      (component as any).onConsumptionSave({});

      expect(mockDataService.saveRecord).toHaveBeenCalledWith(mockRecord, null);
      expect(mockFormService.cancelEdit).toHaveBeenCalled();
      expect(mockDataService.successTitle!()).toBe('HEATING.SUCCESS_TITLE');
      expect(mockDataService.showSuccessModal!()).toBe(true);
    });

    it('should delegate to onFieldChange', () => {
      (component as any).onFieldChange({ key: 'room-1', value: 10 });
      expect(mockFormService.updateField).toHaveBeenCalledWith('room-1', 10);
    });

    it('should call startEdit and scroll when onEditRecord is triggered', () => {
      const mockScrollIntoView = vi.fn();
      const documentSpy = vi
        .spyOn(document, 'querySelector')
        .mockReturnValue({ scrollIntoView: mockScrollIntoView } as any);

      const record = createMockRecord();
      (component as any).onEditRecord(record);

      expect(mockFormService.startEdit).toHaveBeenCalledWith(record);
      expect(documentSpy).toHaveBeenCalledWith('app-consumption-input');
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('should not throw if scrollIntoView is unavailable during onEditRecord', () => {
      vi.spyOn(document, 'querySelector').mockReturnValue(null);
      const record = createMockRecord();
      expect(() => (component as any).onEditRecord(record)).not.toThrow();
    });

    it('should set record to delete and show confirm modal', () => {
      const record = createMockRecord();
      (component as any).onDeleteRecord(record);
      expect((component as any).recordToDelete()).toEqual(record);
      expect((component as any).showDeleteModal()).toBe(true);
    });

    it('should confirm delete and reset modal', () => {
      const record = createMockRecord();
      (component as any).recordToDelete.set(record);
      (component as any).showDeleteModal.set(true);
      (component as any).confirmDelete();

      expect(mockDataService.deleteRecord).toHaveBeenCalledWith(record);
      expect((component as any).showDeleteModal()).toBe(false);
      expect((component as any).recordToDelete()).toBeNull();
    });

    it('should cancel delete and reset modal', () => {
      (component as any).recordToDelete.set(createMockRecord());
      (component as any).showDeleteModal.set(true);
      (component as any).cancelDelete();

      expect(mockDataService.deleteRecord).not.toHaveBeenCalled();
      expect((component as any).showDeleteModal()).toBe(false);
      expect((component as any).recordToDelete()).toBeNull();
    });
  });

  // ============ Bulk Delete ============

  describe('Bulk Delete', () => {
    it('should initiate mass deletion', () => {
      const records = [createMockRecord()];
      (component as any).onDeleteAllRecords(records);
      expect((component as any).recordsToDeleteAll()).toEqual(records);
      expect((component as any).showDeleteAllModal()).toBe(true);
    });

    it('should confirm delete all records', () => {
      const records = [createMockRecord()];
      (component as any).recordsToDeleteAll.set(records);
      (component as any).confirmDeleteAll();
      expect(mockDataService.deleteRecords).toHaveBeenCalledWith(records);
      expect((component as any).showDeleteAllModal()).toBe(false);
      expect((component as any).recordsToDeleteAll()).toEqual([]);
    });

    it('should cancel delete all records', () => {
      const records = [createMockRecord()];
      (component as any).recordsToDeleteAll.set(records);
      (component as any).cancelDeleteAll();
      expect(mockDataService.deleteRecords).not.toHaveBeenCalled();
      expect((component as any).showDeleteAllModal()).toBe(false);
      expect((component as any).recordsToDeleteAll()).toEqual([]);
    });

    it('should compute delete all message key correctly', () => {
      (component as any).recordsToDeleteAll.set([createMockRecord()]);
      expect((component as any).deleteAllMessageKey()).toBe(
        'HOME.DELETE_ALL_CONFIRM_MESSAGE_SINGULAR',
      );

      (component as any).recordsToDeleteAll.set([createMockRecord(), createMockRecord()]);
      expect((component as any).deleteAllMessageKey()).toBe(
        'HOME.DELETE_ALL_CONFIRM_MESSAGE_PLURAL',
      );
    });

    it('should compute delete all message params', () => {
      (component as any).recordsToDeleteAll.set([createMockRecord(), createMockRecord()]);
      expect((component as any).deleteAllMessageParams()).toEqual({ count: '2' });
    });
  });

  // ============ Rooms Configuration ============

  describe('Rooms Configuration', () => {
    it('should open and save rooms', () => {
      (component as any).openRoomsModal();
      expect((component as any).showRoomsModal()).toBe(true);

      const newRooms = [createMockRoom('new', 'New Room')];
      (component as any).onRoomsSave(newRooms);
      expect(mockRoomsService.setRooms).toHaveBeenCalledWith(newRooms);
      expect((component as any).showRoomsModal()).toBe(false);
    });

    it('should cancel rooms edit', () => {
      (component as any).openRoomsModal();
      (component as any).onRoomsCancel();
      expect((component as any).showRoomsModal()).toBe(false);
      expect(mockRoomsService.setRooms).not.toHaveBeenCalled();
    });

    it('should compute roomsWithData correctly', () => {
      (mockDataService.records as WritableSignal<any>).set([
        createMockRecord({ rooms: { 'room-1': 100 } }),
        createMockRecord({ rooms: { 'room-2': 50 } }),
      ]);
      const roomsWithData = (component as any).roomsWithData();
      expect(roomsWithData).toContain('room-1');
      expect(roomsWithData).toContain('room-2');
      expect(roomsWithData).toHaveLength(2);
    });
  });

  // ============ Chart Setup & Delegations ============

  describe('Chart Setup & Delegations', () => {
    it('should delegate onChartViewChange', () => {
      (component as any).onChartViewChange('by-room');
      expect(mockPreferencesService.setChartView).toHaveBeenCalledWith('by-room', 'heating');
    });

    it('should delegate onDisplayModeChange', () => {
      (component as any).onDisplayModeChange('total');
      expect(mockPreferencesService.setDisplayMode).toHaveBeenCalledWith('total', 'heating');
    });

    it('should delegate to other DataService methods', () => {
      const event = {} as Event;

      (component as any).importData(event);
      expect(mockDataService.importData).toHaveBeenCalledWith(event);

      (component as any).confirmImport();
      expect(mockDataService.confirmImport).toHaveBeenCalled();

      (component as any).cancelImport();
      expect(mockDataService.cancelImport).toHaveBeenCalled();

      (component as any).importFromExcel(event);
      expect(mockDataService.importFromExcel).toHaveBeenCalledWith(event);

      (component as any).exportData();
      expect(mockDataService.exportData).toHaveBeenCalled();

      (component as any).exportToExcel();
      expect(mockDataService.exportToExcel).toHaveBeenCalled();

      (component as any).exportToPdf();
      expect(mockDataService.exportToPdf).toHaveBeenCalled();

      (component as any).closeSuccessModal();
      expect(mockDataService.closeSuccessModal).toHaveBeenCalled();

      (component as any).closeErrorModal();
      expect(mockDataService.closeErrorModal).toHaveBeenCalled();
    });
  });
});
