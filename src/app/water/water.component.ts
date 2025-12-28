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
import { LucideAngularModule, ArrowLeft, Download, Upload, CircleCheck, Trash2, FileSpreadsheet, Info } from 'lucide-angular';
import { ConsumptionInputComponent, type ConsumptionGroup, type ConsumptionData } from '../shared/consumption-input/consumption-input.component';
import { DeleteConfirmationModalComponent } from '../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';
import { DetailedRecordsComponent } from '../shared/detailed-records/detailed-records.component';
import { ConsumptionRecord, calculateWaterTotal, calculateKitchenTotal, calculateBathroomTotal } from '../models/records.model';
import { ConsumptionChartComponent, type ChartView, type DisplayMode } from '../shared/consumption-chart/consumption-chart.component';
import { ErrorModalComponent } from '../shared/error-modal/error-modal.component';
import { HouseholdService } from '../services/household.service';
import { WaterAveragesService } from '../services/water-averages.service';
import { ImportValidationService } from '../services/import-validation.service';
import { LocalStorageService } from '../services/local-storage.service';

@Component({
  selector: 'app-water',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, LucideAngularModule, ConsumptionInputComponent, DeleteConfirmationModalComponent, ConfirmationModalComponent, DetailedRecordsComponent, ConsumptionChartComponent, ErrorModalComponent],
  templateUrl: './water.component.html',
  styleUrl: './water.component.scss'
})
export class WaterComponent {
  private storage = inject(STORAGE_SERVICE);
  private fileStorage = inject(FileStorageService);
  private languageService = inject(LanguageService);
  protected excelService = inject(ExcelService);
  protected excelSettings = inject(ExcelSettingsService);
  private householdService = inject(HouseholdService);
  private waterAveragesService = inject(WaterAveragesService);
  private importValidationService = inject(ImportValidationService);
  private localStorageService = inject(LocalStorageService);

  protected readonly ArrowLeftIcon = ArrowLeft;
  protected readonly DownloadIcon = Download;
  protected readonly UploadIcon = Upload;
  protected readonly CheckCircleIcon = CircleCheck;
  protected readonly TrashIcon = Trash2;
  protected readonly FileSpreadsheetIcon = FileSpreadsheet;
  protected readonly InfoIcon = Info;

  protected isExporting = signal(false);
  protected isImporting = signal(false);
  protected showErrorModal = signal(false);
  protected errorTitle = signal('ERROR.TITLE');
  protected errorMessage = signal('');
  protected errorDetails = signal('');
  protected errorInstructions = signal<string[]>([]);
  protected errorType = signal<'error' | 'warning'>('error');


  protected readonly maxDate = new Date().toISOString().split('T')[0];

  protected records = signal<ConsumptionRecord[]>([]);
  protected selectedDate = signal<string>('');
  protected showSuccessModal = signal(false);
  protected showDeleteModal = signal(false);
  protected showDeleteAllModal = signal(false);
  protected recordToDelete = signal<ConsumptionRecord | null>(null);
  protected recordsToDelete = signal<ConsumptionRecord[]>([]);
  protected showImportConfirmModal = signal(false);
  protected pendingImportFile = signal<File | null>(null);

  protected chartView = signal<ChartView>(this.getStoredChartView());
  protected displayMode = signal<DisplayMode>(this.getStoredDisplayMode());
  protected kitchenWarm = signal<number | null>(null);
  protected kitchenCold = signal<number | null>(null);
  protected bathroomWarm = signal<number | null>(null);
  protected bathroomCold = signal<number | null>(null);

  protected editingRecord = signal<ConsumptionRecord | null>(null);

  protected dateExists = computed(() => {
    if (this.editingRecord()) return false; // Don't warn when editing
    const selected = this.selectedDate();
    if (!selected) return false;
    return this.records().some(r => {
      const rDate = new Date(r.date);
      const year = rDate.getFullYear();
      const month = String(rDate.getMonth() + 1).padStart(2, '0');
      const day = String(rDate.getDate()).padStart(2, '0');
      const localDate = `${year}-${month}-${day}`;
      return localDate === selected;
    });
  });

  protected hasValidInput = computed(() =>
    this.kitchenWarm() !== null ||
    this.kitchenCold() !== null ||
    this.bathroomWarm() !== null ||
    this.bathroomCold() !== null
  );

