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
  HelpCircle,
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

// Re-export for consumers
export type { ConsumptionRecord } from '../../models/records.model';

// Generic record interface - any record with a date
// Index signature allows bracket notation access for water-specific fallback in template
export interface GenericRecord {
  date: Date;
  kitchenWarm?: number;
  kitchenCold?: number;
  bathroomWarm?: number;
  bathroomCold?: number;
  value?: number;
  rooms?: Record<string, number>;
}

// Sort option interface for configurable sorting
export interface SortOptionConfig {
  value: string;
  labelKey: string;
  direction: '↑' | '↓';
}

export type SortOption = string; // Now generic string instead of union

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
  private languageService = inject(LanguageService);
  private localStorageService = inject(LocalStorageService);

  // Icons
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
  protected readonly HelpIcon = HelpCircle;
  protected readonly ResetIcon = RotateCcw;
  protected readonly ChevronUpIcon = ChevronUp;

  // Inputs - generic to support any record type with date
  @Input() set records(val: GenericRecord[]) {
    this.recordsSignal.set(val || []);
  }
  get records(): GenericRecord[] {
    return this.recordsSignal();
  }
  protected recordsSignal = signal<GenericRecord[]>([]);

  @Input() set defaultSortOption(val: SortOption) {
    this.defaultSortOptionSignal.set(val || 'date-desc');
    this.sortOption.set(val || 'date-desc');
  }
  get defaultSortOption(): SortOption {
    return this.defaultSortOptionSignal();
  }
  protected defaultSortOptionSignal = signal<SortOption>('date-desc');

  @Input() set showSearchDate(val: boolean) {
    this.showSearchDateSignal.set(val);
  }
  get showSearchDate(): boolean {
    return this.showSearchDateSignal();
  }
  protected showSearchDateSignal = signal<boolean>(true);

  @Input() set showYearMonth(val: boolean) {
    this.showYearMonthSignal.set(val);
  }
  get showYearMonth(): boolean {
    return this.showYearMonthSignal();
  }
  protected showYearMonthSignal = signal<boolean>(true);

  @Input() set showEditDelete(val: boolean) {
    this.showEditDeleteSignal.set(val);
  }
  get showEditDelete(): boolean {
    return this.showEditDeleteSignal();
  }
  protected showEditDeleteSignal = signal<boolean>(true);

  @Input() set recordType(val: string) {
    this.recordTypeSignal.set(val || 'water');
  }
  get recordType(): string {
    return this.recordTypeSignal();
  }
  protected recordTypeSignal = signal<string>('water');

  @Input() set helpTitleKey(val: string) {
    this.helpTitleKeySignal.set(val || 'HOME.RECORDS_HELP_TITLE');
  }
  get helpTitleKey(): string {
    return this.helpTitleKeySignal();
  }
  protected helpTitleKeySignal = signal<string>('HOME.RECORDS_HELP_TITLE');

  @Input() set helpSteps(val: HelpStep[]) {
    this.helpStepsSignal.set(val || []);
  }
  get helpSteps(): HelpStep[] {
    return this.helpStepsSignal();
  }
  protected helpStepsSignal = signal<HelpStep[]>([]);

  @Input() set showTotal(val: boolean) {
    this.showTotalSignal.set(val);
  }
  get showTotal(): boolean {
    return this.showTotalSignal();
  }
  protected showTotalSignal = signal<boolean>(true);

  @Input() set totalLabelKey(val: string) {
    this.totalLabelKeySignal.set(val || 'HOME.TOTAL');
  }
  get totalLabelKey(): string {
    return this.totalLabelKeySignal();
  }
  protected totalLabelKeySignal = signal<string>('HOME.TOTAL');

  @Input() set hasDetails(val: boolean) {
    this.hasDetailsSignal.set(val);
  }
  get hasDetails(): boolean {
    return this.hasDetailsSignal();
  }
  protected hasDetailsSignal = signal<boolean>(true);

  @Input() set allowCollapse(val: boolean) {
    this.allowCollapseSignal.set(val);
  }
  get allowCollapse(): boolean {
    return this.allowCollapseSignal();
  }
  protected allowCollapseSignal = signal<boolean>(true);

  // Configurable sort options - parent provides these
  @Input() set sortOptions(val: SortOptionConfig[]) {
    this.sortOptionsSignal.set(val || []);
  }
  get sortOptions(): SortOptionConfig[] {
    return this.sortOptionsSignal();
  }
  protected sortOptionsSignal = signal<SortOptionConfig[]>([
    { value: 'date-desc', labelKey: 'HOME.SORT.DATE_DESC', direction: '↓' },
    { value: 'date-asc', labelKey: 'HOME.SORT.DATE_ASC', direction: '↑' },
    { value: 'total-desc', labelKey: 'HOME.SORT.TOTAL_DESC', direction: '↓' },
    { value: 'total-asc', labelKey: 'HOME.SORT.TOTAL_ASC', direction: '↑' },
    { value: 'kitchen-desc', labelKey: 'HOME.SORT.KITCHEN_DESC', direction: '↓' },
    { value: 'kitchen-asc', labelKey: 'HOME.SORT.KITCHEN_ASC', direction: '↑' },
    { value: 'bathroom-desc', labelKey: 'HOME.SORT.BATHROOM_DESC', direction: '↓' },
    { value: 'bathroom-asc', labelKey: 'HOME.SORT.BATHROOM_ASC', direction: '↑' },
  ]);

  // Callback for calculating total - parent provides record-specific logic
  @Input() set calculateTotalFn(val: (record: GenericRecord) => number) {
    this.calculateTotalFnSignal.set(val || (() => 0));
  }
  get calculateTotalFn(): (record: GenericRecord) => number {
    return this.calculateTotalFnSignal();
  }
  protected calculateTotalFnSignal = signal<(record: GenericRecord) => number>(() => 0);

  // Configurable note about values (e.g., "All values in liters" vs "All values in kWh")
  @Input() set valuesNoteKey(val: string) {
    this.valuesNoteKeySignal.set(val || 'HOME.ALL_VALUES_IN_LITERS');
  }
  get valuesNoteKey(): string {
    return this.valuesNoteKeySignal();
  }
  protected valuesNoteKeySignal = signal<string>('HOME.ALL_VALUES_IN_LITERS');

  // Content projection for record details template
  @ContentChild('recordDetails') recordDetailsTemplate!: TemplateRef<{ $implicit: GenericRecord }>;

  // Outputs - generic
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

  // State
  protected startDate = signal<string | null>(null);
  protected endDate = signal<string | null>(null);
  protected searchYear = signal<number | null>(null);
  protected searchMonth = signal<number | null>(null);
  protected currentPage = signal<number>(1);
  protected paginationSize = signal<number>(5);
  protected sortOption = signal<SortOption>('date-desc');
  protected showHelpModal = signal(false);
  protected isCollapsed = signal(true); // Will be initialized in constructor

  constructor() {
    // Reactively load collapsed state when recordType changes
    effect(() => {
      const type = this.recordTypeSignal();
      untracked(() => {
        const key = `detailed_records_for_${type}_are_collapsed`;
        const stored = this.localStorageService.getPreference(key);
        // If stored is null, default to true (collapsed)
        this.isCollapsed.set(stored !== null ? stored === 'true' : true);
      });
    });

    // Emit filtered records and filter state whenever they change
    effect(() => {
      const filtered = this.filteredRecords();
      this.filteredRecordsChange.emit(filtered);
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

  // Removed getInitialCollapsedState as it's now handled by the effect

  // Computed properties
  protected currentLang = computed(() => this.languageService.currentLang());

  protected availableYears = computed(() => {
    const years = new Set(this.recordsSignal().map((r) => new Date(r.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  });

  protected filteredRecords = computed(() => {
    const startDate = this.startDate();
    const endDate = this.endDate();
    const searchYear = this.searchYear();
    const searchMonth = this.searchMonth();
    let records = this.recordsSignal();

    if (startDate) {
      records = records.filter((r) => {
        const date = new Date(r.date);
        const recordDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return recordDate >= startDate;
      });
    }

    if (endDate) {
      records = records.filter((r) => {
        const date = new Date(r.date);
        const recordDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return recordDate <= endDate;
      });
    }

    if (searchYear) {
      records = records.filter((r) => new Date(r.date).getFullYear() === searchYear);
    }

    if (searchMonth !== null) {
      records = records.filter((r) => new Date(r.date).getMonth() === searchMonth);
    }

    return records;
  });

  protected isFilterActive = computed(() => {
    return (
      this.startDate() !== null ||
      this.endDate() !== null ||
      this.searchYear() !== null ||
      this.searchMonth() !== null
    );
  });

  protected displayedRecords = computed(() => {
    const records = [...this.filteredRecords()];
    const sortOption = this.sortOption();
    const calculateTotal = this.calculateTotalFnSignal();

    // Sort records using generic approach
    records.sort((a, b) => {
      if (sortOption === 'date-desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortOption === 'date-asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortOption === 'total-desc') {
        return calculateTotal(b) - calculateTotal(a);
      }
      if (sortOption === 'total-asc') {
        return calculateTotal(a) - calculateTotal(b);
      }
      // For water-specific sorts, fall back to legacy functions if record has required properties
      if (sortOption === 'kitchen-desc' && 'kitchenWarm' in a) {
        return (
          calculateKitchenTotal(b as unknown as ConsumptionRecord) -
          calculateKitchenTotal(a as unknown as ConsumptionRecord)
        );
      }
      if (sortOption === 'kitchen-asc' && 'kitchenWarm' in a) {
        return (
          calculateKitchenTotal(a as unknown as ConsumptionRecord) -
          calculateKitchenTotal(b as unknown as ConsumptionRecord)
        );
      }
      if (sortOption === 'bathroom-desc' && 'bathroomWarm' in a) {
        return (
          calculateBathroomTotal(b as unknown as ConsumptionRecord) -
          calculateBathroomTotal(a as unknown as ConsumptionRecord)
        );
      }
      if (sortOption === 'bathroom-asc' && 'bathroomWarm' in a) {
        return (
          calculateBathroomTotal(a as unknown as ConsumptionRecord) -
          calculateBathroomTotal(b as unknown as ConsumptionRecord)
        );
      }
      return 0;
    });

    // Limit records based on current page and pagination size
    return records.slice(
      (this.currentPage() - 1) * this.paginationSize(),
      this.currentPage() * this.paginationSize(),
    );
  });

  protected totalPages = computed(() => {
    return Math.ceil(this.filteredRecords().length / this.paginationSize());
  });

  protected pageOfText = computed(() => {
    return this.languageService.translate('HOME.PAGE_OF', {
      current: this.currentPage(),
      total: this.totalPages(),
    });
  });

  protected showingRecordsText = computed(() => {
    return this.languageService.translate('HOME.SHOWING_RECORDS', {
      current: this.displayedRecords().length,
      total: this.filteredRecords().length,
    });
  });

  // Filter Constraint Helpers
  protected isYearDisabled(year: number): boolean {
    const start = this.startDate();
    const end = this.endDate();

    if (start) {
      const startYear = new Date(start).getFullYear();
      if (year < startYear) return true;
    }

    if (end) {
      const endYear = new Date(end).getFullYear();
      if (year > endYear) return true;
    }

    return false;
  }

  protected isMonthDisabled(monthIndex: number): boolean {
    const start = this.startDate();
    const end = this.endDate();
    const year = this.searchYear();

    // If year is selected, check constraints against that specific year
    if (year !== null) {
      if (start) {
        const startDate = new Date(start);
        if (year < startDate.getFullYear()) return true;
        if (year === startDate.getFullYear() && monthIndex < startDate.getMonth()) return true;
      }

      if (end) {
        const endDate = new Date(end);
        if (year > endDate.getFullYear()) return true;
        if (year === endDate.getFullYear() && monthIndex > endDate.getMonth()) return true;
      }
      return false;
    }

    // If NO year is selected, we only disable if the range is stricly within a partial year span
    // For example: Range Jan 2024 - Mar 2024 (3 months)
    // Then months April-Dec should be disabled because they can't possibly match anything in that range.
    // But if Range is Nov 2023 - Feb 2024, then Nov, Dec, Jan, Feb are valid.

    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);

      // Calculate month difference
      const monthsDiff =
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());

      // If range covers 12 months or more, all months are valid
      if (monthsDiff >= 11) return false;

      // If range is within the same year
      if (startDate.getFullYear() === endDate.getFullYear()) {
        return monthIndex < startDate.getMonth() || monthIndex > endDate.getMonth();
      }

      // If range spans across adjacent years (e.g. Nov 2023 - Feb 2024)
      // This is tricky without a year selected.
      // A record in "March" could be March 2023 (outside) or March 2024 (outside).
      // But if user didn't pick a year, they usually mean "Month X in ANY year within range".
      // If the range is small (e.g. 2 months), likely they only want those 2 months.

      // Simplified Logic as per plan:
      // If spans < 12 months, check if monthIndex is roughly inside the varying window.
      // Actually simpler:
      // If (monthIndex < startMonth AND monthIndex > endMonth) -> potentially disabled?
      // No, because of wrap around.
      // Example: Nov(10) to Feb(1). Valid: 10,11, 0, 1. Invalid: 2..9.

      const startMonth = startDate.getMonth();
      const endMonth = endDate.getMonth();

      if (startDate.getFullYear() < endDate.getFullYear()) {
        // Spans year boundary. Valid months are [startMonth...11] AND [0...endMonth]
        // Invalid are (endMonth ... startMonth)
        return monthIndex > endMonth && monthIndex < startMonth;
      }
    }

    return false;
  }

  // Helper methods - using shared utility functions
  protected calculateTotal(record: ConsumptionRecord): number {
    return calculateWaterTotal(record);
  }

  protected calculateKitchenTotal(record: ConsumptionRecord): number {
    return calculateKitchenTotal(record);
  }

  protected calculateBathroomTotal(record: ConsumptionRecord): number {
    return calculateBathroomTotal(record);
  }

  // Pagination methods
  protected nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((page) => page + 1);
    }
  }

  protected prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((page) => page - 1);
    }
  }

  protected onPaginationSizeChange(size: number) {
    this.paginationSize.set(size);
    this.currentPage.set(1); // Reset to first page when changing page size
  }

  protected setSortOption(option: unknown) {
    this.sortOption.set(option as SortOption);
  }

  // Event emitters
  protected onEditRecord(record: GenericRecord) {
    this.editRecord.emit(record);
  }

  protected onDeleteRecord(record: GenericRecord) {
    this.deleteRecord.emit(record);
  }

  protected onDeleteAllRecords() {
    this.deleteAllRecords.emit(this.filteredRecords());
  }

  protected showHelp() {
    this.showHelpModal.set(true);
  }

  protected closeHelp() {
    this.showHelpModal.set(false);
  }

  protected toggleCollapse() {
    this.isCollapsed.update((v) => !v);
    const key = `detailed_records_for_${this.recordTypeSignal()}_are_collapsed`;
    this.localStorageService.setPreference(key, String(this.isCollapsed()));
  }

  protected resetFilters() {
    this.startDate.set(null);
    this.endDate.set(null);
    this.searchYear.set(null);
    this.searchMonth.set(null);
    this.currentPage.set(1);
  }
}
