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
import { HeatingFormService } from '../services/heating-form.service';
import { HeatingRoomsService, HeatingRoomConfig } from '../services/heating-rooms.service';
import { LucideAngularModule, ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Download, Upload, FileSpreadsheet, Settings } from 'lucide-angular';
import { ConsumptionChartComponent, type ChartView, type DisplayMode } from '../shared/consumption-chart/consumption-chart.component';
import { ConsumptionInputComponent, type ConsumptionData, type ConsumptionGroup } from '../shared/consumption-input/consumption-input.component';
import { ErrorModalComponent } from '../shared/error-modal/error-modal.component';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';
import { HeatingRoomsModalComponent } from '../shared/heating-rooms-modal/heating-rooms-modal.component';
import { ImportValidationService } from '../services/import-validation.service';
import { DynamicHeatingRecord, HeatingRecord, calculateDynamicHeatingTotal, filterZeroPlaceholders, isDynamicHeatingRecordAllZero, isHeatingRecordAllZero, toHeatingRecord, toDynamicHeatingRecord } from '../models/records.model';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-heating',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, LucideAngularModule, ConsumptionChartComponent, ConsumptionInputComponent, ErrorModalComponent, ConfirmationModalComponent, HeatingRoomsModalComponent],
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
  protected formService = inject(HeatingFormService);
  protected roomsService = inject(HeatingRoomsService);

  protected readonly ArrowLeftIcon = ArrowLeft;
  protected readonly ChevronDownIcon = ChevronDown;
  protected readonly ChevronLeftIcon = ChevronLeft;
  protected readonly ChevronRightIcon = ChevronRight;
  protected readonly DownloadIcon = Download;
  protected readonly UploadIcon = Upload;
  protected readonly FileSpreadsheetIcon = FileSpreadsheet;
  protected readonly SettingsIcon = Settings;

  protected isExporting = signal(false);
  protected isImporting = signal(false);
  protected showErrorModal = signal(false);
  protected errorTitle = signal('ERROR.TITLE');
  protected errorMessage = signal('');
  protected errorDetails = signal('');
  protected errorInstructions = signal<string[]>([]);
  protected errorType = signal<'error' | 'warning'>('error');

  protected records = signal<DynamicHeatingRecord[]>([]);
  protected showImportConfirmModal = signal(false);
  protected pendingImportFile = signal<File | null>(null);
  protected chartView = signal<ChartView>('total');
  protected displayMode = signal<DisplayMode>('total');
  protected showRoomsModal = signal(false);

  // Compute which rooms have data (non-zero values in records)
  protected roomsWithData = computed(() => {
    const roomIds = new Set<string>();
    this.records().forEach(record => {
      Object.entries(record.rooms).forEach(([roomId, value]) => {
        if (value && value > 0) {
          roomIds.add(roomId);
        }
      });
    });
    return Array.from(roomIds);
  });

  // Convert dynamic records to legacy format for chart component
  protected chartRecords = computed(() => this.records().map(toHeatingRecord));

  // Pagination - simplified sort options for dynamic rooms
  protected currentPage = signal<number>(1);
  protected paginationSize = signal<number>(5);
  protected sortOption = signal<'date-desc' | 'date-asc' | 'total-desc' | 'total-asc'>('date-desc');

  // Form State Delegation
  protected selectedDate = this.formService.selectedDate;
  protected editingRecord = this.formService.editingRecord;
  protected dateExists = computed(() => this.formService.isDateDuplicate(this.records()));
  protected maxDate = new Date().toISOString().split('T')[0];

  // Consumption Groups for shared input component - supports ALL configured rooms
  protected consumptionGroups = computed<ConsumptionGroup[]>(() => {
    const rooms = this.roomsService.rooms();
    return [{
      title: 'HEATING.ROOMS_SETTINGS_TITLE',
      fields: rooms.map(room => ({
        key: room.id,
        label: room.name,
        value: this.formService.getRoomValue(room.id)
      }))
    }];
  });

  // Helper to get room value from a record for template display
  protected getRoomValue(record: DynamicHeatingRecord, roomId: string): number {
    return record.rooms[roomId] || 0;
  }

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
          return calculateDynamicHeatingTotal(b) - calculateDynamicHeatingTotal(a);
        case 'total-asc':
          return calculateDynamicHeatingTotal(a) - calculateDynamicHeatingTotal(b);
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
    // Load records which may be in legacy or dynamic format
    const records = await this.storage.load<(DynamicHeatingRecord | HeatingRecord)[]>('heating_consumption_records');
    if (records) {
      // Convert all records to dynamic format and ensure dates are Date objects
      const parsedRecords = records.map(r => {
        const converted = toDynamicHeatingRecord(r);
        return { ...converted, date: new Date(converted.date) };
      });
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

        // Filter out zero-value placeholders on the freshest date
        const { filtered, skippedCount } = filterZeroPlaceholders(result.validRecords, isHeatingRecordAllZero);

        // Convert to dynamic format and import
        const dynamicRecords = filtered.map(toDynamicHeatingRecord);
        await this.storage.importRecords('heating_consumption_records', dynamicRecords);
        await this.loadData();
        // Update notification service
        this.notificationService.setHeatingRecords(this.records());

        // Show warning if placeholders were skipped
        if (skippedCount > 0) {
          const key = skippedCount === 1 ? 'HEATING.IMPORT_PLACEHOLDER_SKIPPED_SINGULAR' : 'HEATING.IMPORT_PLACEHOLDER_SKIPPED_PLURAL';
          this.errorType.set('warning');
          this.errorTitle.set(this.languageService.translate('HOME.IMPORT_WARNING_TITLE'));
          this.errorMessage.set(this.languageService.translate(key).replace('{count}', skippedCount.toString()));
          this.errorDetails.set('');
          this.errorInstructions.set([]);
          this.showErrorModal.set(true);
        }
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

        // Filter out zero-value placeholders on the freshest date
        const { filtered, skippedCount } = filterZeroPlaceholders(records, isDynamicHeatingRecordAllZero);

        // Merge with existing records, avoiding duplicates by date
        this.records.update(existing => {
          const merged = [...existing, ...filtered];
          const uniqueMap = new Map<number, DynamicHeatingRecord>();
          merged.forEach(r => uniqueMap.set(r.date.getTime(), r));
          return Array.from(uniqueMap.values())
            .sort((a, b) => a.date.getTime() - b.date.getTime());
        });

        await this.storage.save('heating_consumption_records', this.records());
        // Update notification service
        this.notificationService.setHeatingRecords(this.records());
        input.value = '';

        // Build combined warning message
        const warnings: string[] = [];
        if (missingColumns.length > 0) {
          warnings.push(this.languageService.translate('HOME.MISSING_COLUMNS') + ': ' + missingColumns.join(', '));
        }
        if (skippedCount > 0) {
          const key = skippedCount === 1 ? 'HEATING.IMPORT_PLACEHOLDER_SKIPPED_SINGULAR' : 'HEATING.IMPORT_PLACEHOLDER_SKIPPED_PLURAL';
          warnings.push(this.languageService.translate(key).replace('{count}', skippedCount.toString()));
        }

        if (warnings.length > 0) {
          this.errorTitle.set(this.languageService.translate('HOME.IMPORT_WARNING_TITLE'));
          this.errorMessage.set(this.languageService.translate('HOME.IMPORT_WARNING_MESSAGE'));
          this.errorDetails.set(warnings.join('\n'));
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

  protected calculateTotal(record: DynamicHeatingRecord): number {
    return calculateDynamicHeatingTotal(record);
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

  // Form Event Handlers
  protected onFieldChange(event: { key: string; value: number | null }) {
    this.formService.updateField(event.key, event.value);
  }

  protected onConsumptionSave(data: ConsumptionData) {
    const newRecord = this.formService.createRecordFromState();
    if (newRecord) {
      // Check if editing existing record
      if (this.editingRecord()) {
        // Update existing record
        this.records.update(records =>
          records.map(r =>
            r.date.getTime() === this.editingRecord()!.date.getTime() ? newRecord : r
          )
        );
      } else {
        // Add new record
        this.records.update(records => [...records, newRecord]);
      }

      void this.storage.save('heating_consumption_records', this.records());
      this.notificationService.setHeatingRecords(this.records());
      this.formService.cancelEdit();
    }
  }

  protected cancelEdit() {
    this.formService.cancelEdit();
  }

  // Room Settings Modal Handlers
  protected openRoomsModal() {
    this.showRoomsModal.set(true);
  }

  protected onRoomsSave(rooms: HeatingRoomConfig[]) {
    this.roomsService.setRooms(rooms);
    this.showRoomsModal.set(false);
  }

  protected onRoomsCancel() {
    this.showRoomsModal.set(false);
  }
}
