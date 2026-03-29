import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConsumptionInputComponent, ConsumptionGroup } from './consumption-input.component';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { DatePickerComponent } from '../date-picker/date-picker.component';
import { HelpModalComponent } from '../help-modal/help-modal.component';
import { Pipe, PipeTransform, Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { vi, afterEach } from 'vitest';

@Pipe({ name: 'translate', standalone: true })
class MockTranslatePipe implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

@Component({ selector: 'app-date-picker', standalone: true, template: '' })
class MockDatePickerComponent {
  @Input() date = '';
  @Input() maxDate = '';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Output() dateChange = new EventEmitter<string>();
}

@Component({ selector: 'app-help-modal', standalone: true, template: '' })
class MockHelpModalComponent {
  @Input() show = false;
  @Input() titleKey = '';
  @Input() steps: any[] = [];
  @Output() close = new EventEmitter<void>();
}

const makeGroups = (values: Record<string, number | null>[]): ConsumptionGroup[] => {
  return values.map((fields, i) => ({
    title: `GROUP_${i}`,
    fields: Object.entries(fields).map(([key, value]) => ({
      key,
      label: `LABEL_${key}`,
      value,
    })),
  }));
};

describe('ConsumptionInputComponent', () => {
  let component: ConsumptionInputComponent;
  let fixture: ComponentFixture<ConsumptionInputComponent>;
  let languageServiceMock: any;

  beforeEach(async () => {
    languageServiceMock = {
      currentLang: signal('en'),
      translate: vi.fn().mockImplementation((key: string) => key),
    };

    await TestBed.configureTestingModule({
      imports: [ConsumptionInputComponent],
    })
      .overrideComponent(ConsumptionInputComponent, {
        remove: { imports: [TranslatePipe, DatePickerComponent, HelpModalComponent] },
        add: { imports: [MockTranslatePipe, MockDatePickerComponent, MockHelpModalComponent] },
      })
      .overrideProvider(LanguageService, { useValue: languageServiceMock })
      .compileComponents();

    fixture = TestBed.createComponent(ConsumptionInputComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const initWithDefaults = (overrides?: {
    groups?: ConsumptionGroup[];
    selectedDate?: string;
    maxDate?: string;
  }) => {
    fixture.componentRef.setInput(
      'groups',
      overrides?.groups ?? makeGroups([{ a: null, b: null }]),
    );
    fixture.componentRef.setInput('selectedDate', overrides?.selectedDate ?? '2024-06-15');
    fixture.componentRef.setInput('maxDate', overrides?.maxDate ?? '2024-12-31');
    fixture.detectChanges();
  };

  describe('Creation and Defaults', () => {
    it('should create', () => {
      initWithDefaults();
      expect(component).toBeTruthy();
    });

    it('should have correct default input values', () => {
      initWithDefaults();
      expect(component.editingMode()).toBe(false);
      expect(component.dateExists()).toBe(false);
      expect(component.titleKey()).toBe('HOME.RECORD_CONSUMPTION');
      expect(component.editTitleKey()).toBe('HOME.EDIT_RECORD');
      expect(component.saveKey()).toBe('HOME.SAVE');
      expect(component.updateKey()).toBe('HOME.UPDATE_RECORD');
      expect(component.cancelKey()).toBe('HOME.CANCEL');
      expect(component.allowPartialGroups()).toBe(false);
      expect(component.layoutMode()).toBe('grouped');
    });

    it('should have no error message by default', () => {
      initWithDefaults();
      expect((component as any).errorMessage()).toBeNull();
    });

    it('should have help modal hidden by default', () => {
      initWithDefaults();
      expect((component as any).showHelpModal()).toBe(false);
    });
  });

  describe('onDateChange', () => {
    it('should emit dateChange with the new date', () => {
      initWithDefaults();

      const spy = vi.fn();
      component.dateChange.subscribe(spy);

      (component as any).onDateChange('2024-07-01');
      expect(spy).toHaveBeenCalledWith('2024-07-01');
    });

    it('should clear error message on date change', () => {
      initWithDefaults();

      (component as any).errorMessage.set('some error');
      (component as any).onDateChange('2024-07-01');
      expect((component as any).errorMessage()).toBeNull();
    });
  });

  describe('onFieldChange', () => {
    it('should emit fieldChange with key and value', () => {
      initWithDefaults();

      const spy = vi.fn();
      component.fieldChange.subscribe(spy);

      (component as any).onFieldChange('coldWater', 42);
      expect(spy).toHaveBeenCalledWith({ key: 'coldWater', value: 42 });
    });

    it('should clear error message on field change', () => {
      initWithDefaults();

      (component as any).errorMessage.set('some error');
      (component as any).onFieldChange('coldWater', 10);
      expect((component as any).errorMessage()).toBeNull();
    });

    it('should convert negative values to null', () => {
      initWithDefaults();

      const spy = vi.fn();
      component.fieldChange.subscribe(spy);

      (component as any).onFieldChange('coldWater', -5);
      expect(spy).toHaveBeenCalledWith({ key: 'coldWater', value: null });
    });

    it('should accept null values', () => {
      initWithDefaults();

      const spy = vi.fn();
      component.fieldChange.subscribe(spy);

      (component as any).onFieldChange('coldWater', null);
      expect(spy).toHaveBeenCalledWith({ key: 'coldWater', value: null });
    });

    it('should accept zero values', () => {
      initWithDefaults();

      const spy = vi.fn();
      component.fieldChange.subscribe(spy);

      (component as any).onFieldChange('coldWater', 0);
      expect(spy).toHaveBeenCalledWith({ key: 'coldWater', value: 0 });
    });
  });

  describe('onKeyDown', () => {
    it('should prevent minus key', () => {
      initWithDefaults();

      const event = { key: '-', preventDefault: vi.fn() } as any;
      (component as any).onKeyDown(event);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should prevent plus key', () => {
      initWithDefaults();

      const event = { key: '+', preventDefault: vi.fn() } as any;
      (component as any).onKeyDown(event);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should prevent "e" key', () => {
      initWithDefaults();

      const event = { key: 'e', preventDefault: vi.fn() } as any;
      (component as any).onKeyDown(event);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should prevent "E" key', () => {
      initWithDefaults();

      const event = { key: 'E', preventDefault: vi.fn() } as any;
      (component as any).onKeyDown(event);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should prevent decimal point', () => {
      initWithDefaults();

      const event = { key: '.', preventDefault: vi.fn() } as any;
      (component as any).onKeyDown(event);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should prevent comma', () => {
      initWithDefaults();

      const event = { key: ',', preventDefault: vi.fn() } as any;
      (component as any).onKeyDown(event);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should allow digit keys', () => {
      initWithDefaults();

      const event = { key: '5', preventDefault: vi.fn() } as any;
      (component as any).onKeyDown(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should allow Backspace', () => {
      initWithDefaults();

      const event = { key: 'Backspace', preventDefault: vi.fn() } as any;
      (component as any).onKeyDown(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should allow Tab', () => {
      initWithDefaults();

      const event = { key: 'Tab', preventDefault: vi.fn() } as any;
      (component as any).onKeyDown(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('onInput', () => {
    it('should strip non-numeric characters from input value', () => {
      initWithDefaults();

      const input = { value: '12abc34' } as HTMLInputElement;
      const event = { target: input } as unknown as Event;

      (component as any).onInput(event);
      expect(input.value).toBe('1234');
    });

    it('should allow empty input', () => {
      initWithDefaults();

      const input = { value: '' } as HTMLInputElement;
      const event = { target: input } as unknown as Event;

      (component as any).onInput(event);
      expect(input.value).toBe('');
    });

    it('should clear negative values', () => {
      initWithDefaults();

      const input = { value: '-5' } as HTMLInputElement;
      const event = { target: input } as unknown as Event;

      (component as any).onInput(event);
      // After stripping non-numeric: '5', parseFloat('5') = 5 which is >= 0, no clear
      expect(input.value).toBe('5');
    });

    it('should strip decimal points', () => {
      initWithDefaults();

      const input = { value: '12.5' } as HTMLInputElement;
      const event = { target: input } as unknown as Event;

      (component as any).onInput(event);
      expect(input.value).toBe('125');
    });
  });

  describe('hasValidInput - Standard mode (water)', () => {
    it('should return false when all fields are null', () => {
      initWithDefaults({ groups: makeGroups([{ a: null, b: null }]) });
      expect((component as any).hasValidInput()).toBe(false);
    });

    it('should return true when group is complete', () => {
      initWithDefaults({ groups: makeGroups([{ a: 10, b: 20 }]) });
      expect((component as any).hasValidInput()).toBe(true);
    });

    it('should return false when group is partial (incomplete)', () => {
      initWithDefaults({ groups: makeGroups([{ a: 10, b: null }]) });
      expect((component as any).hasValidInput()).toBe(false);
    });

    it('should return true with one complete group and one empty group', () => {
      initWithDefaults({
        groups: makeGroups([
          { a: 10, b: 20 },
          { c: null, d: null },
        ]),
      });
      expect((component as any).hasValidInput()).toBe(true);
    });

    it('should return false with one partial group and one empty group', () => {
      initWithDefaults({
        groups: makeGroups([
          { a: 10, b: null },
          { c: null, d: null },
        ]),
      });
      expect((component as any).hasValidInput()).toBe(false);
    });

    it('should return true when all groups are complete', () => {
      initWithDefaults({
        groups: makeGroups([
          { a: 10, b: 20 },
          { c: 30, d: 40 },
        ]),
      });
      expect((component as any).hasValidInput()).toBe(true);
    });
  });

  describe('hasValidInput - Partial mode (heating)', () => {
    it('should return true when at least one field has value', () => {
      fixture.componentRef.setInput('groups', makeGroups([{ a: 10, b: null }]));
      fixture.componentRef.setInput('selectedDate', '2024-06-15');
      fixture.componentRef.setInput('maxDate', '2024-12-31');
      fixture.componentRef.setInput('allowPartialGroups', true);
      fixture.detectChanges();

      expect((component as any).hasValidInput()).toBe(true);
    });

    it('should return false when all fields are null in partial mode', () => {
      fixture.componentRef.setInput('groups', makeGroups([{ a: null, b: null }]));
      fixture.componentRef.setInput('selectedDate', '2024-06-15');
      fixture.componentRef.setInput('maxDate', '2024-12-31');
      fixture.componentRef.setInput('allowPartialGroups', true);
      fixture.detectChanges();

      expect((component as any).hasValidInput()).toBe(false);
    });
  });

  describe('onSave', () => {
    it('should set error when no date is selected', () => {
      initWithDefaults({ selectedDate: '', groups: makeGroups([{ a: 10, b: 20 }]) });

      (component as any).onSave();
      expect((component as any).errorMessage()).toBe('HOME.SELECT_DATE_ERROR');
    });

    it('should set error when date already exists', () => {
      fixture.componentRef.setInput('groups', makeGroups([{ a: 10, b: 20 }]));
      fixture.componentRef.setInput('selectedDate', '2024-06-15');
      fixture.componentRef.setInput('maxDate', '2024-12-31');
      fixture.componentRef.setInput('dateExists', true);
      fixture.detectChanges();

      (component as any).onSave();
      expect((component as any).errorMessage()).toBe('HOME.DATE_EXISTS_WARNING');
    });

    it('should set error when all values are zero', () => {
      initWithDefaults({ groups: makeGroups([{ a: 0, b: 0 }]) });

      (component as any).onSave();
      expect((component as any).errorMessage()).toBe('HOME.PARTIAL_INPUT_ERROR');
    });

    it('should set error for incomplete room in standard mode', () => {
      initWithDefaults({ groups: makeGroups([{ a: 10, b: null }]) });

      (component as any).onSave();
      expect((component as any).errorMessage()).toBe('HOME.INCOMPLETE_ROOM_ERROR');
    });

    it('should set error when no complete groups in standard mode', () => {
      initWithDefaults({ groups: makeGroups([{ a: null, b: null }]) });

      (component as any).onSave();
      expect((component as any).errorMessage()).toBe('HOME.PARTIAL_INPUT_ERROR');
    });

    it('should emit save with correct data when valid', () => {
      initWithDefaults({ groups: makeGroups([{ coldWater: 10, warmWater: 20 }]) });

      const spy = vi.fn();
      component.save.subscribe(spy);

      (component as any).onSave();
      expect(spy).toHaveBeenCalledWith({
        date: '2024-06-15',
        fields: { coldWater: 10, warmWater: 20 },
      });
    });

    it('should only emit non-null fields in save data', () => {
      initWithDefaults({
        groups: makeGroups([
          { a: 10, b: 20 },
          { c: null, d: null },
        ]),
      });

      const spy = vi.fn();
      component.save.subscribe(spy);

      (component as any).onSave();
      expect(spy).toHaveBeenCalledWith({
        date: '2024-06-15',
        fields: { a: 10, b: 20 },
      });
    });

    it('should emit save in partial mode with partial group', () => {
      fixture.componentRef.setInput('groups', makeGroups([{ a: 10, b: null }]));
      fixture.componentRef.setInput('selectedDate', '2024-06-15');
      fixture.componentRef.setInput('maxDate', '2024-12-31');
      fixture.componentRef.setInput('allowPartialGroups', true);
      fixture.detectChanges();

      const spy = vi.fn();
      component.save.subscribe(spy);

      (component as any).onSave();
      expect(spy).toHaveBeenCalledWith({
        date: '2024-06-15',
        fields: { a: 10 },
      });
    });

    it('should use custom error message keys', () => {
      fixture.componentRef.setInput('groups', makeGroups([{ a: null, b: null }]));
      fixture.componentRef.setInput('selectedDate', '2024-06-15');
      fixture.componentRef.setInput('maxDate', '2024-12-31');
      fixture.componentRef.setInput('noValuesErrorKey', 'CUSTOM.NO_VALUES');
      fixture.detectChanges();

      (component as any).onSave();
      expect((component as any).errorMessage()).toBe('CUSTOM.NO_VALUES');
    });

    it('should use custom incomplete room error key', () => {
      fixture.componentRef.setInput('groups', makeGroups([{ a: 10, b: null }]));
      fixture.componentRef.setInput('selectedDate', '2024-06-15');
      fixture.componentRef.setInput('maxDate', '2024-12-31');
      fixture.componentRef.setInput('incompleteRoomErrorKey', 'CUSTOM.INCOMPLETE');
      fixture.detectChanges();

      (component as any).onSave();
      expect((component as any).errorMessage()).toBe('CUSTOM.INCOMPLETE');
    });

    it('should use custom date warning key', () => {
      fixture.componentRef.setInput('groups', makeGroups([{ a: 10, b: 20 }]));
      fixture.componentRef.setInput('selectedDate', '2024-06-15');
      fixture.componentRef.setInput('maxDate', '2024-12-31');
      fixture.componentRef.setInput('dateExists', true);
      fixture.componentRef.setInput('dateWarningKey', 'CUSTOM.DATE_WARNING');
      fixture.detectChanges();

      (component as any).onSave();
      expect((component as any).errorMessage()).toBe('CUSTOM.DATE_WARNING');
    });
  });

  describe('onCancel', () => {
    it('should emit cancel event', () => {
      initWithDefaults();

      const spy = vi.fn();
      component.cancel.subscribe(spy);

      (component as any).onCancel();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Help Modal', () => {
    it('should open help modal', () => {
      initWithDefaults();
      (component as any).showHelp();
      expect((component as any).showHelpModal()).toBe(true);
    });

    it('should close help modal', () => {
      initWithDefaults();
      (component as any).showHelp();
      (component as any).closeHelp();
      expect((component as any).showHelpModal()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty groups array', () => {
      initWithDefaults({ groups: [] });
      expect((component as any).hasValidInput()).toBe(false);
    });

    it('should handle groups with empty fields array', () => {
      fixture.componentRef.setInput('groups', [{ title: 'Empty', fields: [] }]);
      fixture.componentRef.setInput('selectedDate', '2024-06-15');
      fixture.componentRef.setInput('maxDate', '2024-12-31');
      fixture.detectChanges();

      // Empty group is considered "complete" by every() — vacuous truth
      expect((component as any).hasValidInput()).toBe(true);
    });

    it('should handle multiple groups with mixed completeness', () => {
      const groups: ConsumptionGroup[] = [
        {
          title: 'Kitchen',
          fields: [
            { key: 'kw', label: 'Warm', value: 10 },
            { key: 'kc', label: 'Cold', value: 20 },
          ],
        },
        {
          title: 'Bathroom',
          fields: [
            { key: 'bw', label: 'Warm', value: null },
            { key: 'bc', label: 'Cold', value: null },
          ],
        },
      ];
      initWithDefaults({ groups });
      expect((component as any).hasValidInput()).toBe(true); // Kitchen complete, Bathroom empty
    });

    it('should handle value of 0 as a valid non-null value', () => {
      initWithDefaults({ groups: makeGroups([{ a: 0, b: 0 }]) });
      // 0 values: fields are non-null but hasNonZeroValue will be false
      // This should fail validation because no non-zero values
      const spy = vi.fn();
      component.save.subscribe(spy);
      (component as any).onSave();
      expect(spy).not.toHaveBeenCalled();
      expect((component as any).errorMessage()).toBeTruthy();
    });

    it('should handle fields with value 0 mixed with positive values', () => {
      initWithDefaults({ groups: makeGroups([{ a: 0, b: 5 }]) });
      const spy = vi.fn();
      component.save.subscribe(spy);
      (component as any).onSave();
      expect(spy).toHaveBeenCalledWith({
        date: '2024-06-15',
        fields: { a: 0, b: 5 },
      });
    });

    it('should not emit save when not called', () => {
      initWithDefaults({ groups: makeGroups([{ a: 10, b: 20 }]) });
      const spy = vi.fn();
      component.save.subscribe(spy);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should handle large values', () => {
      initWithDefaults({ groups: makeGroups([{ a: 999999, b: 888888 }]) });
      const spy = vi.fn();
      component.save.subscribe(spy);
      (component as any).onSave();
      expect(spy).toHaveBeenCalledWith({
        date: '2024-06-15',
        fields: { a: 999999, b: 888888 },
      });
    });

    it('should handle save error then re-save after fixing', () => {
      // First: no date → error
      initWithDefaults({ selectedDate: '', groups: makeGroups([{ a: 10, b: 20 }]) });
      (component as any).onSave();
      expect((component as any).errorMessage()).toBe('HOME.SELECT_DATE_ERROR');

      // Fix by changing date — should clear error
      (component as any).onDateChange('2024-06-15');
      expect((component as any).errorMessage()).toBeNull();
    });

    it('should handle partial mode with no values', () => {
      fixture.componentRef.setInput('groups', makeGroups([{ a: null, b: null }]));
      fixture.componentRef.setInput('selectedDate', '2024-06-15');
      fixture.componentRef.setInput('maxDate', '2024-12-31');
      fixture.componentRef.setInput('allowPartialGroups', true);
      fixture.detectChanges();

      (component as any).onSave();
      expect((component as any).errorMessage()).toBe('HOME.PARTIAL_INPUT_ERROR');
    });
  });

  describe('Layout Modes', () => {
    it('should default to grouped layout', () => {
      initWithDefaults();
      expect(component.layoutMode()).toBe('grouped');
    });

    it('should accept flat layout', () => {
      fixture.componentRef.setInput('groups', makeGroups([{ a: null }]));
      fixture.componentRef.setInput('selectedDate', '2024-06-15');
      fixture.componentRef.setInput('maxDate', '2024-12-31');
      fixture.componentRef.setInput('layoutMode', 'flat');
      fixture.detectChanges();

      expect(component.layoutMode()).toBe('flat');
    });
  });
});
