import { Component, computed, inject, signal, effect, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TranslatePipe } from '../pipes/translate.pipe';
import { DemoService } from '../services/demo.service';
import { DemoWizardComponent } from '../shared/demo-wizard/demo-wizard.component';
import {
  LucideAngularModule,
  Download,
  Upload,
  CircleCheck,
  Trash2,
  FileText,
  FileInput,
  FileOutput,
  TriangleAlert,
  RefreshCw,
  Droplet,
  Lightbulb,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
} from 'lucide-angular';
import {
  ConsumptionInputComponent,
  type ConsumptionGroup,
} from '../shared/consumption-input/consumption-input.component';
import { DeleteConfirmationModalComponent } from '../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';
import { DetailedRecordsComponent } from '../shared/detailed-records/detailed-records.component';
import {
  BaseConsumptionComponent,
  ConsumptionDataServiceContract,
} from '../shared/base-consumption.directive';
import {
  ConsumptionRecord,
  calculateWaterTotal,
  calculateKitchenTotal,
  calculateBathroomTotal,
} from '../models/records.model';
import { ComparisonNoteComponent } from '../shared/comparison-note/comparison-note.component';
import {
  ConsumptionChartComponent,
  type ChartView,
  type DisplayMode,
} from '../shared/consumption-chart/consumption-chart.component';
import { ErrorModalComponent } from '../shared/error-modal/error-modal.component';
import { HouseholdService } from '../services/household.service';
import { ConsumptionPreferencesService } from '../services/consumption-preferences.service';
import { ConsumptionFormService } from '../services/consumption-form.service';
import { ConsumptionDataService } from '../services/consumption-data.service';
import { PredictionService } from '../services/prediction.service';
import { PredictionsPanelComponent } from '../shared/predictions-panel/predictions-panel.component';
import { ExcelSettingsService } from '../services/excel-settings.service';
import { ChartCalculationService } from '../services/chart-calculation.service';
import { LocalStorageService } from '../services/local-storage.service';
import { LanguageService } from '../services/language.service';
import { WaterFactsService } from '../services/water-facts.service';
import {
  CHART_HELP_STEPS,
  RECORD_HELP_STEPS,
  RECORDS_LIST_HELP_STEPS,
  DEMO_WIZARD_STEPS,
  DEMO_TOUR_STEPS,
} from './water.constants';
import { DemoTourComponent } from '../shared/demo-tour/demo-tour.component';
import { secureRandom } from '../utils/crypto.utils';

@Component({
  selector: 'app-water',
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
    DemoWizardComponent,
    DemoTourComponent,
    PredictionsPanelComponent,
  ],
  templateUrl: './water.component.html',
  styleUrl: './water.component.scss',
})
export class WaterComponent extends BaseConsumptionComponent<ConsumptionRecord> {
  // Icons
  protected readonly DownloadIcon = Download;
  protected readonly UploadIcon = Upload;
  protected readonly FileOutputIcon = FileOutput;
  protected readonly FileInputIcon = FileInput;
  protected readonly FileTextIcon = FileText;
  protected readonly CheckCircleIcon = CircleCheck;
  protected readonly TrashIcon = Trash2;
  protected readonly AlertTriangleIcon = TriangleAlert;
  protected readonly RefreshCwIcon = RefreshCw;
  protected readonly LightbulbIcon = Lightbulb;
  protected readonly ToggleLeftIcon = ToggleLeft;
  protected readonly ToggleRightIcon = ToggleRight;
  protected readonly ChevronDownIcon = ChevronDown;

  private readonly elementRef = inject(ElementRef, { optional: true });

  // Services
  protected readonly excelSettings = inject(ExcelSettingsService);
  protected readonly demoService = inject(DemoService);
  private readonly householdService = inject(HouseholdService);
  private readonly chartCalculationService = inject(ChartCalculationService);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly languageService = inject(LanguageService);
  private readonly waterFactsService = inject(WaterFactsService);
  private readonly preferencesService = inject(ConsumptionPreferencesService);
  private readonly formService = inject(ConsumptionFormService);
  private readonly dataService = inject(ConsumptionDataService);
  private readonly predictionService = inject(PredictionService);

  // Signals
  protected readonly records = this.dataService.records;
  protected readonly waterPrediction = computed(() =>
    this.predictionService.predictWater(this.records()),
  );
  protected readonly adjustedRecords = computed(() => {
    const recs = this.records();
    const changes = this.confirmedMeterChanges();
    if (changes.length === 0) return recs;
    return this.chartCalculationService.adjustForMeterChanges(recs, changes);
  });

  protected readonly chartView = this.preferencesService.chartView;
  protected readonly displayMode = this.preferencesService.displayMode;
  protected readonly effectiveComparisonCountryCode = signal('DE'); // Default
  protected readonly selectedPredictionPeriod = signal<30 | 90 | 180 | 365 | 3650>(30);

  protected onPredictionPeriodChange(period: 30 | 90 | 180 | 365 | 3650): void {
    this.selectedPredictionPeriod.set(period);
  }

