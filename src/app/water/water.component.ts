import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TranslatePipe } from '../pipes/translate.pipe';
import { LucideAngularModule, Download, Upload, CircleCheck, Trash2, FileText, FileInput, FileOutput, AlertTriangle, Lightbulb, RefreshCw, Droplet } from 'lucide-angular';
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
import { LanguageService } from '../services/language.service';
import { WaterFactsService, WaterFact } from '../services/water-facts.service';
import { CHART_HELP_STEPS, RECORD_HELP_STEPS, RECORDS_LIST_HELP_STEPS } from './water.constants';

@Component({
  selector: 'app-water',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, LucideAngularModule, ConsumptionInputComponent, DeleteConfirmationModalComponent, ConfirmationModalComponent, DetailedRecordsComponent, ConsumptionChartComponent, ComparisonNoteComponent, ErrorModalComponent],
  templateUrl: './water.component.html',
  styleUrl: './water.component.scss',

})
export class WaterComponent {
  // Icons
  protected readonly DownloadIcon = Download;
  protected readonly UploadIcon = Upload;
  protected readonly FileOutputIcon = FileOutput;
  protected readonly FileInputIcon = FileInput;
  protected readonly FileTextIcon = FileText;
  protected readonly CheckCircleIcon = CircleCheck;
  protected readonly TrashIcon = Trash2;
  protected readonly AlertTriangleIcon = AlertTriangle;
  protected readonly LightbulbIcon = Lightbulb;
  protected readonly RefreshCwIcon = RefreshCw;

  // Services
  protected excelSettings = inject(ExcelSettingsService);
  private householdService = inject(HouseholdService);
  private chartCalculationService = inject(ChartCalculationService);
  private localStorageService = inject(LocalStorageService);
  private languageService = inject(LanguageService);
  private waterFactsService = inject(WaterFactsService);
  private preferencesService = inject(ConsumptionPreferencesService);
  private formService = inject(ConsumptionFormService);
  private dataService = inject(ConsumptionDataService);

  // Signals
  protected records = this.dataService.records;
  protected adjustedRecords = computed(() => {
    const recs = this.records();
    const changes = this.confirmedMeterChanges();
    if (changes.length === 0) return recs;
    return this.chartCalculationService.adjustForMeterChanges(recs, changes);
  });

  protected chartView = this.preferencesService.chartView;
  protected displayMode = this.preferencesService.displayMode;
  protected effectiveComparisonCountryCode = signal('DE'); // Default
  protected factRandomSeed = signal(Math.random());

  // Template Helpers & Signals
  protected consumptionGroups = computed<ConsumptionGroup[]>(() => [
    {
      title: 'WATER.KITCHEN',
      fields: [
        { key: 'kitchenWarm', label: 'WATER.WARM', icon: Droplet, value: this.formService.kitchenWarm() },
        { key: 'kitchenCold', label: 'WATER.COLD', icon: Droplet, value: this.formService.kitchenCold() }
      ]
    },
    {
      title: 'WATER.BATHROOM',
      fields: [
        { key: 'bathroomWarm', label: 'WATER.WARM', icon: Droplet, value: this.formService.bathroomWarm() },
        { key: 'bathroomCold', label: 'WATER.COLD', icon: Droplet, value: this.formService.bathroomCold() }
      ]
    }
  ]);

  protected selectedDate = this.formService.selectedDate;
  protected editingRecord = this.formService.editingRecord;
  protected maxDate = new Date().toISOString().split('T')[0];

  protected helpSteps = RECORD_HELP_STEPS;
  protected chartHelpSteps = CHART_HELP_STEPS;
  protected recordsHelpSteps = RECORDS_LIST_HELP_STEPS;

  protected isExporting = this.dataService.isExporting;
  protected isImporting = this.dataService.isImporting;
  protected filteredRecords = this.dataService.filteredRecords;

  protected showImportConfirmModal = this.dataService.showImportConfirmModal;
  protected showFilterWarningModal = this.dataService.showFilterWarningModal;