  protected familySize = computed(() => this.householdService.members().length);

  // Check if there's enough data for country comparison (needs 3 records for 2 incremental data points)
  protected hasSufficientDataForComparison = computed(() => this.records().length >= 3);

  protected cityName = computed(() => this.householdService.address()?.city || '');

  protected countryName = computed(() => this.householdService.address()?.country || '');

  // Temporary country selection for comparison - stores country code (not persisted)
  protected comparisonCountry = signal<string>('');

  // Get list of available countries for dropdown
  protected availableCountries = computed(() => {
    return this.waterAveragesService.getAvailableCountries();
  });

  // Get the effective country code (user selection or derived from address country name)
  protected effectiveComparisonCountryCode = computed(() => {
    // If user selected a country, use that
    if (this.comparisonCountry()) {
      return this.comparisonCountry();
    }
    // Otherwise, try to find the country code from the address country name
    const addressCountry = this.countryName();
    if (addressCountry) {
      const code = this.waterAveragesService.getCountryCode(addressCountry);
      if (code) return code;
    }
    // Default to 'world' (World Average) if nothing found
    return 'world';
  });

  // Get the translated name for the effective country (for display in comparison note)
  protected effectiveComparisonCountryName = computed(() => {
    const code = this.effectiveComparisonCountryCode();
    const countries = this.availableCountries();
    const country = countries.find(c => c.code.toLowerCase() === code.toLowerCase());
    return country ? this.languageService.translate(country.translationKey) : this.languageService.translate('COUNTRIES.WORLD');
  });

  protected countryAverage = computed(() => {
    const code = this.effectiveComparisonCountryCode();
    const countries = this.availableCountries();
    const country = countries.find(c => c.code.toLowerCase() === code.toLowerCase());
    return country?.average || 150; // Default to World average
  });

  protected onComparisonCountryChange(countryCode: string): void {
    this.comparisonCountry.set(countryCode);
  }

  protected getSelectedCountryFlag(): string {
    const code = this.effectiveComparisonCountryCode();
    if (code) {
      return this.waterAveragesService.getFlagUrl(code);
    }
    // Default to world/UN flag
    return '/flags/un.png';
  }

  protected consumptionGroups = computed<ConsumptionGroup[]>(() => [
    {
      title: 'HOME.KITCHEN',
      fields: [
        { key: 'kitchenWarm', label: 'HOME.WARM_WATER', value: this.kitchenWarm() },
        { key: 'kitchenCold', label: 'HOME.COLD_WATER', value: this.kitchenCold() }
      ]
    },
    {
      title: 'HOME.BATHROOM',
      fields: [
        { key: 'bathroomWarm', label: 'HOME.WARM_WATER', value: this.bathroomWarm() },
        { key: 'bathroomCold', label: 'HOME.COLD_WATER', value: this.bathroomCold() }
      ]
    }
  ]);

  protected deleteAllMessageParams = computed(() => ({
    count: this.recordsToDelete().length.toString()
  }));

  protected deleteAllMessageKey = computed(() =>
    this.recordsToDelete().length === 1
      ? 'HOME.DELETE_ALL_CONFIRM_MESSAGE_SINGULAR'
      : 'HOME.DELETE_ALL_CONFIRM_MESSAGE_PLURAL'
  );

  protected onChartViewChange = (view: ChartView): void => {
    this.chartView.set(view);
    this.saveChartView(view);
  };

  protected onDisplayModeChange = (mode: DisplayMode): void => {
    this.displayMode.set(mode);
    this.saveDisplayMode(mode);
  };

  private getStoredChartView(): ChartView {
    const stored = this.localStorageService.getPreference('water_chart_view');
    if (stored === 'total' || stored === 'by-room' || stored === 'by-type' || stored === 'detailed') {
      return stored;
    }
    return 'total';
  }

  private getStoredDisplayMode(): DisplayMode {
    const stored = this.localStorageService.getPreference('water_display_mode');
    if (stored === 'total' || stored === 'incremental') {
      return stored;
    }
    return 'incremental';
  }

  private saveChartView(view: ChartView): void {
    this.localStorageService.setPreference('water_chart_view', view);
  }

  private saveDisplayMode(mode: DisplayMode): void {
    this.localStorageService.setPreference('water_display_mode', mode);
  }

