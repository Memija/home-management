import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../pipes/translate.pipe';
import { STORAGE_SERVICE } from '../services/storage.service';
import { FileStorageService } from '../services/file-storage.service';
import { LanguageService } from '../services/language.service';
import { ExcelService } from '../services/excel.service';
import { ExcelSettingsService } from '../services/excel-settings.service';
import { HeatingFormService } from '../services/heating-form.service';
import { HeatingRoomsService, HeatingRoomConfig } from '../services/heating-rooms.service';
import { LucideAngularModule, ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Download, Upload, FileSpreadsheet, Settings, CheckCircle, Armchair, Bed, Bath, CookingPot, Baby, Briefcase, DoorOpen, UtensilsCrossed, Home, Lightbulb, Info, Trash2, FileText, AlertTriangle } from 'lucide-angular';

import { ConsumptionChartComponent, type ChartView, type DisplayMode } from '../shared/consumption-chart/consumption-chart.component';
import { ConsumptionInputComponent, type ConsumptionData, type ConsumptionGroup } from '../shared/consumption-input/consumption-input.component';
import { ErrorModalComponent } from '../shared/error-modal/error-modal.component';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';
import { HeatingRoomsModalComponent } from '../shared/heating-rooms-modal/heating-rooms-modal.component';
import { DetailedRecordsComponent, SortOptionConfig } from '../shared/detailed-records/detailed-records.component';
import { DeleteConfirmationModalComponent } from '../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { ComparisonNoteComponent } from '../shared/comparison-note/comparison-note.component';
import { ImportValidationService } from '../services/import-validation.service';
import { DynamicHeatingRecord, HeatingRecord, calculateDynamicHeatingTotal, filterZeroPlaceholders, isDynamicHeatingRecordAllZero, isHeatingRecordAllZero, toHeatingRecord, toDynamicHeatingRecord } from '../models/records.model';
import { NotificationService } from '../services/notification.service';
import { HeatingFactsService } from '../services/heating-facts.service';
import { HouseholdService } from '../services/household.service';
import { HEATING_RECORD_HELP_STEPS, RECORDS_LIST_HELP_STEPS } from './heating.constants';
import { PdfService } from '../services/pdf.service';
import { ConsumptionPreferencesService } from '../services/consumption-preferences.service';
import { ChartCalculationService } from '../services/chart-calculation.service';
import { LocalStorageService } from '../services/local-storage.service';

const ROOM_TYPE_ICONS: Record<string, any> = {
  'HEATING.ROOM_LIVING_ROOM': Armchair,
  'HEATING.ROOM_BEDROOM': Bed,
  'HEATING.ROOM_KIDS_ROOM': Baby,
  'HEATING.ROOM_KITCHEN': CookingPot,
  'HEATING.ROOM_BATHROOM': Bath,
  'HEATING.ROOM_OFFICE': Briefcase,
  'HEATING.ROOM_GUEST_ROOM': DoorOpen,
  'HEATING.ROOM_DINING_ROOM': UtensilsCrossed,
  'HEATING.ROOM_HALLWAY': DoorOpen,
  'HEATING.ROOM_ATTIC': Home
};

// Chart colors by room type - semantically meaningful colors
const ROOM_TYPE_COLORS: Record<string, { border: string; bg: string }> = {
  'HEATING.ROOM_LIVING_ROOM': { border: '#e91e63', bg: 'rgba(233, 30, 99, 0.1)' },    // Pink - warm, cozy
  'HEATING.ROOM_BEDROOM': { border: '#9c27b0', bg: 'rgba(156, 39, 176, 0.1)' },       // Purple - calm, restful
  'HEATING.ROOM_KIDS_ROOM': { border: '#ff9800', bg: 'rgba(255, 152, 0, 0.1)' },      // Orange - playful, energetic
  'HEATING.ROOM_KITCHEN': { border: '#28a745', bg: 'rgba(40, 167, 69, 0.1)' },        // Green - fresh, natural
  'HEATING.ROOM_BATHROOM': { border: '#00bcd4', bg: 'rgba(0, 188, 212, 0.1)' },       // Cyan - water, clean
  'HEATING.ROOM_OFFICE': { border: '#3f51b5', bg: 'rgba(63, 81, 181, 0.1)' },         // Indigo - professional, focused
  'HEATING.ROOM_GUEST_ROOM': { border: '#795548', bg: 'rgba(121, 85, 72, 0.1)' },     // Brown - welcoming, warm
  'HEATING.ROOM_DINING_ROOM': { border: '#ff5722', bg: 'rgba(255, 87, 34, 0.1)' },    // Deep orange - appetite, social
  'HEATING.ROOM_HALLWAY': { border: '#607d8b', bg: 'rgba(96, 125, 139, 0.1)' },       // Blue-gray - neutral, transitional
  'HEATING.ROOM_ATTIC': { border: '#9e9e9e', bg: 'rgba(158, 158, 158, 0.1)' }         // Gray - storage, secondary
};

