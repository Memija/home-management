import { Component, Input, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import {
  LucideAngularModule,
  TriangleAlert,
  HelpCircle,
  Home,
  Camera,
  type LucideIconData,
} from 'lucide-angular';
import { DatePickerComponent } from '../date-picker/date-picker.component';
import { HelpModalComponent, HelpStep } from '../help-modal/help-modal.component';
import {
  MeterReaderModalComponent,
  type MeterField,
  type MeterReadingOutput,
} from '../meter-reader-modal/meter-reader-modal.component';

export interface ConsumptionField {
  key: string;
  label: string;
  value: number | null;
  icon?: LucideIconData;
}

export interface ConsumptionGroup {
  title: string;
  fields: ConsumptionField[];
}

export interface ConsumptionData {
  date: string;
  fields: Record<string, number>;
}

@Component({
  selector: 'app-consumption-input',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    LucideAngularModule,
    DatePickerComponent,
    HelpModalComponent,
    MeterReaderModalComponent,
  ],
  templateUrl: './consumption-input.component.html',
  styleUrl: './consumption-input.component.scss',
})
export class ConsumptionInputComponent {
  private languageService = inject(LanguageService);

  protected readonly TriangleAlertIcon = TriangleAlert;
  protected readonly HelpIcon = HelpCircle;
  protected readonly HomeIcon = Home;
  protected readonly CameraIcon = Camera;

  // Inputs
  @Input() set groups(val: ConsumptionGroup[]) {
    this.groupsSignal.set(val || []);
  }
  get groups(): ConsumptionGroup[] {
    return this.groupsSignal();
  }
  protected groupsSignal = signal<ConsumptionGroup[]>([]);

  @Input() set selectedDate(val: string) {
    this.selectedDateSignal.set(val || '');
  }
  get selectedDate(): string {
    return this.selectedDateSignal();
  }
  protected selectedDateSignal = signal<string>('');

  @Input() set maxDate(val: string) {
    this.maxDateSignal.set(val || '');
  }
  get maxDate(): string {
    return this.maxDateSignal();
  }
  protected maxDateSignal = signal<string>('');

  @Input() set editingMode(val: boolean) {
    this.editingModeSignal.set(val);
  }
  get editingMode(): boolean {
    return this.editingModeSignal();
  }
  protected editingModeSignal = signal<boolean>(false);

  @Input() set dateExists(val: boolean) {
    this.dateExistsSignal.set(val);
  }
  get dateExists(): boolean {
    return this.dateExistsSignal();
  }
  protected dateExistsSignal = signal<boolean>(false);

  @Input() set titleKey(val: string) {
    this.titleKeySignal.set(val || 'HOME.RECORD_CONSUMPTION');
  }
  get titleKey(): string {
    return this.titleKeySignal();
  }
  protected titleKeySignal = signal<string>('HOME.RECORD_CONSUMPTION');

  @Input() set editTitleKey(val: string) {
    this.editTitleKeySignal.set(val || 'HOME.EDIT_RECORD');
  }
  get editTitleKey(): string {
    return this.editTitleKeySignal();
  }
  protected editTitleKeySignal = signal<string>('HOME.EDIT_RECORD');

  @Input() set dateWarningKey(val: string) {
    this.dateWarningKeySignal.set(val || 'HOME.DATE_EXISTS_WARNING');
  }
  get dateWarningKey(): string {
    return this.dateWarningKeySignal();
  }
  protected dateWarningKeySignal = signal<string>('HOME.DATE_EXISTS_WARNING');

  @Input() set readingsForKey(val: string) {
    this.readingsForKeySignal.set(val || 'HOME.READINGS_FOR');
  }
  get readingsForKey(): string {
    return this.readingsForKeySignal();
  }
  protected readingsForKeySignal = signal<string>('HOME.READINGS_FOR');

  @Input() set saveKey(val: string) {
    this.saveKeySignal.set(val || 'HOME.SAVE');
  }
  get saveKey(): string {
    return this.saveKeySignal();
  }
  protected saveKeySignal = signal<string>('HOME.SAVE');

