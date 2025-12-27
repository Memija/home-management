import { Component, signal, computed, inject } from '@angular/core';
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
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, LucideAngularModule, ConsumptionChartComponent, ErrorModalComponent, ConfirmationModalComponent],
  templateUrl: './heating.component.html',
  styleUrl: './heating.component.scss'
})
export class HeatingComponent {
  private storage = inject(STORAGE_SERVICE);
  private fileStorage = inject(FileStorageService);
  private languageService = inject(LanguageService);
  protected excelService = inject(ExcelService);
  protected excelSettings = inject(ExcelSettingsService);

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

        // Validate imported data is an array
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format: expected an array of records');
        }

        if (data.length === 0) {
          throw new Error('The file is empty or has no data records.');
        }

        // Validate each record and collect errors
        const validationErrors: string[] = [];
        const validRecords: HeatingRecord[] = [];
        const seenDates = new Map<string, number>();

        for (let index = 0; index < data.length; index++) {
          const record = data[index];
          const rowNumber = index + 1;

          // Check record is an object
          if (!record || typeof record !== 'object') {
            validationErrors.push(`Record ${rowNumber}: Invalid record format`);
            continue;
          }

          // Check required fields exist
          if (!('date' in record)) {
            validationErrors.push(`Record ${rowNumber}: Missing 'date' field`);
            continue;
          }

          // Parse and validate date
          const dateValue = record.date;
          let parsedDate: Date | null = null;

          if (typeof dateValue === 'string') {
            parsedDate = new Date(dateValue);
            if (isNaN(parsedDate.getTime())) {
              validationErrors.push(`Record ${rowNumber}: Invalid date value '${dateValue}'`);
              continue;
            }
          } else if (dateValue instanceof Date) {
            parsedDate = dateValue;
          } else {
            validationErrors.push(`Record ${rowNumber}: Invalid date type`);
            continue;
          }

          // Check for duplicate dates (use local date to match display)
          const dateKey = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
          if (seenDates.has(dateKey)) {
            validationErrors.push(`Record ${rowNumber}: Duplicate date '${dateKey}' (first occurrence in record ${seenDates.get(dateKey)})`);
            continue;
          }
          seenDates.set(dateKey, rowNumber);

          // Validate numeric fields
          const numericFields = ['livingRoom', 'bedroom', 'kitchen', 'bathroom'];
          const rowErrors: string[] = [];
          const numericValues: Record<string, number> = {};

          for (const field of numericFields) {
            const value = record[field];
            if (value === undefined || value === null || value === '') {
              numericValues[field] = 0; // Default to 0 for missing
            } else if (typeof value === 'number' && !isNaN(value)) {
              numericValues[field] = value;
            } else if (typeof value === 'string') {
              const num = Number(value);
              if (isNaN(num)) {
                rowErrors.push(`Record ${rowNumber}: Invalid number value '${value}' for field '${field}'`);
              } else {
                numericValues[field] = num;
              }
            } else {
              rowErrors.push(`Record ${rowNumber}: Invalid type for field '${field}'`);
            }
          }

          if (rowErrors.length > 0) {
            validationErrors.push(...rowErrors);
            continue;
          }

          validRecords.push({
            date: parsedDate,
            livingRoom: numericValues['livingRoom'],
            bedroom: numericValues['bedroom'],
            kitchen: numericValues['kitchen'],
            bathroom: numericValues['bathroom']
          });
        }

        if (validationErrors.length > 0) {
          throw new Error(validationErrors.join('\n'));
        }

        await this.storage.importRecords('heating_consumption_records', validRecords);
        await this.loadData();
      } catch (error) {
        console.error('Error importing data:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';

        this.errorType.set('error');
        this.errorTitle.set(this.languageService.translate('HEATING.JSON_IMPORT_ERROR_TITLE'));
        this.errorMessage.set(this.languageService.translate('HEATING.JSON_IMPORT_ERROR'));
        this.errorDetails.set(errorMsg);

        // Provide specific instructions based on ALL error types present
        const instructions: string[] = [];

        if (errorMsg.includes('Invalid date')) {
          instructions.push(
            'ERROR.JSON_DATE_FIX_1',
            'ERROR.JSON_DATE_FIX_2'
          );
        }
        if (errorMsg.includes('Invalid number value')) {
          instructions.push(
            'ERROR.JSON_NUMBER_FIX_1',
            'ERROR.JSON_NUMBER_FIX_2'
          );
        }
        if (errorMsg.includes('Duplicate date')) {
          instructions.push(
            'ERROR.JSON_DUPLICATE_FIX_1',
            'ERROR.JSON_DUPLICATE_FIX_2'
          );
        }

        if (instructions.length === 0) {
          instructions.push(
            'HOME.IMPORT_ERROR_INSTRUCTION_1',
            'HOME.IMPORT_ERROR_INSTRUCTION_2',
            'HOME.IMPORT_ERROR_INSTRUCTION_3'
          );
        }

        this.errorInstructions.set(instructions);
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

        // Provide specific instructions based on ALL error types present
        const instructions: string[] = [];

        if (errorMsg.includes('Invalid date')) {
          instructions.push(
            'ERROR.EXCEL_DATE_FIX_1',
            'ERROR.EXCEL_DATE_FIX_2',
            'ERROR.EXCEL_DATE_FIX_3'
          );
        }
        if (errorMsg.includes('Invalid number value')) {
          instructions.push(
            'ERROR.EXCEL_NUMBER_FIX_1',
            'ERROR.EXCEL_NUMBER_FIX_2'
          );
        }
        if (errorMsg.includes('Duplicate date')) {
          instructions.push(
            'ERROR.EXCEL_DUPLICATE_FIX_1',
            'ERROR.EXCEL_DUPLICATE_FIX_2'
          );
        }
        if (errorMsg.includes('Missing required') && errorMsg.includes('column')) {
          instructions.push(
            'ERROR.EXCEL_COLUMN_FIX_1',
            'ERROR.EXCEL_COLUMN_FIX_2'
          );
        }

        // If no specific instructions matched, use generic ones
        if (instructions.length === 0) {
          instructions.push(
            'ERROR.EXCEL_GENERIC_FIX_1',
            'ERROR.EXCEL_GENERIC_FIX_2'
          );
        }

        this.errorInstructions.set(instructions);

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
