import { Component, Input, Output, EventEmitter, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CountryService } from '../../services/country.service';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

/**
 * Reusable country selector with search/autocomplete functionality.
 * Stores country as ISO code internally, displays translated name.
 */
@Component({
  selector: 'app-country-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './country-selector.component.html',
  styleUrl: './country-selector.component.scss'
})
export class CountrySelectorComponent {
  private countryService = inject(CountryService);
  private languageService = inject(LanguageService);

  /** The country code (e.g., 'de', 'us') - two-way bindable */
  @Input() set countryCode(value: string) {
    this._countryCode.set(value);
    // Update search field to show display name
    if (value) {
      const info = this.countryService.getCountryInfoByCode(value);
      if (info) {
        this._countrySearch.set(this.languageService.translate(info.translationKey));
      }
    }
  }
  get countryCode(): string {
    return this._countryCode();
  }

  /** Placeholder text for the input */
  @Input() placeholder = 'SETTINGS.SEARCH_COUNTRY';

  /** Whether the input has an error state */
  @Input() hasError = false;

  /** Emits when country code changes */
  @Output() countryCodeChange = new EventEmitter<string>();

  /** Emits validation errors */
  @Output() validationErrors = new EventEmitter<string[]>();

  // Internal state
  protected _countryCode = signal('');
  protected _countrySearch = signal('');

  /** Filtered countries based on search (reactive to language changes) */
  protected filteredCountries = computed(() => {
    const search = this._countrySearch().toLowerCase().trim();
    if (!search) return [];

    // Get countries fresh each time (translated based on current language)
    const countries = this.countryService.getCountries();

    // If search exactly matches a country, don't show dropdown (already selected)
    const exactMatch = countries.some(c => c.toLowerCase() === search);
    if (exactMatch) return [];

    // Filter and exclude current selection if it partially matches
    const currentDisplay = this.displayName().toLowerCase();
    return countries
      .filter(c => c.toLowerCase().includes(search) && c.toLowerCase() !== currentDisplay)
      .slice(0, 10); // Limit to 10 results
  });

  /** Display name for the selected country (translated) */
  protected displayName = computed(() => {
    // Read language signal to create reactive dependency
    this.languageService.currentLang();

    const code = this._countryCode();
    if (!code) return '';
    const info = this.countryService.getCountryInfoByCode(code);
    if (info) {
      return this.languageService.translate(info.translationKey);
    }
    return code; // Fallback to code if not found
  });

  constructor() {
    // Sync search field when language changes
    effect(() => {
      const lang = this.languageService.currentLang();
      const code = this._countryCode();
      if (code) {
        const info = this.countryService.getCountryInfoByCode(code);
        if (info) {
          this._countrySearch.set(this.languageService.translate(info.translationKey));
        }
      }
    });
  }

  /**
   * Handle search input changes
   */
  onSearchChange(value: string): void {
    this._countrySearch.set(value);

    // Try to find exact match and set code
    const info = this.countryService.getCountryInfoByName(value);
    if (info) {
      this._countryCode.set(info.code);
      this.countryCodeChange.emit(info.code);
      this.validationErrors.emit([]);
    } else {
      // No exact match, clear code and emit error if not empty
      this._countryCode.set('');
      this.countryCodeChange.emit('');
      if (value.trim() !== '') {
        this.validationErrors.emit(['SETTINGS.ERRORS.INVALID_COUNTRY']);
      } else {
        this.validationErrors.emit([]);
      }
    }
  }

  /**
   * Select a country from the dropdown
   */
  selectCountry(countryName: string): void {
    const info = this.countryService.getCountryInfoByName(countryName);
    if (info) {
      this._countryCode.set(info.code);
      this._countrySearch.set(countryName);
      this.countryCodeChange.emit(info.code);
    } else {
      this._countryCode.set(countryName);
      this._countrySearch.set(countryName);
      this.countryCodeChange.emit(countryName);
    }
    this.validationErrors.emit([]);
  }

  /** TrackBy for ngFor performance */
  trackByCountry(index: number, country: string): string {
    return country;
  }
}
