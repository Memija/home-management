import { Component, signal, effect, inject, computed } from '@angular/core';
import { LucideAngularModule, Pencil, Save, X, Download, Upload } from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HouseholdService, Address } from '../../services/household.service';
import { LanguageService } from '../../services/language.service';
import { FileStorageService } from '../../services/file-storage.service';
import { CountryService } from '../../services/country.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { ErrorModalComponent } from '../../shared/error-modal/error-modal.component';

@Component({
  selector: 'app-address',
  standalone: true,
  imports: [FormsModule, CommonModule, TranslatePipe, LucideAngularModule, ConfirmationModalComponent, ErrorModalComponent],
  templateUrl: './address.component.html',
  styleUrl: './address.component.scss'
})
export class AddressComponent {
  protected languageService = inject(LanguageService);
  protected householdService = inject(HouseholdService);
  protected fileStorage = inject(FileStorageService);
  protected countryService = inject(CountryService);

  // Icons
  protected readonly EditIcon = Pencil;
  protected readonly SaveIcon = Save;
  protected readonly CancelIcon = X;
  protected readonly ExportIcon = Download;
  protected readonly ImportIcon = Upload;

  // Address Form Signals with defaults
  protected streetName = signal('Broadway');
  protected streetNumber = signal('2156');
  protected city = signal('New York');
  protected zipCode = signal('10024');
  protected country = signal('United States');
  protected countrySearch = signal('');

  // Address UI State
  protected isEditingAddress = signal(true);
  protected showSaveConfirmation = signal(false);

  // Validation Errors
  protected streetNumberError = signal('');
  protected zipCodeError = signal('');

  // Import confirmation modal
  protected showImportConfirmModal = signal(false);
  protected pendingImportFile = signal<File | null>(null);

  // Error modal state
  protected showImportErrorModal = signal(false);
  protected importErrorMessage = signal('');
  protected importErrorInstructions = signal<string[]>([]);

  // Filtered countries based on search (reactive to language changes)
  protected filteredCountries = computed(() => {
    const search = this.countrySearch().toLowerCase();
    if (!search) return [];
    // Get countries fresh each time (they're translated based on current language)
    const countries = this.countryService.getCountries();
    return countries
      .filter(c => c.toLowerCase().includes(search))
      .slice(0, 10); // Limit to 10 results
  });

  // Form validation
  protected isAddressFormValid = computed(() => {
    return this.streetName().trim() !== '' &&
      this.streetNumber().trim() !== '' &&
      this.city().trim() !== '' &&
      this.zipCode().trim() !== '' &&
      this.country().trim() !== '' &&
      this.streetNumberError() === '' &&
      this.zipCodeError() === '';
  });

  constructor() {
    // Initialize address form if data exists
    effect(() => {
      const addr = this.householdService.address();
      if (addr) {
        this.streetName.set(addr.streetName);
        this.streetNumber.set(addr.streetNumber);
        this.city.set(addr.city);
        this.zipCode.set(addr.zipCode);
        this.country.set(addr.country);
        this.isEditingAddress.set(false);
      }
    });
  }

  validateNumericField(field: 'number' | 'zip', value: string): void {
    const numericRegex = /^\d*$/;

    if (!numericRegex.test(value)) {
      if (field === 'number') {
        this.streetNumberError.set('SETTINGS.ERRORS.NUMBER_ONLY');
      } else {
        this.zipCodeError.set('SETTINGS.ERRORS.NUMBER_ONLY');
      }
    } else {
      if (field === 'number') {
        this.streetNumberError.set('');
      } else {
        this.zipCodeError.set('');
      }
    }
  }

  onStreetNumberChange(value: string): void {
    // Only set if value is numeric or empty
    if (/^\d*$/.test(value)) {
      this.streetNumber.set(value);
      this.streetNumberError.set('');
    } else {
      this.streetNumberError.set('SETTINGS.ERRORS.NUMBER_ONLY');
    }
  }

  onZipCodeChange(value: string): void {
    // Only set if value is numeric or empty
    if (/^\d*$/.test(value)) {
      this.zipCode.set(value);
      this.zipCodeError.set('');
    } else {
      this.zipCodeError.set('SETTINGS.ERRORS.NUMBER_ONLY');
    }
  }

  selectCountry(country: string): void {
    this.country.set(country);
    this.countrySearch.set('');
  }

  editAddress(): void {
    this.isEditingAddress.set(true);
    this.showSaveConfirmation.set(false);
  }

  cancelEdit(): void {
    // Restore from saved address
    const addr = this.householdService.address();
    if (addr) {
      this.streetName.set(addr.streetName);
      this.streetNumber.set(addr.streetNumber);
      this.city.set(addr.city);
      this.zipCode.set(addr.zipCode);
      this.country.set(addr.country);
      this.isEditingAddress.set(false);
      this.streetNumberError.set('');
      this.zipCodeError.set('');
    }
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

      // Hide confirmation after 3 seconds
      setTimeout(() => {
        this.showSaveConfirmation.set(false);
      }, 3000);
    }
  }

  exportAddress(): void {
    const address = this.householdService.address();
    if (address) {
      this.fileStorage.exportToFile(address, 'address.json');
    }
  }

  async importAddress(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.pendingImportFile.set(file);
      this.showImportConfirmModal.set(true);
      input.value = ''; // Reset input so same file can be selected again
    }
  }

  async confirmImportAddress(): Promise<void> {
    const file = this.pendingImportFile();
    if (file) {
      try {
        const data = await this.fileStorage.importFromFile<Address>(file);
        // Validate required fields
        if (data && data.streetName && data.streetNumber && data.city && data.zipCode && data.country) {
          this.householdService.updateAddress(data);
          this.showSaveConfirmation.set(true);
          setTimeout(() => this.showSaveConfirmation.set(false), 3000);
        } else {
          throw new Error('Invalid address format');
        }
      } catch (error) {
        console.error('Error importing address:', error);
        this.importErrorMessage.set(this.languageService.translate('SETTINGS.IMPORT_ERROR'));
        this.importErrorInstructions.set([
          'HOME.IMPORT_ERROR_INSTRUCTION_1',
          'HOME.IMPORT_ERROR_INSTRUCTION_2',
          'HOME.IMPORT_ERROR_INSTRUCTION_3'
        ]);
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
    this.importErrorInstructions.set([]);
  }

  // TrackBy for *ngFor performance
  trackByCountry(index: number, country: string): string {
    return country;
  }
}
