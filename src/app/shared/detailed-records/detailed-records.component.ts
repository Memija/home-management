import { Component, signal, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { LucideAngularModule, Edit, Trash2, Calendar, Info, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { DatePickerComponent } from '../date-picker/date-picker.component';
import { LanguageService } from '../../services/language.service';
import { inject } from '@angular/core';

export interface ConsumptionRecord {
  date: Date;
  kitchenWarm: number;
  kitchenCold: number;
  bathroomWarm: number;
  bathroomCold: number;
}

export type SortOption = 'date-desc' | 'date-asc' | 'total-desc' | 'total-asc' | 'kitchen-desc' | 'kitchen-asc' | 'bathroom-desc' | 'bathroom-asc';

@Component({
  selector: 'app-detailed-records',
  standalone: true,
  imports: [FormsModule, DatePipe, LucideAngularModule, TranslatePipe, DatePickerComponent],
  templateUrl: './detailed-records.component.html',
  styleUrl: './detailed-records.component.scss'
})
export class DetailedRecordsComponent {
  private languageService = inject(LanguageService);

  // Icons
  protected readonly EditIcon = Edit;
  protected readonly TrashIcon = Trash2;
  protected readonly CalendarIcon = Calendar;
  protected readonly InfoIcon = Info;
  protected readonly ChevronDownIcon = ChevronDown;
  protected readonly ChevronLeftIcon = ChevronLeft;
  protected readonly ChevronRightIcon = ChevronRight;

  // Inputs
  records = input.required<ConsumptionRecord[]>();
  defaultSortOption = input<SortOption>('date-desc');
  showSearchDate = input<boolean>(true);
  showYearMonth = input<boolean>(true);
  showEditDelete = input<boolean>(true);
  recordType = input<string>('water');

  // Outputs
  editRecord = output<ConsumptionRecord>();
  deleteRecord = output<ConsumptionRecord>();

  // State
  protected searchDate = signal<string | null>(null);
  protected searchYear = signal<number | null>(null);
  protected searchMonth = signal<number | null>(null);
  protected currentPage = signal<number>(1);
  protected paginationSize = signal<number>(5);
  protected sortOption = signal<SortOption>('date-desc');

  // Computed properties
  protected currentLang = computed(() => this.languageService.currentLang());

  protected availableYears = computed(() => {
    const years = new Set(this.records().map(r => new Date(r.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  });

  protected filteredRecords = computed(() => {
    const searchDate = this.searchDate();
    const searchYear = this.searchYear();
    const searchMonth = this.searchMonth();
    let records = this.records();

    if (searchDate) {
      records = records.filter(r => {
        const recordDate = new Date(r.date).toISOString().split('T')[0];
        return recordDate === searchDate;
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

  protected displayedRecords = computed(() => {
    const records = [...this.filteredRecords()];
    const sortOption = this.sortOption();

    // Sort records
    records.sort((a, b) => {
      switch (sortOption) {
        case 'date-desc':
          return b.date.getTime() - a.date.getTime();
        case 'date-asc':
          return a.date.getTime() - b.date.getTime();
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

  constructor() {
    // Initialize sort option from input
    this.sortOption.set(this.defaultSortOption());
  }

  // Helper methods
  protected calculateTotal(record: ConsumptionRecord): number {
    return record.kitchenWarm + record.kitchenCold + record.bathroomWarm + record.bathroomCold;
  }

  protected calculateKitchenTotal(record: ConsumptionRecord): number {
    return record.kitchenWarm + record.kitchenCold;
  }

  protected calculateBathroomTotal(record: ConsumptionRecord): number {
    return record.bathroomWarm + record.bathroomCold;
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
}
