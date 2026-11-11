import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  input,
  output,
  effect,
  linkedSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Info, Lightbulb } from 'lucide-angular';
import { HouseholdService } from '../../services/household.service';
import { WaterAveragesService } from '../../services/water-averages.service';
import { LanguageService } from '../../services/language.service';
import { CountryFactsService } from '../../services/country-facts.service';
import { HeatingFactsService } from '../../services/heating-facts.service';
import { HeatingAveragesService } from '../../services/heating-averages.service';
import { ElectricityCountryFactsService } from '../../services/electricity-country-facts.service';
import { ElectricityAveragesService } from '../../services/electricity-averages.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

export type ComparisonNoteType = 'water' | 'heating' | 'electricity';

export interface HeatingCountry {
  code: string;
  nameKey: string;
}

export interface ElectricityCountry {
  code: string;
  nameKey: string;
}

@Component({
  selector: 'app-comparison-note',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, TranslatePipe],
  templateUrl: './comparison-note.component.html',
  styleUrl: './comparison-note.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparisonNoteComponent {
  private readonly householdService = inject(HouseholdService);
  private readonly waterAveragesService = inject(WaterAveragesService);
  private readonly languageService = inject(LanguageService);
  private readonly countryFactsService = inject(CountryFactsService);
  private readonly heatingFactsService = inject(HeatingFactsService);
  private readonly heatingAveragesService = inject(HeatingAveragesService);
  private readonly electricityFactsService = inject(ElectricityCountryFactsService);
  private readonly electricityAveragesService = inject(ElectricityAveragesService);

  // Inputs
  readonly type = input<ComparisonNoteType, ComparisonNoteType | null | undefined>('water', {
    transform: (val) => val || 'water',
  });

  readonly records = input<{ date: Date }[], { date: Date }[] | null | undefined>([], {
    transform: (val) => val || [],
  });

  readonly chartView = input<string, string | null | undefined>('total', {
    transform: (val) => val || 'total',
  });

  readonly country = input<string | null>(null);

  // Outputs
  readonly countryCodeChange = output<string>();
  readonly countryChange = output<string | null>();

  // Internal State
  protected readonly InfoIcon = Info;
  protected readonly LightbulbIcon = Lightbulb;
  readonly comparisonCountry = linkedSignal<string | null>(() => this.country());
  protected readonly factSeed = linkedSignal<{ country: string; view: string }, number>({
    source: () => ({
      country: this.effectiveComparisonCountryCode(),
      view: this.chartView(),
    }),
    computation: () => Date.now(),
  });

  protected familySize = computed(() => this.householdService.members().length);
  protected hasSufficientDataForComparison = computed(() => this.records().length >= 3);

  protected countryName = computed(() => this.householdService.address()?.country || '');

  // Water countries - sorted A-Z (Schwartzian transform: translate once per country)
  protected waterCountries = computed(() => {
    this.languageService.translationVersion?.();
    this.languageService.currentLang();
    const countries = this.waterAveragesService.getAvailableCountries();
    return countries
      .map((item) => ({
        ...item,
        codeLower: item.code.toLowerCase(),
        name: this.languageService.translate(item.translationKey),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  // Heating countries - sorted A-Z (Schwartzian transform: translate once per country)
  protected sortedHeatingCountries = computed(() => {
    this.languageService.translationVersion?.();
    this.languageService.currentLang();
    const countries = this.heatingFactsService.getAvailableCountries();
    return countries
      .map((item) => ({
        ...item,
        codeLower: item.code.toLowerCase(),
        translationKey: item.nameKey,
        name: this.languageService.translate(item.nameKey),
        average: this.heatingAveragesService.getAverageKwhPerYear(item.code),
      }))
      .filter((item) => item.average > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  // Electricity countries - sorted A-Z (Schwartzian transform: translate once per country)
  protected sortedElectricityCountries = computed(() => {
    this.languageService.translationVersion?.();
    this.languageService.currentLang();
    const countries = this.electricityFactsService.getAvailableCountries();
    return countries
      .map((item) => ({
        ...item,
        codeLower: item.code.toLowerCase(),
        translationKey: item.nameKey,
        name: this.languageService.translate(item.nameKey),
        average: this.electricityAveragesService.getAverageKwhPerPersonPerYear(item.code),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  protected availableCountries = computed(() => {
    if (this.type() === 'heating') {
      return this.sortedHeatingCountries();
    }
    if (this.type() === 'electricity') {
      return this.sortedElectricityCountries();
    }
    return this.waterCountries();
  });

  private readonly availableCountriesMap = computed(
    () => new Map(this.availableCountries().map((c) => [c.codeLower, c])),
  );

  protected effectiveComparisonCountryCode = computed(() => {
    const selected = this.comparisonCountry();
    if (selected) return selected;

    // Fallback to user's country or default
    const userCountry = this.countryName();
    // Check if user's country is valid for the current type
    if (userCountry && this.isValidCountry(userCountry)) {
      return userCountry;
    }

    return 'DE';
  });

  protected readonly effectiveComparisonCountryCodeLower = computed(() =>
    this.effectiveComparisonCountryCode().toLowerCase(),
  );

  protected readonly selectedCountryFlag = computed(() => this.getSelectedCountryFlag());

  protected readonly countryFlagAlt = computed(() => {
    this.languageService.translationVersion?.();
    this.languageService.currentLang();
    return this.languageService.translate('CHART.COUNTRY_FLAG_ALT', {
      country: this.effectiveComparisonCountryCode(),
    });
  });

  protected readonly compareWithInfoKey = computed(
    () => `CHART.COMPARE_WITH_INFO_${this.type().toUpperCase()}`,
  );

  protected selectedCountryEntry = computed(() =>
    this.availableCountriesMap().get(this.effectiveComparisonCountryCodeLower()),
  );

  protected effectiveComparisonCountryName = computed(() => {
    const country = this.selectedCountryEntry();
    if (country) {
      return country.name;
    }
    return this.effectiveComparisonCountryCode().toUpperCase();
  });

  protected countryAverage = computed(() => {
    const entry = this.selectedCountryEntry();
    if (entry) {
      return entry.average;
    }
    const code = this.effectiveComparisonCountryCode();
    if (this.type() === 'heating') {
      return this.heatingAveragesService.getAverageKwhPerYear(code);
    }
    if (this.type() === 'electricity') {
      return this.electricityAveragesService.getAverageKwhPerPersonPerYear(code);
    }
    return 150;
  });

  private isValidCountry(code: string): boolean {
    return this.availableCountriesMap().has(code.toLowerCase());
  }

  // Water fact - for water comparison mode
  protected waterFact = computed(() => {
    const code = this.effectiveComparisonCountryCode();
    const seed = this.factSeed();
    const view = this.chartView();
    let viewHash = 0;
    for (let i = 0; i < view.length; i++) {
      viewHash += view.codePointAt(i) ?? 0;
    }
    const index = (seed % 100) + this.records().length + viewHash;
    return this.countryFactsService.getFactByIndex(code, index);
  });

  // Heating fact - for heating comparison mode
  protected heatingFact = computed(() => {
    const code = this.effectiveComparisonCountryCode();
    const seed = this.factSeed();
    const index = Math.floor((seed % 100) + this.records().length);
    return this.heatingFactsService.getFactByIndex(0, index, 'country', code);
  });

  // Electricity fact
  protected electricityFact = computed(() => {
    const code = this.effectiveComparisonCountryCode();
    const seed = this.factSeed();
    const index = Math.floor((seed % 100) + this.records().length);
    return this.electricityFactsService.getFactByIndex(0, index, 'country', code);
  });

  // Combined fact based on type
  protected countryFact = computed(() => {
    if (this.type() === 'heating') {
      return this.heatingFact()?.message || null;
    }
    if (this.type() === 'electricity') {
      return this.electricityFact()?.message || null;
    }
    return this.waterFact();
  });

  // Heating fact title
  protected heatingFactTitle = computed(() => {
    return this.heatingFact()?.title || '';
  });

  protected electricityFactTitle = computed(() => {
    return this.electricityFact()?.title || '';
  });

  // Main comparison text computed in TS to ensure reactivity and stability
  protected comparisonText = computed(() => {
    const type = this.type();
    const countryName = this.effectiveComparisonCountryName();
    const average = this.countryAverage();
    const size = this.familySize();

    // Ensure language dependency is tracked
    this.languageService.translationVersion?.();
    this.languageService.currentLang();

    if (type === 'water') {
      return this.languageService.translate('CHART.COMPARISON_NOTE_COUNTRY', {
        country: countryName,
        average: average,
        size: size,
      });
    }

    if (type === 'heating') {
      const text = this.languageService.translate('CHART.COMPARISON_NOTE_COUNTRY_HEATING', {
        country: countryName,
        average: average,
      });
      return text;
    }

    return this.languageService.translate('CHART.COMPARISON_NOTE_COUNTRY_ELECTRICITY', {
      country: countryName,
      average: average,
      size: size,
    });
  });

  constructor() {
    // Emit effective country code whenever it changes
    effect(() => {
      this.countryCodeChange.emit(this.effectiveComparisonCountryCode());
    });
  }

  protected onComparisonCountryChange(countryCode: string) {
    this.comparisonCountry.set(countryCode);
  }

  protected getSelectedCountryFlag(): string {
    const code = this.effectiveComparisonCountryCode();
    return this.waterAveragesService.getFlagUrl(code);
  }

  protected refreshFact(): void {
    this.factSeed.set(Date.now());
  }
}