// Default color for unknown room types
const DEFAULT_ROOM_COLOR = { border: '#ffa726', bg: 'rgba(255, 167, 38, 0.1)' };

@Component({
  selector: 'app-heating',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, LucideAngularModule, ConsumptionChartComponent, ConsumptionInputComponent, ErrorModalComponent, ConfirmationModalComponent, HeatingRoomsModalComponent, DetailedRecordsComponent, ComparisonNoteComponent, DeleteConfirmationModalComponent],
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
  private heatingFactsService = inject(HeatingFactsService);
  private householdService = inject(HouseholdService);
  private preferencesService = inject(ConsumptionPreferencesService);
  private chartCalculationService = inject(ChartCalculationService);
  private localStorageService = inject(LocalStorageService);

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

  private pdfService = inject(PdfService);

  // Available countries for heating facts - from service
  protected readonly availableCountries = this.heatingFactsService.getAvailableCountries();

  // Selected country for facts
  protected selectedCountryCode = signal('DE');

  // Get selected country name
  protected selectedCountryName = computed(() => {
    const code = this.selectedCountryCode();
    const country = this.availableCountries.find(c => c.code === code);
    return country ? this.languageService.translate(country.nameKey) : code;
  });

  protected onCountryChange(code: string): void {
    this.selectedCountryCode.set(code);
    this.refreshFact();
  }

  // Help Steps for recording form
  protected readonly helpSteps = HEATING_RECORD_HELP_STEPS;
  protected readonly recordsHelpSteps = RECORDS_LIST_HELP_STEPS;

  // Sort options for detailed records component
  protected readonly heatingSortOptions: SortOptionConfig[] = [
    { value: 'date-desc', labelKey: 'HOME.SORT.DATE_DESC', direction: '↓' },
    { value: 'date-asc', labelKey: 'HOME.SORT.DATE_ASC', direction: '↑' },
    { value: 'total-desc', labelKey: 'HOME.SORT.TOTAL_DESC', direction: '↓' },
    { value: 'total-asc', labelKey: 'HOME.SORT.TOTAL_ASC', direction: '↑' }
  ];

  // Calculate total callback for detailed records - arrow function to maintain 'this' context
  protected readonly calculateTotal = (record: any): number => {
    return calculateDynamicHeatingTotal(record as DynamicHeatingRecord);
  };

  // Random seed for heating facts - changes when chart view changes
  private factRandomSeed = signal(Math.random());

  // Heating fun fact - changes based on display mode
  protected heatingFact = computed(() => {
    const records = this.chartRecords();
    const mode = this.displayMode();
    const seed = this.factRandomSeed();

    // For incremental/country mode, use selected country from dropdown
    // For total mode, the country doesn't matter (historical facts)
    const countryCode = mode === 'total' ? 'GENERAL' : this.selectedCountryCode();

    if (records.length === 0) {
      return null;
    }

    // Calculate random index from seed
    const factIndex = Math.floor(seed * 15);

    // Total mode = historical facts, Incremental = country facts
    const factMode = mode === 'total' ? 'historical' : 'country';

    return this.heatingFactsService.getFactByIndex(
      0, // kWh not needed currently
      factIndex,
      factMode,
      countryCode
    );
  });

  // Refresh the displayed fact
  protected refreshFact(): void {
    this.factRandomSeed.set(Math.random());
  }

  protected isExporting = signal(false);
  protected isImporting = signal(false);
  protected showSuccessModal = signal(false);
  protected successTitle = signal('HEATING.SUCCESS_TITLE');
  protected successMessage = signal('HEATING.RECORD_SAVED');
  protected showErrorModal = signal(false);
  protected errorTitle = signal('ERROR.TITLE');

  protected closeSuccessModal() {
    this.showSuccessModal.set(false);
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

      // Persist to storage
      this.storage.save('heating_consumption_records', this.records());

      this.cancelEdit();
      this.successTitle.set('HEATING.SUCCESS_TITLE');
      this.successMessage.set('HEATING.RECORD_SAVED');
      this.showSuccessModal.set(true);

      // Update notification service
      this.notificationService.setHeatingRecords(this.records());
    }
  }
  protected errorMessage = signal('');
  protected errorDetails = signal('');
  protected errorInstructions = signal<string[]>([]);
  protected errorType = signal<'error' | 'warning' | 'success'>('error');

  protected records = signal<DynamicHeatingRecord[]>([]);
  protected showImportConfirmModal = signal(false);
  protected pendingImportFile = signal<File | null>(null);
  protected chartView = this.preferencesService.heatingChartView;
  protected displayMode = this.preferencesService.heatingDisplayMode;
  protected showRoomsModal = signal(false);

  // Delete confirmation modal state
  protected showDeleteModal = signal(false);
  protected recordToDelete = signal<DynamicHeatingRecord | null>(null);
  protected showDeleteAllModal = signal(false);
  protected recordsToDeleteAll = signal<DynamicHeatingRecord[]>([]);

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

  // New Room Spikes Detection
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

    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });

  protected adjustedRecords = computed(() => {
    return this.chartCalculationService.adjustForNewRooms(this.records(), this.confirmedSpikes());
  });

  // Pass adjusted records to chart component
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

  // Extract room names for chart labels
  protected chartRoomNames = computed(() => this.roomsService.rooms().map(r => r.name));

  // Extract room IDs for chart data mapping
  protected chartRoomIds = computed(() => this.roomsService.rooms().map(r => r.id));

  // Extract room colors for chart - uses room type or name-based heuristics
  protected chartRoomColors = computed(() => this.roomsService.rooms().map(r => this.getRoomColor(r)));

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
        value: this.formService.getRoomValue(room.id),
        icon: this.getRoomIcon(room)
      }))
    }];
  });

  protected getRoomIcon(room: HeatingRoomConfig): any {
    // 1. Try to use explicit room type
    if (room.type && ROOM_TYPE_ICONS[room.type]) {
      return ROOM_TYPE_ICONS[room.type];
    }

    // 2. Fallback: heuristic guessing for legacy data or custom names without type
    return this.guessLegacyIcon(room.name);
  }

  private guessLegacyIcon(name: string): any {
    const lower = name.toLowerCase();

    // Pattern mapping: translation key -> icon
    const patternMapping: Array<{ patternKey: string; icon: any }> = [
      { patternKey: 'HEATING.ROOM_PATTERNS_LIVING', icon: Armchair },
      { patternKey: 'HEATING.ROOM_PATTERNS_BEDROOM', icon: Bed },
      { patternKey: 'HEATING.ROOM_PATTERNS_BATHROOM', icon: Bath },
      { patternKey: 'HEATING.ROOM_PATTERNS_KITCHEN', icon: CookingPot },
      { patternKey: 'HEATING.ROOM_PATTERNS_KIDS', icon: Baby },
      { patternKey: 'HEATING.ROOM_PATTERNS_OFFICE', icon: Briefcase },
      { patternKey: 'HEATING.ROOM_PATTERNS_GUEST', icon: DoorOpen },
      { patternKey: 'HEATING.ROOM_PATTERNS_DINING', icon: UtensilsCrossed },
      { patternKey: 'HEATING.ROOM_PATTERNS_HALLWAY', icon: DoorOpen }
    ];

    for (const { patternKey, icon } of patternMapping) {
      const patternsString = this.languageService.translate(patternKey);
      // Split comma-separated patterns and check if any match
      const patterns = patternsString.split(',').map(p => p.trim().toLowerCase());
      if (patterns.some(pattern => pattern && lower.includes(pattern))) {
        return icon;
      }
    }

    return Home;
  }

  protected getRoomColor(room: HeatingRoomConfig): { border: string; bg: string } {
    // 1. Try to use explicit room type
    if (room.type && ROOM_TYPE_COLORS[room.type]) {
      return ROOM_TYPE_COLORS[room.type];
    }

    // 2. Fallback: heuristic guessing for legacy data or custom names without type
    return this.guessLegacyColor(room.name);
  }

  private guessLegacyColor(name: string): { border: string; bg: string } {
    const lower = name.toLowerCase();

    // Pattern mapping: translation key -> room type key for color lookup
    const patternMapping: Array<{ patternKey: string; roomType: string }> = [
      { patternKey: 'HEATING.ROOM_PATTERNS_LIVING', roomType: 'HEATING.ROOM_LIVING_ROOM' },
      { patternKey: 'HEATING.ROOM_PATTERNS_BEDROOM', roomType: 'HEATING.ROOM_BEDROOM' },
      { patternKey: 'HEATING.ROOM_PATTERNS_BATHROOM', roomType: 'HEATING.ROOM_BATHROOM' },
      { patternKey: 'HEATING.ROOM_PATTERNS_KITCHEN', roomType: 'HEATING.ROOM_KITCHEN' },
      { patternKey: 'HEATING.ROOM_PATTERNS_KIDS', roomType: 'HEATING.ROOM_KIDS_ROOM' },
      { patternKey: 'HEATING.ROOM_PATTERNS_OFFICE', roomType: 'HEATING.ROOM_OFFICE' },
      { patternKey: 'HEATING.ROOM_PATTERNS_GUEST', roomType: 'HEATING.ROOM_GUEST_ROOM' },
      { patternKey: 'HEATING.ROOM_PATTERNS_DINING', roomType: 'HEATING.ROOM_DINING_ROOM' },
      { patternKey: 'HEATING.ROOM_PATTERNS_HALLWAY', roomType: 'HEATING.ROOM_HALLWAY' }
    ];

    for (const { patternKey, roomType } of patternMapping) {
      const patternsString = this.languageService.translate(patternKey);
      // Split comma-separated patterns and check if any match
      const patterns = patternsString.split(',').map(p => p.trim().toLowerCase());
      if (patterns.some(pattern => pattern && lower.includes(pattern))) {
        return ROOM_TYPE_COLORS[roomType] ?? DEFAULT_ROOM_COLOR;
      }
    }

    return DEFAULT_ROOM_COLOR;
  }

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
      .replace('{{current}}', this.currentPage().toString())
      .replace('{{total}}', this.totalPages().toString());
  });

  protected showingRecordsText = computed(() => {
    const key = 'HOME.SHOWING_RECORDS';
    const template = this.languageService.translate(key);
    return template
      .replace('{{current}}', this.displayedRecords().length.toString())
      .replace('{{total}}', this.records().length.toString());
  });

  protected onChartViewChange = (view: ChartView): void => {
    this.preferencesService.setChartView(view, 'heating');
    this.refreshFact(); // Trigger new random fact
  };

  protected onDisplayModeChange = (mode: DisplayMode): void => {
    this.preferencesService.setDisplayMode(mode, 'heating');
    this.refreshFact(); // Trigger new random fact
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
      // Sync with notification service for due/overdue reminders
      this.notificationService.setHeatingRecords(this.records());
    }
  }

  async exportData() {
    this.isExporting.set(true);
    try {
      const records = await this.storage.exportRecords('heating_consumption_records');
      this.fileStorage.exportToFile(records, 'heating-consumption.json');
    } finally {
      this.isExporting.set(false);
    }
  }

  async exportToExcel() {
    this.isExporting.set(true);
    try {
      this.excelService.exportHeatingToExcel(
        this.records(),
        'heating-consumption.xlsx'
      );
    } catch (error) {
      console.error('Excel export error:', error);
      alert(this.languageService.translate('HEATING.EXCEL_IMPORT_ERROR'));
    } finally {
      this.isExporting.set(false);
    }
  }

  async exportToPdf() {
    this.isExporting.set(true);
    try {
      const roomNames = this.roomsService.rooms().map(r => r.name);
      await this.pdfService.exportHeatingToPdf(
        this.records(),
        roomNames,
        'heating-consumption.pdf'
      );
    } catch (error) {
      console.error('PDF export error:', error);
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
        // Validate records with strict room ID check
        const expectedRoomIds = this.roomsService.rooms().map(r => r.id);
        const result = this.importValidationService.validateHeatingJsonImport(data as unknown[], expectedRoomIds);
        if (result.errors.length > 0) {
          throw new Error(result.errors.join('\n'));
        }

        // Filter out zero-value placeholders
        // Cast result.validRecords to DynamicHeatingRecord[] because we updated the validator
        // to return dynamic records (even though interface says HeatingRecord for now)
        const validDynamicRecords = result.validRecords as unknown as DynamicHeatingRecord[];

        const { filtered, skippedCount } = filterZeroPlaceholders(validDynamicRecords, isDynamicHeatingRecordAllZero);

        // Import records (they are already dynamic)
        await this.storage.importRecords('heating_consumption_records', filtered);
        await this.loadData();
        // Update notification service
        this.notificationService.setHeatingRecords(this.records());

        // Show warning if placeholders were skipped, otherwise show success
        if (skippedCount > 0) {
          const key = skippedCount === 1 ? 'HEATING.IMPORT_PLACEHOLDER_SKIPPED_SINGULAR' : 'HEATING.IMPORT_PLACEHOLDER_SKIPPED_PLURAL';
          this.errorType.set('warning');
          this.errorTitle.set(this.languageService.translate('HOME.IMPORT_WARNING_TITLE'));
          this.errorMessage.set(this.languageService.translate(key).replace('{{count}}', skippedCount.toString()));
          this.errorDetails.set('');
          this.errorInstructions.set([]);
          this.showErrorModal.set(true);
        } else {
          // Show success message
          this.successTitle.set('IMPORT.SUCCESS_TITLE');
          this.successMessage.set('IMPORT.JSON_SUCCESS');
          this.showSuccessModal.set(true);
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
          warnings.push(this.languageService.translate(key).replace('{{count}}', skippedCount.toString()));
        }

        if (warnings.length > 0) {
          this.errorTitle.set(this.languageService.translate('HOME.IMPORT_WARNING_TITLE'));
          this.errorMessage.set(this.languageService.translate('HOME.IMPORT_WARNING_MESSAGE'));
          this.errorDetails.set(warnings.join('\n'));
          this.errorInstructions.set([]);
          this.errorType.set('warning');
          this.showErrorModal.set(true);
        } else {
          // Show success message
          this.successTitle.set('IMPORT.SUCCESS_TITLE');
          this.successMessage.set('IMPORT.EXCEL_SUCCESS');
          this.showSuccessModal.set(true);
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

  // Record event handlers from DetailedRecordsComponent
  protected onEditRecord(record: any) {
    this.formService.startEdit(record as DynamicHeatingRecord);
    // Scroll to the form section
    const formSection = document.querySelector('app-consumption-input');
    formSection?.scrollIntoView({ behavior: 'smooth' });
  }

  protected onDeleteRecord(record: any) {
    this.recordToDelete.set(record as DynamicHeatingRecord);
    this.showDeleteModal.set(true);
  }

  protected confirmDelete() {
    const record = this.recordToDelete();
    if (record) {
      this.records.update(records => records.filter(r => r.date.getTime() !== record.date.getTime()));
      this.storage.save('heating_consumption_records', this.records());
      this.notificationService.setHeatingRecords(this.records());
    }
    this.showDeleteModal.set(false);
    this.recordToDelete.set(null);
  }

  protected cancelDelete() {
    this.showDeleteModal.set(false);
    this.recordToDelete.set(null);
  }

  protected onDeleteAllRecords(recordsToDelete: any[]) {
    this.recordsToDeleteAll.set(recordsToDelete as DynamicHeatingRecord[]);
    this.showDeleteAllModal.set(true);
  }

  protected confirmDeleteAll() {
    const recordsToDelete = this.recordsToDeleteAll();
    const datesToDelete = new Set(recordsToDelete.map((r: any) => r.date.getTime()));
    this.records.update(records => records.filter(r => !datesToDelete.has(r.date.getTime())));
    this.storage.save('heating_consumption_records', this.records());
    this.notificationService.setHeatingRecords(this.records());
    this.showDeleteAllModal.set(false);
    this.recordsToDeleteAll.set([]);
  }

  protected cancelDeleteAll() {
    this.showDeleteAllModal.set(false);
    this.recordsToDeleteAll.set([]);
  }

  // Computed property for delete all message key (singular/plural)
  protected deleteAllMessageKey = computed(() => {
    const count = this.recordsToDeleteAll().length;
    return count === 1 ? 'HOME.DELETE_ALL_CONFIRM_MESSAGE_SINGULAR' : 'HOME.DELETE_ALL_CONFIRM_MESSAGE_PLURAL';
  });

  // Computed property for delete all message params
  protected deleteAllMessageParams = computed(() => ({
    count: this.recordsToDeleteAll().length.toString()
  }));
}
