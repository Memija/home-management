import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import {
  LucideAngularModule,
  TriangleAlert,
  CircleQuestionMark,
  House,
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

const DISALLOWED_NUMBER_KEYS = new Set(['-', '+', 'e', 'E', '.', ',']);

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsumptionInputComponent {
  private readonly languageService = inject(LanguageService);

  protected readonly TriangleAlertIcon = TriangleAlert;
  protected readonly HelpIcon = CircleQuestionMark;
  protected readonly HomeIcon = House;
  protected readonly CameraIcon = Camera;

  // Inputs
  readonly groups = input<ConsumptionGroup[], ConsumptionGroup[] | null | undefined>([], {
    transform: (val) => val || [],
  });
  readonly selectedDate = input<string, string | null | undefined>('', {
    transform: (val) => val || '',
  });
  readonly maxDate = input<string, string | null | undefined>('', {
    transform: (val) => val || '',
  });
  readonly editingMode = input<boolean>(false);
  readonly dateExists = input<boolean>(false);
  readonly titleKey = input<string, string | null | undefined>('HOME.RECORD_CONSUMPTION', {
    transform: (val) => val || 'HOME.RECORD_CONSUMPTION',
  });
  readonly editTitleKey = input<string, string | null | undefined>('HOME.EDIT_RECORD', {
    transform: (val) => val || 'HOME.EDIT_RECORD',
  });
  readonly dateWarningKey = input<string, string | null | undefined>('HOME.DATE_EXISTS_WARNING', {
    transform: (val) => val || 'HOME.DATE_EXISTS_WARNING',
  });
  readonly readingsForKey = input<string, string | null | undefined>('HOME.READINGS_FOR', {
    transform: (val) => val || 'HOME.READINGS_FOR',
  });
  readonly saveKey = input<string, string | null | undefined>('HOME.SAVE', {
    transform: (val) => val || 'HOME.SAVE',
  });
  readonly updateKey = input<string, string | null | undefined>('HOME.UPDATE_RECORD', {
    transform: (val) => val || 'HOME.UPDATE_RECORD',
  });
  readonly cancelKey = input<string, string | null | undefined>('HOME.CANCEL', {
    transform: (val) => val || 'HOME.CANCEL',
  });
  readonly helpTitleKey = input<string, string | null | undefined>('HOME.RECORD_HELP_TITLE', {
    transform: (val) => val || 'HOME.RECORD_HELP_TITLE',
  });
  readonly helpSteps = input<HelpStep[], HelpStep[] | null | undefined>([], {
    transform: (val) => val || [],
  });
  readonly allowPartialGroups = input<boolean>(false);
  readonly layoutMode = input<'grouped' | 'flat', 'grouped' | 'flat' | null | undefined>(
    'grouped',
    {
      transform: (val) => val || 'grouped',
    },
  );
  readonly noValuesErrorKey = input<string, string | null | undefined>('HOME.PARTIAL_INPUT_ERROR', {
    transform: (val) => val || 'HOME.PARTIAL_INPUT_ERROR',
  });
  readonly incompleteRoomErrorKey = input<string, string | null | undefined>(
    'HOME.INCOMPLETE_ROOM_ERROR',
    {
      transform: (val) => val || 'HOME.INCOMPLETE_ROOM_ERROR',
    },
  );

  // State
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showHelpModal = signal(false);
  protected readonly showMeterReader = signal(false);

  // Outputs
  readonly dateChange = output<string>();
  readonly fieldChange = output<{ key: string; value: number | null }>();
  readonly save = output<ConsumptionData>();
  readonly cancelModal = output<void>();

  protected currentLang = computed(() => this.languageService.currentLang());

  protected hasValidInput = computed(() => {
    const grps = this.groups();

    // In partial groups mode (heating), just need at least one field with a value
    if (this.allowPartialGroups()) {
      for (const group of grps) {
        for (const field of group.fields) {
          if (field.value !== null) return true;
        }
      }
      return false;
    }

    // Standard mode (water): each group must be either complete or empty, and at least one complete
    let atLeastOneComplete = false;
    for (const group of grps) {
      let nullCount = 0;
      const totalFields = group.fields.length;
      for (const field of group.fields) {
        if (field.value === null) {
          nullCount++;
        }
      }
      if (nullCount > 0 && nullCount < totalFields) {
        return false;
      }
      if (nullCount === 0) {
        atLeastOneComplete = true;
      }
    }

    return atLeastOneComplete;
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
    if (DISALLOWED_NUMBER_KEYS.has(event.key)) {
      event.preventDefault();
    }
  }

  protected onInput(event: Event) {
    // Handle all input methods (typing, pasting, etc.)
    const inputEl = event.target as HTMLInputElement;

    // Remove any non-numeric characters (except keeping empty string)
    // This catches pastings with disallowed chars
    if (inputEl.value) {
      inputEl.value = inputEl.value.replace(/\D/g, '');
    }

    const value = Number.parseFloat(inputEl.value);

    // If the value is negative, clear it immediately (double safety)
    if (value < 0) {
      inputEl.value = '';
    }
  }

  protected onSave() {
    if (!this.selectedDate()) {
      this.errorMessage.set('HOME.SELECT_DATE_ERROR');
      return;
    }

    if (this.dateExists()) {
      this.errorMessage.set(this.dateWarningKey());
      return;
    }

    // Check for specific validation failures and collect non-null field values in a single pass
    const grps = this.groups();
    const fields: Record<string, number> = {};
    let hasPartialGroups = false;
    let hasCompleteGroups = false;
    let hasAnyValues = false;
    let hasAnyNonZeroValues = false;

    for (const group of grps) {
      let nullCount = 0;
      const totalFields = group.fields.length;
      for (const field of group.fields) {
        if (field.value === null) {
          nullCount++;
        } else {
          hasAnyValues = true;
          if (field.value > 0) {
            hasAnyNonZeroValues = true;
          }
          fields[field.key] = field.value;
        }
      }
      if (nullCount === 0) {
        hasCompleteGroups = true;
      } else if (nullCount < totalFields) {
        hasPartialGroups = true;
      }
    }

    // Prevent saving records where all values are zero or empty
    if (!hasAnyNonZeroValues) {
      this.errorMessage.set(this.noValuesErrorKey());
      return;
    }

    // In partial groups mode (heating), allow saving if at least one field has a value
    if (this.allowPartialGroups()) {
      if (!hasAnyValues) {
        this.errorMessage.set(this.noValuesErrorKey());
        return;
      }
    } else {
      // Standard mode (water): require complete groups
      if (hasPartialGroups) {
        // User started a room but didn't complete it
        this.errorMessage.set(this.incompleteRoomErrorKey());
        return;
      }

      if (!hasCompleteGroups) {
        // No room has unknown data
        this.errorMessage.set(this.noValuesErrorKey());
        return;
      }
    }

    this.save.emit({
      date: this.selectedDate(),
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
    const grps = this.groups();
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