  protected unconfirmedMeterChanges = computed(() => {
    if (this.records().length < 2) return [];
    const changes = this.chartCalculationService.detectMeterChanges(this.records());
    return changes.filter(date =>
      !this.confirmedMeterChanges().includes(date) &&
      !this.dismissedMeterChanges().includes(date)
    );
  });

  protected formattedMeterChangeDate = computed(() => {
    const dates = this.unconfirmedMeterChanges();
    if (dates.length === 0) return '';
    return new Date(dates[0]).toLocaleDateString(this.languageService.currentLang());
  });

  protected successTitle = signal('HOME.SUCCESS');
  protected successMessage = signal('HOME.RECORD_SAVED');

  protected deleteAllMessageKey = computed(() => 'HOME.DELETE_ALL_CONFIRM_MESSAGE');
  protected deleteAllMessageParams = computed<Record<string, string>>(() => ({ count: this.dataService.recordsToDelete().length.toString() }));

  protected errorTitle = this.dataService.errorTitle;
  protected errorMessage = this.dataService.errorMessage;
  protected errorDetails = this.dataService.errorDetails;
  protected errorInstructions = this.dataService.errorInstructions;
  protected errorType = this.dataService.errorType;

  protected showSuccessModal = this.dataService.showSuccessModal;
  protected showErrorModal = this.dataService.showErrorModal;
  protected showDeleteModal = this.dataService.showDeleteModal;
  protected showDeleteAllModal = this.dataService.showDeleteAllModal;

  protected familySize = computed(() => this.householdService.members().length);

