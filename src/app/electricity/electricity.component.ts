import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TranslatePipe } from '../pipes/translate.pipe';
import { LucideAngularModule, Clipboard as ClipboardIcon, Download, Upload, CircleCheck, Trash2, FileSpreadsheet, FileText, FileInput, FileOutput, Info, AlertTriangle, Lightbulb, Zap } from 'lucide-angular';
import { ConsumptionInputComponent, type ConsumptionData, type ConsumptionGroup } from '../shared/consumption-input/consumption-input.component';
import { DeleteConfirmationModalComponent } from '../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';
import { DetailedRecordsComponent, SortOptionConfig } from '../shared/detailed-records/detailed-records.component';
import { ElectricityRecord, getDateKey } from '../models/records.model';
import { ComparisonNoteComponent } from '../shared/comparison-note/comparison-note.component';
import { ConsumptionChartComponent, type ChartView, type DisplayMode } from '../shared/consumption-chart/consumption-chart.component';
import { ErrorModalComponent } from '../shared/error-modal/error-modal.component';
import { HouseholdService } from '../services/household.service';
import { ConsumptionPreferencesService } from '../services/consumption-preferences.service';
import { ElectricityFormService } from '../services/electricity-form.service';
import { ElectricityDataService } from '../services/electricity-data.service';
import { ExcelSettingsService } from '../services/excel-settings.service';
import { ChartCalculationService } from '../services/chart-calculation.service';
import { LanguageService } from '../services/language.service';
import { ElectricityMeterService } from '../services/electricity-meter.service';
import { ElectricityFactsService } from '../services/electricity-facts.service';
import { CHART_HELP_STEPS, RECORD_HELP_STEPS, RECORDS_LIST_HELP_STEPS } from './electricity.constants';

import { SmartImportModalComponent } from '../shared/smart-import-modal/smart-import-modal.component';

@Component({
  selector: 'app-electricity',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, LucideAngularModule, ConsumptionInputComponent, DeleteConfirmationModalComponent, ConfirmationModalComponent, DetailedRecordsComponent, ConsumptionChartComponent, ComparisonNoteComponent, ErrorModalComponent, SmartImportModalComponent],
  templateUrl: './electricity.component.html',
  styleUrl: './electricity.component.scss',

})
export class ElectricityComponent {
  protected preferencesService = inject(ConsumptionPreferencesService);
  protected formService = inject(ElectricityFormService);
  protected dataService = inject(ElectricityDataService);
  protected excelSettings = inject(ExcelSettingsService);
  protected meterService = inject(ElectricityMeterService);
  private householdService = inject(HouseholdService);
  private chartCalculationService = inject(ChartCalculationService);
  private languageService = inject(LanguageService);
  private electricityFactsService = inject(ElectricityFactsService);

  // Icons
  protected readonly DownloadIcon = Download;
  protected readonly UploadIcon = Upload;
  protected readonly CheckCircleIcon = CircleCheck;
  protected readonly TrashIcon = Trash2;
  protected readonly FileSpreadsheetIcon = FileSpreadsheet;
  protected readonly ClipboardIcon = ClipboardIcon;
  protected readonly FileInputIcon = FileInput;
  protected readonly FileOutputIcon = FileOutput;
  protected readonly FileTextIcon = FileText;
  protected readonly InfoIcon = Info;
  protected readonly AlertTriangleIcon = AlertTriangle;
  protected readonly LightbulbIcon = Lightbulb;
  protected readonly ZapIcon = Zap;

  // Constants
  protected readonly helpSteps = RECORD_HELP_STEPS;
  protected readonly chartHelpSteps = CHART_HELP_STEPS;
  protected readonly recordsHelpSteps = RECORDS_LIST_HELP_STEPS;

  protected consumptionGroups = computed<ConsumptionGroup[]>(() => [
    {
      title: 'ELECTRICITY.TITLE',
      fields: [
        { key: 'value', label: 'ELECTRICITY.VALUE', value: this.formService.value(), icon: Zap }
      ]
    }
  ]);

  // Sort Options
  protected sortOptions = signal<SortOptionConfig[]>([
    { value: 'date-desc', labelKey: 'HOME.SORT.DATE_DESC', direction: '↓' },
    { value: 'date-asc', labelKey: 'HOME.SORT.DATE_ASC', direction: '↑' },
    { value: 'total-desc', labelKey: 'HOME.SORT.TOTAL_DESC', direction: '↓' },
    { value: 'total-asc', labelKey: 'HOME.SORT.TOTAL_ASC', direction: '↑' }
  ]);

