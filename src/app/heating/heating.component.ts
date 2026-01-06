import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../pipes/translate.pipe';
import { STORAGE_SERVICE } from '../services/storage.service';
import { FileStorageService } from '../services/file-storage.service';
import { LanguageService } from '../services/language.service';
import { ExcelService } from '../services/excel.service';
import { ExcelSettingsService } from '../services/excel-settings.service';
import { LucideAngularModule, ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Download, Upload, FileSpreadsheet } from 'lucide-angular';
import { ConsumptionChartComponent, type ChartView, type DisplayMode } from '../shared/consumption-chart/consumption-chart.component';
import { ErrorModalComponent } from '../shared/error-modal/error-modal.component';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';
import { ImportValidationService } from '../services/import-validation.service';
import { HeatingRecord, calculateHeatingTotal } from '../models/records.model';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-heating',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, LucideAngularModule, ConsumptionChartComponent, ErrorModalComponent, ConfirmationModalComponent],
  templateUrl: './heating.component.html',
  styleUrl: './heating.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeatingComponent {
  private storage = inject(STORAGE_SERVICE);
  private fileStorage = inject(FileStorageService);
  private languageService = inject(LanguageService);
  protected excelService = inject(ExcelService);
  protected excelSettings = inject(ExcelSettingsService);
  private importValidationService = inject(ImportValidationService);
  private notificationService = inject(NotificationService);

  protected readonly ArrowLeftIcon = ArrowLeft;
  protected readonly ChevronDownIcon = ChevronDown;
  protected readonly ChevronLeftIcon = ChevronLeft;
  protected readonly ChevronRightIcon = ChevronRight;
  protected readonly DownloadIcon = Download;
  protected readonly UploadIcon = Upload;
  protected readonly FileSpreadsheetIcon = FileSpreadsheet;

  protected isExporting = signal(false);
  protected isImporting = signal(false);
  protected showErrorModal = signal(false);
  protected errorTitle = signal('ERROR.TITLE');
  protected errorMessage = signal('');
  protected errorDetails = signal('');
  protected errorInstructions = signal<string[]>([]);
  protected errorType = signal<'error' | 'warning'>('error');

  protected records = signal<HeatingRecord[]>([]);
  protected showImportConfirmModal = signal(false);
  protected pendingImportFile = signal<File | null>(null);
  protected nextSunday = signal<Date>(this.calculateNextSunday());
  protected chartView = signal<ChartView>('total');
  protected displayMode = signal<DisplayMode>('total');

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

  protected onDisplayModeChange = (mode: DisplayMode): void => {
    this.displayMode.set(mode);
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
    this.isExporting.set(true);
    try {
      const records = await this.storage.exportRecords('heating_consumption_records');
      const dateStr = new Date().toISOString().split('T')[0];
      this.fileStorage.exportToFile(records, `heating-records-${dateStr}.json`);
    } finally {
      this.isExporting.set(false);
    }
  }

  async exportToExcel() {
    this.isExporting.set(true);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      this.excelService.exportHeatingToExcel(
        this.records(),
        `heating-consumption-${dateStr}.xlsx`
      );
    } catch (error) {
      console.error('Excel export error:', error);
      alert(this.languageService.translate('HEATING.EXCEL_IMPORT_ERROR'));
    } finally {
      this.isExporting.set(false);
    }
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
      this.isImporting.set(true);
      try {
        const data = await this.fileStorage.importFromFile(file);

        // Validate data array
        const arrayError = this.importValidationService.validateDataArray(data);
        if (arrayError) {
          throw new Error(arrayError);
        }

        // Validate records
        const result = this.importValidationService.validateHeatingJsonImport(data as unknown[]);
        if (result.errors.length > 0) {
          throw new Error(result.errors.join('\n'));
        }

        await this.storage.importRecords('heating_consumption_records', result.validRecords);
        await this.loadData();
        // Update notification service
        this.notificationService.setHeatingRecords(this.records());
      } catch (error) {
        console.error('Error importing data:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';

        this.errorType.set('error');
        this.errorTitle.set(this.languageService.translate('HEATING.JSON_IMPORT_ERROR_TITLE'));
        this.errorMessage.set(this.languageService.translate('HEATING.JSON_IMPORT_ERROR'));
        this.errorDetails.set(errorMsg);
        this.errorInstructions.set(this.importValidationService.getJsonErrorInstructions(errorMsg));
        this.showErrorModal.set(true);
      } finally {
        this.isImporting.set(false);
      }
    }
    this.showImportConfirmModal.set(false);
    this.pendingImportFile.set(null);
  }

  cancelImport() {
    this.showImportConfirmModal.set(false);
    this.pendingImportFile.set(null);
  }

  async importFromExcel(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.isImporting.set(true);
      try {
        // Validate file type
        const validExtensions = ['.xlsx', '.xls', '.csv'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        if (!validExtensions.includes(fileExtension)) {
          throw new Error(`Invalid file type. Expected Excel file (.xlsx, .xls, .csv), got ${fileExtension}`);
        }

        const { records, missingColumns } = await this.excelService.importHeatingFromExcel(file);

        // Merge with existing records, avoiding duplicates by date
        this.records.update(existing => {
          const merged = [...existing, ...records];
          const uniqueMap = new Map<number, HeatingRecord>();
          merged.forEach(r => uniqueMap.set(r.date.getTime(), r));
          return Array.from(uniqueMap.values())
            .sort((a, b) => a.date.getTime() - b.date.getTime());
        });

        await this.storage.save('heating_consumption_records', this.records());
        // Update notification service
        this.notificationService.setHeatingRecords(this.records());
        input.value = '';

        if (missingColumns.length > 0) {
          this.errorTitle.set(this.languageService.translate('HOME.IMPORT_WARNING_TITLE'));
          this.errorMessage.set(this.languageService.translate('HOME.IMPORT_WARNING_MESSAGE'));
          this.errorDetails.set(this.languageService.translate('HOME.MISSING_COLUMNS') + ': ' + missingColumns.join(', '));
          this.errorInstructions.set([]);
          this.errorType.set('warning');
          this.showErrorModal.set(true);
        }
      } catch (error) {
        console.error('Excel import error:', error);
        this.errorType.set('error');
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';

        // Show detailed error modal with instructions
        this.errorTitle.set(this.languageService.translate('HEATING.EXCEL_IMPORT_ERROR_TITLE'));
        this.errorMessage.set(this.languageService.translate('HEATING.EXCEL_IMPORT_ERROR'));
        this.errorDetails.set(errorMsg);
        this.errorInstructions.set(this.importValidationService.getExcelErrorInstructions(errorMsg));

        this.showErrorModal.set(true);
      } finally {
        this.isImporting.set(false);
        input.value = ''; // Reset input to allow re-importing same file
      }
    }
  }

  protected closeErrorModal() {
    this.showErrorModal.set(false);
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
    return calculateHeatingTotal(record);
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
      // Update notification service
      this.notificationService.setHeatingRecords(this.records());

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
