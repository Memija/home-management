import { Component, signal, effect, inject, computed, HostListener } from '@angular/core';
import {
  LucideAngularModule,
  Pencil,
  Save,
  X,
  Download,
  Upload,
  CircleQuestionMark,
  TriangleAlert,
} from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HouseholdService, Address } from '../../services/household.service';
import { LanguageService } from '../../services/language.service';
import { FileStorageService } from '../../services/file-storage.service';
import { CountryService } from '../../services/country.service';
import { FormValidationService } from '../../services/form-validation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import {
  ErrorModalComponent,
  ErrorInstruction,
} from '../../shared/error-modal/error-modal.component';
import { HelpModalComponent, HelpStep } from '../../shared/help-modal/help-modal.component';
import { CountrySelectorComponent } from '../../shared/country-selector/country-selector.component';
import { DeleteConfirmationModalComponent } from '../../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { NavigationGuardState } from '../../utils/navigation-guard.utils';

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
    CountrySelectorComponent,
  ],
  templateUrl: './address.component.html',
  styleUrl: './address.component.scss',
})
export class AddressComponent {
  protected readonly languageService = inject(LanguageService);
  protected readonly householdService = inject(HouseholdService);
  protected readonly fileStorage = inject(FileStorageService);
  protected readonly countryService = inject(CountryService);
  private readonly validationService = inject(FormValidationService);

  // Icons
  protected readonly EditIcon = Pencil;
  protected readonly SaveIcon = Save;
  protected readonly CancelIcon = X;
  protected readonly ExportIcon = Download;
  protected readonly ImportIcon = Upload;
  protected readonly HelpIcon = CircleQuestionMark;
  protected readonly TriangleAlertIcon = TriangleAlert;

  // Help modal
  protected readonly showHelpModal = signal(false);
  protected readonly helpSteps: HelpStep[] = [
    {
      titleKey: 'SETTINGS.ADDRESS_HELP_STEP_1_TITLE',
      descriptionKey: 'SETTINGS.ADDRESS_HELP_STEP_1_DESC',
    },
    {
      titleKey: 'SETTINGS.ADDRESS_HELP_STEP_2_TITLE',
      descriptionKey: 'SETTINGS.ADDRESS_HELP_STEP_2_DESC',
    },
    {
      titleKey: 'SETTINGS.ADDRESS_HELP_STEP_3_TITLE',
      descriptionKey: 'SETTINGS.ADDRESS_HELP_STEP_3_DESC',
    },
    {
      titleKey: 'SETTINGS.ADDRESS_HELP_STEP_4_TITLE',
      descriptionKey: 'SETTINGS.ADDRESS_HELP_STEP_4_DESC',
    },
  ];

  // Address Form Signals with defaults
  protected readonly streetName = signal('');
  protected readonly streetNumber = signal('');
  protected readonly city = signal('');
  protected readonly zipCode = signal('');
  protected readonly country = signal(''); // Stores COUNTRY CODE (e.g., 'de')

  // Address UI State
  protected readonly isEditingAddress = signal(true);
  protected readonly showSaveConfirmation = signal(false);

  // Validation Errors
  protected readonly streetNameError = signal<string[]>([]);
  protected readonly streetNumberError = signal<string[]>([]);
  protected readonly cityError = signal<string[]>([]);
  protected readonly zipCodeError = signal<string[]>([]);
  protected readonly countryError = signal<string[]>([]);

  // Navigation Guard State
  private readonly navGuard = new NavigationGuardState();
  protected readonly showUnsavedChangesModal = this.navGuard.showModal;
  protected readonly pendingNavigation = this.navGuard.pendingNavigation;

  // Import confirmation modal
  protected readonly showImportConfirmModal = signal(false);
  protected readonly pendingImportFile = signal<File | null>(null);

