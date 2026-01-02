import { Component, computed, inject, ChangeDetectionStrategy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../pipes/translate.pipe';
import { LucideAngularModule, ArrowLeft, Download, Upload, CircleCheck, Trash2, FileSpreadsheet, FileText, FileInput, FileOutput, Info, AlertTriangle } from 'lucide-angular';
import { ConsumptionInputComponent, type ConsumptionData, type ConsumptionGroup } from '../shared/consumption-input/consumption-input.component';
import { DeleteConfirmationModalComponent } from '../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';
import { DetailedRecordsComponent } from '../shared/detailed-records/detailed-records.component';
import { ConsumptionRecord, calculateWaterTotal, calculateKitchenTotal, calculateBathroomTotal } from '../models/records.model';
import { ComparisonNoteComponent } from '../shared/comparison-note/comparison-note.component';
import { ConsumptionChartComponent, type ChartView, type DisplayMode } from '../shared/consumption-chart/consumption-chart.component';
import { ErrorModalComponent } from '../shared/error-modal/error-modal.component';
import { HouseholdService } from '../services/household.service';
import { ConsumptionPreferencesService } from '../services/consumption-preferences.service';
import { ConsumptionFormService } from '../services/consumption-form.service';
import { ConsumptionDataService } from '../services/consumption-data.service';
import { ExcelSettingsService } from '../services/excel-settings.service';
import { ChartCalculationService } from '../services/chart-calculation.service';
import { LocalStorageService } from '../services/local-storage.service';
import { CHART_HELP_STEPS, RECORD_HELP_STEPS, RECORDS_LIST_HELP_STEPS } from './water.constants';

@Component({
  selector: 'app-water',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, LucideAngularModule, ConsumptionInputComponent, DeleteConfirmationModalComponent, ConfirmationModalComponent, DetailedRecordsComponent, ConsumptionChartComponent, ComparisonNoteComponent, ErrorModalComponent],
  templateUrl: './water.component.html',
  styleUrl: './water.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WaterComponent {
  protected preferencesService = inject(ConsumptionPreferencesService);
  protected formService = inject(ConsumptionFormService);
  protected dataService = inject(ConsumptionDataService);
  protected excelSettings = inject(ExcelSettingsService);
  private householdService = inject(HouseholdService);
  private chartCalculationService = inject(ChartCalculationService);
  private localStorageService = inject(LocalStorageService);

  // Icons
  protected readonly ArrowLeftIcon = ArrowLeft;
  protected readonly DownloadIcon = Download;
  protected readonly UploadIcon = Upload;
  protected readonly CheckCircleIcon = CircleCheck;
  protected readonly TrashIcon = Trash2;
  protected readonly FileSpreadsheetIcon = FileSpreadsheet;
  protected readonly FileInputIcon = FileInput;
  protected readonly FileOutputIcon = FileOutput;
  protected readonly FileTextIcon = FileText;
  protected readonly InfoIcon = Info;
  protected readonly AlertTriangleIcon = AlertTriangle;

  // Constants
  protected readonly helpSteps = RECORD_HELP_STEPS;
  protected readonly chartHelpSteps = CHART_HELP_STEPS;
  protected readonly recordsHelpSteps = RECORDS_LIST_HELP_STEPS;

  protected consumptionGroups = signal<ConsumptionGroup[]>([
    {
      title: 'WATER.KITCHEN',
      fields: [
        { key: 'kitchenWarm', label: 'WATER.WARM', value: null },
        { key: 'kitchenCold', label: 'WATER.COLD', value: null }
      ]
    },
    {
      title: 'WATER.BATHROOM',
      fields: [
        { key: 'bathroomWarm', label: 'WATER.WARM', value: null },
        { key: 'bathroomCold', label: 'WATER.COLD', value: null }
      ]
    }
  ]);

  // State Delegation
  protected records = this.dataService.records;
  protected filteredRecords = this.dataService.filteredRecords;
  protected isExporting = this.dataService.isExporting;
  protected isImporting = this.dataService.isImporting;
  protected showSuccessModal = this.dataService.showSuccessModal;
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
    return count === 1 ? 'HOME.DELETE_ALL_CONFIRM_MESSAGE_SINGULAR' : 'HOME.DELETE_ALL_CONFIRM_MESSAGE_PLURAL';
  });
  protected deleteAllMessageParams = computed(() => ({ count: this.recordsToDelete().length.toString() }));

  // Comparison Signal
  protected effectiveComparisonCountryCode = signal<string>('DE');

  // Meter Change Detection
  private confirmedMeterChanges = signal<string[]>(this.getStoredMeterChanges());
  private dismissedMeterChanges = signal<string[]>(this.getStoredDismissedMeterChanges());

  protected detectedMeterChanges = computed(() => {
    const records = this.records();
    return this.chartCalculationService.detectMeterChanges(records);
  });

  protected unconfirmedMeterChanges = computed(() => {
    const detected = this.detectedMeterChanges();
    const confirmed = this.confirmedMeterChanges();
    const dismissed = this.dismissedMeterChanges();
    return detected.filter(d => !confirmed.includes(d) && !dismissed.includes(d));
  });

  protected adjustedRecords = computed(() => {
    const records = this.records();
    const confirmed = this.confirmedMeterChanges();
    if (confirmed.length === 0) return records;
    return this.chartCalculationService.adjustForMeterChanges(records, confirmed);
  });

  // Methods
  protected handleCountryCodeChange(code: string) {
    this.effectiveComparisonCountryCode.set(code);
  }

  // UI Handlers
  protected onChartViewChange = (view: ChartView) => this.preferencesService.setChartView(view);
  protected onDisplayModeChange = (mode: DisplayMode) => this.preferencesService.setDisplayMode(mode);

  protected onFilterStateChange(state: { year: number | null; month: number | null; startDate: string | null; endDate: string | null }) {
    this.dataService.updateFilterState(state);
  }

  protected onFilteredRecordsChange(records: ConsumptionRecord[]) {
    // Optional
  }

  // Delegations to DataService
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

  protected deleteAllRecords(records: ConsumptionRecord[]) {
    this.dataService.recordsToDelete.set(records);
    this.dataService.showDeleteAllModal.set(true);
  }

  protected closeSuccessModal() { this.dataService.showSuccessModal.set(false); }
  protected closeErrorModal() { this.dataService.showErrorModal.set(false); }


  // Edit/Delete Interactions
  protected editRecord(record: ConsumptionRecord) {
    this.formService.startEdit(record);
    document.querySelector('.input-section')?.scrollIntoView({ behavior: 'smooth' });
  }

  protected deleteRecord(record: ConsumptionRecord) {
    this.dataService.recordToDelete.set(record);
    this.dataService.showDeleteModal.set(true);
  }

  protected saveRecord() {
    if (this.hasValidInput() && !this.dateExists()) {
      const newRecord = this.formService.createRecordFromState();
      if (newRecord) {
        this.dataService.saveRecord(newRecord);
        this.formService.cancelEdit();
      }
    }
  }

  protected onConsumptionSave(data: ConsumptionData) {
    // Handled via saveRecord bound to (save) event
  }

  protected cancelEdit() {
    this.formService.cancelEdit();
  }

  protected onFieldChange(event: { key: string; value: number | null }) {
    this.formService.updateField(event.key, event.value);
  }

  // Calc Helpers
  protected calculateTotal = calculateWaterTotal;
  protected calculateKitchenTotal = calculateKitchenTotal;
  protected calculateBathroomTotal = calculateBathroomTotal;

  // Meter Change Methods
  private getStoredMeterChanges(): string[] {
    const stored = this.localStorageService.getPreference('water_confirmed_meter_changes');
    try {
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private getStoredDismissedMeterChanges(): string[] {
    const stored = this.localStorageService.getPreference('water_dismissed_meter_changes');
    try {
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveMeterChanges(): void {
    this.localStorageService.setPreference(
      'water_confirmed_meter_changes',
      JSON.stringify(this.confirmedMeterChanges())
    );
    this.localStorageService.setPreference(
      'water_dismissed_meter_changes',
      JSON.stringify(this.dismissedMeterChanges())
    );
  }

  protected confirmMeterChange(date: string): void {
    this.confirmedMeterChanges.update(changes => [...changes, date]);
    this.saveMeterChanges();
  }

  protected dismissMeterChange(date: string): void {
    this.dismissedMeterChanges.update(changes => [...changes, date]);
    this.saveMeterChanges();
  }
}
