import { Component, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExcelSettingsService } from '../../services/excel-settings.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LucideAngularModule, FileSpreadsheet, RotateCcw, ChevronDown, ChevronUp, HelpCircle } from 'lucide-angular';
import { LanguageService } from '../../services/language.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { HelpModalComponent, HelpStep } from '../../shared/help-modal/help-modal.component';

@Component({
  selector: 'app-excel-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, LucideAngularModule, HelpModalComponent],
  templateUrl: './excel-settings.component.html',
  styleUrl: './excel-settings.component.scss'
})
export class ExcelSettingsComponent {
  private localStorageService = inject(LocalStorageService);
  protected excelSettingsService = inject(ExcelSettingsService);
  protected languageService = inject(LanguageService);
  protected readonly FileSpreadsheetIcon = FileSpreadsheet;
  protected readonly RotateCcwIcon = RotateCcw;
  protected readonly ChevronDownIcon = ChevronDown;
  protected readonly ChevronUpIcon = ChevronUp;
  protected readonly HelpIcon = HelpCircle;

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
  protected validationError = signal('');
  protected isPreviewCollapsed = signal(true); // Collapsed by default

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

  // Validation: check if form is valid
  protected isFormValid = computed(() => {
    const allFields = [
      this.waterDateCol(), this.waterKitchenWarmCol(), this.waterKitchenColdCol(),
      this.waterBathroomWarmCol(), this.waterBathroomColdCol(),
      this.heatingDateCol(), this.heatingLivingRoomCol(), this.heatingBedroomCol(),
      this.heatingKitchenCol(), this.heatingBathroomCol()
    ];

    // Check if all fields are filled
    if (allFields.some(field => !field || field.trim() === '')) {
      return false;
    }

    // Check if all fields pass validation
    return allFields.every(field => this.isValidColumnName(field));
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
    const savedCollapsedState = this.localStorageService.getPreference('excelPreviewCollapsed');
    if (savedCollapsedState !== null) {
      this.isPreviewCollapsed.set(savedCollapsedState === 'true');
    }
  }

  protected togglePreview() {
    this.isPreviewCollapsed.update(val => !val);
    // Save to localStorage
    this.localStorageService.setPreference('excelPreviewCollapsed', this.isPreviewCollapsed().toString());
  }

  /**
   * Validate Excel column name
   * Rules:
   * - Not empty
   * - Max 255 characters
   * - No invalid characters: [ ] * / \ ? :
   * - No leading/trailing whitespace
   */
  private isValidColumnName(name: string): boolean {
    if (!name || name.trim() === '') return false;
    if (name.length > 255) return false;
    if (name !== name.trim()) return false;

    // Check for invalid characters
    const invalidChars = /[\[\]\*\/\\\?\:]/;
    if (invalidChars.test(name)) return false;

    return true;
  }

  /**
   * Get validation error message for a column name
   */
  protected getValidationError(name: string): string {
    if (!name || name.trim() === '') {
      return this.languageService.translate('EXCEL.VALIDATION_REQUIRED');
    }
    if (name.length > 255) {
      return this.languageService.translate('EXCEL.VALIDATION_TOO_LONG');
    }
    if (name !== name.trim()) {
      return this.languageService.translate('EXCEL.VALIDATION_NO_WHITESPACE');
    }
    const invalidChars = /[\[\]\*\/\\\?\:]/;
    if (invalidChars.test(name)) {
      return this.languageService.translate('EXCEL.VALIDATION_INVALID_CHARS');
    }
    return '';
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
    this.showModal.set(false);
    this.showSaveSuccess.set(false);
    this.validationError.set('');
  }

  protected saveSettings() {
    // Validate all fields
    if (!this.isFormValid()) {
      this.validationError.set(this.languageService.translate('EXCEL.VALIDATION_FORM_INVALID'));
      return;
    }

    // Check for duplicate column names within each mapping
    const waterColumns = [
      this.waterDateCol(), this.waterKitchenWarmCol(), this.waterKitchenColdCol(),
      this.waterBathroomWarmCol(), this.waterBathroomColdCol()
    ];
    const heatingColumns = [
      this.heatingDateCol(), this.heatingLivingRoomCol(), this.heatingBedroomCol(),
      this.heatingKitchenCol(), this.heatingBathroomCol()
    ];

    const hasDuplicatesWater = new Set(waterColumns).size !== waterColumns.length;
    const hasDuplicatesHeating = new Set(heatingColumns).size !== heatingColumns.length;

    if (hasDuplicatesWater || hasDuplicatesHeating) {
      this.validationError.set(this.languageService.translate('EXCEL.VALIDATION_DUPLICATES'));
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
}