  // Error modal state
  protected readonly showImportErrorModal = signal(false);
  protected readonly importErrorMessage = signal('');
  protected readonly importErrorDetails = signal('');
  protected readonly importErrorInstructions = signal<(string | ErrorInstruction)[]>([]);

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
    return (
      this.streetName().trim() !== '' &&
      this.streetNumber().trim() !== '' &&
      this.city().trim() !== '' &&
      this.zipCode().trim() !== '' &&
      this.country().trim() !== '' &&
      this.streetNameError().length === 0 &&
      this.streetNumberError().length === 0 &&
      this.cityError().length === 0 &&
      this.zipCodeError().length === 0 &&
      this.countryError().length === 0 &&
      this.isValidCountry()
    );
  });

  // Check for unsaved changes
  public hasUnsavedChanges = computed(() => {
    // If not editing, no changes
    if (!this.isEditingAddress()) return false;

    const saved = this.householdService.address();
    // If no saved address and we are editing, check if any field has content
    if (!saved) {
      return (
        this.streetName().trim() !== '' ||
        this.streetNumber().trim() !== '' ||
        this.city().trim() !== '' ||
        this.zipCode().trim() !== '' ||
        this.country().trim() !== ''
      );
    }

    // Compare strictly
    return (
      this.streetName() !== saved.streetName ||
      this.streetNumber() !== saved.streetNumber ||
      this.city() !== saved.city ||
      this.zipCode() !== saved.zipCode ||
      this.country() !== (saved.country || '')
    );
    // Note: saved.country logic in constructor might normalize to code,
    // but here we just compare what is in signals vs what is in service.
    // Ideally service should have Normalized data, but we'll assume equality check is sufficient
    // for string primitives.
  });

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): string | undefined {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
      return '';
    }
    return undefined;
  }

  constructor() {
    // Initialize address form if data exists
    effect(() => {
      const addr = this.householdService.address();
      if (addr) {
        this.loadAddressIntoForm(addr);
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
    this.loadAddressIntoForm(addr);
    this.streetNameError.set([]);
    this.streetNumberError.set([]);
    this.cityError.set([]);
    this.zipCodeError.set([]);
    this.countryError.set([]);
  }

  private loadAddressIntoForm(addr: Address | null): void {
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
    return this.navGuard.triggerWarning(this.hasUnsavedChanges(), onLeave);
  }

  confirmLeaveWithoutSaving(): void {
    this.navGuard.confirmLeave();
  }

  stayAndSave(): void {
    this.navGuard.stay();
  }

  saveAddress(): void {
    if (this.isAddressFormValid()) {
      const address: Address = {
        streetName: this.streetName(),
        streetNumber: this.streetNumber(),
        city: this.city(),
        zipCode: this.zipCode(),
        country: this.country(),
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

  importAddress(event: Event): void {
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
    if (!file) {
      this.cancelImportAddress();
      return;
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      this.setInvalidFileTypeError();
      return;
    }

    try {
      const data = await this.fileStorage.importFromFile<Address>(file);
      this.processImportedAddress(data);
    } catch (err: unknown) {
      this.handleImportError(err);
    } finally {
      this.cancelImportAddress();
    }
  }

  private setInvalidFileTypeError(): void {
    this.importErrorMessage.set(
      this.languageService.translate('SETTINGS.IMPORT_ADDRESS_INVALID_FILE_TYPE'),
    );
    this.importErrorInstructions.set([
      'SETTINGS.IMPORT_ADDRESS_INVALID_FILE_TYPE_INSTRUCTION_1',
      'SETTINGS.IMPORT_ADDRESS_INVALID_FILE_TYPE_INSTRUCTION_2',
    ]);
    this.showImportErrorModal.set(true);
    this.cancelImportAddress();
  }

  private normalizeImportCountry(country: unknown): string {
    if (typeof country !== 'string') return '';
    const lowerValue = country.toLowerCase().trim();
    const infoByCode = this.countryService.getCountryInfoByCode(lowerValue);
    if (infoByCode) return infoByCode.code;

    const infoByName = this.countryService.getCountryInfoByNameAnyLanguage(country);
    return infoByName ? infoByName.code : country;
  }

  private validateAddressFields(data: Address): void {
    const fieldChecks = [
      {
        key: 'SETTINGS.STREET_NAME',
        errors: this.validationService.getStreetNameError(data.streetName),
      },
      {
        key: 'SETTINGS.NUMBER',
        errors: this.validationService.getStreetNumberError(data.streetNumber),
      },
      {
        key: 'SETTINGS.CITY',
        errors: this.validationService.getCityError(data.city),
      },
      {
        key: 'SETTINGS.ZIP_CODE',
        errors: this.validationService.getZipCodeError(data.zipCode),
      },
      {
        key: 'SETTINGS.COUNTRY',
        errors: this.validationService.getCountryError(data.country),
      },
    ];

    const errors: string[] = [];
    const fieldKeys: string[] = [];

    for (const { key, errors: errs } of fieldChecks) {
      if (errs.length > 0) {
        fieldKeys.push(key);
        const fieldName = this.languageService.translate(key);
        const translatedErrs = errs.map((e) => this.languageService.translate(e)).join(', ');
        errors.push(`${fieldName}: ${translatedErrs}`);
      }
    }

    if (errors.length > 0) {
      throw Object.assign(new Error(this.languageService.translate('SETTINGS.VALIDATION_FAILED')), {
        details: errors.join('\n'),
        fieldKeys,
      });
    }
  }

  private processImportedAddress(data: Address | null): void {
    if (data?.country && typeof data.country === 'string') {
      data.country = this.normalizeImportCountry(data.country);
    }

    if (!data?.streetName || !data.streetNumber || !data.city || !data.zipCode || !data.country) {
      throw new Error(this.languageService.translate('SETTINGS.IMPORT_ERROR'));
    }

    this.validateAddressFields(data);

    this.householdService.updateAddress(data);
    this.showSaveConfirmation.set(true);
    setTimeout(() => this.showSaveConfirmation.set(false), 3000);
  }

  private handleImportError(err: unknown): void {
    interface AddressImportError {
      message?: string;
      details?: string;
      fieldKeys?: string[];
      error?: string;
    }
    const error = err as AddressImportError;
    console.error('Error importing address:', error);

    if (error.message === 'invalid_file_type' || error.error === 'invalid_file_type') {
      this.setInvalidFileTypeError();
      return;
    }

    this.importErrorMessage.set(
      error.message || this.languageService.translate('SETTINGS.IMPORT_ERROR'),
    );
    this.importErrorDetails.set(error.details || '');

    const instructions: (string | ErrorInstruction)[] = [];
    if (Array.isArray(error.fieldKeys)) {
      for (const key of error.fieldKeys) {
        instructions.push({
          key: 'HOME.IMPORT_ERROR_CHECK_FIELD',
          params: { field: this.languageService.translate(key) },
        });
      }
    }
    instructions.push(
      'HOME.IMPORT_ERROR_INSTRUCTION_1',
      'HOME.IMPORT_ERROR_INSTRUCTION_2',
      'HOME.IMPORT_ERROR_INSTRUCTION_3',
    );
    this.importErrorInstructions.set(instructions);
    this.showImportErrorModal.set(true);
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