  // Water fun fact - changes when chart view changes and is context-aware
  protected waterFact = computed(() => {
    const records = this.records();
    const chartView = this.chartView();
    const mode = this.displayMode();
    const lang = this.languageService.currentLang();
    const seed = this.factRandomSeed();

    if (mode !== 'total' || records.length === 0) {
      return null;
    }

    const latestRecord = records[records.length - 1];

    const kitchenTotal = latestRecord.kitchenWarm + latestRecord.kitchenCold;
    const bathroomTotal = latestRecord.bathroomWarm + latestRecord.bathroomCold;
    const warmTotal = latestRecord.kitchenWarm + latestRecord.bathroomWarm;
    const coldTotal = latestRecord.kitchenCold + latestRecord.bathroomCold;
    const totalLiters = kitchenTotal + bathroomTotal;

    const factIndex = Math.floor(seed * 20);

    type FactContext = 'total' | 'kitchen' | 'bathroom' | 'warm' | 'cold';
    let context: FactContext = 'total';
    let liters = totalLiters;

    switch (chartView) {
      case 'by-room':
        if (seed > 0.5) {
          context = kitchenTotal > 0 ? 'kitchen' : (bathroomTotal > 0 ? 'bathroom' : 'total');
          liters = context === 'kitchen' ? kitchenTotal : (context === 'bathroom' ? bathroomTotal : totalLiters);
        } else {
          context = bathroomTotal > 0 ? 'bathroom' : (kitchenTotal > 0 ? 'kitchen' : 'total');
          liters = context === 'bathroom' ? bathroomTotal : (context === 'kitchen' ? kitchenTotal : totalLiters);
        }
        break;
      case 'by-type':
        if (seed > 0.5) {
          context = warmTotal > 0 ? 'warm' : (coldTotal > 0 ? 'cold' : 'total');
          liters = context === 'warm' ? warmTotal : (context === 'cold' ? coldTotal : totalLiters);
        } else {
          context = coldTotal > 0 ? 'cold' : (warmTotal > 0 ? 'warm' : 'total');
          liters = context === 'cold' ? coldTotal : (context === 'warm' ? warmTotal : totalLiters);
        }
        break;
      default:
        context = 'total';
        liters = totalLiters;
    }

    return this.waterFactsService.getFactByIndex(liters, factIndex, context);
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
    this.preferencesService.setChartView(view);
    this.refreshFact();
  };
  protected onDisplayModeChange = (mode: DisplayMode) => this.preferencesService.setDisplayMode(mode);

  protected onFilterStateChange(state: { year: number | null; month: number | null; startDate: string | null; endDate: string | null }) {
    this.dataService.updateFilterState(state);
  }

  protected onFilteredRecordsChange(records: unknown[]) {
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

  protected deleteAllRecords(records: unknown[]) {
    this.dataService.recordsToDelete.set(records as ConsumptionRecord[]);
    this.dataService.showDeleteAllModal.set(true);
  }

  protected closeSuccessModal() { this.dataService.showSuccessModal.set(false); }
  protected closeErrorModal() { this.dataService.showErrorModal.set(false); }


  // Edit/Delete Interactions
  protected editRecord(record: unknown) {
    this.formService.startEdit(record as ConsumptionRecord);
    document.querySelector('.input-section')?.scrollIntoView({ behavior: 'smooth' });
  }

  protected deleteRecord(record: unknown) {
    this.dataService.recordToDelete.set(record as ConsumptionRecord);
    this.dataService.showDeleteModal.set(true);
  }

  protected saveRecord() {
    if (this.hasValidInput && !this.dateExists) {
      const newRecord = this.formService.createRecordFromState();
      if (newRecord) {
        this.dataService.saveRecord(newRecord);
        this.formService.cancelEdit();
      }
    }
  }

  protected onConsumptionSave(data: ConsumptionData) {
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
    this.formService.updateField(event.key, event.value);
  }

  // Calc Helpers
  protected get hasValidInput(): boolean {
    return this.formService.hasValidInput();
  }

  protected get dateExists(): boolean {
    return this.formService.isDateDuplicate(this.records());
  }

  protected calculateTotal = (record: unknown): number => calculateWaterTotal(record as ConsumptionRecord);
  protected calculateKitchenTotal = calculateKitchenTotal;
  protected calculateBathroomTotal = calculateBathroomTotal;

  // Meter Change Methods
  private confirmedMeterChanges = signal<string[]>(this.getStoredMeterChanges());
  private dismissedMeterChanges = signal<string[]>(this.getStoredDismissedMeterChanges());

  private getStoredMeterChanges(): string[] {
    const stored = this.localStorageService.getPreference('water_confirmed_meter_changes');
    try {
      const parsed = stored ? JSON.parse(stored) : [];
      // Normalize: ensure we only have the date part YYYY-MM-DD
      return Array.isArray(parsed) ? parsed.map((d: string) => d.split('T')[0]) : [];
    } catch {
      return [];
    }
  }

  private getStoredDismissedMeterChanges(): string[] {
    const stored = this.localStorageService.getPreference('water_dismissed_meter_changes');
    try {
      const parsed = stored ? JSON.parse(stored) : [];
      // Normalize: ensure we only have the date part YYYY-MM-DD
      return Array.isArray(parsed) ? parsed.map((d: string) => d.split('T')[0]) : [];
    } catch {
      return [];
    }
  }

  private saveMeterChanges(): void {
    const confirmed = this.confirmedMeterChanges();
    const dismissed = this.dismissedMeterChanges();

    // Ensure we are saving arrays
    if (Array.isArray(confirmed)) {
      this.localStorageService.setPreference(
        'water_confirmed_meter_changes',
        JSON.stringify(confirmed)
      );
    }

    if (Array.isArray(dismissed)) {
      this.localStorageService.setPreference(
        'water_dismissed_meter_changes',
        JSON.stringify(dismissed)
      );
    }
  }

  protected confirmMeterChange(date: string): void {
    if (!date) return;
    this.confirmedMeterChanges.update((changes: string[]) => {
      const newChanges = [...changes, date];
      return [...new Set(newChanges)]; // Deduplicate
    });
    this.saveMeterChanges();
  }

  protected dismissMeterChange(date: string): void {
    if (!date) return;
    this.dismissedMeterChanges.update((changes: string[]) => {
      const newChanges = [...changes, date];
      return [...new Set(newChanges)]; // Deduplicate
    });
    this.saveMeterChanges();
  }
}
