import {
  Component,
  inject,
  computed,
  signal,
  effect,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener,
  WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExcelSettingsService } from '../../services/excel-settings.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import {
  LucideAngularModule,
  FileSpreadsheet,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  CircleQuestionMark,
  Download,
  Upload,
  Pencil,
  TriangleAlert,
} from 'lucide-angular';
import { LanguageService } from '../../services/language.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { FileStorageService } from '../../services/file-storage.service';
import { HelpModalComponent, HelpStep } from '../../shared/help-modal/help-modal.component';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { ErrorModalComponent } from '../../shared/error-modal/error-modal.component';
import { ExcelValidationService } from '../../services/excel-validation.service';
import { ExcelImportService } from '../../services/excel-import.service';
import { DeleteConfirmationModalComponent } from '../../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { HeatingRoomsService } from '../../services/heating-rooms.service';
import { NavigationGuardState } from '../../utils/navigation-guard.utils';
import { ExcelMappingCardComponent } from './excel-mapping-card/excel-mapping-card.component';

@Component({
  selector: 'app-excel-settings',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    LucideAngularModule,
    HelpModalComponent,
    ConfirmationModalComponent,
    DeleteConfirmationModalComponent,
    ErrorModalComponent,
    ExcelMappingCardComponent,
  ],
  templateUrl: './excel-settings.component.html',
  styleUrl: './excel-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExcelSettingsComponent {
  private readonly localStorageService = inject(LocalStorageService);
  private readonly fileStorage = inject(FileStorageService);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly validationService = inject(ExcelValidationService);
  private readonly importService = inject(ExcelImportService);
  protected readonly excelSettingsService = inject(ExcelSettingsService);
  protected readonly languageService = inject(LanguageService);
  protected readonly heatingRoomsService = inject(HeatingRoomsService);
  protected readonly FileSpreadsheetIcon = FileSpreadsheet;
  protected readonly RotateCcwIcon = RotateCcw;
  protected readonly ChevronDownIcon = ChevronDown;
  protected readonly ChevronUpIcon = ChevronUp;
  protected readonly HelpIcon = CircleQuestionMark;
  protected readonly ExportIcon = Download;
  protected readonly ImportIcon = Upload;
  protected readonly EditIcon = Pencil;
  protected readonly TriangleAlertIcon = TriangleAlert;

  // Help modal
  protected readonly showHelpModal = signal(false);
  protected readonly helpSteps: HelpStep[] = [1, 2, 3, 4].map((n) => ({
    titleKey: `SETTINGS.EXCEL_HELP_STEP_${n}_TITLE`,
    descriptionKey: `SETTINGS.EXCEL_HELP_STEP_${n}_DESC`,
  }));

  protected readonly showModal = signal(false);
  protected readonly showSaveSuccess = signal(false);
  protected readonly showImportSuccess = signal(false);
  protected readonly validationError = signal('');
  protected readonly isPreviewCollapsed = signal(false); // Expanded by default

  // Import confirmation & error modals
  protected readonly showImportConfirmModal = signal(false);
  protected readonly pendingImportFile = signal<File | null>(null);
  protected readonly showImportErrorModal = signal(false);
  protected readonly importErrorMessage = signal('');
  protected readonly importErrorDetails = signal('');
  protected readonly importErrorInstructions = signal<string[]>([]);

  // Navigation Guard State
  private readonly navGuard = new NavigationGuardState();
  protected readonly showUnsavedChangesModal = this.navGuard.showModal;
  protected readonly pendingNavigation = this.navGuard.pendingNavigation;

  // Local state for editing - using signals for reactivity
  protected readonly enabled = signal(false);
  protected readonly waterDateCol = signal('');
  protected readonly waterKitchenWarmCol = signal('');
  protected readonly waterKitchenColdCol = signal('');
  protected readonly waterBathroomWarmCol = signal('');
  protected readonly waterBathroomColdCol = signal('');
  protected readonly heatingDateCol = signal('');
  protected readonly electricityDateCol = signal('');
  protected readonly electricityValueCol = signal('');
  // Dynamic room column mappings by room ID
  protected readonly heatingRoomCols = signal<Record<string, string>>({});

  private readonly fieldCfg = (id: string, key: string, colSignal: WritableSignal<string>) => ({
    id,
    labelKey: `SETTINGS.EXCEL_COLUMN_${key}_NAME`,
    placeholderKey: `EXCEL.DEFAULT_${key}`,
    colSignal,
  });

  protected readonly waterFieldConfigs = [
    this.fieldCfg('water-date', 'DATE', this.waterDateCol),
    this.fieldCfg('water-kitchen-warm', 'KITCHEN_WARM', this.waterKitchenWarmCol),
    this.fieldCfg('water-kitchen-cold', 'KITCHEN_COLD', this.waterKitchenColdCol),
    this.fieldCfg('water-bathroom-warm', 'BATHROOM_WARM', this.waterBathroomWarmCol),
    this.fieldCfg('water-bathroom-cold', 'BATHROOM_COLD', this.waterBathroomColdCol),
  ];

  protected readonly electricityFieldConfigs = [
    this.fieldCfg('electricity-date', 'DATE', this.electricityDateCol),
    this.fieldCfg('electricity-value', 'ELECTRICITY_VALUE', this.electricityValueCol),
  ];

  // Computed column arrays for validation
  protected waterColumns = computed(() => [
    this.waterDateCol(),
    this.waterKitchenWarmCol(),
    this.waterKitchenColdCol(),
    this.waterBathroomWarmCol(),
    this.waterBathroomColdCol(),
  ]);

  protected heatingColumns = computed(() => {
    const roomCols = this.heatingRoomCols();
    return [
      this.heatingDateCol(),
      ...this.heatingRoomsService.rooms().map((r) => roomCols[r.id] || ''),
    ];
  });

  protected electricityColumns = computed(() => [
    this.electricityDateCol(),
    this.electricityValueCol(),
  ]);

  private buildDuplicateFrequencyMap(cols: string[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const c of cols) {
      const normalized = c.trim().toLowerCase();
      if (normalized) {
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      }
    }
    return counts;
  }

  private getColStateFromCounts(value: string, counts: Map<string, number>) {
    const normalized = value.trim().toLowerCase();
    return {
      value,
      validationError: this.validationService.getValidationError(value),
      isDuplicate: normalized !== '' && (counts.get(normalized) ?? 0) > 1,
    };
  }

  private readonly heatingDuplicateMap = computed(() =>
    this.buildDuplicateFrequencyMap(this.heatingColumns()),
  );

  protected readonly heatingPreviewRooms = computed(() => {
    const roomCols = this.heatingRoomCols();
    return this.rooms().map((r) => ({
      id: r.id,
      displayValue: roomCols[r.id] || r.name,
    }));
  });

  protected readonly waterFieldStates = computed(() => {
    const counts = this.buildDuplicateFrequencyMap(this.waterColumns());
    return this.waterFieldConfigs.map((f) => ({
      ...f,
      ...this.getColStateFromCounts(f.colSignal(), counts),
    }));
  });

  protected readonly heatingDateFieldState = computed(() =>
    this.getColStateFromCounts(this.heatingDateCol(), this.heatingDuplicateMap()),
  );

  protected readonly heatingRoomFieldStates = computed(() => {
    this.languageService.translationVersion?.();
    this.languageService.currentLang();
    const counts = this.heatingDuplicateMap();
    return this.rooms().map((r) => ({
      ...r,
      fieldId: `heating-room-${r.id}`,
      label: this.languageService.translate('SETTINGS.EXCEL_COLUMN_FOR_ROOM', { name: r.name }),
      ...this.getColStateFromCounts(this.getRoomCol(r.id), counts),
    }));
  });

  protected readonly electricityFieldStates = computed(() => {
    const counts = this.buildDuplicateFrequencyMap(this.electricityColumns());
    return this.electricityFieldConfigs.map((f) => ({
      ...f,
      ...this.getColStateFromCounts(f.colSignal(), counts),
    }));
  });

  // Helper for template to check configured rooms count
  protected heatingRoomCount = computed(() => this.heatingRoomsService.rooms().length);
  // Expose rooms signal for reactive updates
  protected rooms = this.heatingRoomsService.rooms;

  // Helper to update a single room column
  protected updateRoomCol(roomId: string, value: string): void {
    this.heatingRoomCols.update((cols) => ({ ...cols, [roomId]: value }));
  }

  // Helper to get a room column value
  protected getRoomCol(roomId: string): string {
    return this.heatingRoomCols()[roomId] || '';
  }

  // Validation: check if form is valid
  protected isFormValid = computed(() => {
    return (
      this.validationService.validateMappings(this.waterColumns(), this.heatingColumns()).isValid &&
      this.validationService.validateMappings(this.electricityColumns(), []).isValid
    ); // Simple check for now, ideally validate all groups
  });

  /**
   * Check if an electricity column name is duplicated within the electricity section
   */
  protected isDuplicateElectricity(value: string): boolean {
    return this.validationService.isDuplicate(value, this.electricityColumns());
  }

  constructor() {
    // Watch for settings changes and update local state
    effect(() => {
      const settings = this.excelSettingsService.settings();
      this.enabled.set(settings.enabled);
      this.syncColumnsFromSettings(settings);
      this.cdr.markForCheck();
    });

    // Load collapsed state from localStorage
    const savedCollapsedState = this.localStorageService.getPreference(
      'excel_preview_is_collapsed',
    );
    if (savedCollapsedState !== null) {
      this.isPreviewCollapsed.set(savedCollapsedState === 'true');
    } else {
      // If no preference saved, save default (false)
      this.localStorageService.setPreference('excel_preview_is_collapsed', 'false');
    }
  }

  private syncColumnsFromSettings(settings: ReturnType<ExcelSettingsService['settings']>): void {
    this.waterDateCol.set(settings.waterMapping.date);
    this.waterKitchenWarmCol.set(settings.waterMapping.kitchenWarm);
    this.waterKitchenColdCol.set(settings.waterMapping.kitchenCold);
    this.waterBathroomWarmCol.set(settings.waterMapping.bathroomWarm);
    this.waterBathroomColdCol.set(settings.waterMapping.bathroomCold);
    this.heatingDateCol.set(settings.heatingMapping.date);
    this.electricityDateCol.set(settings.electricityMapping.date);
    this.electricityValueCol.set(settings.electricityMapping.value);

    const newRoomCols: Record<string, string> = {};
    for (const room of this.heatingRoomsService.rooms()) {
      newRoomCols[room.id] = settings.heatingMapping.rooms?.[room.id] ?? '';
    }
    this.heatingRoomCols.set(newRoomCols);
  }

  protected togglePreview() {
    this.isPreviewCollapsed.update((val) => !val);
    // Save to localStorage
    this.localStorageService.setPreference(
      'excel_preview_is_collapsed',
      this.isPreviewCollapsed().toString(),
    );
  }

  // Check for unsaved changes
  public hasUnsavedChanges = computed(() => {
    // Only check if edit modal is open. If modal is closed, we assume changes were saved or discarded.
    if (!this.showModal()) return false;

    const saved = this.excelSettingsService.settings();
    return (
      this.waterDateCol().trim() !== saved.waterMapping.date ||
      this.waterKitchenWarmCol().trim() !== saved.waterMapping.kitchenWarm ||
      this.waterKitchenColdCol().trim() !== saved.waterMapping.kitchenCold ||
      this.waterBathroomWarmCol().trim() !== saved.waterMapping.bathroomWarm ||
      this.waterBathroomColdCol().trim() !== saved.waterMapping.bathroomCold ||
      this.heatingDateCol().trim() !== saved.heatingMapping.date ||
      this.electricityDateCol().trim() !== saved.electricityMapping.date ||
      this.electricityValueCol().trim() !== saved.electricityMapping.value ||
      this.hasHeatingRoomChanges(saved)
    );
  });

  // Check if any heating room columns have changed
  private hasHeatingRoomChanges(saved: {
    heatingMapping: { rooms?: Record<string, string> };
  }): boolean {
    const currentRoomCols = this.heatingRoomCols();
    const savedRooms = saved.heatingMapping.rooms || {};

    for (const roomId of Object.keys(currentRoomCols)) {
      if ((currentRoomCols[roomId] || '').trim() !== (savedRooms[roomId] || '')) {
        return true;
      }
    }
    return false;
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): string | undefined {
    if (event.defaultPrevented) return undefined;
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
      return '';
    }
    return undefined;
  }

  /**
   * Check if a water column name is duplicated within the water section
   */
  protected isDuplicateWater(value: string): boolean {
    return this.validationService.isDuplicate(value, this.waterColumns());
  }

  /**
   * Check if a heating column name is duplicated within the heating section
   */
  protected isDuplicateHeating(value: string): boolean {
    return this.validationService.isDuplicate(value, this.heatingColumns());
  }

  protected onEnabledChange(event?: Event) {
    if (event) {
      const checkbox = event.target as HTMLInputElement;
      this.enabled.set(checkbox.checked);
    }

    // Save the enabled state immediately
    this.excelSettingsService.updateSettings({
      enabled: this.enabled(),
      waterMapping: this.excelSettingsService.settings().waterMapping,
      heatingMapping: this.excelSettingsService.settings().heatingMapping,
      electricityMapping: this.excelSettingsService.settings().electricityMapping,
    });
  }

  protected openModal() {
    this.showModal.set(true);
    this.validationError.set('');
  }

  protected closeModal() {
    if (this.hasUnsavedChanges()) {
      this.triggerNavigationWarning(() => this.performCloseModal());
    } else {
      this.performCloseModal();
    }
  }

  private performCloseModal() {
    this.syncColumnsFromSettings(this.excelSettingsService.settings());
    this.showModal.set(false);
    this.showSaveSuccess.set(false);
    this.validationError.set('');
  }

  // Navigation Guard Methods
  public triggerNavigationWarning(onLeave: () => void): boolean {
    return this.navGuard.triggerWarning(this.hasUnsavedChanges(), onLeave);
  }

  confirmLeaveWithoutSaving() {
    this.navGuard.confirmLeave();
  }

  stayAndSave() {
    this.navGuard.stay();
  }

  protected saveSettings() {
    // Validate all fields and check for duplicates
    const validation = this.validationService.validateMappings(
      this.waterColumns(),
      this.heatingColumns(),
    );
    if (!validation.isValid) {
      // Use the returned error key or default
      this.validationError.set(
        this.languageService.translate(validation.errorKey || 'EXCEL.VALIDATION_FORM_INVALID'),
      );
      return;
    }

    // Collect all room column mappings
    const heatingMappingRooms: Record<string, string> = {};
    const rooms = this.heatingRoomsService.rooms();
    const roomCols = this.heatingRoomCols();

    for (const room of rooms) {
      heatingMappingRooms[room.id] = (roomCols[room.id] || '').trim();
    }

    this.excelSettingsService.updateSettings({
      enabled: this.enabled(),
      waterMapping: {
        date: this.waterDateCol().trim(),
        kitchenWarm: this.waterKitchenWarmCol().trim(),
        kitchenCold: this.waterKitchenColdCol().trim(),
        bathroomWarm: this.waterBathroomWarmCol().trim(),
        bathroomCold: this.waterBathroomColdCol().trim(),
      },
      heatingMapping: {
        date: this.heatingDateCol().trim(),
        rooms: heatingMappingRooms,
      },
      electricityMapping: {
        date: this.electricityDateCol().trim(),
        value: this.electricityValueCol().trim(),
      },
    });

    this.validationError.set('');
    this.showSaveSuccess.set(true);
    setTimeout(() => this.showSaveSuccess.set(false), 3000);

    // Close modal and hide success message after 2 seconds
    setTimeout(() => {
      this.showSaveSuccess.set(false);
      this.showModal.set(false);
    }, 2000);
  }

  protected resetDefaults() {
    this.excelSettingsService.resetToDefaults();
    this.validationError.set('');
  }

  protected async exportSettings() {
    try {
      const settings = this.excelSettingsService.settings();
      await this.fileStorage.exportData(settings, 'excel-settings.json');
    } catch (error) {
      console.error('Failed to export settings:', error);
    }
  }

  protected importSettings(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.pendingImportFile.set(file);
      this.showImportConfirmModal.set(true);
      input.value = '';
    }
  }

  protected async confirmImportSettings() {
    const file = this.pendingImportFile();
    if (file) {
      // Validate file extension
      if (!file.name.toLowerCase().endsWith('.json')) {
        this.importErrorMessage.set(
          this.languageService.translate('SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FILE_TYPE'),
        );
        this.importErrorInstructions.set([
          'SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FILE_TYPE_INSTRUCTION_1',
          'SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FILE_TYPE_INSTRUCTION_2',
        ]);
        this.showImportErrorModal.set(true);
        this.showImportConfirmModal.set(false);
        this.pendingImportFile.set(null);
        return;
      }

      try {
        const rawData = await this.fileStorage.importFromFile<unknown>(file);
        const settings = this.importService.validateImportedSettings(rawData);

        // Update settings
        this.excelSettingsService.updateSettings(settings);

        this.showImportSuccess.set(true);
        setTimeout(() => this.showImportSuccess.set(false), 3000);
      } catch (err: unknown) {
        console.error('Failed to import settings:', err);

        const { message, details, instructions } = this.importService.mapImportError(err);

        this.importErrorMessage.set(this.languageService.translate(message));
        this.importErrorDetails.set(details);
        this.importErrorInstructions.set(instructions);

        this.showImportErrorModal.set(true);
      }
    }
    this.showImportConfirmModal.set(false);
    this.pendingImportFile.set(null);
  }

  protected cancelImportSettings() {
    this.showImportConfirmModal.set(false);
    this.pendingImportFile.set(null);
  }

  protected closeImportErrorModal() {
    this.showImportErrorModal.set(false);
    this.importErrorMessage.set('');
    this.importErrorDetails.set('');
    this.importErrorInstructions.set([]);
  }
}
