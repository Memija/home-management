import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddressComponent } from './address.component';
import { LucideAngularModule } from 'lucide-angular';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { DeleteConfirmationModalComponent } from '../../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { ErrorModalComponent } from '../../shared/error-modal/error-modal.component';
import { HelpModalComponent } from '../../shared/help-modal/help-modal.component';
import { CountrySelectorComponent } from '../../shared/country-selector/country-selector.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { HouseholdService } from '../../services/household.service';
import { LanguageService } from '../../services/language.service';
import { FileStorageService } from '../../services/file-storage.service';
import { CountryService } from '../../services/country.service';
import { FormValidationService } from '../../services/form-validation.service';
import { signal, Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { vi, afterEach } from 'vitest';

// --- Stub Components & Pipes ---
@Component({ selector: 'lucide-icon', template: '', standalone: true })
class StubLucideIconComponent {
  @Input() img: unknown;
}

@Component({ selector: 'app-confirmation-modal', template: '', standalone: true })
class StubConfirmationModalComponent {
  @Input() show = false;
  @Input() titleKey = '';
  @Input() messageKey = '';
  @Input() confirmKey = '';
  @Input() cancelKey = '';
  @Input() icon: unknown;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancelModal = new EventEmitter<void>();
}

@Component({ selector: 'app-delete-confirmation-modal', template: '', standalone: true })
class StubDeleteConfirmationModalComponent {
  @Input() show = false;
  @Input() titleKey = '';
  @Input() messageKey = '';
  @Input() deleteKey = '';
  @Input() cancelKey = '';
  @Input() icon: unknown;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancelModal = new EventEmitter<void>();
}

@Component({ selector: 'app-error-modal', template: '', standalone: true })
class StubErrorModalComponent {
  @Input() show = false;
  @Input() title = '';
  @Input() message = '';
  @Input() details = '';
  @Input() instructions: unknown[] = [];
  @Output() cancelModal = new EventEmitter<void>();
}

@Component({ selector: 'app-help-modal', template: '', standalone: true })
class StubHelpModalComponent {
  @Input() show = false;
  @Input() titleKey = '';
  @Input() steps: unknown[] = [];
  @Output() closeModal = new EventEmitter<void>();
}

@Component({ selector: 'app-country-selector', template: '', standalone: true })
class StubCountrySelectorComponent {
  @Input() countryCode = '';
  @Input() hasError = false;
  @Output() countryCodeChange = new EventEmitter<string>();
  @Output() validationErrors = new EventEmitter<string[]>();
}

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'translate', standalone: true })
class StubTranslatePipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