  // State Delegation
  protected records = this.dataService.records;
  protected filteredRecords = this.dataService.filteredRecords;
  protected isExporting = this.dataService.isExporting;
  protected isImporting = this.dataService.isImporting;
  protected showSuccessModal = this.dataService.showSuccessModal;
  protected successTitle = this.dataService.successTitle;
  protected successMessage = this.dataService.successMessage;
  protected showDeleteModal = this.dataService.showDeleteModal;
  protected showDeleteAllModal = this.dataService.showDeleteAllModal;
  protected recordToDelete = this.dataService.recordToDelete;
  protected recordsToDelete = this.dataService.recordsToDelete;
  protected showImportConfirmModal = this.dataService.showImportConfirmModal;
  protected pendingImportFile = this.dataService.pendingImportFile;
  protected showFilterWarningModal = this.dataService.showFilterWarningModal;
  protected maxDate = this.dataService.maxDate;

  // Error State Delegation
  protected showErrorModal = this.dataService.showErrorModal;
  protected errorTitle = this.dataService.errorTitle;
  protected errorMessage = this.dataService.errorMessage;
  protected errorDetails = this.dataService.errorDetails;
  protected errorInstructions = this.dataService.errorInstructions;
  protected errorType = this.dataService.errorType;

  // Form Signals Delegation
  protected selectedDate = this.formService.selectedDate;
  protected editingRecord = this.formService.editingRecord;
  protected hasValidInput = this.formService.hasValidInput;
  protected dateExists = computed(() => this.formService.isDateDuplicate(this.records()));

  // Chart Preferences
  protected chartView = this.preferencesService.chartView;
  protected displayMode = this.preferencesService.displayMode;

  // Other Computed
  protected familySize = computed(() => this.householdService.members().length);
  protected cityName = computed(() => this.householdService.address()?.city || '');
  protected countryName = computed(() => this.householdService.address()?.country || '');

  protected deleteAllMessageKey = computed(() => {
    const count = this.recordsToDelete().length;
    return count === 1 ? 'ELECTRICITY.DELETE_ALL_CONFIRM_MESSAGE_SINGULAR' : 'ELECTRICITY.DELETE_ALL_CONFIRM_MESSAGE_PLURAL';
  });
  protected deleteAllMessageParams = computed(() => ({ count: this.recordsToDelete().length.toString() }));

  // Comparison Signal
  protected effectiveComparisonCountryCode = signal<string>('DE');

  // Meter Change Detection
  protected detectedMeterChanges = computed(() => this.meterService.detectMeterChanges(this.records()));
  protected unconfirmedMeterChanges = computed(() => this.meterService.filterUnconfirmed(this.detectedMeterChanges()));

  protected formattedMeterChangeDate = computed(() => {
    const unconfirmed = this.unconfirmedMeterChanges();
    if (unconfirmed.length === 0) return '';

    const dateStr = unconfirmed[0];
    const date = new Date(dateStr);
    const lang = this.languageService.currentLang();
    const locale = lang === 'de' ? 'de-DE' : 'en-US';

    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });

