import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExcelSettingsComponent } from './excel-settings.component';
import { ExcelSettingsService, ExcelSettings } from '../../services/excel-settings.service';
import { ExcelValidationService } from '../../services/excel-validation.service';
import { ExcelImportService, ImportError } from '../../services/excel-import.service';
import { LanguageService } from '../../services/language.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { FileStorageService } from '../../services/file-storage.service';
import { HeatingRoomsService } from '../../services/heating-rooms.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { DeleteConfirmationModalComponent } from '../../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { ErrorModalComponent } from '../../shared/error-modal/error-modal.component';
import { HelpModalComponent } from '../../shared/help-modal/help-modal.component';
import { Pipe, PipeTransform, Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { vi, afterEach } from 'vitest';

// --- Mock Components & Pipes ---

@Pipe({ name: 'translate', standalone: true })
class MockTranslatePipe implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

@Component({ selector: 'app-delete-confirmation-modal', standalone: true, template: '' })
class MockDeleteConfirmationModalComponent {
  @Input() show = false;
  @Input() titleKey = '';
  @Input() messageKey = '';
  @Input() cancelKey = '';
  @Input() deleteKey = '';
  @Input() icon: any;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}

@Component({ selector: 'app-confirmation-modal', standalone: true, template: '' })
class MockConfirmationModalComponent {
  @Input() show = false;
  @Input() titleKey = '';
  @Input() messageKey = '';
  @Input() cancelKey = '';
  @Input() confirmKey = '';
  @Input() icon: any;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}

@Component({ selector: 'app-error-modal', standalone: true, template: '' })
class MockErrorModalComponent {
  @Input() show = false;
  @Input() title = '';
  @Input() message = '';
  @Input() details = '';
  @Input() instructions: string[] = [];
  @Output() cancel = new EventEmitter<void>();
}

@Component({ selector: 'app-help-modal', standalone: true, template: '' })
class MockHelpModalComponent {
  @Input() show = false;
  @Input() titleKey = '';
  @Input() steps: any[] = [];
  @Output() close = new EventEmitter<void>();
}

// --- Helpers ---

const DEFAULT_SETTINGS: ExcelSettings = {
  enabled: false,
  waterMapping: {
    date: 'Date',
    kitchenWarm: 'Kitchen Warm Water',
    kitchenCold: 'Kitchen Cold Water',
    bathroomWarm: 'Bathroom Warm Water',
    bathroomCold: 'Bathroom Cold Water',
  },
  heatingMapping: {
    date: 'Date',
    rooms: {},
  },
  electricityMapping: {
    date: 'Date',
    value: 'Electricity Consumption (kWh)',
  },
};

const makeSettings = (overrides: Partial<ExcelSettings> = {}): ExcelSettings => ({
  ...DEFAULT_SETTINGS,
  ...overrides,
  waterMapping: { ...DEFAULT_SETTINGS.waterMapping, ...overrides.waterMapping },
  heatingMapping: { ...DEFAULT_SETTINGS.heatingMapping, ...overrides.heatingMapping },
  electricityMapping: { ...DEFAULT_SETTINGS.electricityMapping, ...overrides.electricityMapping },
});

describe('ExcelSettingsComponent', () => {
  let component: ExcelSettingsComponent;
  let fixture: ComponentFixture<ExcelSettingsComponent>;
  let excelSettingsServiceMock: any;
  let validationServiceMock: any;
  let importServiceMock: any;
  let languageServiceMock: any;
  let localStorageServiceMock: any;
  let fileStorageServiceMock: any;
  let heatingRoomsServiceMock: any;

  const settingsSignal = signal<ExcelSettings>(makeSettings());
  const roomsSignal = signal<{ id: string; name: string; type?: string }[]>([]);

  beforeEach(async () => {
    settingsSignal.set(makeSettings());
    roomsSignal.set([]);

    excelSettingsServiceMock = {
      settings: settingsSignal,
      updateSettings: vi.fn(),
      resetToDefaults: vi.fn(),
    };

    validationServiceMock = {
      validateMappings: vi.fn().mockReturnValue({ isValid: true }),
      isDuplicate: vi.fn().mockReturnValue(false),
      isValidColumnName: vi.fn().mockReturnValue(true),
      getValidationError: vi.fn().mockReturnValue(''),
    };

    importServiceMock = {
      validateImportedSettings: vi.fn().mockReturnValue(makeSettings()),
      mapImportError: vi.fn().mockReturnValue({
        message: 'SETTINGS.IMPORT_ERROR',
        details: 'Details',
        instructions: ['INSTRUCTION_1'],
      }),
    };

    languageServiceMock = {
      currentLang: signal('en'),
      translate: vi.fn().mockImplementation((key: string) => key),
    };

    localStorageServiceMock = {
      getPreference: vi.fn().mockReturnValue(null),
      setPreference: vi.fn(),
    };

    fileStorageServiceMock = {
      exportData: vi.fn().mockResolvedValue(undefined),
      importFromFile: vi.fn().mockResolvedValue(makeSettings()),
    };

    heatingRoomsServiceMock = {
      rooms: roomsSignal,
    };

    await TestBed.configureTestingModule({
      imports: [ExcelSettingsComponent],
    })
      .overrideComponent(ExcelSettingsComponent, {
        remove: {
          imports: [
            TranslatePipe,
            DeleteConfirmationModalComponent,
            ConfirmationModalComponent,
            ErrorModalComponent,
            HelpModalComponent,
          ],
        },
        add: {
          imports: [
            MockTranslatePipe,
            MockDeleteConfirmationModalComponent,
            MockConfirmationModalComponent,
            MockErrorModalComponent,
            MockHelpModalComponent,
          ],
        },
      })
      .overrideProvider(ExcelSettingsService, { useValue: excelSettingsServiceMock })
      .overrideProvider(ExcelValidationService, { useValue: validationServiceMock })
      .overrideProvider(ExcelImportService, { useValue: importServiceMock })
      .overrideProvider(LanguageService, { useValue: languageServiceMock })
      .overrideProvider(LocalStorageService, { useValue: localStorageServiceMock })
      .overrideProvider(FileStorageService, { useValue: fileStorageServiceMock })
      .overrideProvider(HeatingRoomsService, { useValue: heatingRoomsServiceMock })
      .compileComponents();

    fixture = TestBed.createComponent(ExcelSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ========================================================================
  // Creation & Default State
  // ========================================================================
  describe('Creation and Defaults', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should not show edit modal by default', () => {
      expect((component as any).showModal()).toBe(false);
    });

    it('should not show save success by default', () => {
      expect((component as any).showSaveSuccess()).toBe(false);
    });

    it('should not show import success by default', () => {
      expect((component as any).showImportSuccess()).toBe(false);
    });

    it('should have empty validation error by default', () => {
      expect((component as any).validationError()).toBe('');
    });

    it('should not show import confirm modal by default', () => {
      expect((component as any).showImportConfirmModal()).toBe(false);
    });

    it('should have null pending import file by default', () => {
      expect((component as any).pendingImportFile()).toBeNull();
    });

    it('should not show import error modal by default', () => {
      expect((component as any).showImportErrorModal()).toBe(false);
    });

    it('should have empty import error message by default', () => {
      expect((component as any).importErrorMessage()).toBe('');
    });

    it('should have empty import error details by default', () => {
      expect((component as any).importErrorDetails()).toBe('');
    });

    it('should have empty import error instructions by default', () => {
      expect((component as any).importErrorInstructions()).toEqual([]);
    });

    it('should not show unsaved changes modal by default', () => {
      expect((component as any).showUnsavedChangesModal()).toBe(false);
    });

    it('should have null pending navigation by default', () => {
      expect((component as any).pendingNavigation()).toBeNull();
    });

    it('should not show help modal by default', () => {
      expect((component as any).showHelpModal()).toBe(false);
    });

    it('should have 4 help steps', () => {
      expect((component as any).helpSteps.length).toBe(4);
    });

    it('should have enabled set to false by default', () => {
      expect((component as any).enabled()).toBe(false);
    });

    it('should initialize local column signals from default settings', () => {
      expect((component as any).waterDateCol()).toBe('Date');
      expect((component as any).waterKitchenWarmCol()).toBe('Kitchen Warm Water');
      expect((component as any).waterKitchenColdCol()).toBe('Kitchen Cold Water');
      expect((component as any).waterBathroomWarmCol()).toBe('Bathroom Warm Water');
      expect((component as any).waterBathroomColdCol()).toBe('Bathroom Cold Water');
      expect((component as any).heatingDateCol()).toBe('Date');
      expect((component as any).electricityDateCol()).toBe('Date');
      expect((component as any).electricityValueCol()).toBe('Electricity Consumption (kWh)');
    });

    it('should have empty heating room cols when no rooms configured', () => {
      expect((component as any).heatingRoomCols()).toEqual({});
    });
  });

  // ========================================================================
  // Preview Collapsed State
  // ========================================================================
  describe('Preview Collapsed State', () => {
    it('should start expanded by default when no saved preference', () => {
      expect((component as any).isPreviewCollapsed()).toBe(false);
    });

    it('should save default collapsed state to localStorage when no preference exists', () => {
      expect(localStorageServiceMock.setPreference).toHaveBeenCalledWith(
        'excel_preview_is_collapsed',
        'false',
      );
    });

    it('should load collapsed state as true from localStorage', async () => {
      localStorageServiceMock.getPreference.mockReturnValue('true');

      // Re-create component to test constructor logic
      const newFixture = TestBed.createComponent(ExcelSettingsComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      expect((newComponent as any).isPreviewCollapsed()).toBe(true);
    });

    it('should load collapsed state as false from localStorage', async () => {
      localStorageServiceMock.getPreference.mockReturnValue('false');

      const newFixture = TestBed.createComponent(ExcelSettingsComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      expect((newComponent as any).isPreviewCollapsed()).toBe(false);
    });
  });

  // ========================================================================
  // togglePreview
  // ========================================================================
  describe('togglePreview', () => {
    it('should toggle from expanded to collapsed', () => {
      (component as any).togglePreview();
      expect((component as any).isPreviewCollapsed()).toBe(true);
    });

    it('should toggle from collapsed back to expanded', () => {
      (component as any).isPreviewCollapsed.set(true);
      (component as any).togglePreview();
      expect((component as any).isPreviewCollapsed()).toBe(false);
    });

    it('should save collapsed state to localStorage', () => {
      (component as any).togglePreview();
      expect(localStorageServiceMock.setPreference).toHaveBeenCalledWith(
        'excel_preview_is_collapsed',
        'true',
      );
    });

    it('should save expanded state to localStorage', () => {
      (component as any).isPreviewCollapsed.set(true);
      (component as any).togglePreview();
      expect(localStorageServiceMock.setPreference).toHaveBeenCalledWith(
        'excel_preview_is_collapsed',
        'false',
      );
    });
  });

  // ========================================================================
  // Computed Columns
  // ========================================================================
  describe('Computed Columns', () => {
    it('should compute waterColumns from signals', () => {
      (component as any).waterDateCol.set('A');
      (component as any).waterKitchenWarmCol.set('B');
      (component as any).waterKitchenColdCol.set('C');
      (component as any).waterBathroomWarmCol.set('D');
      (component as any).waterBathroomColdCol.set('E');

      expect((component as any).waterColumns()).toEqual(['A', 'B', 'C', 'D', 'E']);
    });

    it('should compute electricityColumns from signals', () => {
      (component as any).electricityDateCol.set('X');
      (component as any).electricityValueCol.set('Y');

      expect((component as any).electricityColumns()).toEqual(['X', 'Y']);
    });

    it('should compute heatingColumns with date and room columns', () => {
      roomsSignal.set([
        { id: 'room_1', name: 'Living Room' },
        { id: 'room_2', name: 'Bedroom' },
      ]);
      (component as any).heatingDateCol.set('Date');
      (component as any).heatingRoomCols.set({ room_1: 'LR Col', room_2: 'BR Col' });

      const cols = (component as any).heatingColumns();
      expect(cols).toEqual(['Date', 'LR Col', 'BR Col']);
    });

    it('should use empty string for rooms without configured columns', () => {
      roomsSignal.set([{ id: 'room_1', name: 'Living Room' }]);
      (component as any).heatingDateCol.set('Date');
      (component as any).heatingRoomCols.set({});

      const cols = (component as any).heatingColumns();
      expect(cols).toEqual(['Date', '']);
    });

    it('should compute heatingRoomCount from rooms service', () => {
      roomsSignal.set([
        { id: 'room_1', name: 'R1' },
        { id: 'room_2', name: 'R2' },
        { id: 'room_3', name: 'R3' },
      ]);
      expect((component as any).heatingRoomCount()).toBe(3);
    });

    it('should return 0 heatingRoomCount when no rooms', () => {
      expect((component as any).heatingRoomCount()).toBe(0);
    });
  });

  // ========================================================================
  // Room Column Helpers
  // ========================================================================
  describe('updateRoomCol / getRoomCol', () => {
    it('should update a room column value', () => {
      (component as any).updateRoomCol('room_1', 'My Column');
      expect((component as any).heatingRoomCols()['room_1']).toBe('My Column');
    });

    it('should not overwrite other room columns', () => {
      (component as any).heatingRoomCols.set({ room_1: 'A', room_2: 'B' });
      (component as any).updateRoomCol('room_1', 'Updated');

      expect((component as any).heatingRoomCols()['room_1']).toBe('Updated');
      expect((component as any).heatingRoomCols()['room_2']).toBe('B');
    });

    it('should get a room column value', () => {
      (component as any).heatingRoomCols.set({ room_1: 'Col A' });
      expect((component as any).getRoomCol('room_1')).toBe('Col A');
    });

    it('should return empty string for non-existent room column', () => {
      expect((component as any).getRoomCol('nonexistent')).toBe('');
    });
  });

  // ========================================================================
  // isFormValid
  // ========================================================================
  describe('isFormValid', () => {
    it('should return true when all validations pass', () => {
      validationServiceMock.validateMappings.mockReturnValue({ isValid: true });
      expect((component as any).isFormValid()).toBe(true);
    });

    it('should return false when water/heating validation fails', () => {
      validationServiceMock.validateMappings
        .mockReturnValueOnce({ isValid: false, errorKey: 'EXCEL.VALIDATION_FORM_INVALID' })
        .mockReturnValueOnce({ isValid: true });
      expect((component as any).isFormValid()).toBe(false);
    });

    it('should return false when electricity validation fails', () => {
      validationServiceMock.validateMappings
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({ isValid: false, errorKey: 'EXCEL.VALIDATION_FORM_INVALID' });
      expect((component as any).isFormValid()).toBe(false);
    });
  });

  // ========================================================================
  // Duplicate Checks
  // ========================================================================
  describe('Duplicate detection', () => {
    it('isDuplicateWater should delegate to validation service', () => {
      validationServiceMock.isDuplicate.mockReturnValue(true);
      const result = (component as any).isDuplicateWater('Date');
      expect(validationServiceMock.isDuplicate).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('isDuplicateHeating should delegate to validation service', () => {
      validationServiceMock.isDuplicate.mockReturnValue(false);
      const result = (component as any).isDuplicateHeating('Date');
      expect(validationServiceMock.isDuplicate).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('isDuplicateElectricity should delegate to validation service', () => {
      validationServiceMock.isDuplicate.mockReturnValue(true);
      const result = (component as any).isDuplicateElectricity('Date');
      expect(validationServiceMock.isDuplicate).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('isDuplicateWater should pass water columns to validation service', () => {
      (component as any).waterDateCol.set('A');
      (component as any).waterKitchenWarmCol.set('B');
      (component as any).waterKitchenColdCol.set('C');
      (component as any).waterBathroomWarmCol.set('D');
      (component as any).waterBathroomColdCol.set('E');

      (component as any).isDuplicateWater('A');
      expect(validationServiceMock.isDuplicate).toHaveBeenCalledWith('A', [
        'A',
        'B',
        'C',
        'D',
        'E',
      ]);
    });

    it('isDuplicateElectricity should pass electricity columns to validation service', () => {
      (component as any).electricityDateCol.set('X');
      (component as any).electricityValueCol.set('Y');

      (component as any).isDuplicateElectricity('X');
      expect(validationServiceMock.isDuplicate).toHaveBeenCalledWith('X', ['X', 'Y']);
    });
  });

  // ========================================================================
  // onEnabledChange
  // ========================================================================
  describe('onEnabledChange', () => {
    it('should update enabled signal from checkbox event', () => {
      const event = { target: { checked: true } } as unknown as Event;
      (component as any).onEnabledChange(event);
      expect((component as any).enabled()).toBe(true);
    });

    it('should update enabled signal to false from checkbox event', () => {
      (component as any).enabled.set(true);
      const event = { target: { checked: false } } as unknown as Event;
      (component as any).onEnabledChange(event);
      expect((component as any).enabled()).toBe(false);
    });

    it('should call updateSettings with current enabled state', () => {
      const event = { target: { checked: true } } as unknown as Event;
      (component as any).onEnabledChange(event);
      expect(excelSettingsServiceMock.updateSettings).toHaveBeenCalled();
      const calledWith = excelSettingsServiceMock.updateSettings.mock.calls[0][0];
      expect(calledWith.enabled).toBe(true);
    });

    it('should preserve existing mappings when toggling enabled', () => {
      const event = { target: { checked: true } } as unknown as Event;
      (component as any).onEnabledChange(event);
      const calledWith = excelSettingsServiceMock.updateSettings.mock.calls[0][0];
      expect(calledWith.waterMapping).toEqual(DEFAULT_SETTINGS.waterMapping);
      expect(calledWith.heatingMapping).toEqual(DEFAULT_SETTINGS.heatingMapping);
      expect(calledWith.electricityMapping).toEqual(DEFAULT_SETTINGS.electricityMapping);
    });

    it('should handle call without event', () => {
      (component as any).enabled.set(true);
      (component as any).onEnabledChange();
      expect(excelSettingsServiceMock.updateSettings).toHaveBeenCalled();
      const calledWith = excelSettingsServiceMock.updateSettings.mock.calls[0][0];
      expect(calledWith.enabled).toBe(true);
    });
  });

  // ========================================================================
  // openModal / closeModal / performCloseModal
  // ========================================================================
  describe('openModal', () => {
    it('should set showModal to true', () => {
      (component as any).openModal();
      expect((component as any).showModal()).toBe(true);
    });

    it('should clear validation error', () => {
      (component as any).validationError.set('Some error');
      (component as any).openModal();
      expect((component as any).validationError()).toBe('');
    });
  });

  describe('closeModal', () => {
    it('should close directly when no unsaved changes', () => {
      (component as any).showModal.set(true);
      (component as any).closeModal();
      expect((component as any).showModal()).toBe(false);
    });

    it('should show unsaved changes modal when there are unsaved changes', () => {
      (component as any).showModal.set(true);
      (component as any).waterDateCol.set('Changed');
      (component as any).closeModal();
      // hasUnsavedChanges checks showModal(), and we modified a field
      expect((component as any).showUnsavedChangesModal()).toBe(true);
    });

    it('should reset local state to saved settings when closing without changes', () => {
      settingsSignal.set(
        makeSettings({ waterMapping: { ...DEFAULT_SETTINGS.waterMapping, date: 'CustomDate' } }),
      );
      fixture.detectChanges();

      (component as any).showModal.set(true);
      (component as any).closeModal();

      expect((component as any).waterDateCol()).toBe('CustomDate');
    });

    it('should clear save success when closing', () => {
      (component as any).showSaveSuccess.set(true);
      (component as any).showModal.set(true);
      (component as any).closeModal();
      expect((component as any).showSaveSuccess()).toBe(false);
    });

    it('should clear validation error when closing', () => {
      (component as any).validationError.set('Error');
      (component as any).showModal.set(true);
      (component as any).closeModal();
      expect((component as any).validationError()).toBe('');
    });
  });

  // ========================================================================
  // hasUnsavedChanges
  // ========================================================================
  describe('hasUnsavedChanges', () => {
    it('should return false when modal is closed', () => {
      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('should return false when modal is open and no fields changed', () => {
      (component as any).showModal.set(true);
      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('should return true when waterDateCol is changed', () => {
      (component as any).showModal.set(true);
      (component as any).waterDateCol.set('Changed');
      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('should return true when waterKitchenWarmCol is changed', () => {
      (component as any).showModal.set(true);
      (component as any).waterKitchenWarmCol.set('Changed');
      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('should return true when waterKitchenColdCol is changed', () => {
      (component as any).showModal.set(true);
      (component as any).waterKitchenColdCol.set('Changed');
      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('should return true when waterBathroomWarmCol is changed', () => {
      (component as any).showModal.set(true);
      (component as any).waterBathroomWarmCol.set('Changed');
      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('should return true when waterBathroomColdCol is changed', () => {
      (component as any).showModal.set(true);
      (component as any).waterBathroomColdCol.set('Changed');
      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('should return true when heatingDateCol is changed', () => {
      (component as any).showModal.set(true);
      (component as any).heatingDateCol.set('Changed');
      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('should return true when electricityDateCol is changed', () => {
      (component as any).showModal.set(true);
      (component as any).electricityDateCol.set('Changed');
      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('should return true when electricityValueCol is changed', () => {
      (component as any).showModal.set(true);
      (component as any).electricityValueCol.set('Changed');
      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('should detect changes with leading/trailing whitespace', () => {
      (component as any).showModal.set(true);
      (component as any).waterDateCol.set('  Date  ');
      // trim() of '  Date  ' is 'Date' which matches saved — so no change
      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('should return true when heating room columns have changed', () => {
      roomsSignal.set([{ id: 'room_1', name: 'Living Room' }]);
      settingsSignal.set(
        makeSettings({
          heatingMapping: { date: 'Date', rooms: { room_1: 'LR' } },
        }),
      );
      fixture.detectChanges();

      (component as any).showModal.set(true);
      (component as any).heatingRoomCols.set({ room_1: 'Changed LR' });
      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('should return false when heating room columns match saved (empty)', () => {
      roomsSignal.set([{ id: 'room_1', name: 'Living Room' }]);
      settingsSignal.set(
        makeSettings({
          heatingMapping: { date: 'Date', rooms: {} },
        }),
      );
      fixture.detectChanges();

      (component as any).showModal.set(true);
      (component as any).heatingRoomCols.set({ room_1: '' });
      expect(component.hasUnsavedChanges()).toBe(false);
    });
  });

  // ========================================================================
  // onBeforeUnload
  // ========================================================================
  describe('onBeforeUnload', () => {
    it('should prevent default when there are unsaved changes', () => {
      (component as any).showModal.set(true);
      (component as any).waterDateCol.set('Changed');

      const event = new Event('beforeunload') as BeforeUnloadEvent;
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      component.onBeforeUnload(event);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not prevent default when no unsaved changes', () => {
      const event = new Event('beforeunload') as BeforeUnloadEvent;
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      component.onBeforeUnload(event);
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  // ========================================================================
  // Navigation Guard
  // ========================================================================
  describe('triggerNavigationWarning', () => {
    it('should return true and show modal when there are unsaved changes', () => {
      (component as any).showModal.set(true);
      (component as any).waterDateCol.set('Changed');

      const onLeave = vi.fn();
      const result = component.triggerNavigationWarning(onLeave);

      expect(result).toBe(true);
      expect((component as any).showUnsavedChangesModal()).toBe(true);
      expect((component as any).pendingNavigation()).toBe(onLeave);
    });

    it('should return false when no unsaved changes', () => {
      const onLeave = vi.fn();
      const result = component.triggerNavigationWarning(onLeave);

      expect(result).toBe(false);
      expect((component as any).showUnsavedChangesModal()).toBe(false);
    });
  });

  describe('confirmLeaveWithoutSaving', () => {
    it('should execute pending navigation', () => {
      const navFn = vi.fn();
      (component as any).pendingNavigation.set(navFn);
      component.confirmLeaveWithoutSaving();
      expect(navFn).toHaveBeenCalledTimes(1);
    });

    it('should hide unsaved changes modal', () => {
      (component as any).showUnsavedChangesModal.set(true);
      component.confirmLeaveWithoutSaving();
      expect((component as any).showUnsavedChangesModal()).toBe(false);
    });

    it('should clear pending navigation', () => {
      (component as any).pendingNavigation.set(vi.fn());
      component.confirmLeaveWithoutSaving();
      expect((component as any).pendingNavigation()).toBeNull();
    });

    it('should handle null pending navigation gracefully', () => {
      (component as any).pendingNavigation.set(null);
      expect(() => component.confirmLeaveWithoutSaving()).not.toThrow();
    });
  });

  describe('stayAndSave', () => {
    it('should hide unsaved changes modal', () => {
      (component as any).showUnsavedChangesModal.set(true);
      component.stayAndSave();
      expect((component as any).showUnsavedChangesModal()).toBe(false);
    });

    it('should clear pending navigation', () => {
      (component as any).pendingNavigation.set(vi.fn());
      component.stayAndSave();
      expect((component as any).pendingNavigation()).toBeNull();
    });
  });

  // ========================================================================
  // saveSettings
  // ========================================================================
  describe('saveSettings', () => {
    it('should call updateSettings with trimmed values', () => {
      (component as any).waterDateCol.set('  Trimmed Date  ');
      (component as any).waterKitchenWarmCol.set('  KW  ');
      (component as any).waterKitchenColdCol.set('  KC  ');
      (component as any).waterBathroomWarmCol.set('  BW  ');
      (component as any).waterBathroomColdCol.set('  BC  ');
      (component as any).heatingDateCol.set('  HD  ');
      (component as any).electricityDateCol.set('  ED  ');
      (component as any).electricityValueCol.set('  EV  ');

      (component as any).saveSettings();

      expect(excelSettingsServiceMock.updateSettings).toHaveBeenCalled();
      const calledWith = excelSettingsServiceMock.updateSettings.mock.calls[0][0];
      expect(calledWith.waterMapping.date).toBe('Trimmed Date');
      expect(calledWith.waterMapping.kitchenWarm).toBe('KW');
      expect(calledWith.waterMapping.kitchenCold).toBe('KC');
      expect(calledWith.waterMapping.bathroomWarm).toBe('BW');
      expect(calledWith.waterMapping.bathroomCold).toBe('BC');
      expect(calledWith.heatingMapping.date).toBe('HD');
      expect(calledWith.electricityMapping.date).toBe('ED');
      expect(calledWith.electricityMapping.value).toBe('EV');
    });

    it('should not save when validation fails', () => {
      validationServiceMock.validateMappings.mockReturnValue({
        isValid: false,
        errorKey: 'EXCEL.VALIDATION_FORM_INVALID',
      });

      (component as any).saveSettings();
      expect(excelSettingsServiceMock.updateSettings).not.toHaveBeenCalled();
    });

    it('should set validation error when validation fails', () => {
      validationServiceMock.validateMappings.mockReturnValue({
        isValid: false,
        errorKey: 'EXCEL.VALIDATION_FORM_INVALID',
      });

      (component as any).saveSettings();
      expect((component as any).validationError()).toBe('EXCEL.VALIDATION_FORM_INVALID');
    });

    it('should use default error key when validation errorKey is undefined', () => {
      validationServiceMock.validateMappings.mockReturnValue({ isValid: false });

      (component as any).saveSettings();
      expect(languageServiceMock.translate).toHaveBeenCalledWith('EXCEL.VALIDATION_FORM_INVALID');
    });

    it('should clear validation error on successful save', () => {
      (component as any).validationError.set('Previous error');
      (component as any).saveSettings();
      expect((component as any).validationError()).toBe('');
    });

    it('should show save success on successful save', () => {
      (component as any).saveSettings();
      expect((component as any).showSaveSuccess()).toBe(true);
    });

    it('should hide save success after 3 seconds', () => {
      vi.useFakeTimers();
      (component as any).saveSettings();
      expect((component as any).showSaveSuccess()).toBe(true);

      vi.advanceTimersByTime(3000);
      expect((component as any).showSaveSuccess()).toBe(false);
      vi.useRealTimers();
    });

    it('should close modal after 2 seconds', () => {
      vi.useFakeTimers();
      (component as any).showModal.set(true);
      (component as any).saveSettings();

      vi.advanceTimersByTime(2000);
      expect((component as any).showModal()).toBe(false);
      vi.useRealTimers();
    });

    it('should include room column mappings trimmed', () => {
      roomsSignal.set([
        { id: 'room_1', name: 'Living Room' },
        { id: 'room_2', name: 'Bedroom' },
      ]);
      (component as any).heatingRoomCols.set({ room_1: '  LR  ', room_2: '  BR  ' });

      (component as any).saveSettings();

      const calledWith = excelSettingsServiceMock.updateSettings.mock.calls[0][0];
      expect(calledWith.heatingMapping.rooms).toEqual({ room_1: 'LR', room_2: 'BR' });
    });

    it('should save empty string for unconfigured room columns', () => {
      roomsSignal.set([{ id: 'room_1', name: 'Living Room' }]);
      (component as any).heatingRoomCols.set({});

      (component as any).saveSettings();

      const calledWith = excelSettingsServiceMock.updateSettings.mock.calls[0][0];
      expect(calledWith.heatingMapping.rooms).toEqual({ room_1: '' });
    });

    it('should include current enabled state in saved settings', () => {
      (component as any).enabled.set(true);
      (component as any).saveSettings();

      const calledWith = excelSettingsServiceMock.updateSettings.mock.calls[0][0];
      expect(calledWith.enabled).toBe(true);
    });
  });

  // ========================================================================
  // resetDefaults
  // ========================================================================
  describe('resetDefaults', () => {
    it('should call resetToDefaults on the service', () => {
      (component as any).resetDefaults();
      expect(excelSettingsServiceMock.resetToDefaults).toHaveBeenCalledTimes(1);
    });

    it('should clear validation error', () => {
      (component as any).validationError.set('Error');
      (component as any).resetDefaults();
      expect((component as any).validationError()).toBe('');
    });
  });

  // ========================================================================
  // exportSettings
  // ========================================================================
  describe('exportSettings', () => {
    it('should call fileStorage.exportData with current settings', async () => {
      await (component as any).exportSettings();
      expect(fileStorageServiceMock.exportData).toHaveBeenCalledWith(
        DEFAULT_SETTINGS,
        'excel-settings.json',
      );
    });

    it('should not throw when export fails', async () => {
      fileStorageServiceMock.exportData.mockRejectedValue(new Error('Export failed'));
      await expect((component as any).exportSettings()).resolves.toBeUndefined();
    });

    it('should log error when export fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      fileStorageServiceMock.exportData.mockRejectedValue(new Error('Export failed'));

      await (component as any).exportSettings();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to export settings:', expect.any(Error));
    });
  });

  // ========================================================================
  // importSettings (file selection)
  // ========================================================================
  describe('importSettings', () => {
    it('should set pending import file and show confirm modal', () => {
      const file = new File(['{}'], 'settings.json', { type: 'application/json' });
      const event = { target: { files: [file], value: 'settings.json' } } as unknown as Event;

      (component as any).importSettings(event);

      expect((component as any).pendingImportFile()).toBe(file);
      expect((component as any).showImportConfirmModal()).toBe(true);
    });

    it('should clear input value after selecting file', () => {
      const file = new File(['{}'], 'settings.json', { type: 'application/json' });
      const target = { files: [file], value: 'settings.json' };
      const event = { target } as unknown as Event;

      (component as any).importSettings(event);

      expect(target.value).toBe('');
    });

    it('should not show confirm modal when no file selected', () => {
      const event = { target: { files: [], value: '' } } as unknown as Event;
      (component as any).importSettings(event);

      expect((component as any).showImportConfirmModal()).toBe(false);
      expect((component as any).pendingImportFile()).toBeNull();
    });

    it('should not show confirm modal when files is undefined', () => {
      const event = { target: { files: undefined, value: '' } } as unknown as Event;
      (component as any).importSettings(event);

      expect((component as any).showImportConfirmModal()).toBe(false);
    });
  });

  // ========================================================================
  // confirmImportSettings
  // ========================================================================
  describe('confirmImportSettings', () => {
    it('should do nothing when no pending file', async () => {
      (component as any).pendingImportFile.set(null);
      await (component as any).confirmImportSettings();

      expect(fileStorageServiceMock.importFromFile).not.toHaveBeenCalled();
      expect((component as any).showImportConfirmModal()).toBe(false);
    });

    it('should show error for non-JSON file', async () => {
      const file = new File(['data'], 'settings.txt', { type: 'text/plain' });
      (component as any).pendingImportFile.set(file);

      await (component as any).confirmImportSettings();

      expect((component as any).showImportErrorModal()).toBe(true);
      expect(languageServiceMock.translate).toHaveBeenCalledWith(
        'SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FILE_TYPE',
      );
      expect((component as any).importErrorInstructions()).toEqual([
        'SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FILE_TYPE_INSTRUCTION_1',
        'SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FILE_TYPE_INSTRUCTION_2',
      ]);
    });

    it('should clear confirm modal when file type is invalid', async () => {
      const file = new File(['data'], 'settings.xlsx', { type: 'application/vnd.ms-excel' });
      (component as any).pendingImportFile.set(file);

      await (component as any).confirmImportSettings();

      expect((component as any).showImportConfirmModal()).toBe(false);
      expect((component as any).pendingImportFile()).toBeNull();
    });

    it('should accept .JSON (uppercase) file extension', async () => {
      const file = new File(['{}'], 'settings.JSON', { type: 'application/json' });
      (component as any).pendingImportFile.set(file);

      await (component as any).confirmImportSettings();

      expect(fileStorageServiceMock.importFromFile).toHaveBeenCalledWith(file);
    });

    it('should update settings on successful import', async () => {
      const newSettings = makeSettings({ enabled: true });
      importServiceMock.validateImportedSettings.mockReturnValue(newSettings);

      const file = new File(['{}'], 'settings.json', { type: 'application/json' });
      (component as any).pendingImportFile.set(file);

      await (component as any).confirmImportSettings();

      expect(excelSettingsServiceMock.updateSettings).toHaveBeenCalledWith(newSettings);
    });

    it('should show import success on successful import', async () => {
      const file = new File(['{}'], 'settings.json', { type: 'application/json' });
      (component as any).pendingImportFile.set(file);

      await (component as any).confirmImportSettings();

      expect((component as any).showImportSuccess()).toBe(true);
    });

    it('should hide import success after 3 seconds', async () => {
      vi.useFakeTimers();
      const file = new File(['{}'], 'settings.json', { type: 'application/json' });
      (component as any).pendingImportFile.set(file);

      await (component as any).confirmImportSettings();

      expect((component as any).showImportSuccess()).toBe(true);
      vi.advanceTimersByTime(3000);
      expect((component as any).showImportSuccess()).toBe(false);
      vi.useRealTimers();
    });

    it('should show error modal when import validation throws', async () => {
      const importError = new Error('Invalid settings structure');
      fileStorageServiceMock.importFromFile.mockRejectedValue(importError);
      importServiceMock.mapImportError.mockReturnValue({
        message: 'SETTINGS.IMPORT_ERROR',
        details: 'Some detail',
        instructions: ['I1', 'I2'],
      });

      const file = new File(['bad'], 'settings.json', { type: 'application/json' });
      (component as any).pendingImportFile.set(file);

      await (component as any).confirmImportSettings();

      expect((component as any).showImportErrorModal()).toBe(true);
      expect((component as any).importErrorMessage()).toBe('SETTINGS.IMPORT_ERROR');
      expect((component as any).importErrorDetails()).toBe('Some detail');
      expect((component as any).importErrorInstructions()).toEqual(['I1', 'I2']);
    });

    it('should show error modal when validateImportedSettings throws', async () => {
      const importError: ImportError = {
        message: 'SETTINGS.IMPORT_VALIDATION_ERROR',
        details: 'Missing fields',
        fieldKeys: ['field1'],
        hintKeys: ['hint1'],
      };
      importServiceMock.validateImportedSettings.mockImplementation(() => {
        throw importError;
      });
      importServiceMock.mapImportError.mockReturnValue({
        message: 'SETTINGS.IMPORT_VALIDATION_ERROR',
        details: 'Missing fields',
        instructions: ['Fix the fields'],
      });

      const file = new File(['{}'], 'settings.json', { type: 'application/json' });
      (component as any).pendingImportFile.set(file);

      await (component as any).confirmImportSettings();

      expect((component as any).showImportErrorModal()).toBe(true);
    });

    it('should close confirm modal and clear pending file after import', async () => {
      const file = new File(['{}'], 'settings.json', { type: 'application/json' });
      (component as any).pendingImportFile.set(file);
      (component as any).showImportConfirmModal.set(true);

      await (component as any).confirmImportSettings();

      expect((component as any).showImportConfirmModal()).toBe(false);
      expect((component as any).pendingImportFile()).toBeNull();
    });

    it('should close confirm modal and clear pending file even on error', async () => {
      fileStorageServiceMock.importFromFile.mockRejectedValue(new Error('fail'));

      const file = new File(['bad'], 'settings.json', { type: 'application/json' });
      (component as any).pendingImportFile.set(file);
      (component as any).showImportConfirmModal.set(true);

      await (component as any).confirmImportSettings();

      expect((component as any).showImportConfirmModal()).toBe(false);
      expect((component as any).pendingImportFile()).toBeNull();
    });
  });

  // ========================================================================
  // cancelImportSettings
  // ========================================================================
  describe('cancelImportSettings', () => {
    it('should hide import confirm modal', () => {
      (component as any).showImportConfirmModal.set(true);
      (component as any).cancelImportSettings();
      expect((component as any).showImportConfirmModal()).toBe(false);
    });

    it('should clear pending import file', () => {
      (component as any).pendingImportFile.set(new File([''], 'test.json'));
      (component as any).cancelImportSettings();
      expect((component as any).pendingImportFile()).toBeNull();
    });
  });

  // ========================================================================
  // closeImportErrorModal
  // ========================================================================
  describe('closeImportErrorModal', () => {
    it('should hide import error modal', () => {
      (component as any).showImportErrorModal.set(true);
      (component as any).closeImportErrorModal();
      expect((component as any).showImportErrorModal()).toBe(false);
    });

    it('should clear error message', () => {
      (component as any).importErrorMessage.set('Error');
      (component as any).closeImportErrorModal();
      expect((component as any).importErrorMessage()).toBe('');
    });

    it('should clear error details', () => {
      (component as any).importErrorDetails.set('Details');
      (component as any).closeImportErrorModal();
      expect((component as any).importErrorDetails()).toBe('');
    });

    it('should clear error instructions', () => {
      (component as any).importErrorInstructions.set(['I1']);
      (component as any).closeImportErrorModal();
      expect((component as any).importErrorInstructions()).toEqual([]);
    });
  });

  // ========================================================================
  // Settings sync via effect (constructor)
  // ========================================================================
  describe('Settings sync effect', () => {
    it('should update local signals when settings change', () => {
      const customSettings = makeSettings({
        enabled: true,
        waterMapping: {
          date: 'Datum',
          kitchenWarm: 'Küche Warm',
          kitchenCold: 'Küche Kalt',
          bathroomWarm: 'Bad Warm',
          bathroomCold: 'Bad Kalt',
        },
        heatingMapping: { date: 'HD', rooms: {} },
        electricityMapping: { date: 'ED', value: 'EV' },
      });

      settingsSignal.set(customSettings);
      fixture.detectChanges();

      expect((component as any).enabled()).toBe(true);
      expect((component as any).waterDateCol()).toBe('Datum');
      expect((component as any).waterKitchenWarmCol()).toBe('Küche Warm');
      expect((component as any).waterKitchenColdCol()).toBe('Küche Kalt');
      expect((component as any).waterBathroomWarmCol()).toBe('Bad Warm');
      expect((component as any).waterBathroomColdCol()).toBe('Bad Kalt');
      expect((component as any).heatingDateCol()).toBe('HD');
      expect((component as any).electricityDateCol()).toBe('ED');
      expect((component as any).electricityValueCol()).toBe('EV');
    });

    it('should update heating room columns when settings include rooms', () => {
      roomsSignal.set([
        { id: 'room_1', name: 'Living Room' },
        { id: 'room_2', name: 'Bedroom' },
      ]);
      settingsSignal.set(
        makeSettings({
          heatingMapping: { date: 'Date', rooms: { room_1: 'LR Col', room_2: 'BR Col' } },
        }),
      );
      fixture.detectChanges();

      expect((component as any).heatingRoomCols()['room_1']).toBe('LR Col');
      expect((component as any).heatingRoomCols()['room_2']).toBe('BR Col');
    });

    it('should default to empty string for rooms not in settings', () => {
      roomsSignal.set([{ id: 'room_1', name: 'Living Room' }]);
      settingsSignal.set(
        makeSettings({
          heatingMapping: { date: 'Date', rooms: {} },
        }),
      );
      fixture.detectChanges();

      expect((component as any).heatingRoomCols()['room_1']).toBe('');
    });
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================
  describe('Edge Cases', () => {
    it('should handle settings with undefined rooms gracefully', () => {
      roomsSignal.set([{ id: 'room_1', name: 'Room 1' }]);
      settingsSignal.set({
        enabled: false,
        waterMapping: DEFAULT_SETTINGS.waterMapping,
        heatingMapping: { date: 'Date', rooms: undefined as any },
        electricityMapping: DEFAULT_SETTINGS.electricityMapping,
      });
      fixture.detectChanges();

      // Should use fallback empty string via ?? operator
      expect((component as any).heatingRoomCols()['room_1']).toBe('');
    });

    it('should handle rapid toggle of preview without errors', () => {
      expect(() => {
        for (let i = 0; i < 10; i++) {
          (component as any).togglePreview();
        }
      }).not.toThrow();
    });

    it('should handle empty string column names in save', () => {
      (component as any).waterDateCol.set('');
      (component as any).waterKitchenWarmCol.set('');
      (component as any).waterKitchenColdCol.set('');
      (component as any).waterBathroomWarmCol.set('');
      (component as any).waterBathroomColdCol.set('');
      (component as any).heatingDateCol.set('');
      (component as any).electricityDateCol.set('');
      (component as any).electricityValueCol.set('');

      // Validation would typically fail here, so set it to pass
      validationServiceMock.validateMappings.mockReturnValue({ isValid: true });

      (component as any).saveSettings();
      const calledWith = excelSettingsServiceMock.updateSettings.mock.calls[0][0];
      expect(calledWith.waterMapping.date).toBe('');
    });

    it('should handle special characters in column names', () => {
      (component as any).waterDateCol.set('Datum & Uhrzeit');
      validationServiceMock.validateMappings.mockReturnValue({ isValid: true });

      (component as any).saveSettings();
      const calledWith = excelSettingsServiceMock.updateSettings.mock.calls[0][0];
      expect(calledWith.waterMapping.date).toBe('Datum & Uhrzeit');
    });

    it('should handle saving with many rooms', () => {
      const rooms = Array.from({ length: 10 }, (_, i) => ({
        id: `room_${i + 1}`,
        name: `Room ${i + 1}`,
      }));
      roomsSignal.set(rooms);

      const roomCols: Record<string, string> = {};
      rooms.forEach((r) => {
        roomCols[r.id] = `Col ${r.name}`;
      });
      (component as any).heatingRoomCols.set(roomCols);

      validationServiceMock.validateMappings.mockReturnValue({ isValid: true });
      (component as any).saveSettings();

      const calledWith = excelSettingsServiceMock.updateSettings.mock.calls[0][0];
      expect(Object.keys(calledWith.heatingMapping.rooms).length).toBe(10);
    });

    it('should handle concurrent modal operations gracefully', () => {
      // Open modal, try to import, then close
      (component as any).openModal();
      expect((component as any).showModal()).toBe(true);

      (component as any).showImportConfirmModal.set(true);
      (component as any).cancelImportSettings();
      expect((component as any).showImportConfirmModal()).toBe(false);
      // Modal should still be open
      expect((component as any).showModal()).toBe(true);
    });

    it('should handle close modal resetting room columns from saved settings', () => {
      roomsSignal.set([{ id: 'room_1', name: 'Living Room' }]);
      settingsSignal.set(
        makeSettings({
          heatingMapping: { date: 'Date', rooms: { room_1: 'SavedCol' } },
        }),
      );
      fixture.detectChanges();

      (component as any).showModal.set(true);
      (component as any).heatingRoomCols.set({ room_1: 'Modified' });

      // Close without unsaved changes check (force close)
      (component as any).showModal.set(false);
      // Manually call performCloseModal to test its room reset
      (component as any).performCloseModal();

      expect((component as any).heatingRoomCols()['room_1']).toBe('SavedCol');
    });

    it('should handle import of file with .json in the middle of name', async () => {
      // File like "my.json.backup.txt" is NOT a .json file
      const file = new File(['data'], 'my.json.backup.txt', { type: 'text/plain' });
      (component as any).pendingImportFile.set(file);

      await (component as any).confirmImportSettings();

      expect((component as any).showImportErrorModal()).toBe(true);
    });

    it('should handle file with .json extension but invalid content', async () => {
      fileStorageServiceMock.importFromFile.mockRejectedValue(new Error('Parse error'));
      importServiceMock.mapImportError.mockReturnValue({
        message: 'PARSE_ERROR',
        details: 'Invalid JSON',
        instructions: [],
      });

      const file = new File(['not json'], 'settings.json', { type: 'application/json' });
      (component as any).pendingImportFile.set(file);

      await (component as any).confirmImportSettings();

      expect((component as any).showImportErrorModal()).toBe(true);
      expect((component as any).importErrorMessage()).toBe('PARSE_ERROR');
    });

    it('should handle multiple sequential saves', () => {
      vi.useFakeTimers();
      (component as any).saveSettings();
      vi.advanceTimersByTime(1000);
      (component as any).saveSettings();
      vi.advanceTimersByTime(3000);

      expect(excelSettingsServiceMock.updateSettings).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('should handle reset defaults followed by immediate save', () => {
      (component as any).resetDefaults();
      expect(excelSettingsServiceMock.resetToDefaults).toHaveBeenCalled();

      // After reset, the effect should update local signals
      // Then saving should work with the new defaults
      validationServiceMock.validateMappings.mockReturnValue({ isValid: true });
      (component as any).saveSettings();
      expect(excelSettingsServiceMock.updateSettings).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // Help Modal
  // ========================================================================
  describe('Help Modal', () => {
    it('should have correct help step structure', () => {
      const steps = (component as any).helpSteps;
      steps.forEach((step: any) => {
        expect(step).toHaveProperty('titleKey');
        expect(step).toHaveProperty('descriptionKey');
        expect(step.titleKey).toContain('SETTINGS.EXCEL_HELP_STEP_');
        expect(step.descriptionKey).toContain('SETTINGS.EXCEL_HELP_STEP_');
      });
    });
  });
});
