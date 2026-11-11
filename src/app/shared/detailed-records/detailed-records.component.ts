import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  effect,
  inject,
  ContentChild,
  TemplateRef,
  linkedSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  LucideAngularModule,
  Pencil,
  Trash2,
  Calendar,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarFold,
  ListFilter,
  CircleQuestionMark,
  RotateCcw,
} from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { DatePickerComponent } from '../date-picker/date-picker.component';
import { HelpModalComponent, HelpStep } from '../help-modal/help-modal.component';
import { LanguageService } from '../../services/language.service';
import { LocalStorageService } from '../../services/local-storage.service';
import {
  ConsumptionRecord,
  calculateWaterTotal,
  calculateKitchenTotal,
  calculateBathroomTotal,
  parseSafeDate,
} from '../../models/records.model';
import {
  DEFAULT_SORT_OPTIONS,
  MONTH_TRANSLATION_KEYS,
  computeDateRangeBounds,
  computeDisabledMonths,
  filterDetailedRecords,
  getWaterDetailRows,
  sortDetailedRecords,
} from './detailed-records.utils';

// Re-export for consumers
export type { ConsumptionRecord } from '../../models/records.model';

export interface GenericRecord {
  date: Date;
  kitchenWarm?: number;
  kitchenCold?: number;
  bathroomWarm?: number;
  bathroomCold?: number;
  value?: number;
  rooms?: Record<string, number>;
}

export interface SortOptionConfig {
  value: string;
  labelKey: string;
  direction: '↑' | '↓';
}

