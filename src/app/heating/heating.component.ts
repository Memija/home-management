import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  signal,
  computed,
  inject,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../pipes/translate.pipe';
import { DemoService } from '../services/demo.service';
import { DemoWizardComponent } from '../shared/demo-wizard/demo-wizard.component';
import { HeatingFormService } from '../services/heating-form.service';
import { HeatingRoomsService, HeatingRoomConfig } from '../services/heating-rooms.service';
import { HeatingDataService } from '../services/heating-data.service';
import { LucideAngularModule, Settings, Lightbulb } from 'lucide-angular';
import {
  ConsumptionChartComponent,
  type ChartView,
  type DisplayMode,
} from '../shared/consumption-chart/consumption-chart.component';
import {
  ConsumptionInputComponent,
  type ConsumptionGroup,
} from '../shared/consumption-input/consumption-input.component';
import {
  BaseConsumptionComponent,
  ConsumptionDataServiceContract,
} from '../shared/base-consumption.directive';
import { ErrorModalComponent } from '../shared/error-modal/error-modal.component';
import { HouseholdService } from '../services/household.service';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';
import { HeatingRoomsModalComponent } from '../shared/heating-rooms-modal/heating-rooms-modal.component';
import {
  DetailedRecordsComponent,
  SortOptionConfig,
  GenericRecord,
} from '../shared/detailed-records/detailed-records.component';
import { DeleteConfirmationModalComponent } from '../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { ComparisonNoteComponent } from '../shared/comparison-note/comparison-note.component';
import {
  DynamicHeatingRecord,
  calculateDynamicHeatingTotal,
  parseSafeDate,
} from '../models/records.model';
import { HeatingFactsService } from '../services/heating-facts.service';
import {
  HEATING_RECORD_HELP_STEPS,
  RECORDS_LIST_HELP_STEPS,
  CHART_HELP_STEPS,
  DEMO_WIZARD_STEPS,
  DEMO_TOUR_STEPS,
  HEATING_SORT_OPTIONS,
} from './heating.constants';
import {
  buildHeatingCategoryNames,
  findUnconfirmedSpike,
  getRoomIdsWithData,
  getStoredHeatingSpikes,
  HeatingSpikeEntry,
  saveHeatingSpikes,
} from './heating.utils';
import { DemoTourComponent } from '../shared/demo-tour/demo-tour.component';
import { secureRandom } from '../utils/crypto.utils';
import { ConsumptionPreferencesService } from '../services/consumption-preferences.service';
import { ChartCalculationService } from '../services/chart-calculation.service';
import { LocalStorageService } from '../services/local-storage.service';
import { HeatingRoomUtilsService } from '../services/heating-room-utils.service';
import { LanguageService } from '../services/language.service';
import { ExcelSettingsService } from '../services/excel-settings.service';
import { PredictionService } from '../services/prediction.service';
import { PredictionsPanelComponent } from '../shared/predictions-panel/predictions-panel.component';
import { RecordActionsDropdownComponent } from '../shared/record-actions-dropdown/record-actions-dropdown.component';
import { SuccessModalComponent } from '../shared/success-modal/success-modal.component';