  constructor() {
    this.loadData();
  }

  private async loadData() {
    const records = await this.storage.load<ConsumptionRecord[]>('water_consumption_records');
    if (records) {
      const parsedRecords = records.map(r => ({ ...r, date: new Date(r.date) }));
      this.records.set(parsedRecords);
    }
  }

  async exportData() {
    this.isExporting.set(true);
    try {
      const records = await this.storage.exportRecords('water_consumption_records');
      const dateStr = new Date().toISOString().split('T')[0];
      this.fileStorage.exportToFile(records, 'water-records-' + dateStr + '.json');
    } finally {
      this.isExporting.set(false);
    }
  }

  async exportToExcel() {
    this.isExporting.set(true);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      this.excelService.exportWaterToExcel(
        this.records(),
        `water-consumption-${dateStr}.xlsx`
      );
    } catch (error) {
      console.error('Excel export error:', error);
      alert(this.languageService.translate('WATER.EXCEL_IMPORT_ERROR'));
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
        const result = this.importValidationService.validateWaterJsonImport(data as any[]);
        if (result.errors.length > 0) {
          throw new Error(result.errors.join('\n'));
        }

        await this.storage.importRecords('water_consumption_records', result.validRecords);
        await this.loadData();
        this.showSuccessModal.set(true);
      } catch (error) {
        console.error('Error importing data:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';

        this.errorType.set('error');
        this.errorTitle.set(this.languageService.translate('WATER.JSON_IMPORT_ERROR_TITLE'));
        this.errorMessage.set(this.languageService.translate('WATER.JSON_IMPORT_ERROR'));
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

        const { records, missingColumns } = await this.excelService.importWaterFromExcel(file);

        // Merge with existing records, avoiding duplicates by date
        this.records.update(existing => {
          const merged = [...existing, ...records];
          const uniqueMap = new Map<number, ConsumptionRecord>();
          merged.forEach(r => uniqueMap.set(r.date.getTime(), r));
          return Array.from(uniqueMap.values())
            .sort((a, b) => a.date.getTime() - b.date.getTime());
        });

        await this.storage.save('water_consumption_records', this.records());
        input.value = '';

        if (missingColumns.length > 0) {
          this.errorTitle.set(this.languageService.translate('HOME.IMPORT_WARNING_TITLE'));
          this.errorMessage.set(this.languageService.translate('HOME.IMPORT_WARNING_MESSAGE'));
          this.errorDetails.set(this.languageService.translate('HOME.MISSING_COLUMNS') + ': ' + missingColumns.join(', '));
          this.errorInstructions.set([]);
          this.errorType.set('warning');
          this.showErrorModal.set(true);
        } else {
          this.showSuccessModal.set(true);
        }
      } catch (error) {
        console.error('Excel import error:', error);
        this.errorType.set('error');
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';

        // Show detailed error modal with instructions
        this.errorTitle.set(this.languageService.translate('WATER.EXCEL_IMPORT_ERROR_TITLE'));
        this.errorMessage.set(this.languageService.translate('WATER.EXCEL_IMPORT_ERROR'));
        this.errorDetails.set(errorMsg);
        this.errorInstructions.set(this.importValidationService.getExcelErrorInstructions(errorMsg));

        this.showErrorModal.set(true);
      } finally {
        this.isImporting.set(false);
        input.value = ''; // Reset input to allow re-importing same file
      }
    }
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

  protected editRecord(record: ConsumptionRecord) {
    this.editingRecord.set(record);
    this.selectedDate.set(new Date(record.date).toISOString().split('T')[0]);
    this.kitchenWarm.set(record.kitchenWarm);
    this.kitchenCold.set(record.kitchenCold);
    this.bathroomWarm.set(record.bathroomWarm);
    this.bathroomCold.set(record.bathroomCold);

    // Scroll to input section
    document.querySelector('.input-section')?.scrollIntoView({ behavior: 'smooth' });
  }

  protected deleteRecord(record: ConsumptionRecord) {
    this.recordToDelete.set(record);
    this.showDeleteModal.set(true);
  }