  protected readonly waterCategoryNames = computed(() => ({
    kitchenWarm: 'CHART.KITCHEN_WARM',
    kitchenCold: 'CHART.KITCHEN_COLD',
    bathroomWarm: 'CHART.BATHROOM_WARM',
    bathroomCold: 'CHART.BATHROOM_COLD',
    kitchenTotal: 'CHART.KITCHEN_TOTAL',
    bathroomTotal: 'CHART.BATHROOM_TOTAL',
    warmTotal: 'CHART.WARM_WATER_TOTAL',
    coldTotal: 'CHART.COLD_WATER_TOTAL',
  }));

  private readonly syncCountryFromAddress = effect(() => {
    const address = this.householdService.address();
    if (address?.country) {
      this.effectiveComparisonCountryCode.set(address.country.toUpperCase());
    }
  });
  protected readonly factRandomSeed = signal(secureRandom());

  // Template Helpers & Signals
  protected readonly coldWaterOnlyMode = this.preferencesService.coldWaterOnlyMode;

  protected readonly consumptionGroups = computed<ConsumptionGroup[]>(() => {
    const coldOnly = this.coldWaterOnlyMode();

    if (coldOnly) {
      return [
        {
          title: 'WATER.KITCHEN',
          fields: [
            {
              key: 'kitchenCold',
              label: 'WATER.TOTAL_LABEL',
              icon: Droplet,
              value: this.formService.kitchenCold(),
            },
          ],
        },
        {
          title: 'WATER.BATHROOM',
          fields: [
            {
              key: 'bathroomCold',
              label: 'WATER.TOTAL_LABEL',
              icon: Droplet,
              value: this.formService.bathroomCold(),
            },
          ],
        },
      ];
    }

    return [
      {
        title: 'WATER.KITCHEN',
        fields: [
          {
            key: 'kitchenWarm',
            label: 'WATER.WARM',
            icon: Droplet,
            value: this.formService.kitchenWarm(),
          },
          {
            key: 'kitchenCold',
            label: 'WATER.COLD',
            icon: Droplet,
            value: this.formService.kitchenCold(),
          },
        ],
      },
      {
        title: 'WATER.BATHROOM',
        fields: [
          {
            key: 'bathroomWarm',
            label: 'WATER.WARM',
            icon: Droplet,
            value: this.formService.bathroomWarm(),
          },
          {
            key: 'bathroomCold',
            label: 'WATER.COLD',
            icon: Droplet,
            value: this.formService.bathroomCold(),
          },
        ],
      },
    ];
  });

  protected readonly selectedDate = this.formService.selectedDate;
  protected readonly editingRecord = this.formService.editingRecord;
  protected readonly maxDate = new Date().toISOString().split('T')[0];

  protected readonly helpSteps = RECORD_HELP_STEPS;
  protected readonly chartHelpSteps = CHART_HELP_STEPS;
  protected readonly recordsHelpSteps = RECORDS_LIST_HELP_STEPS;

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

  protected readonly isExporting = this.dataService.isExporting;
  protected readonly isImporting = this.dataService.isImporting;
  protected readonly filteredRecords = this.dataService.filteredRecords;

  protected readonly showImportConfirmModal = this.dataService.showImportConfirmModal;
  protected readonly showFilterWarningModal = this.dataService.showFilterWarningModal;

  protected readonly unconfirmedMeterChanges = computed(() => {
    if (this.records().length < 2) return [];
    const changes = this.chartCalculationService.detectMeterChanges(this.records());
    return changes.filter(
      (date) =>
        !this.confirmedMeterChanges().includes(date) &&
        !this.dismissedMeterChanges().includes(date),
    );
  });

  protected readonly formattedMeterChangeDate = computed(() => {
    const dates = this.unconfirmedMeterChanges();
    if (dates.length === 0) return '';
    return new Date(dates[0]).toLocaleDateString(this.languageService.currentLang());
  });

  protected readonly successTitle = this.dataService.successTitle;
  protected readonly successMessage = this.dataService.successMessage;

  protected readonly deleteAllMessageKey = computed(() => 'HOME.DELETE_ALL_CONFIRM_MESSAGE');
  protected readonly deleteAllMessageParams = computed<Record<string, string>>(() => ({
    count: this.dataService.recordsToDelete().length.toString(),
  }));

  protected readonly errorTitle = this.dataService.errorTitle;
  protected readonly errorMessage = this.dataService.errorMessage;
  protected readonly errorDetails = this.dataService.errorDetails;
  protected readonly errorInstructions = this.dataService.errorInstructions;
  protected readonly errorType = this.dataService.errorType;

  protected readonly showSuccessModal = this.dataService.showSuccessModal;
  protected readonly showErrorModal = this.dataService.showErrorModal;
  protected readonly showDeleteModal = this.dataService.showDeleteModal;
  protected readonly showDeleteAllModal = this.dataService.showDeleteAllModal;

  protected readonly familySize = computed(() => this.householdService.members().length);

