import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../pipes/translate.pipe';
import { HeatingFormService } from '../services/heating-form.service';
import { HeatingRoomsService, HeatingRoomConfig } from '../services/heating-rooms.service';
import { HeatingDataService } from '../services/heating-data.service';
import { LucideAngularModule, ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Download, Upload, FileSpreadsheet, Settings, CheckCircle, Lightbulb, Info, Trash2, FileText, AlertTriangle } from 'lucide-angular';

import { ConsumptionChartComponent, type ChartView, type DisplayMode } from '../shared/consumption-chart/consumption-chart.component';
import { ConsumptionInputComponent, type ConsumptionData, type ConsumptionGroup } from '../shared/consumption-input/consumption-input.component';
import { ErrorModalComponent } from '../shared/error-modal/error-modal.component';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';
import { HeatingRoomsModalComponent } from '../shared/heating-rooms-modal/heating-rooms-modal.component';
import { DetailedRecordsComponent, SortOptionConfig, GenericRecord } from '../shared/detailed-records/detailed-records.component';
import { DeleteConfirmationModalComponent } from '../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { ComparisonNoteComponent } from '../shared/comparison-note/comparison-note.component';
import { DynamicHeatingRecord, calculateDynamicHeatingTotal } from '../models/records.model';
import { HeatingFactsService } from '../services/heating-facts.service';
import { HEATING_RECORD_HELP_STEPS, RECORDS_LIST_HELP_STEPS } from './heating.constants';
import { ConsumptionPreferencesService } from '../services/consumption-preferences.service';
import { ChartCalculationService } from '../services/chart-calculation.service';
import { LocalStorageService } from '../services/local-storage.service';
import { HeatingRoomUtilsService } from '../services/heating-room-utils.service';
import { LanguageService } from '../services/language.service';
import { ExcelSettingsService } from '../services/excel-settings.service';

