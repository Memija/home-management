import { Component, signal, effect, inject, computed, HostListener } from '@angular/core';
import { LucideAngularModule, Pencil, Save, X, Download, Upload, HelpCircle, TriangleAlert } from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HouseholdService, Address } from '../../services/household.service';
import { LanguageService } from '../../services/language.service';
import { FileStorageService } from '../../services/file-storage.service';
import { CountryService } from '../../services/country.service';
import { FormValidationService } from '../../services/form-validation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { ErrorModalComponent, ErrorInstruction } from '../../shared/error-modal/error-modal.component';
import { HelpModalComponent, HelpStep } from '../../shared/help-modal/help-modal.component';
import { CountrySelectorComponent } from '../../shared/country-selector/country-selector.component';
import { DeleteConfirmationModalComponent } from '../../shared/delete-confirmation-modal/delete-confirmation-modal.component';

@Component({
  selector: 'app-address',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    TranslatePipe,
    LucideAngularModule,
    ConfirmationModalComponent,
    DeleteConfirmationModalComponent,
    ErrorModalComponent,
    HelpModalComponent,
    CountrySelectorComponent
  ],
  templateUrl: './address.component.html',
  styleUrl: './address.component.scss'
})
export class AddressComponent {
  protected languageService = inject(LanguageService);
  protected householdService = inject(HouseholdService);
  protected fileStorage = inject(FileStorageService);
  protected countryService = inject(CountryService);
  private validationService = inject(FormValidationService);

  // Icons
  protected readonly EditIcon = Pencil;
  protected readonly SaveIcon = Save;
  protected readonly CancelIcon = X;
  protected readonly ExportIcon = Download;
  protected readonly ImportIcon = Upload;
  protected readonly HelpIcon = HelpCircle;
  protected readonly TriangleAlertIcon = TriangleAlert;

  // Help modal
  protected showHelpModal = signal(false);
  protected readonly helpSteps: HelpStep[] = [
    { titleKey: 'SETTINGS.ADDRESS_HELP_STEP_1_TITLE', descriptionKey: 'SETTINGS.ADDRESS_HELP_STEP_1_DESC' },
    { titleKey: 'SETTINGS.ADDRESS_HELP_STEP_2_TITLE', descriptionKey: 'SETTINGS.ADDRESS_HELP_STEP_2_DESC' },
    { titleKey: 'SETTINGS.ADDRESS_HELP_STEP_3_TITLE', descriptionKey: 'SETTINGS.ADDRESS_HELP_STEP_3_DESC' },
    { titleKey: 'SETTINGS.ADDRESS_HELP_STEP_4_TITLE', descriptionKey: 'SETTINGS.ADDRESS_HELP_STEP_4_DESC' }
  ];

  // Address Form Signals with defaults
  protected streetName = signal('');
  protected streetNumber = signal('');
  protected city = signal('');
  protected zipCode = signal('');
  protected country = signal(''); // Stores COUNTRY CODE (e.g., 'de')

  // Address UI State
  protected isEditingAddress = signal(true);
  protected showSaveConfirmation = signal(false);

  // Validation Errors
  protected streetNameError = signal<string[]>([]);
  protected streetNumberError = signal<string[]>([]);
  protected cityError = signal<string[]>([]);
  protected zipCodeError = signal<string[]>([]);
  protected countryError = signal<string[]>([]);

  // Navigation Guard State
  protected showUnsavedChangesModal = signal(false);
  protected pendingNavigation = signal<(() => void) | null>(null);

  // Import confirmation modal
  protected showImportConfirmModal = signal(false);
  protected pendingImportFile = signal<File | null>(null);

  // Error modal state
  protected showImportErrorModal = signal(false);
  protected importErrorMessage = signal('');
  protected importErrorDetails = signal('');
  protected importErrorInstructions = signal<(string | ErrorInstruction)[]>([]);