  // Water fun fact - changes when chart view changes and is context-aware
  protected readonly waterFact = computed(() => {
    const records = this.records();
    const mode = this.displayMode();

    if (!this.languageService.currentLang() || mode !== 'total' || records.length === 0) {
      return null;
    }

    const seed = this.factRandomSeed();
    const latestRecord = records.at(-1)!;
    const totals = calculateRecordTotals(latestRecord);
    const { context, liters } = resolveWaterFactContext(this.chartView(), seed, totals);
    const factIndex = Math.floor(seed * 20);

    return this.waterFactsService.getFactByIndex(liters, factIndex, context);
  });

  protected refreshFact(): void {
    this.factRandomSeed.set(secureRandom());
  }

  // Methods
  protected handleCountryCodeChange(code: string) {
    this.effectiveComparisonCountryCode.set(code);
  }

  // UI Handlers
  protected readonly onChartViewChange = (view: ChartView) => {
    this.preferencesService.setChartView(view);
    this.refreshFact();
  };
  protected readonly onDisplayModeChange = (mode: DisplayMode) =>
    this.preferencesService.setDisplayMode(mode);

  protected onFilterStateChange(state: {
    year: number | null;
    month: number | null;
    startDate: string | null;
    endDate: string | null;
  }) {
    this.dataService.updateFilterState(state);
  }

  protected onFilteredRecordsChange() {
    // Optional
  }

  override get baseDataService(): ConsumptionDataServiceContract<ConsumptionRecord> {
    return this.dataService;
  }

  protected deleteAllRecords(records: unknown[]) {
    this.dataService.recordsToDelete.set(records as ConsumptionRecord[]);
    this.dataService.showDeleteAllModal.set(true);
  }

  protected closeSuccessModal() {
    this.dataService.showSuccessModal.set(false);
  }
  protected closeErrorModal() {
    this.dataService.showErrorModal.set(false);
  }

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
        void this.dataService.saveRecord(newRecord);
        this.formService.cancelEdit();
      }
    }
  }

  protected onConsumptionSave() {
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
    this.formService.updateField(event.key, event.value);
  }

  protected toggleColdWaterOnlyMode() {
    this.preferencesService.setColdWaterOnlyMode(!this.coldWaterOnlyMode());
    // Reset warm fields when switching to cold-only mode
    if (this.coldWaterOnlyMode()) {
      this.formService.updateField('kitchenWarm', null);
      this.formService.updateField('bathroomWarm', null);
    }
  }

  // Calc Helpers
  protected get hasValidInput(): boolean {
    return this.formService.hasValidInput();
  }

  protected get dateExists(): boolean {
    return this.formService.isDateDuplicate(this.records());
  }

  protected readonly calculateTotal = (record: unknown): number =>
    calculateWaterTotal(record as ConsumptionRecord);
  protected readonly calculateKitchenTotal = calculateKitchenTotal;
  protected readonly calculateBathroomTotal = calculateBathroomTotal;

  // Meter Change Methods
  private readonly confirmedMeterChanges = this.preferencesService.confirmedMeterChanges;
  private readonly dismissedMeterChanges = this.preferencesService.dismissedMeterChanges;

  protected confirmMeterChange(date: string): void {
    if (!date) return;
    this.preferencesService.setMeterChangeConfirmed(date);
  }

  protected dismissMeterChange(date: string): void {
    if (!date) return;
    this.preferencesService.setMeterChangeDismissed(date);
  }
}

type FactContext = 'total' | 'kitchen' | 'bathroom' | 'warm' | 'cold';

interface RoomTotals {
  kitchen: number;
  bathroom: number;
  warm: number;
  cold: number;
  total: number;
}

function calculateRecordTotals(record: ConsumptionRecord): RoomTotals {
  const kitchen = record.kitchenWarm + record.kitchenCold;
  const bathroom = record.bathroomWarm + record.bathroomCold;
  const warm = record.kitchenWarm + record.bathroomWarm;
  const cold = record.kitchenCold + record.bathroomCold;
  return {
    kitchen,
    bathroom,
    warm,
    cold,
    total: kitchen + bathroom,
  };
}

function selectPairedContext(
  primaryKey: 'kitchen' | 'bathroom' | 'warm' | 'cold',
  secondaryKey: 'kitchen' | 'bathroom' | 'warm' | 'cold',
  totals: RoomTotals,
): { context: FactContext; liters: number } {
  if (totals[primaryKey] > 0) {
    return { context: primaryKey, liters: totals[primaryKey] };
  }
  if (totals[secondaryKey] > 0) {
    return { context: secondaryKey, liters: totals[secondaryKey] };
  }
  return { context: 'total', liters: totals.total };
}

function resolveWaterFactContext(
  chartView: string,
  seed: number,
  totals: RoomTotals,
): { context: FactContext; liters: number } {
  if (chartView === 'by-room') {
    return seed > 0.5
      ? selectPairedContext('kitchen', 'bathroom', totals)
      : selectPairedContext('bathroom', 'kitchen', totals);
  }
  if (chartView === 'by-type') {
    return seed > 0.5
      ? selectPairedContext('warm', 'cold', totals)
      : selectPairedContext('cold', 'warm', totals);
  }
  return { context: 'total', liters: totals.total };
}
