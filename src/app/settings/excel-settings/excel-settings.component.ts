import { Component, inject, computed, signal, effect, ChangeDetectionStrategy, HostListener } from '@angular/core';
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
  protected validationService = inject(ExcelValidationService);
  private importService = inject(ExcelImportService);
  protected excelSettingsService = inject(ExcelSettingsService);
  protected languageService = inject(LanguageService);
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
  protected heatingLivingRoomCol = signal('');
  protected heatingBedroomCol = signal('');
  protected heatingKitchenCol = signal('');
  protected heatingBathroomCol = signal('');

  // Computed column arrays for validation
  protected waterColumns = computed(() => [
    this.waterDateCol(), this.waterKitchenWarmCol(), this.waterKitchenColdCol(),
    this.waterBathroomWarmCol(), this.waterBathroomColdCol()
  ]);

  protected heatingColumns = computed(() => [
    this.heatingDateCol(), this.heatingLivingRoomCol(), this.heatingBedroomCol(),
    this.heatingKitchenCol(), this.heatingBathroomCol()
  ]);

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
      this.heatingLivingRoomCol.set(settings.heatingMapping.livingRoom);
      this.heatingBedroomCol.set(settings.heatingMapping.bedroom);
      this.heatingKitchenCol.set(settings.heatingMapping.kitchen);
      this.heatingBathroomCol.set(settings.heatingMapping.bathroom);
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
      this.heatingLivingRoomCol().trim() !== saved.heatingMapping.livingRoom ||
      this.heatingBedroomCol().trim() !== saved.heatingMapping.bedroom ||
      this.heatingKitchenCol().trim() !== saved.heatingMapping.kitchen ||
      this.heatingBathroomCol().trim() !== saved.heatingMapping.bathroom;
  });

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
    this.heatingLivingRoomCol.set(settings.heatingMapping.livingRoom);
    this.heatingBedroomCol.set(settings.heatingMapping.bedroom);
    this.heatingKitchenCol.set(settings.heatingMapping.kitchen);
    this.heatingBathroomCol.set(settings.heatingMapping.bathroom);

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
        livingRoom: this.heatingLivingRoomCol().trim(),
        bedroom: this.heatingBedroomCol().trim(),
        kitchen: this.heatingKitchenCol().trim(),
        bathroom: this.heatingBathroomCol().trim()
      }
    });

    this.validationError.set('');
    this.showSaveSuccess.set(true);

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

      } catch (error: any) {
        console.error('Failed to import settings:', error);

        const { message, details, instructions } = this.importService.mapImportError(error);

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
