import { Component, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../pipes/translate.pipe';
import { LanguageSwitcherComponent } from '../components/language-switcher/language-switcher.component';
import { STORAGE_SERVICE } from '../services/storage.service';
import { FileStorageService } from '../services/file-storage.service';
import { LanguageService } from '../services/language.service';
import { LucideAngularModule, Settings, TriangleAlert, ChevronDown, ChevronLeft, ChevronRight, Upload } from 'lucide-angular';
import { ConsumptionChartComponent, type ChartView, type DisplayMode } from '../shared/consumption-chart/consumption-chart.component';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';
import { ErrorModalComponent } from '../shared/error-modal/error-modal.component';
import { ConsumptionRecord, calculateWaterTotal, calculateKitchenTotal, calculateBathroomTotal } from '../models/records.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, TranslatePipe, LucideAngularModule, ConsumptionChartComponent, ConfirmationModalComponent, ErrorModalComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  private storage = inject(STORAGE_SERVICE);
  private fileStorage = inject(FileStorageService);
  private languageService = inject(LanguageService);

  protected readonly SettingsIcon = Settings;
  protected readonly TriangleAlertIcon = TriangleAlert;
  protected readonly ChevronDownIcon = ChevronDown;
  protected readonly ChevronLeftIcon = ChevronLeft;
  protected readonly ChevronRightIcon = ChevronRight;
  protected readonly UploadIcon = Upload;

  protected showImportConfirmModal = signal(false);
  protected pendingImportFile = signal<File | null>(null);

  // Error modal state
  protected showImportErrorModal = signal(false);
  protected importErrorMessage = signal('');
  protected importErrorInstructions = signal<string[]>([]);

  protected records = signal<ConsumptionRecord[]>([]);
  protected nextSunday = signal<Date>(this.calculateNextSunday());
  protected chartView = signal<ChartView>('total');
  protected displayMode = signal<DisplayMode>('total');
  protected kitchenWarm = signal<number | null>(null);
  protected kitchenCold = signal<number | null>(null);
  protected bathroomWarm = signal<number | null>(null);
  protected bathroomCold = signal<number | null>(null);
  protected errorMessage = signal<string | null>(null);

  // Pagination
  protected currentPage = signal<number>(1);
  protected paginationSize = signal<number>(5);
  protected sortOption = signal<'date-desc' | 'date-asc' | 'total-desc' | 'total-asc' | 'kitchen-desc' | 'kitchen-asc' | 'bathroom-desc' | 'bathroom-asc'>('date-desc');

  protected hasValidInput = computed(() => {
    const kw = this.kitchenWarm() !== null;
    const kc = this.kitchenCold() !== null;
    const bw = this.bathroomWarm() !== null;
    const bc = this.bathroomCold() !== null;

    const kitchenValid = kw === kc; // Both set or both null
    const bathroomValid = bw === bc; // Both set or both null
    const atLeastOneSet = (kw && kc) || (bw && bc);

    return kitchenValid && bathroomValid && atLeastOneSet;
  });

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

  protected onDisplayModeChange = (mode: DisplayMode): void => {
    this.displayMode.set(mode);
  };

  constructor() {
    this.loadData();
  }

  private async loadData() {
    const records = await this.storage.load<ConsumptionRecord[]>('consumption_records');
    if (records) {
      const parsedRecords = records.map(r => ({ ...r, date: new Date(r.date) }));
      this.records.set(parsedRecords);
    }
  }

  async exportData() {
    const records = await this.storage.exportRecords('consumption_records');
    const dateStr = new Date().toISOString().split('T')[0];
    this.fileStorage.exportToFile(records, `consumption-records-${dateStr}.json`);
  }

  async importData(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.pendingImportFile.set(file);
      this.showImportConfirmModal.set(true);
      input.value = ''; // Reset input so same file can be selected again
    }
  }

  async confirmImport() {
    const file = this.pendingImportFile();
    if (file) {
      try {
        const data = await this.fileStorage.importFromFile(file);
        // Validate imported data is an array of consumption records
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format: expected an array of records');
        }
        // Validate each record has required fields
        const isValidRecords = data.every(record =>
          record &&
          typeof record === 'object' &&
          'date' in record &&
          'kitchenWarm' in record &&
          'kitchenCold' in record &&
          'bathroomWarm' in record &&
          'bathroomCold' in record
        );
        if (!isValidRecords) {
          throw new Error('Invalid record structure');
        }
        await this.storage.importRecords('consumption_records', data);
        await this.loadData();
      } catch (error) {
        console.error('Error importing data:', error);
        this.importErrorMessage.set(this.languageService.translate('HOME.IMPORT_INVALID_DATA'));
        this.importErrorInstructions.set([
          'HOME.IMPORT_ERROR_INSTRUCTION_1',
          'HOME.IMPORT_ERROR_INSTRUCTION_2',
          'HOME.IMPORT_ERROR_INSTRUCTION_3'
        ]);
        this.showImportErrorModal.set(true);
      }
    }
    this.showImportConfirmModal.set(false);
    this.pendingImportFile.set(null);
  }

  cancelImport() {
    this.showImportConfirmModal.set(false);
    this.pendingImportFile.set(null);
  }

  closeImportErrorModal() {
    this.showImportErrorModal.set(false);
    this.importErrorMessage.set('');
    this.importErrorInstructions.set([]);
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

  protected calculateTotal(record: ConsumptionRecord): number {
    return calculateWaterTotal(record);
  }

  protected calculateKitchenTotal(record: ConsumptionRecord): number {
    return calculateKitchenTotal(record);
  }

  protected calculateBathroomTotal(record: ConsumptionRecord): number {
    return calculateBathroomTotal(record);
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
    // Check for specific validation failures
    const kw = this.kitchenWarm() !== null;
    const kc = this.kitchenCold() !== null;
    const bw = this.bathroomWarm() !== null;
    const bc = this.bathroomCold() !== null;

    const kitchenComplete = kw && kc;
    const kitchenEmpty = !kw && !kc;
    const kitchenPartial = !kitchenComplete && !kitchenEmpty;

    const bathroomComplete = bw && bc;
    const bathroomEmpty = !bw && !bc;
    const bathroomPartial = !bathroomComplete && !bathroomEmpty;

    if (kitchenPartial || bathroomPartial) {
      this.errorMessage.set('HOME.INCOMPLETE_ROOM_ERROR');
      return;
    }

    if (!kitchenComplete && !bathroomComplete) {
      this.errorMessage.set('HOME.PARTIAL_INPUT_ERROR');
      return;
    }

    this.records.update((records: ConsumptionRecord[]) => [
      ...records,
      {
        date: this.nextSunday(),
        kitchenWarm: this.kitchenWarm() || 0,
        kitchenCold: this.kitchenCold() || 0,
        bathroomWarm: this.bathroomWarm() || 0,
        bathroomCold: this.bathroomCold() || 0
      }
    ]);

    void this.storage.save('consumption_records', this.records());

    const currentSunday = this.nextSunday();
    const nextDate = new Date(currentSunday);
    nextDate.setDate(currentSunday.getDate() + 7);
    this.nextSunday.set(nextDate);

    this.kitchenWarm.set(null);
    this.kitchenCold.set(null);
    this.bathroomWarm.set(null);
    this.bathroomCold.set(null);
    this.errorMessage.set(null);
  }
}
