import { Component, input, output, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LucideAngularModule, TriangleAlert, HelpCircle } from 'lucide-angular';
import { DatePickerComponent } from '../date-picker/date-picker.component';
import { HelpModalComponent, HelpStep } from '../help-modal/help-modal.component';

export interface ConsumptionField {
  key: string;
  label: string;
  value: number | null;
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
  imports: [FormsModule, TranslatePipe, LucideAngularModule, DatePickerComponent, HelpModalComponent],
  templateUrl: './consumption-input.component.html',
  styleUrl: './consumption-input.component.scss'
})
export class ConsumptionInputComponent {
  private languageService = inject(LanguageService);

  protected readonly TriangleAlertIcon = TriangleAlert;
  protected readonly HelpIcon = HelpCircle;

  // Inputs
  groups = input.required<ConsumptionGroup[]>();
  selectedDate = input.required<string>();
  maxDate = input.required<string>();
  editingMode = input<boolean>(false);
  dateExists = input<boolean>(false);
  titleKey = input<string>('HOME.RECORD_CONSUMPTION');
  editTitleKey = input<string>('HOME.EDIT_RECORD');
  dateWarningKey = input<string>('HOME.DATE_EXISTS_WARNING');
  readingsForKey = input<string>('HOME.READINGS_FOR');
  saveKey = input<string>('HOME.SAVE');
  updateKey = input<string>('HOME.UPDATE_RECORD');
  cancelKey = input<string>('HOME.CANCEL');
  helpTitleKey = input<string>('HOME.RECORD_HELP_TITLE');
  helpSteps = input<HelpStep[]>([]);

  // State
  protected errorMessage = signal<string | null>(null);
  protected showHelpModal = signal(false);

  // Outputs
  dateChange = output<string>();
  fieldChange = output<{ key: string; value: number | null }>();
  save = output<ConsumptionData>();
  cancel = output<void>();

  protected currentLang = computed(() => this.languageService.currentLang());

  protected hasValidInput = computed(() => {
    const grps = this.groups();
    const isGroupComplete = (group: ConsumptionGroup) => group.fields.every(f => f.value !== null);
    const isGroupEmpty = (group: ConsumptionGroup) => group.fields.every(f => f.value === null);

    // Each group must be either complete or empty
    const allGroupsValid = grps.every(group => isGroupComplete(group) || isGroupEmpty(group));
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
    // Prevent typing minus, plus, and 'e' (scientific notation) in number inputs
    if (event.key === '-' || event.key === '+' || event.key === 'e' || event.key === 'E') {
      event.preventDefault();
    }
  }

  protected onInput(event: Event) {
    // Handle all input methods (typing, pasting, etc.)
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);

    // If the value is negative, clear it immediately
    if (value < 0) {
      input.value = '';
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

    // Check for specific validation failures
    const grps = this.groups();
    const isGroupComplete = (group: ConsumptionGroup) => group.fields.every(f => f.value !== null);
    const isGroupEmpty = (group: ConsumptionGroup) => group.fields.every(f => f.value === null);
    const isGroupPartial = (group: ConsumptionGroup) => !isGroupComplete(group) && !isGroupEmpty(group);

    const hasPartialGroups = grps.some(isGroupPartial);
    const hasCompleteGroups = grps.some(isGroupComplete);

    if (hasPartialGroups) {
      // User started a room but didn't complete it
      this.errorMessage.set('HOME.INCOMPLETE_ROOM_ERROR');
      return;
    }

    if (!hasCompleteGroups) {
      // No room has any data
      this.errorMessage.set('HOME.PARTIAL_INPUT_ERROR');
      return;
    }

    const fields: Record<string, number> = {};
    this.groups().forEach(group => {
      group.fields.forEach(field => {
        if (field.value !== null) {
          fields[field.key] = field.value;
        }
      });
    });

    this.save.emit({
      date: this.selectedDate(),
      fields
    });
  }

  protected onCancel() {
    this.cancel.emit();
  }

  protected showHelp() {
    this.showHelpModal.set(true);
  }

  protected closeHelp() {
    this.showHelpModal.set(false);
  }
}