  protected adjustedRecords = computed(() => {
    const records = this.records();
    const mode = this.displayMode();
    const confirmed = this.meterService.confirmedMeterChanges();

    if (mode === 'incremental' || confirmed.length === 0) {
      return records;
    }

    const sortedChanges = new Set(confirmed.map(d => getDateKey(new Date(d))));
    const adjusted: ElectricityRecord[] = [];
    let currentOffset = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const recordDateKey = getDateKey(record.date);

      if (i > 0 && sortedChanges.has(recordDateKey)) {
        // Confirmed meter change: Adjust offset to make the curve continuous
        // New offset = Previous Adjusted Value - Current Raw Value
        const prevAdjusted = adjusted[i - 1].value;
        const currRaw = record.value;
        currentOffset = prevAdjusted - currRaw;
      }

      adjusted.push({
        date: record.date,
        value: record.value + currentOffset
      });
    }

    return adjusted;
  });

  // Random seed for facts
  private factRandomSeed = signal(Math.random());

  // Fact
  protected electricityFact = computed(() => {
    const records = this.records();
    const mode = this.displayMode();
    const seed = this.factRandomSeed();

    if (mode !== 'total' || records.length === 0) {
      return null;
    }

    const latestRecord = records[records.length - 1];
    const kwh = latestRecord.value;
    const factIndex = Math.floor(seed * 20);

    return this.electricityFactsService.getFactByIndex(kwh, factIndex);
  });

  // Methods
  protected handleCountryCodeChange(code: string) {
    this.effectiveComparisonCountryCode.set(code);
  }

  // UI Handlers
  protected onChartViewChange = (view: ChartView) => {
    this.preferencesService.setChartView(view);
    this.factRandomSeed.set(Math.random());
  };
  protected onDisplayModeChange = (mode: DisplayMode) => this.preferencesService.setDisplayMode(mode);


  protected onFilteredRecordsChange(records: unknown[]) {
    // Optional
  }

  // Delegations
  protected importData(event: Event) { this.dataService.importData(event); }
  protected importFromExcel(event: Event) { this.dataService.importFromExcel(event); }

  protected confirmImport() { this.dataService.confirmImport(); }
  protected cancelImport() { this.dataService.cancelImport(); }

  protected confirmFilterWarningImport() { this.dataService.confirmFilterWarningImport(); }
  protected cancelFilterWarningImport() { this.dataService.cancelFilterWarningImport(); }

  protected exportData() { this.dataService.exportData(); }
  protected exportToExcel() { this.dataService.exportToExcel(); }
  protected exportToPdf() { this.dataService.exportToPdf(); }

  protected confirmDelete() { this.dataService.confirmDelete(); }
  protected cancelDelete() {
    this.dataService.showDeleteModal.set(false);
    this.dataService.recordToDelete.set(null);
  }

  protected confirmDeleteAll() { this.dataService.confirmDeleteAll(); }
  protected cancelDeleteAll() {
    this.dataService.showDeleteAllModal.set(false);
    this.dataService.recordsToDelete.set([]);
  }

  protected deleteAllRecords(records: unknown[]) {
    this.dataService.recordsToDelete.set(records as ElectricityRecord[]);
    this.dataService.showDeleteAllModal.set(true);
  }

  protected onFilterStateChange(state: { year: number | null; month: number | null; startDate: string | null; endDate: string | null }) {
    this.dataService.updateFilterState(state);
  }

  protected closeSuccessModal() { this.dataService.showSuccessModal.set(false); }
  protected closeErrorModal() { this.dataService.showErrorModal.set(false); }


  // Edit/Delete Interactions
  protected editRecord(record: unknown) {
    this.formService.startEdit(record as ElectricityRecord);
    document.querySelector('.input-section')?.scrollIntoView({ behavior: 'smooth' });
  }

  protected deleteRecord(record: unknown) {
    this.dataService.recordToDelete.set(record as ElectricityRecord);
    this.dataService.showDeleteModal.set(true);
  }

  protected onConsumptionSave(data: ConsumptionData) {
    // Adapter: ConsumptionInput returns ConsumptionData {date, fields: {value: 123}}
    // We need to update form service properties and then create record.
    this.formService.updateDate(data.date);
    this.formService.updateValue(data.fields['value']);

    // If editing, logic is handled in formService context usually,
    // but here we just call createRecordFromState.

    const newRecord = this.formService.createRecordFromState();
    if (newRecord) {
      this.dataService.saveRecord(newRecord);
      this.formService.cancelEdit();
    }
  }

  protected cancelEdit() {
    this.formService.cancelEdit();
  }

  protected onFieldChange(event: { key: string; value: number | null }) {
    this.formService.updateValue(event.value);
  }

  protected onDateChange(date: string) {
    this.formService.updateDate(date);
  }

  // Calc Helpers
  protected calculateTotal = (record: unknown): number => (record as ElectricityRecord).value;

  // Meter Change Methods
  protected confirmMeterChange(date: string): void {
    this.meterService.confirmMeterChange(date);
  }

  protected dismissMeterChange(date: string): void {
    this.meterService.dismissMeterChange(date);
  }

  // Smart Import Logic
  protected showSmartImportModal = signal(false);

  protected openSmartImport() {
    this.showSmartImportModal.set(true);
  }

  protected onSmartImport(records: { date: Date, value: number }[]) {
    if (records.length === 0) return;

    // Convert parsed records to ElectricityRecords and save
    let importedCount = 0;

    records.forEach(record => {
      const newRecord: ElectricityRecord = {
        date: record.date,
        value: record.value
      };

      this.dataService.saveRecord(newRecord);
      importedCount++;
    });

    if (importedCount > 0) {
      this.showSuccessModal.set(true);
    }
  }
}
