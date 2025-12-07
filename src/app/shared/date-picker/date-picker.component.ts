import { Component, input, output, signal, computed, inject, ElementRef, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LucideAngularModule, ChevronLeft, ChevronRight, Calendar } from 'lucide-angular';

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LucideAngularModule],
  providers: [DatePipe],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss'
})
export class DatePickerComponent {
  private languageService = inject(LanguageService);
  private datePipe = inject(DatePipe);
  private eRef = inject(ElementRef);

  // Inputs
  date = input<string>(''); // YYYY-MM-DD
  maxDate = input<string>(''); // YYYY-MM-DD
  placeholder = input<string>('Select date');
  disabled = input<boolean>(false);

  // Outputs
  dateChange = output<string>();

  // State
  isOpen = signal(false);
  viewDate = signal(new Date()); // Current month view

  protected readonly ChevronLeftIcon = ChevronLeft;
  protected readonly ChevronRightIcon = ChevronRight;
  protected readonly CalendarIcon = Calendar;

  protected currentLang = computed(() => this.languageService.currentLang());

  protected formattedDate = computed(() => {
    const d = this.date();
    if (!d) return '';
    return this.datePipe.transform(d, 'mediumDate', undefined, this.currentLang()) || d;
  });

  protected currentMonthName = computed(() => {
    return this.datePipe.transform(this.viewDate(), 'MMMM yyyy', undefined, this.currentLang());
  });

  protected weekDays = computed(() => {
    const days = [];
    const d = new Date();
    // Start from Monday (ISO 8601)
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);

    for (let i = 0; i < 7; i++) {
      days.push(this.datePipe.transform(d, 'EEE', undefined, this.currentLang()));
      d.setDate(d.getDate() + 1);
    }
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

  constructor() {
    // Initialize viewDate from input date if present
    if (this.date()) {
      this.viewDate.set(new Date(this.date()));
    }
  }

  toggleCalendar() {
    if (!this.disabled()) {
      this.isOpen.update(v => !v);
      if (this.isOpen() && this.date()) {
        this.viewDate.set(new Date(this.date()));
      }
    }
  }

  prevMonth() {
    this.viewDate.update(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth() {
    this.viewDate.update(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  selectDate(day: Date | null) {
    if (!day) return;

    // Check max date
    if (this.maxDate()) {
      const max = new Date(this.maxDate());
      if (day > max) return;
    }

    // Use local date parts to avoid timezone issues
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const date = String(day.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${date}`;

    this.dateChange.emit(dateStr);
    this.isOpen.set(false);
  }

  selectToday() {
    const today = new Date();
    // Navigate to current month first
    this.viewDate.set(new Date(today.getFullYear(), today.getMonth(), 1));

    // Format today's date as YYYY-MM-DD
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const date = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${date}`;

    // Emit the date change but keep calendar open so user can see the change
    this.dateChange.emit(dateStr);
  }

  clearDate() {
    this.dateChange.emit('');
    this.isOpen.set(false);
  }

  isSameDay(d1: Date | null, d2Str: string): boolean {
    if (!d1 || !d2Str) return false;
    const d2 = new Date(d2Str);
    return d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();
  }

  isToday(d: Date | null): boolean {
    if (!d) return false;
    const today = new Date();
    return d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
  }

  isSunday(d: Date | null): boolean {
    if (!d) return false;
    return d.getDay() === 0;
  }

  isDisabled(d: Date | null): boolean {
    if (!d) return true;
    if (this.maxDate()) {
      const max = new Date(this.maxDate());
      // Compare only dates, ignore time
      const dTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const maxTime = new Date(max.getFullYear(), max.getMonth(), max.getDate()).getTime();
      return dTime > maxTime;
    }
    return false;
  }

  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
