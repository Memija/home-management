import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookOpen,
  Droplets,
  Flame,
  Globe,
  Info,
  Lightbulb,
  LucideAngularModule,
  Search,
  Users,
  Zap,
} from 'lucide-angular';
import { BenchmarkSourceLink, getBenchmarkSourceUrl } from '../models/benchmark-sources.data';
import { TranslatePipe } from '../pipes/translate.pipe';
import { ElectricityAveragesService } from '../services/electricity-averages.service';
import { HeatingAveragesService } from '../services/heating-averages.service';
import { HouseholdService } from '../services/household.service';
import { LanguageService } from '../services/language.service';
import { WaterAveragesService } from '../services/water-averages.service';
import {
  CountryFactsModalComponent,
  FactCategory,
} from './country-facts-modal/country-facts-modal.component';

export type BenchmarkSortColumn = 'country' | 'water' | 'electricity' | 'heating';
export type BenchmarkSortDirection = 'asc' | 'desc';

export interface CountryBenchmarkRow {
  readonly code: string;
  readonly name: string;
  readonly flagUrl: string;
  readonly waterDailyLiters: number;
  readonly electricityYearlyKwh: number;
  readonly heatingYearlyKwh: number;
  readonly sources: string;
  readonly sourceLinks: readonly BenchmarkSourceLink[];
  readonly isUserCountry: boolean;
}

interface StaticCountryBenchmark {
  readonly code: string;
  readonly codeLower: string;
  readonly translationKey: string;
  readonly flagUrl: string;
  readonly waterPerPersonDaily: number;
  readonly electricityPerPersonYearly: number;
  readonly heatingYearlyKwh: number;
  readonly sources: string;
  readonly sourceLinks: readonly BenchmarkSourceLink[];
}

interface TranslatedCountryBenchmark extends StaticCountryBenchmark {
  readonly name: string;
  readonly nameLower: string;
}

interface InternalBenchmarkRow extends CountryBenchmarkRow {
  readonly nameLower: string;
  readonly codeLower: string;
}

const HOUSEHOLD_SIZE_OPTIONS = [1, 2, 3, 4, 5] as const;
const DEFAULT_HOUSEHOLD_SIZE = 2;

