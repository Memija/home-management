import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePickerComponent } from './date-picker.component';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Pipe, PipeTransform, signal } from '@angular/core';
import { vi, afterEach } from 'vitest';
import { By } from '@angular/platform-browser';
import { DatePickerHarness } from './date-picker.harness';
import { getHarness } from '../../../testing';

@Pipe({ name: 'translate', standalone: true })
class MockTranslatePipe implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

describe('DatePickerComponent', () => {
  let component: DatePickerComponent;
  let fixture: ComponentFixture<DatePickerComponent>;
  let languageServiceMock: unknown;

  beforeEach(async () => {
    languageServiceMock = {
      currentLang: signal('en'),
    };

    await TestBed.configureTestingModule({
      imports: [DatePickerComponent],
    })
      .overrideComponent(DatePickerComponent, {
        remove: { imports: [TranslatePipe] },
        add: { imports: [MockTranslatePipe] },
      })
      .overrideProvider(LanguageService, { useValue: languageServiceMock })
      .compileComponents();

    fixture = TestBed.createComponent(DatePickerComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Creation and Defaults', () => {
    it('should create', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should have empty date by default', () => {
      expect(component.date).toBe('');
    });

    it('should have empty maxDate by default', () => {
      expect(component.maxDate).toBe('');
    });

    it('should have default placeholder', () => {
      expect(component.placeholder).toBe('Select date');
    });

    it('should not be disabled by default', () => {
      expect(component.disabled).toBe(false);
    });

    it('should be closed by default', () => {
      expect(component.isOpen()).toBe(false);
    });
  });

  describe('toggleCalendar', () => {
    it('should open the calendar when closed', () => {
      fixture.detectChanges();

      component.toggleCalendar();
      expect(component.isOpen()).toBe(true);
    });

    it('should close the calendar when open', () => {
      fixture.detectChanges();

      component.toggleCalendar(); // open
      component.toggleCalendar(); // close
      expect(component.isOpen()).toBe(false);
    });

    it('should not open when disabled', () => {
      component.disabled = true;
      fixture.detectChanges();

      component.toggleCalendar();
      expect(component.isOpen()).toBe(false);
    });

    it('should set viewDate to current date when opening with a date set', () => {
      component.date = '2024-06-15';
      fixture.detectChanges();

      component.toggleCalendar();

      const viewDate = component.viewDate();
      expect(viewDate.getFullYear()).toBe(2024);
      expect(viewDate.getMonth()).toBe(5); // June
    });

    it('should not update viewDate when opening without a date', () => {
      component.date = '';
      fixture.detectChanges();

      const viewDateBefore = component.viewDate();
      component.toggleCalendar();
      const viewDateAfter = component.viewDate();

      // viewDate stays as today's month since date is empty
      expect(viewDateAfter.getMonth()).toBe(viewDateBefore.getMonth());
    });
  });

  describe('prevMonth / nextMonth', () => {
    it('should navigate to previous month', () => {
      fixture.detectChanges();

      component.viewDate.set(new Date(2024, 5, 1)); // June 2024
      component.prevMonth();

      expect(component.viewDate().getMonth()).toBe(4); // May
      expect(component.viewDate().getFullYear()).toBe(2024);
    });

    it('should wrap from January to December of previous year', () => {
      fixture.detectChanges();

      component.viewDate.set(new Date(2024, 0, 1)); // January 2024
      component.prevMonth();

      expect(component.viewDate().getMonth()).toBe(11); // December
      expect(component.viewDate().getFullYear()).toBe(2023);
    });

    it('should navigate to next month', () => {
      fixture.detectChanges();

      component.viewDate.set(new Date(2024, 5, 1)); // June 2024
      component.nextMonth();

      expect(component.viewDate().getMonth()).toBe(6); // July
      expect(component.viewDate().getFullYear()).toBe(2024);
    });

    it('should wrap from December to January of next year', () => {
      fixture.detectChanges();

      component.viewDate.set(new Date(2024, 11, 1)); // December 2024
      component.nextMonth();

      expect(component.viewDate().getMonth()).toBe(0); // January
      expect(component.viewDate().getFullYear()).toBe(2025);
    });
  });

  describe('selectDate', () => {
    it('should emit dateChange with formatted YYYY-MM-DD string', () => {
      fixture.detectChanges();

      const spy = vi.fn();
      component.dateChange.subscribe(spy);

      component.selectDate(new Date(2024, 5, 15)); // June 15, 2024

      expect(spy).toHaveBeenCalledWith('2024-06-15');
    });

    it('should close the calendar after selecting a date', () => {
      fixture.detectChanges();

      component.isOpen.set(true);
      component.selectDate(new Date(2024, 5, 15));

      expect(component.isOpen()).toBe(false);
    });

    it('should not emit if day is null', () => {
      fixture.detectChanges();

      const spy = vi.fn();
      component.dateChange.subscribe(spy);

      component.selectDate(null);

      expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit if day exceeds maxDate', () => {
      component.maxDate = '2024-06-10';
      fixture.detectChanges();

      const spy = vi.fn();
      component.dateChange.subscribe(spy);

      component.selectDate(new Date(2024, 5, 15)); // June 15 > June 10

      expect(spy).not.toHaveBeenCalled();
    });

    it('should emit if day equals maxDate', () => {
      component.maxDate = '2024-06-15';
      fixture.detectChanges();

      const spy = vi.fn();
      component.dateChange.subscribe(spy);

      component.selectDate(new Date(2024, 5, 15)); // June 15 = June 15

      expect(spy).toHaveBeenCalledWith('2024-06-15');
    });

    it('should emit if day is before maxDate', () => {
      component.maxDate = '2024-06-20';
      fixture.detectChanges();

      const spy = vi.fn();
      component.dateChange.subscribe(spy);

      component.selectDate(new Date(2024, 5, 15)); // June 15 < June 20

      expect(spy).toHaveBeenCalledWith('2024-06-15');
    });

    it('should pad single-digit months and days', () => {
      fixture.detectChanges();

      const spy = vi.fn();
      component.dateChange.subscribe(spy);

      component.selectDate(new Date(2024, 0, 5)); // Jan 5

      expect(spy).toHaveBeenCalledWith('2024-01-05');
    });
  });

  describe('selectToday', () => {
    it("should emit today's date in YYYY-MM-DD format", () => {
      fixture.detectChanges();

      const spy = vi.fn();
      component.dateChange.subscribe(spy);

      component.selectToday();

      const today = new Date();
      const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      expect(spy).toHaveBeenCalledWith(expected);
    });

    it('should navigate viewDate to current month', () => {
      fixture.detectChanges();

      component.viewDate.set(new Date(2020, 0, 1)); // Jan 2020
      component.selectToday();

      const today = new Date();
      expect(component.viewDate().getMonth()).toBe(today.getMonth());
      expect(component.viewDate().getFullYear()).toBe(today.getFullYear());
    });

    it('should NOT close the calendar after selecting today', () => {
      fixture.detectChanges();

      component.isOpen.set(true);
      component.selectToday();

      // Calendar stays open so user can see the selection
      expect(component.isOpen()).toBe(true);
    });
  });

  describe('clearDate', () => {
    it('should emit empty string', () => {
      fixture.detectChanges();

      const spy = vi.fn();
      component.dateChange.subscribe(spy);

      component.clearDate();

      expect(spy).toHaveBeenCalledWith('');
    });

    it('should close the calendar', () => {
      fixture.detectChanges();

      component.isOpen.set(true);
      component.clearDate();

      expect(component.isOpen()).toBe(false);
    });
  });

  describe('isSameDay', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should return true for matching dates', () => {
      const d = new Date(2024, 5, 15);
      expect(component.isSameDay(d, '2024-06-15')).toBe(true);
    });

    it('should return false for different dates', () => {
      const d = new Date(2024, 5, 15);
      expect(component.isSameDay(d, '2024-06-16')).toBe(false);
    });

    it('should return false for different months', () => {
      const d = new Date(2024, 5, 15);
      expect(component.isSameDay(d, '2024-07-15')).toBe(false);
    });

    it('should return false for different years', () => {
      const d = new Date(2024, 5, 15);
      expect(component.isSameDay(d, '2023-06-15')).toBe(false);
    });

    it('should return false when first date is null', () => {
      expect(component.isSameDay(null, '2024-06-15')).toBe(false);
    });

    it('should return false when second date string is empty', () => {
      const d = new Date(2024, 5, 15);
      expect(component.isSameDay(d, '')).toBe(false);
    });

    it('should return false when both are null/empty', () => {
      expect(component.isSameDay(null, '')).toBe(false);
    });
  });

  describe('isToday', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should return true for today', () => {
      const today = new Date();
      expect(component.isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(component.isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(component.isToday(tomorrow)).toBe(false);
    });

    it('should return false for null', () => {
      expect(component.isToday(null)).toBe(false);
    });

    it('should return false for same day different year', () => {
      const today = new Date();
      const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      expect(component.isToday(lastYear)).toBe(false);
    });
  });

  describe('isSunday', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should return true for a Sunday', () => {
      // 2024-06-02 is a Sunday
      const sunday = new Date(2024, 5, 2);
      expect(component.isSunday(sunday)).toBe(true);
    });

    it('should return false for a Monday', () => {
      // 2024-06-03 is a Monday
      const monday = new Date(2024, 5, 3);
      expect(component.isSunday(monday)).toBe(false);
    });

    it('should return false for a Saturday', () => {
      // 2024-06-01 is a Saturday
      const saturday = new Date(2024, 5, 1);
      expect(component.isSunday(saturday)).toBe(false);
    });

    it('should return false for null', () => {
      expect(component.isSunday(null)).toBe(false);
    });
  });

  describe('isDisabled', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should return true for null', () => {
      expect(component.isDisabled(null)).toBe(true);
    });

    it('should return false when no maxDate is set', () => {
      expect(component.isDisabled(new Date(2099, 11, 31))).toBe(false);
    });

    it('should return true for dates after maxDate', () => {
      component.maxDate = '2024-06-15';
      expect(component.isDisabled(new Date(2024, 5, 16))).toBe(true);
    });

    it('should return false for dates on maxDate', () => {
      component.maxDate = '2024-06-15';
      expect(component.isDisabled(new Date(2024, 5, 15))).toBe(false);
    });

    it('should return false for dates before maxDate', () => {
      component.maxDate = '2024-06-15';
      expect(component.isDisabled(new Date(2024, 5, 14))).toBe(false);
    });

    it('should compare only date parts, ignoring time', () => {
      component.maxDate = '2024-06-15';
      // Same day but with time set — should still be valid
      const d = new Date(2024, 5, 15, 23, 59, 59);
      expect(component.isDisabled(d)).toBe(false);
    });
  });

  describe('calendarDays', () => {
    it('should generate correct number of days for a month', () => {
      fixture.detectChanges();

      // June 2024: 30 days, starts on Saturday (day 6, padding = 5)
      component.viewDate.set(new Date(2024, 5, 1));
      const days = component['calendarDays']();

      // Should have 5 null padding + 30 days = 35
      const nullDays = days.filter((d: unknown) => d === null).length;
      const realDays = days.filter((d: unknown) => d !== null).length;
      expect(realDays).toBe(30);
      expect(days.length).toBe(nullDays + realDays);
    });

    it('should generate correct days for February in a leap year', () => {
      fixture.detectChanges();

      component.viewDate.set(new Date(2024, 1, 1)); // Feb 2024 (leap year)
      const days = component['calendarDays']();

      const realDays = days.filter((d: unknown) => d !== null).length;
      expect(realDays).toBe(29);
    });

    it('should generate correct days for February in a non-leap year', () => {
      fixture.detectChanges();

      component.viewDate.set(new Date(2023, 1, 1)); // Feb 2023
      const days = component['calendarDays']();

      const realDays = days.filter((d: unknown) => d !== null).length;
      expect(realDays).toBe(28);
    });

    it('should start with null padding for days before the 1st', () => {
      fixture.detectChanges();

      // January 2025 starts on Wednesday (day 3, so 2 null paddings: Mon, Tue)
      component.viewDate.set(new Date(2025, 0, 1));
      const days = component['calendarDays']();

      expect(days[0]).toBeNull();
      expect(days[1]).toBeNull();
      expect(days[2]).not.toBeNull(); // Wednesday = first real day
    });

    it('should have no padding when month starts on Monday', () => {
      fixture.detectChanges();

      // July 2024 starts on Monday
      component.viewDate.set(new Date(2024, 6, 1));
      const days = component['calendarDays']();

      expect(days[0]).not.toBeNull();
      expect(days[0]!.getDate()).toBe(1);
    });

    it('should have 6 padding days when month starts on Sunday', () => {
      fixture.detectChanges();

      // September 2024 starts on Sunday
      component.viewDate.set(new Date(2024, 8, 1));
      const days = component['calendarDays']();

      const nullDays = days.filter((d: unknown) => d === null).length;
      expect(nullDays).toBe(6); // Mon-Sat are null, Sun is first day
    });
  });

  describe('weekDays', () => {
    it('should return 7 days', () => {
      fixture.detectChanges();
      const days = component['weekDays']();
      expect(days.length).toBe(7);
    });

    it('should start from Monday (ISO 8601)', () => {
      fixture.detectChanges();
      const days = component['weekDays']();
      // All values should be non-null strings
      days.forEach((d: unknown) => expect(d).toBeTruthy());
    });
  });

  describe('formattedDate', () => {
    it('should return empty string when date is empty', () => {
      component.date = '';
      fixture.detectChanges();

      expect(component['formattedDate']()).toBe('');
    });

    it('should return formatted date when date is set', () => {
      component.date = '2024-06-15';
      fixture.detectChanges();

      const formatted = component['formattedDate']();
      expect(formatted).toBeTruthy();
      expect(formatted).not.toBe('');
    });
  });

  describe('clickout', () => {
    it('should close calendar when clicking outside', () => {
      fixture.detectChanges();

      component.isOpen.set(true);

      // Simulate a click outside the component
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);
      const event = new MouseEvent('click');
      Object.defineProperty(event, 'target', { value: outsideElement });

      component.clickout(event);

      expect(component.isOpen()).toBe(false);
      document.body.removeChild(outsideElement);
    });

    it('should NOT close calendar when clicking inside component', () => {
      fixture.detectChanges();

      component.isOpen.set(true);

      // Simulate a click inside the component
      const event = new MouseEvent('click');
      Object.defineProperty(event, 'target', { value: fixture.nativeElement });

      component.clickout(event);

      expect(component.isOpen()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle selecting date on Dec 31 boundary', () => {
      fixture.detectChanges();

      const spy = vi.fn();
      component.dateChange.subscribe(spy);

      component.selectDate(new Date(2024, 11, 31));

      expect(spy).toHaveBeenCalledWith('2024-12-31');
    });

    it('should handle selecting date on Jan 1 boundary', () => {
      fixture.detectChanges();

      const spy = vi.fn();
      component.dateChange.subscribe(spy);

      component.selectDate(new Date(2025, 0, 1));

      expect(spy).toHaveBeenCalledWith('2025-01-01');
    });

    it('should handle Feb 29 in leap year', () => {
      fixture.detectChanges();

      const spy = vi.fn();
      component.dateChange.subscribe(spy);

      component.selectDate(new Date(2024, 1, 29));

      expect(spy).toHaveBeenCalledWith('2024-02-29');
    });

    it('should handle rapid open/close toggling', () => {
      fixture.detectChanges();

      component.toggleCalendar(); // open
      component.toggleCalendar(); // close
      component.toggleCalendar(); // open
      component.toggleCalendar(); // close

      expect(component.isOpen()).toBe(false);
    });

    it('should handle navigating many months forward', () => {
      fixture.detectChanges();

      component.viewDate.set(new Date(2024, 0, 1)); // Jan 2024
      for (let i = 0; i < 24; i++) {
        component.nextMonth();
      }

      expect(component.viewDate().getFullYear()).toBe(2026);
      expect(component.viewDate().getMonth()).toBe(0); // January
    });

    it('should handle navigating many months backward', () => {
      fixture.detectChanges();

      component.viewDate.set(new Date(2024, 11, 1)); // Dec 2024
      for (let i = 0; i < 24; i++) {
        component.prevMonth();
      }

      // Dec 2024 - 24 months = Dec 2022
      expect(component.viewDate().getFullYear()).toBe(2022);
      expect(component.viewDate().getMonth()).toBe(11);
    });

    it('should handle selecting then clearing date', () => {
      fixture.detectChanges();

      const spy = vi.fn();
      component.dateChange.subscribe(spy);

      component.selectDate(new Date(2024, 5, 15));
      component.clearDate();

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy.mock.calls[0][0]).toBe('2024-06-15');
      expect(spy.mock.calls[1][0]).toBe('');
    });

    it('should not toggle when disabled even after multiple attempts', () => {
      component.disabled = true;
      fixture.detectChanges();

      component.toggleCalendar();
      component.toggleCalendar();
      component.toggleCalendar();

      expect(component.isOpen()).toBe(false);
    });
  });

  describe('DOM Rendering', () => {
    it('should render the input wrapper', () => {
      fixture.detectChanges();

      const wrapper = fixture.debugElement.query(By.css('.input-wrapper'));
      expect(wrapper).toBeTruthy();
    });

    it('should show placeholder when no date is set', () => {
      component.date = '';
      fixture.detectChanges();

      const display = fixture.debugElement.query(By.css('.date-display'));
      expect(display.nativeElement.classList.contains('placeholder')).toBe(true);
    });

    it('should not show placeholder when date is set', () => {
      component.date = '2024-06-15';
      fixture.detectChanges();

      const display = fixture.debugElement.query(By.css('.date-display'));
      expect(display.nativeElement.classList.contains('placeholder')).toBe(false);
    });

    it('should apply disabled class when disabled', () => {
      component.disabled = true;
      fixture.detectChanges();

      const wrapper = fixture.debugElement.query(By.css('.input-wrapper'));
      expect(wrapper.nativeElement.classList.contains('disabled')).toBe(true);
    });

    it('should not show calendar popup when closed', () => {
      fixture.detectChanges();

      const popup = fixture.debugElement.query(By.css('.calendar-popup'));
      expect(popup).toBeNull();
    });

    it('should show calendar popup when open', () => {
      fixture.detectChanges();

      component.isOpen.set(true);
      fixture.detectChanges();

      const popup = fixture.debugElement.query(By.css('.calendar-popup'));
      expect(popup).toBeTruthy();
    });

    it('should render Today and Clear buttons in footer when open', () => {
      fixture.detectChanges();

      component.isOpen.set(true);
      fixture.detectChanges();

      const footer = fixture.debugElement.query(By.css('.calendar-footer'));
      expect(footer).toBeTruthy();

      const buttons = footer.queryAll(By.css('button'));
      expect(buttons.length).toBe(2);
    });

    it('should render navigation buttons in header when open', () => {
      fixture.detectChanges();

      component.isOpen.set(true);
      fixture.detectChanges();

      const navBtns = fixture.debugElement.queryAll(By.css('.nav-btn'));
      expect(navBtns.length).toBe(2);
    });

    it('should render weekday headers when open', () => {
      fixture.detectChanges();

      component.isOpen.set(true);
      fixture.detectChanges();

      const weekdays = fixture.debugElement.queryAll(By.css('.weekday'));
      expect(weekdays.length).toBe(7);
    });
  });

  describe('Using DatePickerHarness', () => {
    let harness: DatePickerHarness;

    beforeEach(async () => {
      fixture.componentRef.setInput('placeholder', 'Select date');
      harness = await getHarness(fixture, DatePickerHarness);
    });

    it('should read placeholder when no date is selected', async () => {
      fixture.componentRef.setInput('date', '');
      expect(await harness.getDisplayText()).toBe('Select date');
    });

    it('should open and close calendar on clicking wrapper via harness', async () => {
      expect(await harness.isCalendarOpen()).toBe(false);
      await harness.toggleCalendar();
      expect(await harness.isCalendarOpen()).toBe(true);
      await harness.toggleCalendar();
      expect(await harness.isCalendarOpen()).toBe(false);
    });

    it('should navigate months via harness', async () => {
      await harness.toggleCalendar();
      const currentMonth = await harness.getMonthYearText();
      expect(currentMonth).toBeTruthy();

      await harness.clickNextMonth();
      const nextMonth = await harness.getMonthYearText();
      expect(nextMonth).not.toBe(currentMonth);

      await harness.clickPrevMonth();
      const backMonth = await harness.getMonthYearText();
      expect(backMonth).toBe(currentMonth);
    });

    it('should select today via harness', async () => {
      const dateSpy = vi.fn();
      component.dateChange.subscribe(dateSpy);

      await harness.toggleCalendar();
      await harness.clickToday();
      expect(dateSpy).toHaveBeenCalled();
    });

    it('should clear date via harness', async () => {
      fixture.componentRef.setInput('date', '2026-06-15');

      const dateSpy = vi.fn();
      component.dateChange.subscribe(dateSpy);

      await harness.toggleCalendar();
      await harness.clickClear();
      expect(dateSpy).toHaveBeenCalledWith('');
    });
  });
});