@Component({
  selector: 'app-heating',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, LucideAngularModule, ConsumptionChartComponent, ConsumptionInputComponent, ErrorModalComponent, ConfirmationModalComponent, HeatingRoomsModalComponent, DetailedRecordsComponent, ComparisonNoteComponent, DeleteConfirmationModalComponent],
  templateUrl: './heating.component.html',
  styleUrl: './heating.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeatingComponent {
  // Services
  protected dataService = inject(HeatingDataService);
  protected formService = inject(HeatingFormService);
  protected roomsService = inject(HeatingRoomsService);
  protected excelSettings = inject(ExcelSettingsService);
  private heatingFactsService = inject(HeatingFactsService);
  private preferencesService = inject(ConsumptionPreferencesService);
  private chartCalculationService = inject(ChartCalculationService);
  private localStorageService = inject(LocalStorageService);
  private roomUtilsService = inject(HeatingRoomUtilsService);
  private languageService = inject(LanguageService);

  // Icons
  protected readonly ArrowLeftIcon = ArrowLeft;
  protected readonly ChevronDownIcon = ChevronDown;
  protected readonly ChevronLeftIcon = ChevronLeft;
  protected readonly ChevronRightIcon = ChevronRight;
  protected readonly DownloadIcon = Download;
  protected readonly UploadIcon = Upload;
  protected readonly FileSpreadsheetIcon = FileSpreadsheet;
  protected readonly SettingsIcon = Settings;
  protected readonly CheckCircleIcon = CheckCircle;
  protected readonly LightbulbIcon = Lightbulb;
  protected readonly InfoIcon = Info;
  protected readonly TrashIcon = Trash2;
  protected readonly FileTextIcon = FileText;
  protected readonly AlertTriangleIcon = AlertTriangle;

  // State delegation to HeatingDataService
  protected records = this.dataService.records;
  protected isExporting = this.dataService.isExporting;
  protected isImporting = this.dataService.isImporting;
  protected showImportConfirmModal = this.dataService.showImportConfirmModal;
  protected showSuccessModal = this.dataService.showSuccessModal;
  protected successTitle = this.dataService.successTitle;
  protected successMessage = this.dataService.successMessage;
  protected showErrorModal = this.dataService.showErrorModal;
  protected errorTitle = this.dataService.errorTitle;
  protected errorMessage = this.dataService.errorMessage;
  protected errorDetails = this.dataService.errorDetails;
  protected errorInstructions = this.dataService.errorInstructions;
  protected errorType = this.dataService.errorType;

  // Chart preferences
  protected chartView = this.preferencesService.heatingChartView;
  protected displayMode = this.preferencesService.heatingDisplayMode;

  // Country selection for facts
  protected readonly availableCountries = this.heatingFactsService.getAvailableCountries();
  protected selectedCountryCode = signal('DE');
  protected selectedCountryName = computed(() => {
    const code = this.selectedCountryCode();
    const country = this.availableCountries.find(c => c.code === code);
    return country ? this.languageService.translate(country.nameKey) : code;
  });

  protected onCountryChange(code: string): void {
    this.selectedCountryCode.set(code);
    this.refreshFact();
  }

  // Help steps
  protected readonly helpSteps = HEATING_RECORD_HELP_STEPS;
  protected readonly recordsHelpSteps = RECORDS_LIST_HELP_STEPS;

  // Sort options
  protected readonly heatingSortOptions: SortOptionConfig[] = [
    { value: 'date-desc', labelKey: 'HOME.SORT.DATE_DESC', direction: '↓' },
    { value: 'date-asc', labelKey: 'HOME.SORT.DATE_ASC', direction: '↑' },
    { value: 'total-desc', labelKey: 'HOME.SORT.TOTAL_DESC', direction: '↓' },
    { value: 'total-asc', labelKey: 'HOME.SORT.TOTAL_ASC', direction: '↑' }
  ];

  protected readonly calculateTotal = (record: GenericRecord): number => calculateDynamicHeatingTotal(record as DynamicHeatingRecord);

  // Facts
  private factRandomSeed = signal(Math.random());
  protected heatingFact = computed(() => {
    const records = this.chartRecords();
    const mode = this.displayMode();
    const seed = this.factRandomSeed();
    const countryCode = mode === 'total' ? 'GENERAL' : this.selectedCountryCode();
    if (records.length === 0) return null;
    const factIndex = Math.floor(seed * 15);
    const factMode = mode === 'total' ? 'historical' : 'country';
    return this.heatingFactsService.getFactByIndex(0, factIndex, factMode, countryCode);
  });

  protected refreshFact(): void {
    this.factRandomSeed.set(Math.random());
  }

  // Rooms modal
  protected showRoomsModal = signal(false);

  // Delete confirmation modal state
  protected showDeleteModal = signal(false);
  protected recordToDelete = signal<DynamicHeatingRecord | null>(null);
  protected showDeleteAllModal = signal(false);
  protected recordsToDeleteAll = signal<DynamicHeatingRecord[]>([]);

  // Spike detection
  private confirmedSpikes = signal<{ date: string, roomId: string }[]>(this.getStoredSpikes('confirmed'));
  private dismissedSpikes = signal<{ date: string, roomId: string }[]>(this.getStoredSpikes('dismissed'));

  protected detectedSpikes = computed(() => this.chartCalculationService.detectNewRoomSpikes(this.records()));

  protected unconfirmedSpike = computed(() => {
    const detected = this.detectedSpikes();
    const confirmed = this.confirmedSpikes();
    const dismissed = this.dismissedSpikes();
    return detected.find(s =>
      !confirmed.some(c => c.date === s.date && c.roomId === s.roomId) &&
      !dismissed.some(d => d.date === s.date && d.roomId === s.roomId)
    );
  });

  protected unconfirmedSpikeRoomName = computed(() => {
    const spike = this.unconfirmedSpike();
    if (!spike) return '';
    const room = this.roomsService.rooms().find(r => r.id === spike.roomId);
    return room ? room.name : spike.roomId;
  });

  protected formattedSpikeDate = computed(() => {
    const spike = this.unconfirmedSpike();
    if (!spike) return '';
    const date = new Date(spike.date);
    const lang = this.languageService.currentLang();
    const locale = lang === 'de' ? 'de-DE' : 'en-US';
    return date.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  });

  protected adjustedRecords = computed(() => {
    return this.chartCalculationService.adjustForNewRooms(this.records(), this.confirmedSpikes());
  });

  protected chartRecords = computed(() => this.adjustedRecords());

  private getStoredSpikes(type: 'confirmed' | 'dismissed'): { date: string, roomId: string }[] {
    const key = `heating_${type}_spikes`;
    const stored = this.localStorageService.getPreference(key);
    try { return stored ? JSON.parse(stored) : []; } catch { return []; }
  }

  private saveSpikes(type: 'confirmed' | 'dismissed', spikes: { date: string, roomId: string }[]) {
    this.localStorageService.setPreference(`heating_${type}_spikes`, JSON.stringify(spikes));
  }

  protected confirmSpike(spike: { date: string, roomId: string }) {
    this.confirmedSpikes.update(s => [...s, { date: spike.date, roomId: spike.roomId }]);
    this.saveSpikes('confirmed', this.confirmedSpikes());
  }

  protected dismissSpike(spike: { date: string, roomId: string }) {
    this.dismissedSpikes.update(s => [...s, { date: spike.date, roomId: spike.roomId }]);
    this.saveSpikes('dismissed', this.dismissedSpikes());
  }

  // Chart room data
  protected chartRoomNames = computed(() => this.roomsService.rooms().map(r => r.name));
  protected chartRoomIds = computed(() => this.roomsService.rooms().map(r => r.id));
  protected chartRoomColors = computed(() => this.roomsService.rooms().map(r => this.roomUtilsService.getRoomColor(r)));

  // Room IDs that have data in existing records - used to warn when deleting rooms
  protected roomsWithData = computed(() => {
    const roomIdsWithData = new Set<string>();
    for (const record of this.records()) {
      for (const [roomId, value] of Object.entries(record.rooms)) {
        if (value && value > 0) {
          roomIdsWithData.add(roomId);
        }
      }
    }
    return Array.from(roomIdsWithData);
  });

  // Form state
  protected selectedDate = this.formService.selectedDate;
  protected editingRecord = this.formService.editingRecord;
  protected dateExists = computed(() => this.formService.isDateDuplicate(this.records()));
  protected maxDate = new Date().toISOString().split('T')[0];

  protected consumptionGroups = computed<ConsumptionGroup[]>(() => {
    const rooms = this.roomsService.rooms();
    return [{
      title: 'HEATING.ROOMS_SETTINGS_TITLE',
      fields: rooms.map(room => ({
        key: room.id,
        label: room.name,
        value: this.formService.getRoomValue(room.id),
        icon: this.roomUtilsService.getRoomIcon(room)
      }))
    }];
  });

  protected getRoomValue(record: DynamicHeatingRecord, roomId: string): number {
    return record.rooms[roomId] || 0;
  }

  // Chart handlers
  protected onChartViewChange = (view: ChartView): void => {
    this.preferencesService.setChartView(view, 'heating');
    this.refreshFact();
  };

  protected onDisplayModeChange = (mode: DisplayMode): void => {
    this.preferencesService.setDisplayMode(mode, 'heating');
    this.refreshFact();
  };

  constructor() {
    this.dataService.loadData();
  }

  // ===== Delegations to DataService =====
  protected importData(event: Event) { this.dataService.importData(event); }
  protected confirmImport() { this.dataService.confirmImport(); }
  protected cancelImport() { this.dataService.cancelImport(); }
  protected importFromExcel(event: Event) { this.dataService.importFromExcel(event); }
  protected exportData() { this.dataService.exportData(); }
  protected exportToExcel() { this.dataService.exportToExcel(); }
  protected exportToPdf() { this.dataService.exportToPdf(); }
  protected closeSuccessModal() { this.dataService.closeSuccessModal(); }
  protected closeErrorModal() { this.dataService.closeErrorModal(); }

  // Form handlers
  protected onConsumptionSave(data: ConsumptionData) {
    const newRecord = this.formService.createRecordFromState();
    if (newRecord) {
      this.dataService.saveRecord(newRecord, this.editingRecord());
      this.cancelEdit();
      this.dataService.successTitle.set('HEATING.SUCCESS_TITLE');
      this.dataService.successMessage.set('HEATING.RECORD_SAVED');
      this.dataService.showSuccessModal.set(true);
    }
  }

  protected onFieldChange(event: { key: string; value: number | null }) {
    this.formService.updateField(event.key, event.value);
  }

  protected cancelEdit() {
    this.formService.cancelEdit();
  }

  // Room modal handlers
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

  // Record handlers
  protected onEditRecord(record: GenericRecord) {
    this.formService.startEdit(record as DynamicHeatingRecord);
    document.querySelector('app-consumption-input')?.scrollIntoView({ behavior: 'smooth' });
  }

  protected onDeleteRecord(record: GenericRecord) {
    this.recordToDelete.set(record as DynamicHeatingRecord);
    this.showDeleteModal.set(true);
  }

  protected confirmDelete() {
    const record = this.recordToDelete();
    if (record) {
      this.dataService.deleteRecord(record);
    }
    this.showDeleteModal.set(false);
    this.recordToDelete.set(null);
  }

  protected cancelDelete() {
    this.showDeleteModal.set(false);
    this.recordToDelete.set(null);
  }

  protected onDeleteAllRecords(recordsToDelete: GenericRecord[]) {
    this.recordsToDeleteAll.set(recordsToDelete as DynamicHeatingRecord[]);
    this.showDeleteAllModal.set(true);
  }

  protected confirmDeleteAll() {
    this.dataService.deleteRecords(this.recordsToDeleteAll());
    this.showDeleteAllModal.set(false);
    this.recordsToDeleteAll.set([]);
  }

  protected cancelDeleteAll() {
    this.showDeleteAllModal.set(false);
    this.recordsToDeleteAll.set([]);
  }

  protected deleteAllMessageKey = computed(() => {
    const count = this.recordsToDeleteAll().length;
    return count === 1 ? 'HOME.DELETE_ALL_CONFIRM_MESSAGE_SINGULAR' : 'HOME.DELETE_ALL_CONFIRM_MESSAGE_PLURAL';
  });

  protected deleteAllMessageParams = computed(() => ({
    count: this.recordsToDeleteAll().length.toString()
  }));
}