@Component({
  selector: 'app-heating',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    LucideAngularModule,
    ConsumptionChartComponent,
    ConsumptionInputComponent,
    ErrorModalComponent,
    ConfirmationModalComponent,
    HeatingRoomsModalComponent,
    DetailedRecordsComponent,
    ComparisonNoteComponent,
    DeleteConfirmationModalComponent,
    DemoWizardComponent,
    DemoTourComponent,
    PredictionsPanelComponent,
    RecordActionsDropdownComponent,
    SuccessModalComponent,
  ],
  templateUrl: './heating.component.html',
  styleUrl: './heating.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeatingComponent
  extends BaseConsumptionComponent<DynamicHeatingRecord>
  implements OnInit
{
  protected readonly dataService = inject(HeatingDataService);
  protected readonly formService = inject(HeatingFormService);
  protected readonly roomsService = inject(HeatingRoomsService);
  protected readonly excelSettings = inject(ExcelSettingsService);
  protected readonly demoService = inject(DemoService);
  private readonly heatingFactsService = inject(HeatingFactsService);
  private readonly preferencesService = inject(ConsumptionPreferencesService);
  private readonly chartCalculationService = inject(ChartCalculationService);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly roomUtilsService = inject(HeatingRoomUtilsService);
  private readonly languageService = inject(LanguageService);
  private readonly householdService = inject(HouseholdService);
  private readonly predictionService = inject(PredictionService);

  override get baseDataService(): ConsumptionDataServiceContract<DynamicHeatingRecord> {
    return this.dataService;
  }

  protected readonly SettingsIcon = Settings;
  protected readonly LightbulbIcon = Lightbulb;

  protected readonly records = this.dataService.records;
  protected readonly heatingPrediction = computed(() =>
    this.predictionService.predictHeating(this.records()),
  );
  protected readonly isExporting = this.dataService.isExporting;
  protected readonly isImporting = this.dataService.isImporting;
  protected readonly showImportConfirmModal = this.dataService.showImportConfirmModal;
  protected readonly showSuccessModal = this.dataService.showSuccessModal;
  protected readonly successTitle = this.dataService.successTitle;
  protected readonly successMessage = this.dataService.successMessage;
  protected readonly showErrorModal = this.dataService.showErrorModal;
  protected readonly errorTitle = this.dataService.errorTitle;
  protected readonly errorMessage = this.dataService.errorMessage;
  protected readonly errorDetails = this.dataService.errorDetails;
  protected readonly errorInstructions = this.dataService.errorInstructions;
  protected readonly errorType = this.dataService.errorType;

  protected readonly chartView = this.preferencesService.heatingChartView;
  protected readonly displayMode = this.preferencesService.heatingDisplayMode;
  protected readonly selectedPredictionPeriod = signal<30 | 90 | 180 | 365 | 3650>(30);

  protected onPredictionPeriodChange(period: 30 | 90 | 180 | 365 | 3650): void {
    this.selectedPredictionPeriod.set(period);
  }

  protected readonly heatingCategoryNames = computed(() =>
    buildHeatingCategoryNames(this.roomsService.rooms()),
  );

  protected readonly availableCountries = this.heatingFactsService.getAvailableCountries();
  protected readonly selectedCountryCode = signal('DE');

  private readonly syncCountryFromAddress = effect(() => {
    const address = this.householdService.address();
    if (address?.country) {
      const isValid = this.availableCountries.some(
        (c) => c.code.toLowerCase() === address.country.toLowerCase(),
      );
      if (isValid) {
        this.selectedCountryCode.set(address.country.toUpperCase());
      }
    }
  });

  protected readonly selectedCountryName = computed(() => {
    const code = this.selectedCountryCode();
    const country = this.availableCountries.find((c) => c.code === code);
    return country ? this.languageService.translate(country.nameKey) : code;
  });

  protected onCountryChange(code: string): void {
    this.selectedCountryCode.set(code);
    this.refreshFact();
  }

  protected readonly helpSteps = HEATING_RECORD_HELP_STEPS;
  protected readonly chartHelpSteps = CHART_HELP_STEPS;
  protected readonly recordsHelpSteps = RECORDS_LIST_HELP_STEPS;

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

  protected readonly heatingSortOptions: SortOptionConfig[] = HEATING_SORT_OPTIONS;

  protected readonly calculateTotal = (record: GenericRecord): number =>
    calculateDynamicHeatingTotal(record as DynamicHeatingRecord);

  private readonly factRandomSeed = signal(secureRandom());
  protected readonly heatingFact = computed(() => {
    const records = this.records();
    const mode = this.displayMode();
    const seed = this.factRandomSeed();
    const countryCode = this.selectedCountryCode();
    if (records.length === 0) return null;
    const factIndex = Math.floor(seed * 15);
    const factMode = mode === 'total' ? 'historical' : 'country';
    return this.heatingFactsService.getFactByIndex(0, factIndex, factMode, countryCode);
  });

  protected refreshFact(): void {
    this.factRandomSeed.set(secureRandom());
  }

  protected readonly showRoomsModal = signal(false);

  protected readonly showDeleteModal = this.dataService.showDeleteModal;
  protected readonly recordToDelete = this.dataService.recordToDelete;
  protected readonly showDeleteAllModal = this.dataService.showDeleteAllModal;
  protected readonly recordsToDeleteAll = this.dataService.recordsToDelete;

  protected readonly confirmedSpikes = signal<HeatingSpikeEntry[]>(
    getStoredHeatingSpikes(this.localStorageService, 'confirmed'),
  );
  protected readonly dismissedSpikes = signal<HeatingSpikeEntry[]>(
    getStoredHeatingSpikes(this.localStorageService, 'dismissed'),
  );

  protected readonly detectedSpikes = computed(() =>
    this.chartCalculationService.detectNewRoomSpikes(this.records()),
  );

  protected readonly unconfirmedSpike = computed(() =>
    findUnconfirmedSpike(this.detectedSpikes(), this.confirmedSpikes(), this.dismissedSpikes()),
  );

  protected readonly unconfirmedSpikeRoomName = computed(() => {
    const spike = this.unconfirmedSpike();
    if (!spike) return '';
    const room = this.roomsService.rooms().find((r) => r.id === spike.roomId);
    if (!room) return spike.roomId;
    return room.type ? this.languageService.translate(room.type) : room.name;
  });

  protected readonly formattedSpikeDate = computed(() => {
    const spike = this.unconfirmedSpike();
    if (!spike) return '';
    return this.languageService.formatDate(parseSafeDate(spike.date), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  protected readonly unconfirmedSpikeParams = computed(() => ({
    room: this.unconfirmedSpikeRoomName(),
    date: this.formattedSpikeDate(),
  }));

  protected readonly adjustedRecords = computed(() =>
    this.chartCalculationService.adjustForNewRooms(this.records(), this.confirmedSpikes()),
  );

  protected readonly chartRecords = computed(() =>
    this.displayMode() === 'incremental' ? this.records() : this.adjustedRecords(),
  );

  protected confirmSpike(spike: HeatingSpikeEntry): void {
    this.confirmedSpikes.update((s) => [...s, { date: spike.date, roomId: spike.roomId }]);
    saveHeatingSpikes(this.localStorageService, 'confirmed', this.confirmedSpikes());
  }

  protected dismissSpike(spike: HeatingSpikeEntry): void {
    this.dismissedSpikes.update((s) => [...s, { date: spike.date, roomId: spike.roomId }]);
    saveHeatingSpikes(this.localStorageService, 'dismissed', this.dismissedSpikes());
  }

  private readonly chartRoomMeta = computed(() => {
    this.languageService.currentLang();
    this.languageService.translationVersion?.();
    const rooms = this.roomsService.rooms();
    const names = new Array<string>(rooms.length);
    const ids = new Array<string>(rooms.length);
    const colors = new Array<{ border: string; bg: string }>(rooms.length);
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      names[i] = r.type ? this.languageService.translate(r.type) : r.name;
      ids[i] = r.id;
      colors[i] = this.roomUtilsService.getRoomColor(r);
    }
    return { names, ids, colors };
  });

  protected readonly chartRoomNames = computed(() => this.chartRoomMeta().names);
  protected readonly chartRoomIds = computed(() => this.chartRoomMeta().ids);
  protected readonly chartRoomColors = computed(() => this.chartRoomMeta().colors);

  protected readonly roomsWithData = computed(() => getRoomIdsWithData(this.records()));

  protected readonly selectedDate = this.formService.selectedDate;
  protected readonly editingRecord = this.formService.editingRecord;
  protected readonly dateExists = computed(() => this.formService.isDateDuplicate(this.records()));
  protected readonly maxDate = new Date().toISOString().split('T')[0];

  protected readonly consumptionGroups = computed<ConsumptionGroup[]>(() => [
    {
      title: 'HEATING.READINGS_BY_ROOM',
      fields: this.roomsService.rooms().map((room) => ({
        key: room.id,
        label: room.name,
        value: this.formService.getRoomValue(room.id),
        icon: this.roomUtilsService.getRoomIcon(room),
      })),
    },
  ]);

  protected getRoomValue(record: DynamicHeatingRecord, roomId: string): number {
    return record.rooms[roomId] || 0;
  }

  protected readonly onChartViewChange = (view: ChartView): void => {
    this.preferencesService.setChartView(view, 'heating');
    this.refreshFact();
  };

  protected readonly onDisplayModeChange = (mode: DisplayMode): void => {
    this.preferencesService.setDisplayMode(mode, 'heating');
    this.refreshFact();
  };

  ngOnInit(): void {
    if (!this.dataService.isInitialized?.()) {
      void this.dataService.loadData();
    }
  }

  protected closeSuccessModal(): void {
    this.dataService.closeSuccessModal();
  }

  protected closeErrorModal(): void {
    this.dataService.closeErrorModal();
  }

  protected onConsumptionSave(): void {
    const newRecord = this.formService.createRecordFromState();
    if (newRecord) {
      void this.dataService.saveRecord(newRecord, this.editingRecord());
      this.cancelEdit();
      this.dataService.successTitle.set('HEATING.SUCCESS_TITLE');
      this.dataService.successMessage.set('HEATING.RECORD_SAVED');
      this.dataService.showSuccessModal.set(true);
    }
  }

  protected onFieldChange(event: { key: string; value: number | null }): void {
    this.formService.updateField(event.key, event.value);
  }

  protected cancelEdit(): void {
    this.formService.cancelEdit();
  }

  protected openRoomsModal(): void {
    this.showRoomsModal.set(true);
  }

  protected onRoomsSave(rooms: HeatingRoomConfig[]): void {
    this.roomsService.setRooms(rooms);
    this.showRoomsModal.set(false);
  }

  protected onRoomsCancel(): void {
    this.showRoomsModal.set(false);
  }

  protected onEditRecord(record: GenericRecord): void {
    this.formService.startEdit(record as DynamicHeatingRecord);
    document.querySelector('app-consumption-input')?.scrollIntoView({ behavior: 'smooth' });
  }

  protected onDeleteRecord(record: GenericRecord): void {
    this.recordToDelete.set(record as DynamicHeatingRecord);
    this.showDeleteModal.set(true);
  }

  protected onDeleteAllRecords(recordsToDelete: GenericRecord[]): void {
    this.recordsToDeleteAll.set(recordsToDelete as DynamicHeatingRecord[]);
    this.showDeleteAllModal.set(true);
  }

  protected readonly deleteAllMessageKey = computed(() =>
    this.recordsToDeleteAll().length === 1
      ? 'HOME.DELETE_ALL_CONFIRM_MESSAGE_SINGULAR'
      : 'HOME.DELETE_ALL_CONFIRM_MESSAGE_PLURAL',
  );

  protected readonly deleteAllMessageParams = computed(() => ({
    count: this.recordsToDeleteAll().length.toString(),
  }));
}
