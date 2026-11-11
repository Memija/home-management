import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  effect,
  inject,
  ElementRef,
} from '@angular/core';
import { DatePipe, DOCUMENT } from '@angular/common';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LucideAngularModule, ChevronLeft, ChevronRight, Calendar } from 'lucide-angular';
import { getDateKey, parseSafeDate } from '../../models/records.model';

export interface CalendarCellViewModel {
  readonly date: Date | null;
  readonly dayNumber: number | null;
  readonly isSelected: boolean;
  readonly isToday: boolean;
  readonly isSunday: boolean;
  readonly isDisabled: boolean;
  readonly fullDateTitle: string;
}

const EMPTY_CALENDAR_CELL: CalendarCellViewModel = Object.freeze({
  date: null,
  dayNumber: null,
  isSelected: false,
  isToday: false,
  isSunday: false,
  isDisabled: true,
  fullDateTitle: '',
});

const weekDaysCache = new Map<string, (string | null)[]>();

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [TranslatePipe, LucideAngularModule],
  providers: [DatePipe],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatePickerComponent {
  private readonly languageService = inject(LanguageService);
  private readonly datePipe = inject(DatePipe);
  private readonly eRef = inject(ElementRef);
  private readonly document = inject(DOCUMENT, { optional: true });

  // Inputs
  readonly date = input<string, string | null | undefined>('', {
    transform: (val) => val || '',
  });

  readonly maxDate = input<string, string | null | undefined>('', {
    transform: (val) => val || '',
  });

  readonly placeholder = input<string, string | null | undefined>('Select date', {
    transform: (val) => val || 'Select date',
  });

  readonly disabled = input<boolean>(false);

  // Outputs
  readonly dateChange = output<string>();

  // State
  readonly isOpen = signal(false);
  readonly viewDate = signal(new Date()); // Current month view

  protected readonly ChevronLeftIcon = ChevronLeft;
  protected readonly ChevronRightIcon = ChevronRight;
  protected readonly CalendarIcon = Calendar;

  protected currentLang = computed(() => this.languageService.currentLang());

  protected formattedDate = computed(() => {
    const d = this.date();
    if (!d) return '';
    return (
      this.datePipe.transform(parseSafeDate(d), 'mediumDate', undefined, this.currentLang()) || d
    );
  });

  constructor() {
    effect((onCleanup) => {
      if (!this.isOpen() || !this.document) return;
      const handler = (event: Event) => this.clickout(event);
      this.document.addEventListener('click', handler);
      onCleanup(() => this.document?.removeEventListener('click', handler));
    });
  }

  protected currentMonthName = computed(() => {
    const raw = this.datePipe.transform(
      this.viewDate(),
      'MMMM yyyy',
      undefined,
      this.currentLang(),
    );
    if (!raw) return '';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  });

  protected weekDays = computed(() => {
    const lang = this.currentLang();
    const cached = weekDaysCache.get(lang);
    if (cached) return cached;

    const days: (string | null)[] = [];
    const d = new Date(2024, 0, 1); // Fixed Monday (2024-01-01) for ISO 8601
    for (let i = 0; i < 7; i++) {
      days.push(this.datePipe.transform(d, 'EEE', undefined, lang));
      d.setDate(d.getDate() + 1);
    }
    weekDaysCache.set(lang, days);
    return days;
  });

  protected calendarDays = computed(() => {
    const view = this.viewDate();
    const year = view.getFullYear();
    const month = view.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];

    // Padding for previous month
    // getDay(): 0 = Sunday, 1 = Monday. We want Monday start.
    let startDay = firstDay.getDay();
    if (startDay === 0) startDay = 7; // Make Sunday 7

    // Add empty slots for previous month days
    for (let i = 1; i < startDay; i++) {
      days.push(null);
    }

    // Days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  });

  private readonly maxDateTimestamp = computed<number | null>(() => {
    const m = this.maxDate();
    if (!m) return null;
    const max = parseSafeDate(m);
    return new Date(max.getFullYear(), max.getMonth(), max.getDate()).getTime();
  });

  protected readonly calendarCells = computed<CalendarCellViewModel[]>(() => {
    if (!this.isOpen()) return [];
    const days = this.calendarDays();
    const selectedStr = this.date();
    const selectedDate = selectedStr ? parseSafeDate(selectedStr) : null;
    const selYear = selectedDate?.getFullYear() ?? -1;
    const selMonth = selectedDate?.getMonth() ?? -1;
    const selDay = selectedDate?.getDate() ?? -1;

    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();

    const maxTime = this.maxDateTimestamp();
    const lang = this.currentLang();

    return days.map((day) => {
      if (!day) {
        return EMPTY_CALENDAR_CELL;
      }

      const dYear = day.getFullYear();
      const dMonth = day.getMonth();
      const dDate = day.getDate();

      return {
        date: day,
        dayNumber: dDate,
        isSelected: dDate === selDay && dMonth === selMonth && dYear === selYear,
        isToday: dDate === todayDay && dMonth === todayMonth && dYear === todayYear,
        isSunday: day.getDay() === 0,
        isDisabled: maxTime !== null && day.getTime() > maxTime,
        fullDateTitle: this.datePipe.transform(day, 'fullDate', undefined, lang) || '',
      };
    });
  });

  toggleCalendar() {
    if (!this.disabled()) {
      this.isOpen.update((v) => !v);
      if (this.isOpen() && this.date()) {
        this.viewDate.set(parseSafeDate(this.date()));
      }
    }
  }

  prevMonth() {
    this.viewDate.update((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth() {
    this.viewDate.update((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  selectDate(day: Date | null) {
    if (!day) return;

    // Check max date
    const maxTime = this.maxDateTimestamp();
    if (maxTime !== null && day.getTime() > maxTime) return;

    const dateStr = getDateKey(day);

    this.dateChange.emit(dateStr);
    this.isOpen.set(false);
  }

  selectToday() {
    const today = new Date();
    // Navigate to current month first
    this.viewDate.set(new Date(today.getFullYear(), today.getMonth(), 1));

    const dateStr = getDateKey(today);

    // Emit the date change but keep calendar open so user can see the change
    this.dateChange.emit(dateStr);
  }

  clearDate() {
    this.dateChange.emit('');
    this.isOpen.set(false);
  }

  isSameDay(d1: Date | null, d2Str: string): boolean {
    if (!d1 || !d2Str) return false;
    const d2 = parseSafeDate(d2Str);
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  }

  isToday(d: Date | null): boolean {
    if (!d) return false;
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  }

  isSunday(d: Date | null): boolean {
    if (!d) return false;
    return d.getDay() === 0;
  }

  isDisabled(d: Date | null): boolean {
    if (!d) return true;
    const maxTime = this.maxDateTimestamp();
    if (maxTime !== null) {
      // Compare only dates, ignore time
      const dTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      return dTime > maxTime;
    }
    return false;
  }

  clickout(event: Event) {
    if (!this.isOpen()) return;
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
