import { Component, computed, inject, signal, effect, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TranslatePipe } from '../pipes/translate.pipe';
import { DemoService } from '../services/demo.service';
import { DemoWizardComponent } from '../shared/demo-wizard/demo-wizard.component';
import {
  LucideAngularModule,
  Clipboard as ClipboardIcon,
  Download,
  Upload,
  CircleCheck,
  Trash2,
  FileSpreadsheet,
  FileText,
  FileInput,
  FileOutput,
  Info,
  TriangleAlert,
  Zap,
  RefreshCw,
  Lightbulb,
  ChevronDown,
} from 'lucide-angular';
import {
  ConsumptionInputComponent,
  type ConsumptionData,
  type ConsumptionGroup,
} from '../shared/consumption-input/consumption-input.component';
import { DeleteConfirmationModalComponent } from '../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';
import {
  BaseConsumptionComponent,
  ConsumptionDataServiceContract,
} from '../shared/base-consumption.directive';
import {
  DetailedRecordsComponent,
  SortOptionConfig,
} from '../shared/detailed-records/detailed-records.component';
import { ElectricityRecord } from '../models/records.model';
import { ComparisonNoteComponent } from '../shared/comparison-note/comparison-note.component';
import {
  ConsumptionChartComponent,
  type ChartView,
  type DisplayMode,
} from '../shared/consumption-chart/consumption-chart.component';
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
import {
  CHART_HELP_STEPS,
  RECORD_HELP_STEPS,
  RECORDS_LIST_HELP_STEPS,
  DEMO_WIZARD_STEPS,
  DEMO_TOUR_STEPS,
} from './electricity.constants';
import { DemoTourComponent } from '../shared/demo-tour/demo-tour.component';
import { secureRandom } from '../utils/crypto.utils';

import { SmartImportModalComponent } from '../shared/smart-import-modal/smart-import-modal.component';
import { PredictionService } from '../services/prediction.service';
import { PredictionsPanelComponent } from '../shared/predictions-panel/predictions-panel.component';

@Component({
  selector: 'app-electricity',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    LucideAngularModule,
    ConsumptionInputComponent,
    DeleteConfirmationModalComponent,
    ConfirmationModalComponent,
    DetailedRecordsComponent,
    ConsumptionChartComponent,
    ComparisonNoteComponent,
    ErrorModalComponent,
    SmartImportModalComponent,
    DemoWizardComponent,
    DemoTourComponent,
    PredictionsPanelComponent,
  ],
  templateUrl: './electricity.component.html',
  styleUrl: './electricity.component.scss',
})
export class ElectricityComponent extends BaseConsumptionComponent<ElectricityRecord> {
  // Services
  protected readonly excelSettings = inject(ExcelSettingsService);
  protected readonly demoService = inject(DemoService);
  private readonly householdService = inject(HouseholdService);
  private readonly chartCalculationService = inject(ChartCalculationService);
  private readonly languageService = inject(LanguageService);
  private readonly electricityFactsService = inject(ElectricityCountryFactsService);
  private readonly preferencesService = inject(ConsumptionPreferencesService);
  private readonly formService = inject(ElectricityFormService);
  private readonly dataService = inject(ElectricityDataService);
  private readonly meterService = inject(ElectricityMeterService);
  private readonly predictionService = inject(PredictionService);

  // Signals
  protected readonly records = this.dataService.records;
  protected readonly electricityPrediction = computed(() =>
    this.predictionService.predictElectricity(this.records()),
  );
  protected readonly chartView = this.preferencesService.electricityChartView;
  protected readonly displayMode = this.preferencesService.electricityDisplayMode;
  protected readonly effectiveComparisonCountryCode = signal('DE');
  protected readonly selectedPredictionPeriod = signal<30 | 90 | 180 | 365 | 3650>(30);

  protected onPredictionPeriodChange(period: 30 | 90 | 180 | 365 | 3650): void {
    this.selectedPredictionPeriod.set(period);
  }

  private readonly syncCountryFromAddress = effect(() => {
    const address = this.householdService.address();
    if (address?.country) {
      // Find if this country is valid for electricity facts
      const isValid = availableElectricityCountries.some(
        (c) => c.code.toLowerCase() === address.country.toLowerCase(),
      );
      if (isValid) {
        this.effectiveComparisonCountryCode.set(address.country.toUpperCase());
      }
    }
  });
  protected readonly factRandomSeed = signal(secureRandom());