  protected confirmDelete() {
    const record = this.recordToDelete();
    if (record) {
      this.records.update(records => records.filter(r => r.date.getTime() !== record.date.getTime()));
      void this.storage.save('water_consumption_records', this.records());

      // If we deleted the record currently being edited, clear the form
      if (this.editingRecord()?.date.getTime() === record.date.getTime()) {
        this.cancelEdit();
      }
    }
    this.showDeleteModal.set(false);
    this.recordToDelete.set(null);
  }

  protected cancelDelete() {
    this.showDeleteModal.set(false);
    this.recordToDelete.set(null);
  }

  protected deleteAllRecords(recordsToDelete: ConsumptionRecord[]) {
    this.recordsToDelete.set(recordsToDelete);
    this.showDeleteAllModal.set(true);
  }

  protected confirmDeleteAll() {
    // Remove the records to delete from the main records array
    const recordsToDeleteSet = new Set(this.recordsToDelete().map(r => r.date.getTime()));
    this.records.update(records =>
      records.filter(r => !recordsToDeleteSet.has(r.date.getTime()))
    );
    void this.storage.save('water_consumption_records', this.records());
    this.showDeleteAllModal.set(false);
    this.recordsToDelete.set([]);
  }

  protected cancelDeleteAll() {
    this.showDeleteAllModal.set(false);
  }

  protected cancelEdit() {
    this.editingRecord.set(null);
    this.selectedDate.set('');
    this.kitchenWarm.set(null);
    this.kitchenCold.set(null);
    this.bathroomWarm.set(null);
    this.bathroomCold.set(null);
  }

  protected saveRecord() {
    if (this.hasValidInput() && !this.dateExists()) {
      const date = new Date(this.selectedDate());
      const newRecord: ConsumptionRecord = {
        date: date,
        kitchenWarm: this.kitchenWarm() || 0,
        kitchenCold: this.kitchenCold() || 0,
        bathroomWarm: this.bathroomWarm() || 0,
        bathroomCold: this.bathroomCold() || 0
      };

      const existingRecordIndex = this.records().findIndex(r =>
        new Date(r.date).toISOString().split('T')[0] === this.selectedDate()
      );

      if (existingRecordIndex !== -1) {
        // Update existing
        this.records.update(records => {
          const updated = [...records];
          updated[existingRecordIndex] = newRecord;
          return updated.sort((a, b) => a.date.getTime() - b.date.getTime());
        });
      } else {
        // New record
        this.records.update(records =>
          [...records, newRecord].sort((a, b) => a.date.getTime() - b.date.getTime())
        );
      }

      void this.storage.save('water_consumption_records', this.records());
      this.showSuccessModal.set(true);
      this.cancelEdit(); // Reset form and state
    }
  }

  protected onFieldChange(event: { key: string; value: number | null }) {
    switch (event.key) {
      case 'kitchenWarm':
        this.kitchenWarm.set(event.value);
        break;
      case 'kitchenCold':
        this.kitchenCold.set(event.value);
        break;
      case 'bathroomWarm':
        this.bathroomWarm.set(event.value);
        break;
      case 'bathroomCold':
        this.bathroomCold.set(event.value);
        break;
    }
  }

  protected onConsumptionSave(data: ConsumptionData) {
    const date = new Date(data.date);
    const newRecord: ConsumptionRecord = {
      date: date,
      kitchenWarm: data.fields['kitchenWarm'] || 0,
      kitchenCold: data.fields['kitchenCold'] || 0,
      bathroomWarm: data.fields['bathroomWarm'] || 0,
      bathroomCold: data.fields['bathroomCold'] || 0
    };

    const existingRecordIndex = this.records().findIndex(r =>
      new Date(r.date).toISOString().split('T')[0] === data.date
    );

    if (existingRecordIndex !== -1) {
      // Update existing
      this.records.update(records => {
        const updated = [...records];
        updated[existingRecordIndex] = newRecord;
        return updated.sort((a, b) => a.date.getTime() - b.date.getTime());
      });
    } else {
      // New record
      this.records.update(records =>
        [...records, newRecord].sort((a, b) => a.date.getTime() - b.date.getTime())
      );
    }

    void this.storage.save('water_consumption_records', this.records());
    this.showSuccessModal.set(true);
    this.cancelEdit();
  }

  protected closeSuccessModal() {
    this.showSuccessModal.set(false);
  }

  protected closeErrorModal() {
    this.showErrorModal.set(false);
  }
}
