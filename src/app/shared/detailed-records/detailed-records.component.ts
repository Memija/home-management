import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  effect,
  inject,
  ContentChild,
  TemplateRef,
  untracked,
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
} from '../../models/records.model';
import {
  DEFAULT_SORT_OPTIONS,
  filterDetailedRecords,
  isMonthDisabledForRange,
  isMonthDisabledForYear,
  isYearDisabledForRange,
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
    DatePipe,
    NgTemplateOutlet,
    LucideAngularModule,
    TranslatePipe,
    DatePickerComponent,
    HelpModalComponent,
  ],
  templateUrl: './detailed-records.component.html',
  styleUrl: './detailed-records.component.scss',
})
export class DetailedRecordsComponent {
  private readonly languageService = inject(LanguageService);
  private readonly localStorageService = inject(LocalStorageService);

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

  protected readonly recordsSignal = signal<GenericRecord[]>([]);
  @Input() set records(val: GenericRecord[]) {
    this.recordsSignal.set(val || []);
  }
  get records(): GenericRecord[] {
    return this.recordsSignal();
  }

  @Input() set defaultSortOption(val: string) {
    this.sortOption.set(val || 'date-desc');
  }

  @Input() showSearchDate = true;
  @Input() showYearMonth = true;
  @Input() showEditDelete = true;

  protected readonly recordTypeSignal = signal<string>('water');
  @Input() set recordType(val: string) {
    this.recordTypeSignal.set(val || 'water');
  }
  get recordType(): string {
    return this.recordTypeSignal();
  }

  @Input() helpTitleKey = 'HOME.RECORDS_HELP_TITLE';
  @Input() helpSteps: HelpStep[] = [];
  @Input() showTotal = true;
  @Input() totalLabelKey = 'HOME.TOTAL';
  @Input() hasDetails = true;
  @Input() allowCollapse = true;
  @Input() sortOptions: SortOptionConfig[] = DEFAULT_SORT_OPTIONS;

  protected readonly calculateTotalFnSignal = signal<(record: GenericRecord) => number>(() => 0);
  @Input() set calculateTotalFn(val: (record: GenericRecord) => number) {
    this.calculateTotalFnSignal.set(val || (() => 0));
  }
  get calculateTotalFn(): (record: GenericRecord) => number {
    return this.calculateTotalFnSignal();
  }

  @Input() valuesNoteKey = 'HOME.ALL_VALUES_IN_LITERS';

  @ContentChild('recordDetails') recordDetailsTemplate!: TemplateRef<{ $implicit: GenericRecord }>;

  @Output() editRecord = new EventEmitter<GenericRecord>();
  @Output() deleteRecord = new EventEmitter<GenericRecord>();
  @Output() deleteAllRecords = new EventEmitter<GenericRecord[]>();
  @Output() filteredRecordsChange = new EventEmitter<GenericRecord[]>();
  @Output() filterStateChange = new EventEmitter<{
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
  protected readonly sortOption = signal<string>('date-desc');
  protected readonly showHelpModal = signal(false);
  protected readonly isCollapsed = signal(true);

  constructor() {
    effect(() => {
      const type = this.recordTypeSignal();
      untracked(() => {
        const key = `detailed_records_for_${type}_are_collapsed`;
        const stored = this.localStorageService.getPreference(key);
        this.isCollapsed.set(stored !== null ? stored === 'true' : true);
      });
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
    const years = new Set(this.recordsSignal().map((r) => new Date(r.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  });

  protected filteredRecords = computed(() =>
    filterDetailedRecords(this.recordsSignal(), {
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

  protected displayedRecords = computed(() => {
    const sorted = sortDetailedRecords(
      this.filteredRecords(),
      this.sortOption(),
      this.calculateTotalFnSignal(),
    );
    return sorted.slice(
      (this.currentPage() - 1) * this.paginationSize(),
      this.currentPage() * this.paginationSize(),
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

  protected isYearDisabled(year: number): boolean {
    return isYearDisabledForRange(year, this.startDate(), this.endDate());
  }

  protected isMonthDisabled(monthIndex: number): boolean {
    const start = this.startDate();
    const end = this.endDate();
    const year = this.searchYear();

    if (year !== null) {
      return isMonthDisabledForYear(monthIndex, year, start, end);
    }

    if (start && end) {
      return isMonthDisabledForRange(monthIndex, start, end);
    }

    return false;
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
    const key = `detailed_records_for_${this.recordTypeSignal()}_are_collapsed`;
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