describe('AddressComponent', () => {
  let component: AddressComponent;
  let fixture: ComponentFixture<AddressComponent>;
  let mockHouseholdService: {
    address: import('@angular/core').WritableSignal<unknown>;
    updateAddress: ReturnType<typeof vi.fn>;
  };
  let mockLanguageService: {
    currentLang: import('@angular/core').WritableSignal<string>;
    translate: ReturnType<typeof vi.fn>;
  };
  let mockFileStorageService: {
    exportToFile: ReturnType<typeof vi.fn>;
    importFromFile: ReturnType<typeof vi.fn>;
  };
  let mockCountryService: {
    getCountryInfoByCode: ReturnType<typeof vi.fn>;
    getCountryInfoByNameAnyLanguage: ReturnType<typeof vi.fn>;
  };
  let mockFormValidationService: {
    getStreetNameError: ReturnType<typeof vi.fn>;
    getStreetNumberError: ReturnType<typeof vi.fn>;
    getCityError: ReturnType<typeof vi.fn>;
    getZipCodeError: ReturnType<typeof vi.fn>;
    getCountryError: ReturnType<typeof vi.fn>;
  };

  let addressSignal: import('@angular/core').WritableSignal<unknown>;

  beforeEach(async () => {
    addressSignal = signal(null);

    mockHouseholdService = {
      address: addressSignal,
      updateAddress: vi.fn(),
    };

    mockLanguageService = {
      currentLang: signal('en'),
      translate: vi.fn((key: string) => key),
    };

    mockFileStorageService = {
      exportToFile: vi.fn(),
      importFromFile: vi.fn(),
    };

    mockCountryService = {
      getCountryInfoByCode: vi.fn(),
      getCountryInfoByNameAnyLanguage: vi.fn(),
    };

    mockFormValidationService = {
      getStreetNameError: vi.fn().mockReturnValue([]),
      getStreetNumberError: vi.fn().mockReturnValue([]),
      getCityError: vi.fn().mockReturnValue([]),
      getZipCodeError: vi.fn().mockReturnValue([]),
      getCountryError: vi.fn().mockReturnValue([]),
    };

    await TestBed.configureTestingModule({
      imports: [
        AddressComponent,
        FormsModule,
        StubLucideIconComponent,
        StubConfirmationModalComponent,
        StubDeleteConfirmationModalComponent,
        StubErrorModalComponent,
        StubHelpModalComponent,
        StubCountrySelectorComponent,
        StubTranslatePipe,
      ],
      providers: [
        { provide: HouseholdService, useValue: mockHouseholdService },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: FileStorageService, useValue: mockFileStorageService },
        { provide: CountryService, useValue: mockCountryService },
        { provide: FormValidationService, useValue: mockFormValidationService },
      ],
    })
      .overrideComponent(AddressComponent, {
        remove: {
          imports: [
            ConfirmationModalComponent,
            DeleteConfirmationModalComponent,
            ErrorModalComponent,
            HelpModalComponent,
            CountrySelectorComponent,
            TranslatePipe,
            LucideAngularModule,
          ],
        },
        add: {
          imports: [
            StubConfirmationModalComponent,
            StubDeleteConfirmationModalComponent,
            StubErrorModalComponent,
            StubHelpModalComponent,
            StubCountrySelectorComponent,
            StubTranslatePipe,
            StubLucideIconComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AddressComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should initialize empty when no address in service', () => {
      fixture.detectChanges();

      expect(component['streetName']()).toBe('');
      expect(component['streetNumber']()).toBe('');
      expect(component['city']()).toBe('');
      expect(component['zipCode']()).toBe('');
      expect(component['country']()).toBe('');
      expect(component['isEditingAddress']()).toBe(true);
    });

    it('should populate fields and set isEditingAddress to false when address exists', () => {
      addressSignal.set({
        streetName: 'Test St',
        streetNumber: '123',
        city: 'Test City',
        zipCode: '12345',
        country: 'de',
      });

      fixture.detectChanges();

      expect(component['streetName']()).toBe('Test St');
      expect(component['streetNumber']()).toBe('123');
      expect(component['city']()).toBe('Test City');
      expect(component['zipCode']()).toBe('12345');
      expect(component['country']()).toBe('de');
      expect(component['isEditingAddress']()).toBe(false);
    });

    it('should populate country code correctly for legacy country name', () => {
      mockCountryService.getCountryInfoByNameAnyLanguage.mockReturnValue({ code: 'fr' });

      addressSignal.set({
        streetName: 'Test St',
        streetNumber: '123',
        city: 'Test City',
        zipCode: '12345',
        country: 'France',
      });

      fixture.detectChanges();

      expect(component['country']()).toBe('fr');
      expect(mockCountryService.getCountryInfoByNameAnyLanguage).toHaveBeenCalledWith('France');
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle streetName changes', () => {
      mockFormValidationService.getStreetNameError.mockReturnValue(['error']);
      component.onStreetNameChange('New St');

      expect(component['streetName']()).toBe('New St');
      expect(component['streetNameError']()).toEqual(['error']);
      expect(mockFormValidationService.getStreetNameError).toHaveBeenCalledWith('New St');
    });

    it('should validate form correctly when all fields are valid', () => {
      component['streetName'].set('Test St');
      component['streetNumber'].set('123');
      component['city'].set('Test City');
      component['zipCode'].set('12345');
      component['country'].set('de');

      mockCountryService.getCountryInfoByCode.mockReturnValue({ code: 'de' });

      expect(component['isAddressFormValid']()).toBe(true);
    });

    it('should return invalid when required fields are empty', () => {
      component['streetName'].set('');
      expect(component['isAddressFormValid']()).toBe(false);
    });
  });

  describe('Unsaved Changes Guard', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should report no unsaved changes when not editing', () => {
      component['isEditingAddress'].set(false);
      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('should report unsaved changes when fields have content and no saved address', () => {
      component['isEditingAddress'].set(true);
      component['streetName'].set('Test St');

      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('should report unsaved changes when fields differ from saved address', () => {
      addressSignal.set({
        streetName: 'Test St',
        streetNumber: '123',
        city: 'Test City',
        zipCode: '12345',
        country: 'de',
      });

      component['isEditingAddress'].set(true);
      component['city'].set('New City');

      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('should trigger navigation warning if unsaved changes exist', () => {
      vi.spyOn(component, 'hasUnsavedChanges').mockReturnValue(true);
      const onLeave = vi.fn();

      const result = component.triggerNavigationWarning(onLeave);

      expect(result).toBe(true);
      expect(component['pendingNavigation']()).toBe(onLeave);
      expect(component['showUnsavedChangesModal']()).toBe(true);
    });

    it('should resolve pending navigation on leave without saving confirmation', () => {
      const onLeave = vi.fn();
      component['pendingNavigation'].set(onLeave);

      component.confirmLeaveWithoutSaving();

      expect(onLeave).toHaveBeenCalled();
      expect(component['pendingNavigation']()).toBeNull();
      expect(component['showUnsavedChangesModal']()).toBe(false);
    });

    it('should handle cancelEdit with unsaved changes', () => {
      vi.spyOn(component, 'triggerNavigationWarning');
      vi.spyOn(component, 'hasUnsavedChanges').mockReturnValue(true);

      component.cancelEdit();

      expect(component.triggerNavigationWarning).toHaveBeenCalled();
    });

    it('should handle cancelEdit without unsaved changes', () => {
      vi.spyOn(component, 'hasUnsavedChanges').mockReturnValue(false);

      component.cancelEdit();

      expect(component['isEditingAddress']()).toBe(false);
    });
  });

  describe('Save and Edit', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should start editing', () => {
      component['isEditingAddress'].set(false);
      component['showSaveConfirmation'].set(true);

      component.editAddress();

      expect(component['isEditingAddress']()).toBe(true);
      expect(component['showSaveConfirmation']()).toBe(false);
    });

    it('should not save if form is invalid', () => {
      component['streetName'].set(''); // Empty name makes it invalid

      component.saveAddress();

      expect(mockHouseholdService.updateAddress).not.toHaveBeenCalled();
    });

    it('should save address if valid', () => {
      vi.useFakeTimers();
      component['streetName'].set('Test St');
      component['streetNumber'].set('123');
      component['city'].set('Test City');
      component['zipCode'].set('12345');
      component['country'].set('de');

      mockCountryService.getCountryInfoByCode.mockReturnValue({ code: 'de' });

      component.saveAddress();

      expect(mockHouseholdService.updateAddress).toHaveBeenCalledWith({
        streetName: 'Test St',
        streetNumber: '123',
        city: 'Test City',
        zipCode: '12345',
        country: 'de',
      });

      expect(component['isEditingAddress']()).toBe(false);
      expect(component['showSaveConfirmation']()).toBe(true);

      vi.advanceTimersByTime(3000); // Fast-forward time for timeout

      expect(component['showSaveConfirmation']()).toBe(false);
      vi.useRealTimers();
    });
  });

  describe('Import/Export', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should export address', () => {
      const address = {
        streetName: 'Test St',
        streetNumber: '123',
        city: 'Test City',
        zipCode: '12345',
        country: 'de',
      };
      addressSignal.set(address);

      component.exportAddress();

      expect(mockFileStorageService.exportToFile).toHaveBeenCalledWith(
        { ...address, country: 'DE' },
        'address.json',
      );
    });

    it('should set file for import on valid selection', async () => {
      const file = new File([''], 'address.json', { type: 'application/json' });
      const mockEvent = { target: { files: [file], value: 'test' } } as unknown as Event;

      await component.importAddress(mockEvent);

      expect(component['pendingImportFile']()).toBe(file);
      expect(component['showImportConfirmModal']()).toBe(true);
    });

    it('should reject non-json import files', async () => {
      const file = new File([''], 'address.txt', { type: 'text/plain' });
      component['pendingImportFile'].set(file);

      await component.confirmImportAddress();

      expect(component['showImportErrorModal']()).toBe(true);
      expect(component['importErrorMessage']()).toContain(
        'SETTINGS.IMPORT_ADDRESS_INVALID_FILE_TYPE',
      );
    });

    it('should successfully import valid address', async () => {
      mockCountryService.getCountryInfoByCode.mockReturnValue({ code: 'de' });
      const address = {
        streetName: 'Test St',
        streetNumber: '123',
        city: 'Test City',
        zipCode: '12345',
        country: 'de',
      };

      mockFileStorageService.importFromFile.mockResolvedValue(address);

      const file = new File([''], 'address.json', { type: 'application/json' });
      component['pendingImportFile'].set(file);

      await component.confirmImportAddress();

      expect(mockHouseholdService.updateAddress).toHaveBeenCalledWith(address);
    });

    it('should handle import errors', async () => {
      mockFileStorageService.importFromFile.mockRejectedValue(new Error('Import failed'));

      const file = new File([''], 'address.json', { type: 'application/json' });
      component['pendingImportFile'].set(file);

      await component.confirmImportAddress();

      expect(component['showImportErrorModal']()).toBe(true);
      expect(component['importErrorMessage']()).toContain('Import failed');
    });
  });
});
