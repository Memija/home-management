import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  linkedSignal,
  computed,
  inject,
  effect,
} from '@angular/core';
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
  imports: [FormsModule, TranslatePipe],
  templateUrl: './country-selector.component.html',
  styleUrl: './country-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountrySelectorComponent {
  private readonly countryService = inject(CountryService);
  private readonly languageService = inject(LanguageService);

  /** The country code (e.g., 'de', 'us') - two-way bindable */
  readonly countryCode = input<string>('');

  /** Placeholder text for the input */
  readonly placeholder = input<string>('SETTINGS.SEARCH_COUNTRY');

  readonly hasError = input<boolean>(false);

  /** HTML id applied to the input field */
  readonly inputId = input<string>('country-selector-input');

  /** HTML name applied to the input field */
  readonly inputName = input<string>('country-selector');

  /** Emits when country code changes */
  readonly countryCodeChange = output<string>();

  /** Emits validation errors */
  readonly validationErrors = output<string[]>();

  // Internal state
  protected readonly _countryCode = linkedSignal(() => this.countryCode());
  protected readonly _countrySearch = signal('');

  private cachedCountriesRef: string[] | null = null;
  private cachedLowerEntries: { name: string; lower: string }[] = [];
  private cachedLowerSet = new Set<string>();

  private getLowerCountryEntries(countries: string[]): {
    entries: { name: string; lower: string }[];
    lowerSet: Set<string>;
  } {
    if (this.cachedCountriesRef !== countries) {
      const entries: { name: string; lower: string }[] = [];
      const lowerSet = new Set<string>();
      for (const name of countries) {
        const lower = name.toLowerCase();
        entries.push({ name, lower });
        lowerSet.add(lower);
      }
      this.cachedCountriesRef = countries;
      this.cachedLowerEntries = entries;
      this.cachedLowerSet = lowerSet;
    }
    return { entries: this.cachedLowerEntries, lowerSet: this.cachedLowerSet };
  }

  /** Filtered countries based on search (reactive to language changes) */
  protected filteredCountries = computed(() => {
    const search = this._countrySearch().toLowerCase().trim();
    if (!search) return [];

    // Get countries fresh each time (translated based on current language)
    const countries = this.countryService.getCountries();
    const { entries, lowerSet } = this.getLowerCountryEntries(countries);

    // If search exactly matches a country, don't show dropdown (already selected)
    if (lowerSet.has(search)) return [];

    // Filter and exclude current selection if it partially matches
    const currentDisplay = this.displayName().toLowerCase();
    const results: string[] = [];
    for (const entry of entries) {
      if (entry.lower.includes(search) && entry.lower !== currentDisplay) {
        results.push(entry.name);
        if (results.length === 10) break; // Limit to 10 results
      }
    }
    return results;
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
    // Sync countryCode input and language changes to search field
    effect(() => {
      this.languageService.currentLang();
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
}