  @Input() set updateKey(val: string) {
    this.updateKeySignal.set(val || 'HOME.UPDATE_RECORD');
  }
  get updateKey(): string {
    return this.updateKeySignal();
  }
  protected updateKeySignal = signal<string>('HOME.UPDATE_RECORD');

  @Input() set cancelKey(val: string) {
    this.cancelKeySignal.set(val || 'HOME.CANCEL');
  }
  get cancelKey(): string {
    return this.cancelKeySignal();
  }
  protected cancelKeySignal = signal<string>('HOME.CANCEL');

  @Input() set helpTitleKey(val: string) {
    this.helpTitleKeySignal.set(val || 'HOME.RECORD_HELP_TITLE');
  }
  get helpTitleKey(): string {
    return this.helpTitleKeySignal();
  }
  protected helpTitleKeySignal = signal<string>('HOME.RECORD_HELP_TITLE');

  @Input() set helpSteps(val: HelpStep[]) {
    this.helpStepsSignal.set(val || []);
  }
  get helpSteps(): HelpStep[] {
    return this.helpStepsSignal();
  }
  protected helpStepsSignal = signal<HelpStep[]>([]);

  // When true, individual fields can be saved independently (heating mode)
  // When false, all fields in a group must be complete (water mode)
  @Input() set allowPartialGroups(val: boolean) {
    this.allowPartialGroupsSignal.set(val);
  }
  get allowPartialGroups(): boolean {
    return this.allowPartialGroupsSignal();
  }
  protected allowPartialGroupsSignal = signal<boolean>(false);

  // Layout mode: 'grouped' = show group containers (water), 'flat' = room cards in grid (heating)
  @Input() set layoutMode(val: 'grouped' | 'flat') {
    this.layoutModeSignal.set(val || 'grouped');
  }
  get layoutMode(): 'grouped' | 'flat' {
    return this.layoutModeSignal();
  }
  protected layoutModeSignal = signal<'grouped' | 'flat'>('grouped');

  // Configurable error message keys for validation
  @Input() set noValuesErrorKey(val: string) {
    this.noValuesErrorKeySignal.set(val || 'HOME.PARTIAL_INPUT_ERROR');
  }
  get noValuesErrorKey(): string {
    return this.noValuesErrorKeySignal();
  }
  protected noValuesErrorKeySignal = signal<string>('HOME.PARTIAL_INPUT_ERROR');

  @Input() set incompleteRoomErrorKey(val: string) {
    this.incompleteRoomErrorKeySignal.set(val || 'HOME.INCOMPLETE_ROOM_ERROR');
  }
  get incompleteRoomErrorKey(): string {
    return this.incompleteRoomErrorKeySignal();
  }
  protected incompleteRoomErrorKeySignal = signal<string>('HOME.INCOMPLETE_ROOM_ERROR');

  // State
  protected errorMessage = signal<string | null>(null);
  protected showHelpModal = signal(false);
  protected showMeterReader = signal(false);

  // Outputs
  @Output() dateChange = new EventEmitter<string>();
  @Output() fieldChange = new EventEmitter<{ key: string; value: number | null }>();
  @Output() save = new EventEmitter<ConsumptionData>();
  @Output() cancelModal = new EventEmitter<void>();

  protected currentLang = computed(() => this.languageService.currentLang());

  protected hasValidInput = computed(() => {
    const grps = this.groupsSignal();
    const isGroupComplete = (group: ConsumptionGroup) =>
      group.fields.every((f) => f.value !== null);
    const isGroupEmpty = (group: ConsumptionGroup) => group.fields.every((f) => f.value === null);
    const hasAnyValue = (group: ConsumptionGroup) => group.fields.some((f) => f.value !== null);

    // In partial groups mode (heating), just need at least one field with a value
    if (this.allowPartialGroupsSignal()) {
      return grps.some(hasAnyValue);
    }

    // Standard mode (water): each group must be either complete or empty
    const allGroupsValid = grps.every((group) => isGroupComplete(group) || isGroupEmpty(group));
    // At least one group must be complete
    const atLeastOneComplete = grps.some(isGroupComplete);

    return allGroupsValid && atLeastOneComplete;
  });

  protected onDateChange(newDate: string) {
    this.errorMessage.set(null);
    this.dateChange.emit(newDate);
  }