  // Country display name (computed for read-only view)
  protected countryDisplayName = computed(() => {
    this.languageService.currentLang();
    const code = this.country();
    if (!code) return '';
    const info = this.countryService.getCountryInfoByCode(code);
    return info ? this.languageService.translate(info.translationKey) : code;
  });

  // Check if country code is valid
  protected isValidCountry = computed(() => {
    const code = this.country().trim().toLowerCase();
    if (!code) return false;
    return !!this.countryService.getCountryInfoByCode(code);
  });

  // Form validation
  protected isAddressFormValid = computed(() => {
    return this.streetName().trim() !== '' &&
      this.streetNumber().trim() !== '' &&
      this.city().trim() !== '' &&
      this.zipCode().trim() !== '' &&
      this.country().trim() !== '' &&
      this.streetNameError().length === 0 &&
      this.streetNumberError().length === 0 &&
      this.cityError().length === 0 &&
      this.zipCodeError().length === 0 &&
      this.countryError().length === 0 &&
      this.isValidCountry();
  });

  // Check for unsaved changes
  public hasUnsavedChanges = computed(() => {
    // If not editing, no changes
    if (!this.isEditingAddress()) return false;

    const saved = this.householdService.address();
    // If no saved address and we are editing, check if any field has content
    if (!saved) {
      return this.streetName().trim() !== '' ||
        this.streetNumber().trim() !== '' ||
        this.city().trim() !== '' ||
        this.zipCode().trim() !== '' ||
        this.country().trim() !== '';
    }

    // Compare strictly
    return this.streetName() !== saved.streetName ||
      this.streetNumber() !== saved.streetNumber ||
      this.city() !== saved.city ||
      this.zipCode() !== saved.zipCode ||
      this.country() !== (saved.country || '');
    // Note: saved.country logic in constructor might normalize to code,
    // but here we just compare what is in signals vs what is in service.
    // Ideally service should have Normalized data, but we'll assume equality check is sufficient
    // for string primitives.
  });

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
      return '';
    }
    return;
  }

  constructor() {
    // Initialize address form if data exists
    effect(() => {
      const addr = this.householdService.address();
      if (addr) {
        this.streetName.set(addr.streetName);
        this.streetNumber.set(addr.streetNumber);
        this.city.set(addr.city);
        this.zipCode.set(addr.zipCode);

        // Migrate legacy name-based country to code if needed
        let countryCode = addr.country;
        if (addr.country && addr.country.length > 2) {
          const info = this.countryService.getCountryInfoByNameAnyLanguage(addr.country);
          if (info) {
            countryCode = info.code;
          }
        }
        this.country.set(countryCode);
        this.isEditingAddress.set(false);
      }
    });
  }

  // Field change handlers using validation service
  onStreetNameChange(value: string): void {
    this.streetName.set(value);
    this.streetNameError.set(this.validationService.getStreetNameError(value));
  }

  onStreetNumberChange(value: string): void {
    this.streetNumber.set(value);
    this.streetNumberError.set(this.validationService.getStreetNumberError(value));
  }

  onCityChange(value: string): void {
    this.city.set(value);
    this.cityError.set(this.validationService.getCityError(value));
  }

  onZipCodeChange(value: string): void {
    this.zipCode.set(value);
    this.zipCodeError.set(this.validationService.getZipCodeError(value));
  }

  // Country change handler (from CountrySelectorComponent)
  onCountryChange(countryCode: string): void {
    this.country.set(countryCode);
  }

  onCountryValidationChange(errors: string[]): void {
    this.countryError.set(errors);
  }

  editAddress(): void {
    this.isEditingAddress.set(true);
    this.showSaveConfirmation.set(false);
  }

  cancelEdit(): void {
    if (this.hasUnsavedChanges()) {
      this.triggerNavigationWarning(() => this.performCancel());
    } else {
      this.performCancel();
    }
  }

  private performCancel(): void {
    const addr = this.householdService.address();
    if (addr) {
      this.streetName.set(addr.streetName);
      this.streetNumber.set(addr.streetNumber);
      this.city.set(addr.city);
      this.zipCode.set(addr.zipCode);

      // Handle legacy name vs code
      let countryCode = addr.country;
      if (addr.country && addr.country.length > 2) {
        const info = this.countryService.getCountryInfoByNameAnyLanguage(addr.country);
        if (info) {
          countryCode = info.code;
        }
      }
      this.country.set(countryCode);
      this.isEditingAddress.set(false);

      // Clear all validation errors
      this.streetNameError.set([]);
      this.streetNumberError.set([]);
      this.cityError.set([]);
      this.zipCodeError.set([]);
      this.countryError.set([]);
      this.countryError.set([]);
    } else {
      // If no address existed (first time), clear fields and stop editing
      this.streetName.set('');
      this.streetNumber.set('');
      this.city.set('');
      this.zipCode.set('');
      this.country.set('');
      this.isEditingAddress.set(false);
    }
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

  saveAddress(): void {
    if (this.isAddressFormValid()) {
      const address: Address = {
        streetName: this.streetName(),
        streetNumber: this.streetNumber(),
        city: this.city(),
        zipCode: this.zipCode(),
        country: this.country()
      };
      this.householdService.updateAddress(address);
      this.isEditingAddress.set(false);
      this.showSaveConfirmation.set(true);
      setTimeout(() => this.showSaveConfirmation.set(false), 3000);
    }
  }

  exportAddress(): void {
    const address = this.householdService.address();
    if (address) {
      const exportData = { ...address };
      if (address.country) {
        exportData.country = address.country.toUpperCase();
      }
      this.fileStorage.exportToFile(exportData, 'address.json');
    }
  }

  async importAddress(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.pendingImportFile.set(file);
      this.showImportConfirmModal.set(true);
      input.value = '';
    }
  }

  async confirmImportAddress(): Promise<void> {
    const file = this.pendingImportFile();
    if (file) {
      // Validate file extension
      if (!file.name.toLowerCase().endsWith('.json')) {
        this.importErrorMessage.set(this.languageService.translate('SETTINGS.IMPORT_ADDRESS_INVALID_FILE_TYPE'));
        this.importErrorInstructions.set([
          'SETTINGS.IMPORT_ADDRESS_INVALID_FILE_TYPE_INSTRUCTION_1',
          'SETTINGS.IMPORT_ADDRESS_INVALID_FILE_TYPE_INSTRUCTION_2'
        ]);
        this.showImportErrorModal.set(true);
        this.showImportConfirmModal.set(false);
        this.pendingImportFile.set(null);
        return;
      }

      try {
        const data = await this.fileStorage.importFromFile<Address>(file);

        // Normalize country to code format
        if (data && data.country && typeof data.country === 'string') {
          const lowerValue = data.country.toLowerCase().trim();
          const infoByCode = this.countryService.getCountryInfoByCode(lowerValue);
          if (infoByCode) {
            data.country = infoByCode.code;
          } else {
            const infoByName = this.countryService.getCountryInfoByNameAnyLanguage(data.country);
            if (infoByName) {
              data.country = infoByName.code;
            }
          }
        }

        // Validate required fields
        if (data && data.streetName && data.streetNumber && data.city && data.zipCode && data.country) {
          const errors: string[] = [];
          const fieldKeys: string[] = [];

          const streetNameErrs = this.validationService.getStreetNameError(data.streetName);
          if (streetNameErrs.length > 0) {
            fieldKeys.push('SETTINGS.STREET_NAME');
            errors.push(`${this.languageService.translate('SETTINGS.STREET_NAME')}: ${streetNameErrs.map(e => this.languageService.translate(e)).join(', ')}`);
          }

          const streetNumErrs = this.validationService.getStreetNumberError(data.streetNumber);
          if (streetNumErrs.length > 0) {
            fieldKeys.push('SETTINGS.NUMBER');
            errors.push(`${this.languageService.translate('SETTINGS.NUMBER')}: ${streetNumErrs.map(e => this.languageService.translate(e)).join(', ')}`);
          }

          const cityErrs = this.validationService.getCityError(data.city);
          if (cityErrs.length > 0) {
            fieldKeys.push('SETTINGS.CITY');
            errors.push(`${this.languageService.translate('SETTINGS.CITY')}: ${cityErrs.map(e => this.languageService.translate(e)).join(', ')}`);
          }

          const zipErrs = this.validationService.getZipCodeError(data.zipCode);
          if (zipErrs.length > 0) {
            fieldKeys.push('SETTINGS.ZIP_CODE');
            errors.push(`${this.languageService.translate('SETTINGS.ZIP_CODE')}: ${zipErrs.map(e => this.languageService.translate(e)).join(', ')}`);
          }

          const countryErrs = this.validationService.getCountryError(data.country);
          if (countryErrs.length > 0) {
            fieldKeys.push('SETTINGS.COUNTRY');
            errors.push(`${this.languageService.translate('SETTINGS.COUNTRY')}: ${countryErrs.map(e => this.languageService.translate(e)).join(', ')}`);
          }

          if (errors.length > 0) {
            throw { message: this.languageService.translate('SETTINGS.VALIDATION_FAILED'), details: errors.join('\n'), fieldKeys };
          }

          this.householdService.updateAddress(data);
          this.showSaveConfirmation.set(true);
          setTimeout(() => this.showSaveConfirmation.set(false), 3000);
        } else {
          throw new Error(this.languageService.translate('SETTINGS.IMPORT_ERROR'));
        }
      } catch (err: unknown) {
        interface AddressImportError {
          message: string;
          details?: string;
          fieldKeys?: string[];
          error?: string;
        }
        const error = err as AddressImportError;
        console.error('Error importing address:', error);

        // Handle explicit invalid file type errors from fileStorage import (if any)
        if (error.message === 'invalid_file_type' || (error.error && error.error === 'invalid_file_type')) {
          this.importErrorMessage.set(this.languageService.translate('SETTINGS.IMPORT_ADDRESS_INVALID_FILE_TYPE'));
          this.importErrorInstructions.set([
            'SETTINGS.IMPORT_ADDRESS_INVALID_FILE_TYPE_INSTRUCTION_1',
            'SETTINGS.IMPORT_ADDRESS_INVALID_FILE_TYPE_INSTRUCTION_2'
          ]);
        } else {
          this.importErrorMessage.set(error.message || this.languageService.translate('SETTINGS.IMPORT_ERROR'));
          this.importErrorDetails.set(error.details || '');

          const instructions: (string | ErrorInstruction)[] = [];
          if (error.fieldKeys && Array.isArray(error.fieldKeys)) {
            error.fieldKeys.forEach((key: string) => {
              instructions.push({ key: 'HOME.IMPORT_ERROR_CHECK_FIELD', params: { field: this.languageService.translate(key) } });
            });
          }
          instructions.push('HOME.IMPORT_ERROR_INSTRUCTION_1', 'HOME.IMPORT_ERROR_INSTRUCTION_2', 'HOME.IMPORT_ERROR_INSTRUCTION_3');
          this.importErrorInstructions.set(instructions);
        }

        this.showImportErrorModal.set(true);
      }
    }
    this.showImportConfirmModal.set(false);
    this.pendingImportFile.set(null);
  }

  cancelImportAddress(): void {
    this.showImportConfirmModal.set(false);
    this.pendingImportFile.set(null);
  }

  closeImportErrorModal(): void {
    this.showImportErrorModal.set(false);
    this.importErrorMessage.set('');
    this.importErrorDetails.set('');
    this.importErrorInstructions.set([]);
  }
}