  protected adjustedRecords = this.records; // Start with records, can be adjustments if needed

  protected showSuccessModal = this.dataService.showSuccessModal;
  protected showErrorModal = this.dataService.showErrorModal;
  protected showDeleteModal = this.dataService.showDeleteModal;
  protected showDeleteAllModal = this.dataService.showDeleteAllModal;
  protected successMessage = this.dataService.successMessage;
  protected successTitle = this.dataService.successTitle;

  protected deleteAllMessageKey = computed(() => 'ELECTRICITY.DELETE_ALL_CONFIRM_MESSAGE');
  protected deleteAllMessageParams = computed<Record<string, string>>(() => ({
    count: this.dataService.recordsToDelete().length.toString(),
  }));

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

  // Demo wizard & tour
  protected readonly demoWizardSteps = DEMO_WIZARD_STEPS;
  protected readonly demoTourSteps = DEMO_TOUR_STEPS;
  protected readonly showDemoWizard = signal(false);
  protected readonly showDemoTour = signal(false);

  protected openRelevantDemoGuide(): void {
    if (this.demoService.isDemoMode()) {
      this.showDemoTour.set(true);
    } else {
      this.showDemoWizard.set(true);
    }
  }

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
    { value: 'value-asc', labelKey: 'HOME.SORT.TOTAL_ASC', direction: '↑' },
  ]);

  protected consumptionGroups = computed<ConsumptionGroup[]>(() => [
    {
      title: 'ELECTRICITY.CONSUMPTION',
      fields: [
        {
          key: 'value',
          label: 'ELECTRICITY.VALUE',
          icon: Zap,
          value: this.formService.value(),
        },
      ],
    },
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
  protected readonly AlertTriangleIcon = TriangleAlert;
  protected readonly ZapIcon = Zap;
  protected readonly RefreshCwIcon = RefreshCw;
  protected readonly LightbulbIcon = Lightbulb;
  protected readonly ChevronDownIcon = ChevronDown;

  private readonly elementRef = inject(ElementRef, { optional: true });

  protected availableElectricityCountries = availableElectricityCountries;

  // Fact
  protected electricityFact = computed(() => {
    const records = this.records();
    const displayMode = this.displayMode();
    const seed = this.factRandomSeed();

    if (records.length === 0) {
      return null;
    }

    const latestRecord = records.at(-1)!;
    const kwh = latestRecord.value;
    const factIndex = Math.floor(seed * 20);
    const factMode = displayMode === 'total' ? 'historical' : 'country';
    const countryCode = this.effectiveComparisonCountryCode();

    return this.electricityFactsService.getFactByIndex(kwh, factIndex, factMode, countryCode);
  });

  protected refreshFact(): void {
    this.factRandomSeed.set(secureRandom());
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
  protected onDisplayModeChange = (mode: DisplayMode) =>
    this.preferencesService.setDisplayMode(mode, 'electricity');

  protected onFilteredRecordsChange() {
    // Optional
  }

  override get baseDataService(): ConsumptionDataServiceContract<ElectricityRecord> {
    return this.dataService;
  }

  protected deleteAllRecords(records: unknown[]) {
    this.dataService.recordsToDelete.set(records as ElectricityRecord[]);
    this.dataService.showDeleteAllModal.set(true);
  }

  protected onFilterStateChange(state: {
    year: number | null;
    month: number | null;
    startDate: string | null;
    endDate: string | null;
  }) {
    this.dataService.updateFilterState(state);
  }

  protected closeSuccessModal() {
    this.dataService.showSuccessModal.set(false);
  }
  protected closeErrorModal() {
    this.dataService.showErrorModal.set(false);
  }

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
      void this.dataService.saveRecord(newRecord);
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
  protected readonly showSmartImportModal = signal(false);

  protected openSmartImport() {
    this.showSmartImportModal.set(true);
  }

  protected onSmartImport(records: { date: Date; value: number }[]) {
    if (records.length === 0) return;

    // Convert parsed records to ElectricityRecords and save
    let importedCount = 0;

    for (const record of records) {
      const newRecord: ElectricityRecord = {
        date: record.date,
        value: record.value,
      };

      void this.dataService.saveRecord(newRecord);
      importedCount++;
    }

    if (importedCount > 0) {
      this.showSuccessModal.set(true);
    }
  }
}