  protected onFieldChange(key: string, value: number | null) {
    this.errorMessage.set(null);
    // Ensure negative values are not accepted
    if (value !== null && value < 0) {
      value = null;
    }
    this.fieldChange.emit({ key, value });
  }

  protected onKeyDown(event: KeyboardEvent) {
    // Prevent typing minus, plus, 'e', decimal point and comma
    if (['-', '+', 'e', 'E', '.', ','].includes(event.key)) {
      event.preventDefault();
    }
  }

  protected onInput(event: Event) {
    // Handle all input methods (typing, pasting, etc.)
    const input = event.target as HTMLInputElement;

    // Remove any non-numeric characters (except keeping empty string)
    // This catches pastings with disallowed chars
    if (input.value) {
      input.value = input.value.replace(/[^0-9]/g, '');
    }

    const value = parseFloat(input.value);

    // If the value is negative, clear it immediately (double safety)
    if (value < 0) {
      input.value = '';
    }
  }

  protected onSave() {
    if (!this.selectedDateSignal()) {
      this.errorMessage.set('HOME.SELECT_DATE_ERROR');
      return;
    }

    if (this.dateExistsSignal()) {
      this.errorMessage.set(this.dateWarningKeySignal());
      return;
    }

    // Check for specific validation failures
    const grps = this.groupsSignal();
    const isGroupComplete = (group: ConsumptionGroup) =>
      group.fields.every((f) => f.value !== null);
    const isGroupEmpty = (group: ConsumptionGroup) => group.fields.every((f) => f.value === null);
    const isGroupPartial = (group: ConsumptionGroup) =>
      !isGroupComplete(group) && !isGroupEmpty(group);
    const hasAnyValue = (group: ConsumptionGroup) => group.fields.some((f) => f.value !== null);
    // Check if at least one field has a non-zero, non-null value
    const hasNonZeroValue = (group: ConsumptionGroup) =>
      group.fields.some((f) => f.value !== null && f.value > 0);

    const hasPartialGroups = grps.some(isGroupPartial);
    const hasCompleteGroups = grps.some(isGroupComplete);
    const hasAnyValues = grps.some(hasAnyValue);
    const hasAnyNonZeroValues = grps.some(hasNonZeroValue);

    // Prevent saving records where all values are zero or empty
    if (!hasAnyNonZeroValues) {
      this.errorMessage.set(this.noValuesErrorKeySignal());
      return;
    }

    // In partial groups mode (heating), allow saving if at least one field has a value
    if (this.allowPartialGroupsSignal()) {
      if (!hasAnyValues) {
        this.errorMessage.set(this.noValuesErrorKeySignal());
        return;
      }
    } else {
      // Standard mode (water): require complete groups
      if (hasPartialGroups) {
        // User started a room but didn't complete it
        this.errorMessage.set(this.incompleteRoomErrorKeySignal());
        return;
      }

      if (!hasCompleteGroups) {
        // No room has unknown data
        this.errorMessage.set(this.noValuesErrorKeySignal());
        return;
      }
    }

    const fields: Record<string, number> = {};
    this.groupsSignal().forEach((group) => {
      group.fields.forEach((field) => {
        if (field.value !== null) {
          fields[field.key] = field.value;
        }
      });
    });

    this.save.emit({
      date: this.selectedDateSignal(),
      fields,
    });
  }

  protected onCancel() {
    this.cancelModal.emit();
  }

  protected showHelp() {
    this.showHelpModal.set(true);
  }

  protected closeHelp() {
    this.showHelpModal.set(false);
  }

  // Meter Reader
  protected meterReaderFields = computed<MeterField[]>(() => {
    const grps = this.groupsSignal();
    const fields: MeterField[] = [];
    grps.forEach((group) => {
      group.fields.forEach((field) => {
        fields.push({
          key: field.key,
          label: field.label,
          groupLabel: group.title,
          currentValue: field.value,
          icon: field.icon,
        });
      });
    });
    return fields;
  });

  protected openMeterReader() {
    this.showMeterReader.set(true);
  }

  protected closeMeterReader() {
    this.showMeterReader.set(false);
  }

  protected onMeterReading(event: MeterReadingOutput) {
    this.fieldChange.emit({ key: event.fieldKey, value: event.value });
  }
}
