import { Component, inject, computed, signal, effect, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExcelSettingsService } from '../../services/excel-settings.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LucideAngularModule, FileSpreadsheet, RotateCcw, ChevronDown, ChevronUp, HelpCircle, Download, Upload, Pencil, TriangleAlert } from 'lucide-angular';
import { LanguageService } from '../../services/language.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { FileStorageService } from '../../services/file-storage.service';
import { ExcelSettings } from '../../services/excel-settings.service';
import { HelpModalComponent, HelpStep } from '../../shared/help-modal/help-modal.component';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { ErrorModalComponent } from '../../shared/error-modal/error-modal.component';
import { ExcelValidationService } from '../../services/excel-validation.service';
import { ExcelImportService, ImportError } from '../../services/excel-import.service';
import { DeleteConfirmationModalComponent } from '../../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { HeatingRoomsService } from '../../services/heating-rooms.service';

@Component({
  selector: 'app-excel-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, LucideAngularModule, HelpModalComponent, ConfirmationModalComponent, DeleteConfirmationModalComponent, ErrorModalComponent],
  templateUrl: './excel-settings.component.html',
  styleUrl: './excel-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExcelSettingsComponent {
  private localStorageService = inject(LocalStorageService);
  private fileStorage = inject(FileStorageService);
  private cdr = inject(ChangeDetectorRef);
  protected validationService = inject(ExcelValidationService);
  private importService = inject(ExcelImportService);
  protected excelSettingsService = inject(ExcelSettingsService);
  protected languageService = inject(LanguageService);
  protected heatingRoomsService = inject(HeatingRoomsService);
  protected readonly FileSpreadsheetIcon = FileSpreadsheet;
  protected readonly RotateCcwIcon = RotateCcw;
  protected readonly ChevronDownIcon = ChevronDown;
  protected readonly ChevronUpIcon = ChevronUp;
  protected readonly HelpIcon = HelpCircle;
  protected readonly ExportIcon = Download;
  protected readonly ImportIcon = Upload;
  protected readonly EditIcon = Pencil;
  protected readonly TriangleAlertIcon = TriangleAlert;

  // Help modal
  protected showHelpModal = signal(false);
  protected readonly helpSteps: HelpStep[] = [
    { titleKey: 'SETTINGS.EXCEL_HELP_STEP_1_TITLE', descriptionKey: 'SETTINGS.EXCEL_HELP_STEP_1_DESC' },
    { titleKey: 'SETTINGS.EXCEL_HELP_STEP_2_TITLE', descriptionKey: 'SETTINGS.EXCEL_HELP_STEP_2_DESC' },
    { titleKey: 'SETTINGS.EXCEL_HELP_STEP_3_TITLE', descriptionKey: 'SETTINGS.EXCEL_HELP_STEP_3_DESC' },
    { titleKey: 'SETTINGS.EXCEL_HELP_STEP_4_TITLE', descriptionKey: 'SETTINGS.EXCEL_HELP_STEP_4_DESC' }
  ];

  protected showModal = signal(false);
  protected showSaveSuccess = signal(false);
  protected showImportSuccess = signal(false);
  protected validationError = signal('');
  protected isPreviewCollapsed = signal(false); // Expanded by default

  // Import confirmation & error modals
  protected showImportConfirmModal = signal(false);
  protected pendingImportFile = signal<File | null>(null);
  protected showImportErrorModal = signal(false);
  protected importErrorMessage = signal('');
  protected importErrorDetails = signal('');
  protected importErrorInstructions = signal<string[]>([]);

  // Navigation Guard State
  protected showUnsavedChangesModal = signal(false);
  protected pendingNavigation = signal<(() => void) | null>(null);

  // Local state for editing - using signals for reactivity
  protected enabled = signal(false);
  protected waterDateCol = signal('');
  protected waterKitchenWarmCol = signal('');
  protected waterKitchenColdCol = signal('');
  protected waterBathroomWarmCol = signal('');
  protected waterBathroomColdCol = signal('');
  protected heatingDateCol = signal('');
  // Dynamic room column mappings by room ID
  protected heatingRoomCols = signal<Record<string, string>>({});

  // Computed column arrays for validation
  protected waterColumns = computed(() => [
    this.waterDateCol(), this.waterKitchenWarmCol(), this.waterKitchenColdCol(),
    this.waterBathroomWarmCol(), this.waterBathroomColdCol()
  ]);

  protected heatingColumns = computed(() => {
    const cols = [this.heatingDateCol()];
    const rooms = this.heatingRoomsService.rooms();
    const roomCols = this.heatingRoomCols();

    // Add all configured room columns
    for (const room of rooms) {
      cols.push(roomCols[room.id] || '');
    }

    return cols;
  });

  // Helper for template to check configured rooms count
  protected heatingRoomCount = computed(() => this.heatingRoomsService.rooms().length);
  // Expose rooms signal for reactive updates
  protected rooms = this.heatingRoomsService.rooms;

  // Helper to update a single room column
  protected updateRoomCol(roomId: string, value: string): void {
    this.heatingRoomCols.update(cols => ({ ...cols, [roomId]: value }));
  }

  // Helper to get a room column value
  protected getRoomCol(roomId: string): string {
    return this.heatingRoomCols()[roomId] || '';
  }

  // Validation: check if form is valid
  protected isFormValid = computed(() => {
    return this.validationService.validateMappings(this.waterColumns(), this.heatingColumns()).isValid;
  });

  constructor() {
    // Watch for settings changes and update local state
    effect(() => {
      const settings = this.excelSettingsService.settings();
      this.enabled.set(settings.enabled);
      this.waterDateCol.set(settings.waterMapping.date);
      this.waterKitchenWarmCol.set(settings.waterMapping.kitchenWarm);
      this.waterKitchenColdCol.set(settings.waterMapping.kitchenCold);
      this.waterBathroomWarmCol.set(settings.waterMapping.bathroomWarm);
      this.waterBathroomColdCol.set(settings.waterMapping.bathroomCold);
      this.heatingDateCol.set(settings.heatingMapping.date);

      // Dynamic Room Loading (ID-based)
      const rooms = this.heatingRoomsService.rooms();
      const newRoomCols: Record<string, string> = {};

      for (const room of rooms) {
        // Try to load from rooms object, fall back to empty string
        newRoomCols[room.id] = settings.heatingMapping.rooms?.[room.id] ?? '';
      }

      this.heatingRoomCols.set(newRoomCols);

      // Trigger change detection for OnPush strategy
      this.cdr.markForCheck();
    });

    // Load collapsed state from localStorage
    const savedCollapsedState = this.localStorageService.getPreference('excel_preview_is_collapsed');
    if (savedCollapsedState !== null) {
      this.isPreviewCollapsed.set(savedCollapsedState === 'true');
    } else {
      // If no preference saved, save default (false)
      this.localStorageService.setPreference('excel_preview_is_collapsed', 'false');
    }
  }

  protected togglePreview() {
    this.isPreviewCollapsed.update(val => !val);
    // Save to localStorage
    this.localStorageService.setPreference('excel_preview_is_collapsed', this.isPreviewCollapsed().toString());
  }



  // Check for unsaved changes
  public hasUnsavedChanges = computed(() => {
    // Only check if edit modal is open. If modal is closed, we assume changes were saved or discarded.
    if (!this.showModal()) return false;

    const saved = this.excelSettingsService.settings();
    return this.waterDateCol().trim() !== saved.waterMapping.date ||
      this.waterKitchenWarmCol().trim() !== saved.waterMapping.kitchenWarm ||
      this.waterKitchenColdCol().trim() !== saved.waterMapping.kitchenCold ||
      this.waterBathroomWarmCol().trim() !== saved.waterMapping.bathroomWarm ||
      this.waterBathroomColdCol().trim() !== saved.waterMapping.bathroomCold ||
      this.heatingDateCol().trim() !== saved.heatingMapping.date ||
      this.hasHeatingRoomChanges(saved);
  });

  // Check if any heating room columns have changed
  private hasHeatingRoomChanges(saved: { heatingMapping: { rooms?: Record<string, string> } }): boolean {
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
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
      return '';
    }
    return;
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
      heatingMapping: this.excelSettingsService.settings().heatingMapping
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
    // Reset local state to saved settings
    const settings = this.excelSettingsService.settings();
    this.waterDateCol.set(settings.waterMapping.date);
    this.waterKitchenWarmCol.set(settings.waterMapping.kitchenWarm);
    this.waterKitchenColdCol.set(settings.waterMapping.kitchenCold);
    this.waterBathroomWarmCol.set(settings.waterMapping.bathroomWarm);
    this.waterBathroomColdCol.set(settings.waterMapping.bathroomCold);
    this.heatingDateCol.set(settings.heatingMapping.date);

    // Reset room columns from saved settings
    const newRoomCols: Record<string, string> = {};
    for (const room of this.heatingRoomsService.rooms()) {
      newRoomCols[room.id] = settings.heatingMapping.rooms?.[room.id] ?? '';
    }
    this.heatingRoomCols.set(newRoomCols);

    this.showModal.set(false);
    this.showSaveSuccess.set(false);
    this.validationError.set('');
  }

  // Navigation Guard Methods
  public triggerNavigationWarning(onLeave: () => void): boolean {
    if (this.hasUnsavedChanges()) {
      this.pendingNavigation.set(onLeave);
      this.showUnsavedChangesModal.set(true);
      return true;
    }
    return false;
  }

  confirmLeaveWithoutSaving() {
    const navigation = this.pendingNavigation();
    if (navigation) navigation();
    this.showUnsavedChangesModal.set(false);
    this.pendingNavigation.set(null);
  }

  stayAndSave() {
    this.showUnsavedChangesModal.set(false);
    this.pendingNavigation.set(null);
  }

  protected saveSettings() {
    // Validate all fields and check for duplicates
    const validation = this.validationService.validateMappings(this.waterColumns(), this.heatingColumns());
    if (!validation.isValid) {
      // Use the returned error key or default
      this.validationError.set(this.languageService.translate(validation.errorKey || 'EXCEL.VALIDATION_FORM_INVALID'));
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
        bathroomCold: this.waterBathroomColdCol().trim()
      },
      heatingMapping: {
        date: this.heatingDateCol().trim(),
        rooms: heatingMappingRooms
      }
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

  protected async importSettings(event: Event) {
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
        this.importErrorMessage.set(this.languageService.translate('SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FILE_TYPE'));
        this.importErrorInstructions.set([
          'SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FILE_TYPE_INSTRUCTION_1',
          'SETTINGS.IMPORT_EXCEL_SETTINGS_INVALID_FILE_TYPE_INSTRUCTION_2'
        ]);
        this.showImportErrorModal.set(true);
        this.showImportConfirmModal.set(false);
        this.pendingImportFile.set(null);
        return;
      }

      try {
        const rawData = await this.fileStorage.importFromFile<any>(file);
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