@Component({
  selector: 'app-detailed-records',
  standalone: true,
  imports: [
    FormsModule,
    NgTemplateOutlet,
    LucideAngularModule,
    TranslatePipe,
    DatePickerComponent,
    HelpModalComponent,
  ],
  providers: [DatePipe],
  templateUrl: './detailed-records.component.html',
  styleUrl: './detailed-records.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailedRecordsComponent {
  private readonly languageService = inject(LanguageService);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly datePipe = inject(DatePipe);

  protected readonly EditIcon = Pencil;
  protected readonly TrashIcon = Trash2;
  protected readonly CalendarIcon = Calendar;
  protected readonly InfoIcon = Info;
  protected readonly ChevronDownIcon = ChevronDown;
  protected readonly ChevronLeftIcon = ChevronLeft;
  protected readonly ChevronRightIcon = ChevronRight;
  protected readonly CalendarDaysIcon = CalendarDays;
  protected readonly CalendarFoldIcon = CalendarFold;
  protected readonly SortIcon = ListFilter;
  protected readonly ArrowUpDownIcon = ListFilter;
  protected readonly HelpIcon = CircleQuestionMark;
  protected readonly ResetIcon = RotateCcw;
  protected readonly ChevronUpIcon = ChevronUp;
  protected readonly monthTranslationKeys = MONTH_TRANSLATION_KEYS;
  protected readonly paginationSizes = [5, 10, 20, 50] as const;
  protected readonly getWaterDetailRows = getWaterDetailRows;

  private readonly recordDatesCache = new WeakMap<
    GenericRecord,
    { lang: string; time: number; formatted: string }
  >();
  private readonly waterRowsCache = new WeakMap<
    GenericRecord,
    ReturnType<typeof getWaterDetailRows>
  >();

  readonly records = input<GenericRecord[], GenericRecord[] | null | undefined>([], {
    transform: (val) => val || [],
  });
  readonly defaultSortOption = input<string, string | null | undefined>('date-desc', {
    transform: (val) => val || 'date-desc',
  });
  readonly showSearchDate = input<boolean>(true);
  readonly showYearMonth = input<boolean>(true);
  readonly showEditDelete = input<boolean>(true);
  readonly recordType = input<string, string | null | undefined>('water', {
    transform: (val) => val || 'water',
  });
  readonly helpTitleKey = input<string>('HOME.RECORDS_HELP_TITLE');
  readonly helpSteps = input<HelpStep[]>([]);
  readonly showTotal = input<boolean>(true);
  readonly totalLabelKey = input<string>('HOME.TOTAL');
  readonly hasDetails = input<boolean>(true);
  readonly allowCollapse = input<boolean>(true);
  readonly sortOptions = input<SortOptionConfig[]>(DEFAULT_SORT_OPTIONS);
  readonly calculateTotalFn = input<
    (record: GenericRecord) => number,
    ((record: GenericRecord) => number) | null | undefined
  >(() => 0, {
    transform: (val) => val || (() => 0),
  });
  readonly valuesNoteKey = input<string>('HOME.ALL_VALUES_IN_LITERS');

  @ContentChild('recordDetails') recordDetailsTemplate!: TemplateRef<{ $implicit: GenericRecord }>;

  readonly editRecord = output<GenericRecord>();
  readonly deleteRecord = output<GenericRecord>();
  readonly deleteAllRecords = output<GenericRecord[]>();
  readonly filteredRecordsChange = output<GenericRecord[]>();
  readonly filterStateChange = output<{
    year: number | null;
    month: number | null;
    startDate: string | null;
    endDate: string | null;
  }>();

  protected readonly startDate = signal<string | null>(null);
  protected readonly endDate = signal<string | null>(null);
  protected readonly searchYear = signal<number | null>(null);
  protected readonly searchMonth = signal<number | null>(null);
  protected readonly currentPage = signal<number>(1);
  protected readonly paginationSize = signal<number>(5);
  protected readonly sortOption = linkedSignal<string>(() => this.defaultSortOption());
  protected readonly showHelpModal = signal(false);
  protected readonly isCollapsed = linkedSignal<string, boolean>({
    source: () => this.recordType(),
    computation: (type) => {
      const key = `detailed_records_for_${type}_are_collapsed`;
      const stored = this.localStorageService.getPreference(key);
      return stored !== null ? stored === 'true' : true;
    },
  });

  constructor() {
    effect(() => {
      this.isCollapsed();
    });

    effect(() => {
      this.filteredRecordsChange.emit(this.filteredRecords());
    });

    effect(() => {
      this.filterStateChange.emit({
        year: this.searchYear(),
        month: this.searchMonth(),
        startDate: this.startDate(),
        endDate: this.endDate(),
      });
    });
  }

  protected currentLang = computed(() => this.languageService.currentLang());

  protected availableYears = computed(() => {
    if (!this.showYearMonth()) return [];
    const years = new Set<number>();
    for (const r of this.records()) {
      years.add(parseSafeDate(r.date).getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  });

  protected filteredRecords = computed(() =>
    filterDetailedRecords(this.records(), {
      startDate: this.startDate(),
      endDate: this.endDate(),
      searchYear: this.searchYear(),
      searchMonth: this.searchMonth(),
    }),
  );

  protected isFilterActive = computed(
    () =>
      this.startDate() !== null ||
      this.endDate() !== null ||
      this.searchYear() !== null ||
      this.searchMonth() !== null,
  );

  protected sortedRecords = computed(() =>
    sortDetailedRecords(this.filteredRecords(), this.sortOption(), this.calculateTotalFn()),
  );

  protected displayedRecords = computed(() =>
    this.sortedRecords().slice(
      (this.currentPage() - 1) * this.paginationSize(),
      this.currentPage() * this.paginationSize(),
    ),
  );

  protected displayedRecordTotals = computed(() => {
    if (!this.showTotal()) {
      return new Map<GenericRecord, number>();
    }
    const calc = this.calculateTotalFn();
    return new Map(this.displayedRecords().map((r) => [r, calc(r)]));
  });

  protected displayedRecordDates = computed(() => {
    const lang = this.currentLang();
    return new Map(
      this.displayedRecords().map((r) => {
        const time = parseSafeDate(r.date).getTime();
        const cached = this.recordDatesCache.get(r);
        if (cached && cached.lang === lang && cached.time === time) {
          return [r, cached.formatted] as const;
        }
        const formatted = this.datePipe.transform(r.date, 'fullDate', undefined, lang) ?? '';
        this.recordDatesCache.set(r, { lang, time, formatted });
        return [r, formatted] as const;
      }),
    );
  });

  protected displayedWaterRows = computed(() => {
    if (this.recordType() !== 'water') {
      return new Map<GenericRecord, ReturnType<typeof getWaterDetailRows>>();
    }
    return new Map(
      this.displayedRecords().map((r) => {
        let rows = this.waterRowsCache.get(r);
        if (!rows) {
          rows = getWaterDetailRows(r);
          this.waterRowsCache.set(r, rows);
        }
        return [r, rows] as const;
      }),
    );
  });

  protected totalPages = computed(() =>
    Math.ceil(this.filteredRecords().length / this.paginationSize()),
  );

  protected pageOfText = computed(() =>
    this.languageService.translate('HOME.PAGE_OF', {
      current: this.currentPage(),
      total: this.totalPages(),
    }),
  );

  protected showingRecordsText = computed(() =>
    this.languageService.translate('HOME.SHOWING_RECORDS', {
      current: this.displayedRecords().length,
      total: this.filteredRecords().length,
    }),
  );

  private readonly yearRangeBounds = computed(() =>
    computeDateRangeBounds(this.startDate(), this.endDate()),
  );

  protected readonly disabledMonths = computed<readonly boolean[]>(() =>
    computeDisabledMonths(this.searchYear(), this.yearRangeBounds()),
  );

  protected isYearDisabled(year: number): boolean {
    const { minYear, maxYear } = this.yearRangeBounds();
    if (minYear !== null && year < minYear) return true;
    if (maxYear !== null && year > maxYear) return true;
    return false;
  }

  protected isMonthDisabled(monthIndex: number): boolean {
    return this.disabledMonths()[monthIndex] ?? false;
  }

  protected calculateTotal(record: ConsumptionRecord): number {
    return calculateWaterTotal(record);
  }

  protected calculateKitchenTotal(record: ConsumptionRecord): number {
    return calculateKitchenTotal(record);
  }

  protected calculateBathroomTotal(record: ConsumptionRecord): number {
    return calculateBathroomTotal(record);
  }

  protected nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((page) => page + 1);
    }
  }

  protected prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((page) => page - 1);
    }
  }

  protected onPaginationSizeChange(size: number): void {
    this.paginationSize.set(size);
    this.currentPage.set(1);
  }

  protected setSortOption(option: unknown): void {
    this.sortOption.set(option as string);
  }

  protected onEditRecord(record: GenericRecord): void {
    this.editRecord.emit(record);
  }

  protected onDeleteRecord(record: GenericRecord): void {
    this.deleteRecord.emit(record);
  }

  protected onDeleteAllRecords(): void {
    this.deleteAllRecords.emit(this.filteredRecords());
  }

  protected showHelp(): void {
    this.showHelpModal.set(true);
  }

  protected closeHelp(): void {
    this.showHelpModal.set(false);
  }

  protected toggleCollapse(): void {
    this.isCollapsed.update((v) => !v);
    const key = `detailed_records_for_${this.recordType()}_are_collapsed`;
    this.localStorageService.setPreference(key, String(this.isCollapsed()));
  }

  protected resetFilters(): void {
    this.startDate.set(null);
    this.endDate.set(null);
    this.searchYear.set(null);
    this.searchMonth.set(null);
    this.currentPage.set(1);
  }
}
