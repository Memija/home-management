import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TranslatePipe } from '../pipes/translate.pipe';
import { LucideAngularModule, Clipboard as ClipboardIcon, Download, Upload, CircleCheck, Trash2, FileSpreadsheet, FileText, FileInput, FileOutput, Info, AlertTriangle, Lightbulb, Zap, RefreshCw } from 'lucide-angular';
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
import { ElectricityCountryFactsService } from '../services/electricity-country-facts.service';
import { availableElectricityCountries } from '../i18n/modules/en/electricity-country-facts';
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
  // Services
  protected excelSettings = inject(ExcelSettingsService);
  private householdService = inject(HouseholdService);
  private chartCalculationService = inject(ChartCalculationService);
  private languageService = inject(LanguageService);
  private electricityFactsService = inject(ElectricityCountryFactsService);
  private preferencesService = inject(ConsumptionPreferencesService);
  private formService = inject(ElectricityFormService);
  private dataService = inject(ElectricityDataService);
  private meterService = inject(ElectricityMeterService);

  // Signals
  protected records = this.dataService.records;
  protected chartView = this.preferencesService.electricityChartView;
  protected displayMode = this.preferencesService.electricityDisplayMode;
  protected effectiveComparisonCountryCode = signal('DE');
  protected factRandomSeed = signal(Math.random());

  protected adjustedRecords = this.records; // Start with records, can be adjustments if needed

  protected showSuccessModal = signal(false);
  protected showErrorModal = signal(false);
  protected showDeleteModal = this.dataService.showDeleteModal;
  protected showDeleteAllModal = this.dataService.showDeleteAllModal;
  protected successMessage = signal('ELECTRICITY.RECORD_SAVED'); // Default success message key
  protected successTitle = signal('HOME.SUCCESS');

  protected deleteAllMessageKey = computed(() => 'ELECTRICITY.DELETE_ALL_CONFIRM_MESSAGE');
  protected deleteAllMessageParams = computed<Record<string, string>>(() => ({ count: this.dataService.recordsToDelete().length.toString() }));

  protected showImportConfirmModal = this.dataService.showImportConfirmModal;
  protected showFilterWarningModal = this.dataService.showFilterWarningModal;

  protected errorTitle = this.dataService.errorTitle;
  protected errorMessage = this.dataService.errorMessage;
  protected errorDetails = this.dataService.errorDetails;
  protected errorInstructions = this.dataService.errorInstructions;
  protected errorType = this.dataService.errorType;

  protected isExporting = this.dataService.isExporting;
  protected isImporting = this.dataService.isImporting;
  protected filteredRecords = this.dataService.filteredRecords;

  protected familySize = computed(() => this.householdService.members().length);

  protected helpSteps = RECORD_HELP_STEPS;
  protected chartHelpSteps = CHART_HELP_STEPS;
  protected recordsHelpSteps = RECORDS_LIST_HELP_STEPS;

  protected selectedDate = this.formService.selectedDate;
  protected editingRecord = this.formService.editingRecord;
  protected maxDate = new Date().toISOString().split('T')[0];

  // Helpers
  protected get hasValidInput(): boolean {
    return this.formService.hasValidInput();
  }

  protected get dateExists(): boolean {
    return this.formService.isDateDuplicate(this.records());
  }

  protected sortOptions = computed<SortOptionConfig[]>(() => [
    { value: 'date-desc', labelKey: 'HOME.SORT.DATE_DESC', direction: '↓' },
    { value: 'date-asc', labelKey: 'HOME.SORT.DATE_ASC', direction: '↑' },
    { value: 'value-desc', labelKey: 'HOME.SORT.TOTAL_DESC', direction: '↓' },
    { value: 'value-asc', labelKey: 'HOME.SORT.TOTAL_ASC', direction: '↑' }
  ]);

  protected consumptionGroups = computed<ConsumptionGroup[]>(() => [
    {
      title: 'ELECTRICITY.CONSUMPTION',
      fields: [
        {
          key: 'value',
          label: 'ELECTRICITY.VALUE',
          icon: Zap,
          value: this.formService.value()
        }
      ]
    }
  ]);

  protected unconfirmedMeterChanges = computed(() => {
    if (this.records().length < 2) return [];
    const changes = this.meterService.detectMeterChanges(this.records());
    return this.meterService.filterUnconfirmed(changes);
  });

  protected formattedMeterChangeDate = computed(() => {
    const dates = this.unconfirmedMeterChanges();
    if (dates.length === 0) return '';
    return new Date(dates[0]).toLocaleDateString(this.languageService.currentLang());
  });


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
  protected readonly RefreshCwIcon = RefreshCw;

  protected availableElectricityCountries = availableElectricityCountries;

  // Fact
  protected electricityFact = computed(() => {
    const records = this.records();
    const displayMode = this.displayMode();
    const seed = this.factRandomSeed();

    if (records.length === 0) {
      return null;
    }

    const latestRecord = records[records.length - 1];
    const kwh = latestRecord.value;
    const factIndex = Math.floor(seed * 20);
    const factMode = displayMode === 'total' ? 'historical' : 'country';
    const countryCode = this.effectiveComparisonCountryCode();

    return this.electricityFactsService.getFactByIndex(kwh, factIndex, factMode, countryCode);
  });

  protected refreshFact(): void {
    this.factRandomSeed.set(Math.random());
  }

  // Methods
  protected handleCountryCodeChange(code: string) {
    this.effectiveComparisonCountryCode.set(code);
  }

  // UI Handlers
  protected onChartViewChange = (view: ChartView) => {
    this.preferencesService.setChartView(view, 'electricity');
    this.refreshFact();
  };
  protected onDisplayModeChange = (mode: DisplayMode) => this.preferencesService.setDisplayMode(mode, 'electricity');


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
