import { Component, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../pipes/translate.pipe';
import { STORAGE_SERVICE } from '../services/storage.service';
import { FileStorageService } from '../services/file-storage.service';
import { LanguageService } from '../services/language.service';
import { LucideAngularModule, ArrowLeft, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-angular';
import { ConsumptionChartComponent, type ChartView } from '../shared/consumption-chart/consumption-chart.component';


export interface HeatingRecord {
  date: Date;
  livingRoom: number;
  bedroom: number;
  kitchen: number;
  bathroom: number;
}

@Component({
  selector: 'app-heating',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, TranslatePipe, LucideAngularModule, ConsumptionChartComponent],
  templateUrl: './heating.component.html',
  styleUrl: './heating.component.scss'
})
export class HeatingComponent {
  private storage = inject(STORAGE_SERVICE);
  private fileStorage = inject(FileStorageService);
  private languageService = inject(LanguageService);

  protected readonly ArrowLeftIcon = ArrowLeft;
  protected readonly ChevronDownIcon = ChevronDown;
  protected readonly ChevronLeftIcon = ChevronLeft;
  protected readonly ChevronRightIcon = ChevronRight;

  protected records = signal<HeatingRecord[]>([]);
  protected nextSunday = signal<Date>(this.calculateNextSunday());
  protected chartView = signal<ChartView>('total');

  protected livingRoom = signal<number | null>(null);
  protected bedroom = signal<number | null>(null);
  protected kitchen = signal<number | null>(null);
  protected bathroom = signal<number | null>(null);

  // Pagination
  protected currentPage = signal<number>(1);
  protected paginationSize = signal<number>(5);
  protected sortOption = signal<'date-desc' | 'date-asc' | 'total-desc' | 'total-asc' | 'livingRoom-desc' | 'bedroom-desc' | 'kitchen-desc' | 'bathroom-desc'>('date-desc');

  protected allFieldsFilled = computed(() =>
    this.livingRoom() !== null &&
    this.bedroom() !== null &&
    this.kitchen() !== null &&
    this.bathroom() !== null
  );

  protected displayedRecords = computed(() => {
    const records = [...this.records()];
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
        case 'livingRoom-desc':
          return b.livingRoom - a.livingRoom;
        case 'bedroom-desc':
          return b.bedroom - a.bedroom;
        case 'kitchen-desc':
          return b.kitchen - a.kitchen;
        case 'bathroom-desc':
          return b.bathroom - a.bathroom;
        default:
          return 0;
      }
    });

    // Limit records based on current page and pagination size
    return records.slice((this.currentPage() - 1) * this.paginationSize(), this.currentPage() * this.paginationSize());
  });

  protected totalPages = computed(() => {
    return Math.ceil(this.records().length / this.paginationSize());
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
      .replace('{total}', this.records().length.toString());
  });

  protected onChartViewChange = (view: ChartView): void => {
    this.chartView.set(view);
  };

  constructor() {
    this.loadData();
  }

  private async loadData() {
    const records = await this.storage.load<HeatingRecord[]>('heating_consumption_records');
    if (records) {
      const parsedRecords = records.map(r => ({ ...r, date: new Date(r.date) }));
      this.records.set(parsedRecords);
    }
  }

  async exportData() {
    const allData = await this.storage.exportAll();
    this.fileStorage.exportToFile(allData, `heating-consumption-${new Date().toISOString().split('T')[0]}.json`);
  }

  async importData(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      try {
        const data = await this.fileStorage.importFromFile(file);
        await this.storage.importAll(data);
        await this.loadData();
        input.value = '';
      } catch (error) {
        console.error('Error importing data:', error);
        alert('Failed to import data. Please check the file format.');
      }
    }
  }

  private calculateNextSunday(): Date {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    nextSunday.setHours(0, 0, 0, 0);
    return nextSunday;
  }

  protected calculateTotal(record: HeatingRecord): number {
    return record.livingRoom + record.bedroom + record.kitchen + record.bathroom;
  }

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
    this.sortOption.set(option as typeof this.sortOption extends () => infer T ? T : never);
  }

  protected saveRecord() {
    if (this.allFieldsFilled()) {
      this.records.update((records: HeatingRecord[]) => [
        ...records,
        {
          date: this.nextSunday(),
          livingRoom: this.livingRoom()!,
          bedroom: this.bedroom()!,
          kitchen: this.kitchen()!,
          bathroom: this.bathroom()!
        }
      ]);

      void this.storage.save('heating_consumption_records', this.records());

      const currentSunday = this.nextSunday();
      const nextDate = new Date(currentSunday);
      nextDate.setDate(currentSunday.getDate() + 7);
      this.nextSunday.set(nextDate);

      this.livingRoom.set(null);
      this.bedroom.set(null);
      this.kitchen.set(null);
      this.bathroom.set(null);
    }
  }
}
