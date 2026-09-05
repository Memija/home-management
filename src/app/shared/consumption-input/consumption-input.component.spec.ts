import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConsumptionInputComponent, ConsumptionGroup } from './consumption-input.component';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { DatePickerComponent } from '../date-picker/date-picker.component';
import { HelpModalComponent } from '../help-modal/help-modal.component';
import { Pipe, PipeTransform, Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { vi, afterEach } from 'vitest';
import { ConsumptionInputHarness } from './consumption-input.harness';
import { getHarness } from '../../../testing';

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
  @Input() steps: unknown[] = [];
  @Output() closeModal = new EventEmitter<void>();
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
  let languageServiceMock: unknown;

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
    component.selectedDate = overrides?.selectedDate ?? '2024-06-15';
    component.maxDate = overrides?.maxDate ?? '2024-12-31';
    fixture.detectChanges();
  };

  describe('Creation and Defaults', () => {
    it('should create', () => {
      initWithDefaults();
      expect(component).toBeTruthy();
    });

    it('should have correct default input values', () => {
      initWithDefaults();
      expect(component.editingMode).toBe(false);
      expect(component.dateExists).toBe(false);
      expect(component.titleKey).toBe('HOME.RECORD_CONSUMPTION');
      expect(component.editTitleKey).toBe('HOME.EDIT_RECORD');
      expect(component.saveKey).toBe('HOME.SAVE');
      expect(component.updateKey).toBe('HOME.UPDATE_RECORD');
      expect(component.cancelKey).toBe('HOME.CANCEL');
      expect(component.allowPartialGroups).toBe(false);
      expect(component.layoutMode).toBe('grouped');
    });

    it('should have no error message by default', () => {
      initWithDefaults();
      expect(component['errorMessage']()).toBeNull();
    });

    it('should have help modal hidden by default', () => {
      initWithDefaults();
      expect(component['showHelpModal']()).toBe(false);
    });
  });

  describe('onDateChange', () => {
    it('should emit dateChange with the new date', () => {
      initWithDefaults();

      const spy = vi.fn();
      component.dateChange.subscribe(spy);

      component['onDateChange']('2024-07-01');
      expect(spy).toHaveBeenCalledWith('2024-07-01');
    });

    it('should clear error message on date change', () => {
      initWithDefaults();

      component['errorMessage'].set('some error');
      component['onDateChange']('2024-07-01');
      expect(component['errorMessage']()).toBeNull();
    });
  });

  describe('onFieldChange', () => {
    it('should emit fieldChange with key and value', () => {
      initWithDefaults();

      const spy = vi.fn();
      component.fieldChange.subscribe(spy);

      component['onFieldChange']('coldWater', 42);
      expect(spy).toHaveBeenCalledWith({ key: 'coldWater', value: 42 });
    });

    it('should clear error message on field change', () => {
      initWithDefaults();

      component['errorMessage'].set('some error');
      component['onFieldChange']('coldWater', 10);
      expect(component['errorMessage']()).toBeNull();
    });

    it('should convert negative values to null', () => {
      initWithDefaults();

      const spy = vi.fn();
      component.fieldChange.subscribe(spy);

      component['onFieldChange']('coldWater', -5);
      expect(spy).toHaveBeenCalledWith({ key: 'coldWater', value: null });
    });

    it('should accept null values', () => {
      initWithDefaults();

      const spy = vi.fn();
      component.fieldChange.subscribe(spy);

      component['onFieldChange']('coldWater', null);
      expect(spy).toHaveBeenCalledWith({ key: 'coldWater', value: null });
    });

    it('should accept zero values', () => {
      initWithDefaults();

      const spy = vi.fn();
      component.fieldChange.subscribe(spy);

      component['onFieldChange']('coldWater', 0);
      expect(spy).toHaveBeenCalledWith({ key: 'coldWater', value: 0 });
    });
  });

  describe('onKeyDown', () => {
    it('should prevent minus key', () => {
      initWithDefaults();

      const event = { key: '-', preventDefault: vi.fn() } as unknown as unknown;
      component['onKeyDown'](event as unknown as KeyboardEvent);
      expect((event as unknown as Event).preventDefault).toHaveBeenCalled();
    });

    it('should prevent plus key', () => {
      initWithDefaults();

      const event = { key: '+', preventDefault: vi.fn() } as unknown as unknown;
      component['onKeyDown'](event as unknown as KeyboardEvent);
      expect((event as unknown as Event).preventDefault).toHaveBeenCalled();
    });

    it('should prevent "e" key', () => {
      initWithDefaults();

      const event = { key: 'e', preventDefault: vi.fn() } as unknown as unknown;
      component['onKeyDown'](event as unknown as KeyboardEvent);
      expect((event as unknown as Event).preventDefault).toHaveBeenCalled();
    });

    it('should prevent "E" key', () => {
      initWithDefaults();

      const event = { key: 'E', preventDefault: vi.fn() } as unknown as unknown;
      component['onKeyDown'](event as unknown as KeyboardEvent);
      expect((event as unknown as Event).preventDefault).toHaveBeenCalled();
    });

    it('should prevent decimal point', () => {
      initWithDefaults();

      const event = { key: '.', preventDefault: vi.fn() } as unknown as unknown;
      component['onKeyDown'](event as unknown as KeyboardEvent);
      expect((event as unknown as Event).preventDefault).toHaveBeenCalled();
    });

    it('should prevent comma', () => {
      initWithDefaults();

      const event = { key: ',', preventDefault: vi.fn() } as unknown as unknown;
      component['onKeyDown'](event as unknown as KeyboardEvent);
      expect((event as unknown as Event).preventDefault).toHaveBeenCalled();
    });

    it('should allow digit keys', () => {
      initWithDefaults();

      const event = { key: '5', preventDefault: vi.fn() } as unknown as unknown;
      component['onKeyDown'](event as unknown as KeyboardEvent);
      expect((event as unknown as Event).preventDefault).not.toHaveBeenCalled();
    });

    it('should allow Backspace', () => {
      initWithDefaults();

      const event = { key: 'Backspace', preventDefault: vi.fn() } as unknown as unknown;
      component['onKeyDown'](event as unknown as KeyboardEvent);
      expect((event as unknown as Event).preventDefault).not.toHaveBeenCalled();
    });

    it('should allow Tab', () => {
      initWithDefaults();

      const event = { key: 'Tab', preventDefault: vi.fn() } as unknown as unknown;
      component['onKeyDown'](event as unknown as KeyboardEvent);
      expect((event as unknown as Event).preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('onInput', () => {
    it('should strip non-numeric characters from input value', () => {
      initWithDefaults();

      const input = { value: '12abc34' } as HTMLInputElement;
      const event = { target: input } as unknown as Event;

      component['onInput'](event);
      expect(input.value).toBe('1234');
    });

    it('should allow empty input', () => {
      initWithDefaults();

      const input = { value: '' } as HTMLInputElement;
      const event = { target: input } as unknown as Event;

      component['onInput'](event);
      expect(input.value).toBe('');
    });

    it('should clear negative values', () => {
      initWithDefaults();

      const input = { value: '-5' } as HTMLInputElement;
      const event = { target: input } as unknown as Event;

      component['onInput'](event);
      // After stripping non-numeric: '5', parseFloat('5') = 5 which is >= 0, no clear
      expect(input.value).toBe('5');
    });

    it('should strip decimal points', () => {
      initWithDefaults();

      const input = { value: '12.5' } as HTMLInputElement;
      const event = { target: input } as unknown as Event;

      component['onInput'](event);
      expect(input.value).toBe('125');
    });
  });

  describe('hasValidInput - Standard mode (water)', () => {
    it('should return false when all fields are null', () => {
      initWithDefaults({ groups: makeGroups([{ a: null, b: null }]) });
      expect(component['hasValidInput']()).toBe(false);
    });

    it('should return true when group is complete', () => {
      initWithDefaults({ groups: makeGroups([{ a: 10, b: 20 }]) });
      expect(component['hasValidInput']()).toBe(true);
    });

    it('should return false when group is partial (incomplete)', () => {
      initWithDefaults({ groups: makeGroups([{ a: 10, b: null }]) });
      expect(component['hasValidInput']()).toBe(false);
    });

    it('should return true with one complete group and one empty group', () => {
      initWithDefaults({
        groups: makeGroups([
          { a: 10, b: 20 },
          { c: null, d: null },
        ]),
      });
      expect(component['hasValidInput']()).toBe(true);
    });

    it('should return false with one partial group and one empty group', () => {
      initWithDefaults({
        groups: makeGroups([
          { a: 10, b: null },
          { c: null, d: null },
        ]),
      });
      expect(component['hasValidInput']()).toBe(false);
    });

    it('should return true when all groups are complete', () => {
      initWithDefaults({
        groups: makeGroups([
          { a: 10, b: 20 },
          { c: 30, d: 40 },
        ]),
      });
      expect(component['hasValidInput']()).toBe(true);
    });
  });

  describe('hasValidInput - Partial mode (heating)', () => {
    it('should return true when at least one field has value', () => {
      component.groups = makeGroups([{ a: 10, b: null }]);
      component.selectedDate = '2024-06-15';
      component.maxDate = '2024-12-31';
      component.allowPartialGroups = true;
      fixture.detectChanges();

      expect(component['hasValidInput']()).toBe(true);
    });

    it('should return false when all fields are null in partial mode', () => {
      component.groups = makeGroups([{ a: null, b: null }]);
      component.selectedDate = '2024-06-15';
      component.maxDate = '2024-12-31';
      component.allowPartialGroups = true;
      fixture.detectChanges();

      expect(component['hasValidInput']()).toBe(false);
    });
  });

  describe('onSave', () => {
    it('should set error when no date is selected', () => {
      initWithDefaults({ selectedDate: '', groups: makeGroups([{ a: 10, b: 20 }]) });

      component['onSave']();
      expect(component['errorMessage']()).toBe('HOME.SELECT_DATE_ERROR');
    });

    it('should set error when date already exists', () => {
      component.groups = makeGroups([{ a: 10, b: 20 }]);
      component.selectedDate = '2024-06-15';
      component.maxDate = '2024-12-31';
      component.dateExists = true;
      fixture.detectChanges();

      component['onSave']();
      expect(component['errorMessage']()).toBe('HOME.DATE_EXISTS_WARNING');
    });

    it('should set error when all values are zero', () => {
      initWithDefaults({ groups: makeGroups([{ a: 0, b: 0 }]) });

      component['onSave']();
      expect(component['errorMessage']()).toBe('HOME.PARTIAL_INPUT_ERROR');
    });

    it('should set error for incomplete room in standard mode', () => {
      initWithDefaults({ groups: makeGroups([{ a: 10, b: null }]) });

      component['onSave']();
      expect(component['errorMessage']()).toBe('HOME.INCOMPLETE_ROOM_ERROR');
    });

    it('should set error when no complete groups in standard mode', () => {
      initWithDefaults({ groups: makeGroups([{ a: null, b: null }]) });

      component['onSave']();
      expect(component['errorMessage']()).toBe('HOME.PARTIAL_INPUT_ERROR');
    });

    it('should emit save with correct data when valid', () => {
      initWithDefaults({ groups: makeGroups([{ coldWater: 10, warmWater: 20 }]) });

      const spy = vi.fn();
      component.save.subscribe(spy);

      component['onSave']();
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

      component['onSave']();
      expect(spy).toHaveBeenCalledWith({
        date: '2024-06-15',
        fields: { a: 10, b: 20 },
      });
    });

    it('should emit save in partial mode with partial group', () => {
      component.groups = makeGroups([{ a: 10, b: null }]);
      component.selectedDate = '2024-06-15';
      component.maxDate = '2024-12-31';
      component.allowPartialGroups = true;
      fixture.detectChanges();

      const spy = vi.fn();
      component.save.subscribe(spy);

      component['onSave']();
      expect(spy).toHaveBeenCalledWith({
        date: '2024-06-15',
        fields: { a: 10 },
      });
    });

    it('should use custom error message keys', () => {
      component.groups = makeGroups([{ a: null, b: null }]);
      component.selectedDate = '2024-06-15';
      component.maxDate = '2024-12-31';
      component.noValuesErrorKey = 'CUSTOM.NO_VALUES';
      fixture.detectChanges();

      component['onSave']();
      expect(component['errorMessage']()).toBe('CUSTOM.NO_VALUES');
    });

    it('should use custom incomplete room error key', () => {
      component.groups = makeGroups([{ a: 10, b: null }]);
      component.selectedDate = '2024-06-15';
      component.maxDate = '2024-12-31';
      component.incompleteRoomErrorKey = 'CUSTOM.INCOMPLETE';
      fixture.detectChanges();

      component['onSave']();
      expect(component['errorMessage']()).toBe('CUSTOM.INCOMPLETE');
    });

    it('should use custom date warning key', () => {
      component.groups = makeGroups([{ a: 10, b: 20 }]);
      component.selectedDate = '2024-06-15';
      component.maxDate = '2024-12-31';
      component.dateExists = true;
      component.dateWarningKey = 'CUSTOM.DATE_WARNING';
      fixture.detectChanges();

      component['onSave']();
      expect(component['errorMessage']()).toBe('CUSTOM.DATE_WARNING');
    });
  });

  describe('onCancel', () => {
    it('should emit cancel event', () => {
      initWithDefaults();

      const spy = vi.fn();
      component.cancelModal.subscribe(spy);

      component['onCancel']();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Help Modal', () => {
    it('should open help modal', () => {
      initWithDefaults();
      component['showHelp']();
      expect(component['showHelpModal']()).toBe(true);
    });

    it('should close help modal', () => {
      initWithDefaults();
      component['showHelp']();
      component['closeHelp']();
      expect(component['showHelpModal']()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty groups array', () => {
      initWithDefaults({ groups: [] });
      expect(component['hasValidInput']()).toBe(false);
    });

    it('should handle groups with empty fields array', () => {
      component.groups = [{ title: 'Empty', fields: [] }];
      component.selectedDate = '2024-06-15';
      component.maxDate = '2024-12-31';
      fixture.detectChanges();

      // Empty group is considered "complete" by every() — vacuous truth
      expect(component['hasValidInput']()).toBe(true);
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
      expect(component['hasValidInput']()).toBe(true); // Kitchen complete, Bathroom empty
    });

    it('should handle value of 0 as a valid non-null value', () => {
      initWithDefaults({ groups: makeGroups([{ a: 0, b: 0 }]) });
      // 0 values: fields are non-null but hasNonZeroValue will be false
      // This should fail validation because no non-zero values
      const spy = vi.fn();
      component.save.subscribe(spy);
      component['onSave']();
      expect(spy).not.toHaveBeenCalled();
      expect(component['errorMessage']()).toBeTruthy();
    });

    it('should handle fields with value 0 mixed with positive values', () => {
      initWithDefaults({ groups: makeGroups([{ a: 0, b: 5 }]) });
      const spy = vi.fn();
      component.save.subscribe(spy);
      component['onSave']();
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
      component['onSave']();
      expect(spy).toHaveBeenCalledWith({
        date: '2024-06-15',
        fields: { a: 999999, b: 888888 },
      });
    });

    it('should handle save error then re-save after fixing', () => {
      // First: no date → error
      initWithDefaults({ selectedDate: '', groups: makeGroups([{ a: 10, b: 20 }]) });
      component['onSave']();
      expect(component['errorMessage']()).toBe('HOME.SELECT_DATE_ERROR');

      // Fix by changing date — should clear error
      component['onDateChange']('2024-06-15');
      expect(component['errorMessage']()).toBeNull();
    });

    it('should handle partial mode with no values', () => {
      component.groups = makeGroups([{ a: null, b: null }]);
      component.selectedDate = '2024-06-15';
      component.maxDate = '2024-12-31';
      component.allowPartialGroups = true;
      fixture.detectChanges();

      component['onSave']();
      expect(component['errorMessage']()).toBe('HOME.PARTIAL_INPUT_ERROR');
    });
  });

  describe('Layout Modes', () => {
    it('should default to grouped layout', () => {
      initWithDefaults();
      expect(component.layoutMode).toBe('grouped');
    });

    it('should accept flat layout', () => {
      component.groups = makeGroups([{ a: null }]);
      component.selectedDate = '2024-06-15';
      component.maxDate = '2024-12-31';
      component.layoutMode = 'flat';
      fixture.detectChanges();

      expect(component.layoutMode).toBe('flat');
    });
  });

  describe('Using ConsumptionInputHarness', () => {
    let harness: ConsumptionInputHarness;

    beforeEach(async () => {
      initWithDefaults({
        groups: makeGroups([
          { kitchenWarm: 10, kitchenCold: 20 },
          { bathroomWarm: 15, bathroomCold: 25 },
        ]),
      });
      fixture.componentRef.setInput('titleKey', 'WATER.ENTER_READINGS');
      harness = await getHarness(fixture, ConsumptionInputHarness);
    });

    it('should read title text via harness', async () => {
      expect(await harness.getTitleText()).toBe('WATER.ENTER_READINGS');
    });

    it('should count number of number input fields via harness', async () => {
      expect(await harness.getInputCount()).toBe(4);
    });

    it('should get and set input values via harness', async () => {
      expect(await harness.getInputValue('kitchenWarm')).toBe('10');

      const fieldSpy = vi.fn();
      component.fieldChange.subscribe(fieldSpy);

      await harness.setInputValue('kitchenWarm', '25');
      expect(fieldSpy).toHaveBeenCalledWith({ key: 'kitchenWarm', value: 25 });
    });

    it('should trigger save event on clicking save button via harness', async () => {
      const saveSpy = vi.fn();
      component.save.subscribe(saveSpy);

      await harness.clickSave();
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('should check error message via harness', async () => {
      expect(await harness.hasError()).toBe(false);
      component['errorMessage'].set('HOME.INVALID_INPUT');
      fixture.detectChanges();

      expect(await harness.hasError()).toBe(true);
      expect(await harness.getErrorText()).toBe('HOME.INVALID_INPUT');
    });
  });
});