@Component({
  selector: 'app-benchmarks',
  standalone: true,
  imports: [CountryFactsModalComponent, LucideAngularModule, RouterLink, TranslatePipe],
  templateUrl: './benchmarks.component.html',
  styleUrl: './benchmarks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenchmarksComponent {
  private readonly waterService = inject(WaterAveragesService);
  private readonly electricityService = inject(ElectricityAveragesService);
  private readonly heatingService = inject(HeatingAveragesService);
  private readonly householdService = inject(HouseholdService);
  private readonly languageService = inject(LanguageService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly GlobeIcon = Globe;
  readonly UsersIcon = Users;
  readonly SearchIcon = Search;
  readonly InfoIcon = Info;
  readonly DropletsIcon = Droplets;
  readonly ZapIcon = Zap;
  readonly FlameIcon = Flame;
  readonly BookOpenIcon = BookOpen;
  readonly ArrowUpDownIcon = ArrowUpDown;
  readonly ArrowUpIcon = ArrowUp;
  readonly ArrowDownIcon = ArrowDown;
  readonly LightbulbIcon = Lightbulb;

  private readonly selectedHouseholdSize = signal<number | null>(null);
  readonly sortColumn = signal<BenchmarkSortColumn>('country');
  readonly sortDirection = signal<BenchmarkSortDirection>('asc');
  readonly selectedCountryCode = signal<string | null>(null);

  readonly userCountryCode = computed<string>(() => {
    if (!this.isBrowser) return '';
    return this.householdService.address()?.country?.trim().toLowerCase() ?? '';
  });

  readonly householdSizes = computed<readonly number[]>(() => {
    const userCount = this.householdService.members().length;
    return userCount > 5 ? [...HOUSEHOLD_SIZE_OPTIONS, userCount] : HOUSEHOLD_SIZE_OPTIONS;
  });

  readonly householdSizeParams = computed<Readonly<Record<number, { readonly count: number }>>>(
    () => {
      const params: Record<number, { readonly count: number }> = {
        1: { count: 1 },
        2: { count: 2 },
        3: { count: 3 },
        4: { count: 4 },
        5: { count: 5 },
      };
      const userCount = this.householdService.members().length;
      if (userCount > 5) {
        params[userCount] = { count: userCount };
      }
      return params;
    },
  );

  readonly householdSize = computed<number>(() => {
    const manual = this.selectedHouseholdSize();
    if (manual !== null) return manual;
    const userCount = this.householdService.members().length;
    return userCount > 0 ? userCount : DEFAULT_HOUSEHOLD_SIZE;
  });

  readonly searchQuery = signal<string>('');

  private readonly staticCountries: readonly StaticCountryBenchmark[] = this.waterService
    .getAvailableCountries()
    .map((entry) => {
      const water = this.waterService.getCountryData(entry.code);
      const electricity = this.electricityService.getCountryData(entry.code);
      const heating = this.heatingService.getCountryData(entry.code);
      const sourceList = [water.source, electricity.source];
      if (heating.averageKwhPerYear > 0) {
        sourceList.push(heating.source);
      }
      const uniqueSources = Array.from(new Set(sourceList));
      const sources = uniqueSources.join(' · ');
      const sourceLinks: readonly BenchmarkSourceLink[] = uniqueSources.map((label) => ({
        label,
        url: getBenchmarkSourceUrl(label),
      }));

      return {
        code: entry.code,
        codeLower: entry.code.toLowerCase(),
        translationKey: entry.translationKey,
        flagUrl: this.waterService.getFlagUrl(entry.code),
        waterPerPersonDaily: water.averageLitersPerPersonPerDay,
        electricityPerPersonYearly: electricity.averageKwhPerPersonPerYear,
        heatingYearlyKwh: heating.averageKwhPerYear,
        sources,
        sourceLinks,
      };
    });

  private readonly translatedCountries = computed<readonly TranslatedCountryBenchmark[]>(() => {
    this.languageService.currentLang?.();
    this.languageService.translationVersion?.();
    return this.staticCountries.map((entry) => {
      const name = this.languageService.translate(entry.translationKey);
      return {
        ...entry,
        name,
        nameLower: name.toLowerCase(),
      };
    });
  });

  private readonly allRows = computed<readonly InternalBenchmarkRow[]>(() => {
    const size = this.householdSize();
    const userCode = this.userCountryCode();

    return this.translatedCountries().map((entry) => ({
      code: entry.code,
      codeLower: entry.codeLower,
      name: entry.name,
      nameLower: entry.nameLower,
      flagUrl: entry.flagUrl,
      waterDailyLiters: entry.waterPerPersonDaily * size,
      electricityYearlyKwh: entry.electricityPerPersonYearly * size,
      heatingYearlyKwh: entry.heatingYearlyKwh,
      sources: entry.sources,
      sourceLinks: entry.sourceLinks,
      isUserCountry: userCode.length > 0 && entry.codeLower === userCode,
    }));
  });

  readonly rows = computed<readonly CountryBenchmarkRow[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const column = this.sortColumn();
    const direction = this.sortDirection();
    const multiplier = direction === 'asc' ? 1 : -1;

    const filtered = query
      ? this.allRows().filter(
          (row) => row.nameLower.includes(query) || row.codeLower.includes(query),
        )
      : this.allRows();

    return [...filtered].sort((a, b) => {
      if (a.isUserCountry !== b.isUserCountry) {
        return a.isUserCountry ? -1 : 1;
      }
      if (column === 'country') {
        return a.name.localeCompare(b.name) * multiplier;
      }
      const valA =
        column === 'water'
          ? a.waterDailyLiters
          : column === 'electricity'
            ? a.electricityYearlyKwh
            : a.heatingYearlyKwh;
      const valB =
        column === 'water'
          ? b.waterDailyLiters
          : column === 'electricity'
            ? b.electricityYearlyKwh
            : b.heatingYearlyKwh;

      if (valA !== valB) {
        return (valA - valB) * multiplier;
      }
      return a.name.localeCompare(b.name);
    });
  });

  readonly selectedCountry = computed<CountryBenchmarkRow | null>(() => {
    const code = this.selectedCountryCode();
    if (!code) return null;
    return this.allRows().find((row) => row.code === code) ?? null;
  });

  readonly activeFactCategory = computed<FactCategory>(() => {
    const col = this.sortColumn();
    if (col === 'electricity' || col === 'heating') {
      return col;
    }
    return 'water';
  });

  setHouseholdSize(size: number): void {
    this.selectedHouseholdSize.set(size);
  }

  openCountryFacts(row: CountryBenchmarkRow): void {
    this.selectedCountryCode.set(row.code);
  }

  closeCountryFacts(): void {
    this.selectedCountryCode.set(null);
  }

  toggleSort(column: BenchmarkSortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
      return;
    }
    this.sortColumn.set(column);
    this.sortDirection.set(column === 'country' ? 'asc' : 'desc');
  }

  getAriaSort(column: BenchmarkSortColumn): 'ascending' | 'descending' | 'none' {
    if (this.sortColumn() !== column) return 'none';
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.searchQuery.set(input?.value ?? '');
  }
}
