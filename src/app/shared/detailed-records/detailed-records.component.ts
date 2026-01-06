import { Component, signal, computed, input, output, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { LucideAngularModule, Edit, Trash2, Calendar, Info, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CalendarDays, ArrowUpDown, HelpCircle, RotateCcw } from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { DatePickerComponent } from '../date-picker/date-picker.component';
import { HelpModalComponent, HelpStep } from '../help-modal/help-modal.component';
import { LanguageService } from '../../services/language.service';
import { LocalStorageService } from '../../services/local-storage.service';

import { ConsumptionRecord, calculateWaterTotal, calculateKitchenTotal, calculateBathroomTotal } from '../../models/records.model';

// Re-export for consumers
export type { ConsumptionRecord } from '../../models/records.model';

export type SortOption = 'date-desc' | 'date-asc' | 'total-desc' | 'total-asc' | 'kitchen-desc' | 'kitchen-asc' | 'bathroom-desc' | 'bathroom-asc';

@Component({
  selector: 'app-detailed-records',
  standalone: true,
  imports: [FormsModule, DatePipe, LucideAngularModule, TranslatePipe, DatePickerComponent, HelpModalComponent],
  templateUrl: './detailed-records.component.html',
  styleUrl: './detailed-records.component.scss'
})
export class DetailedRecordsComponent {
  private languageService = inject(LanguageService);
  private localStorageService = inject(LocalStorageService);

  // Icons
  protected readonly EditIcon = Edit;
  protected readonly TrashIcon = Trash2;
  protected readonly CalendarIcon = Calendar;
  protected readonly InfoIcon = Info;
  protected readonly ChevronDownIcon = ChevronDown;
  protected readonly ChevronLeftIcon = ChevronLeft;
  protected readonly ChevronRightIcon = ChevronRight;
  protected readonly CalendarDaysIcon = CalendarDays;
  protected readonly ArrowUpDownIcon = ArrowUpDown;
  protected readonly HelpIcon = HelpCircle;
  protected readonly ResetIcon = RotateCcw;
  protected readonly ChevronUpIcon = ChevronUp;

  // Inputs
  records = input.required<ConsumptionRecord[]>();
  defaultSortOption = input<SortOption>('date-desc');
  showSearchDate = input<boolean>(true);
  showYearMonth = input<boolean>(true);
  showEditDelete = input<boolean>(true);
  recordType = input<string>('water');
  helpTitleKey = input<string>('HOME.RECORDS_HELP_TITLE');
  helpSteps = input<HelpStep[]>([]);

  // Outputs
  editRecord = output<ConsumptionRecord>();
  deleteRecord = output<ConsumptionRecord>();
  deleteAllRecords = output<ConsumptionRecord[]>();
  filteredRecordsChange = output<ConsumptionRecord[]>();
  filterStateChange = output<{ year: number | null; month: number | null; startDate: string | null; endDate: string | null }>();

  // State
  protected startDate = signal<string | null>(null);
  protected endDate = signal<string | null>(null);
  protected searchYear = signal<number | null>(null);
  protected searchMonth = signal<number | null>(null);
  protected currentPage = signal<number>(1);
  protected paginationSize = signal<number>(5);
  protected sortOption = signal<SortOption>('date-desc');
  protected showHelpModal = signal(false);
  protected isCollapsed = signal(this.getInitialCollapsedState());

  constructor() {
    // Initialize sort option from input
    this.sortOption.set(this.defaultSortOption());

    // Save collapsed state whenever it changes
    effect(() => {
      this.localStorageService.setPreference('detailed_records_are_collapsed', String(this.isCollapsed()));
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
        endDate: this.endDate()
      });
    });
  }

  private getInitialCollapsedState(): boolean {
    const stored = this.localStorageService.getPreference('detailed_records_are_collapsed');
    return stored !== null ? stored === 'true' : true; // Default to collapsed (true)
  }

  // Computed properties
  protected currentLang = computed(() => this.languageService.currentLang());

  protected availableYears = computed(() => {
    const years = new Set(this.records().map(r => new Date(r.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  });

  protected filteredRecords = computed(() => {
    const startDate = this.startDate();
    const endDate = this.endDate();
    const searchYear = this.searchYear();
    const searchMonth = this.searchMonth();
    let records = this.records();

    if (startDate) {
      records = records.filter(r => {
        const date = new Date(r.date);
        const recordDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return recordDate >= startDate;
      });
    }

    if (endDate) {
      records = records.filter(r => {
        const date = new Date(r.date);
        const recordDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return recordDate <= endDate;
      });
    }

    if (searchYear) {
      records = records.filter(r => new Date(r.date).getFullYear() === searchYear);
    }

    if (searchMonth !== null) {
      records = records.filter(r => new Date(r.date).getMonth() === searchMonth);
    }

    return records;
  });

  protected isFilterActive = computed(() => {
    return this.startDate() !== null ||
      this.endDate() !== null ||
      this.searchYear() !== null ||
      this.searchMonth() !== null;
  });

  protected displayedRecords = computed(() => {
    const records = [...this.filteredRecords()];
    const sortOption = this.sortOption();

    // Sort records
    records.sort((a, b) => {
      switch (sortOption) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'total-desc':
          return this.calculateTotal(b) - this.calculateTotal(a);
        case 'total-asc':
          return this.calculateTotal(a) - this.calculateTotal(b);
        case 'kitchen-desc':
          return this.calculateKitchenTotal(b) - this.calculateKitchenTotal(a);
        case 'kitchen-asc':
          return this.calculateKitchenTotal(a) - this.calculateKitchenTotal(b);
        case 'bathroom-desc':
          return this.calculateBathroomTotal(b) - this.calculateBathroomTotal(a);
        case 'bathroom-asc':
          return this.calculateBathroomTotal(a) - this.calculateBathroomTotal(b);
        default:
          return 0;
      }
    });

    // Limit records based on current page and pagination size
    return records.slice((this.currentPage() - 1) * this.paginationSize(), this.currentPage() * this.paginationSize());
  });

  protected totalPages = computed(() => {
    return Math.ceil(this.filteredRecords().length / this.paginationSize());
  });

  protected pageOfText = computed(() => {
    const key = 'HOME.PAGE_OF';
    const template = this.languageService.translate(key);
    return template
      .replace('{current}', this.currentPage().toString())
      .replace('{total}', this.totalPages().toString());
  });

  protected showingRecordsText = computed(() => {
    const key = 'HOME.SHOWING_RECORDS';
    const template = this.languageService.translate(key);
    return template
      .replace('{current}', this.displayedRecords().length.toString())
      .replace('{total}', this.filteredRecords().length.toString());
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
      const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());

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
      this.currentPage.update(page => page + 1);
    }
  }

  protected prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
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
  protected onEditRecord(record: ConsumptionRecord) {
    this.editRecord.emit(record);
  }

  protected onDeleteRecord(record: ConsumptionRecord) {
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

  protected resetFilters() {
    this.startDate.set(null);
    this.endDate.set(null);
    this.searchYear.set(null);
    this.searchMonth.set(null);
    this.currentPage.set(1);
  }
}
