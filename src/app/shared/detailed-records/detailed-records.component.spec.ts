import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  DetailedRecordsComponent,
  GenericRecord,
  SortOptionConfig,
} from './detailed-records.component';
import { LanguageService } from '../../services/language.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { Component, Pipe, PipeTransform, signal, input, output } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { DatePickerComponent } from '../date-picker/date-picker.component';
import { HelpModalComponent, HelpStep } from '../help-modal/help-modal.component';
import { vi, afterEach } from 'vitest';

// Mock TranslatePipe
@Pipe({ name: 'translate', standalone: true })
class MockTranslatePipe implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

// Stub components to avoid resolving their templates
@Component({ selector: 'app-date-picker', standalone: true, template: '' })
class MockDatePickerComponent {
  date = input<string>('');
  maxDate = input<string>('');
  placeholder = input<string>('');
  disabled = input<boolean>(false);
  dateChange = output<string>();
}

@Component({ selector: 'app-help-modal', standalone: true, template: '' })
class MockHelpModalComponent {
  show = input.required<boolean>();
  titleKey = input<string>('');
  steps = input.required<HelpStep[]>();
  close = output<void>();
}

// Helper to create test records
function makeRecord(dateStr: string, extras: Record<string, unknown> = {}): GenericRecord {
  return { date: new Date(dateStr), ...extras };
}

// Helper to create water-type records
function makeWaterRecord(
  dateStr: string,
  kw: number,
  kc: number,
  bw: number,
  bc: number,
): GenericRecord {
  return {
    date: new Date(dateStr),
    kitchenWarm: kw,
    kitchenCold: kc,
    bathroomWarm: bw,
    bathroomCold: bc,
  };
}

describe('DetailedRecordsComponent', () => {
  let component: DetailedRecordsComponent;
  let fixture: ComponentFixture<DetailedRecordsComponent>;
  let languageServiceMock: any;
  let localStorageServiceMock: any;

  beforeEach(async () => {
    languageServiceMock = {
      currentLang: signal('en'),
      translate: vi.fn().mockImplementation((key: string, params?: Record<string, unknown>) => {
        if (params) return `${key}:${JSON.stringify(params)}`;
        return key;
      }),
    };

    localStorageServiceMock = {
      getPreference: vi.fn().mockReturnValue(null),
      setPreference: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DetailedRecordsComponent],
    })
      .overrideComponent(DetailedRecordsComponent, {
        remove: { imports: [TranslatePipe, DatePickerComponent, HelpModalComponent] },
        add: { imports: [MockTranslatePipe, MockDatePickerComponent, MockHelpModalComponent] },
      })
      .overrideProvider(LanguageService, { useValue: languageServiceMock })
      .overrideProvider(LocalStorageService, { useValue: localStorageServiceMock })
      .compileComponents();

    fixture = TestBed.createComponent(DetailedRecordsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Creation and Defaults', () => {
    it('should create', () => {
      fixture.componentRef.setInput('records', []);
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should have correct default input values', () => {
      fixture.componentRef.setInput('records', []);
      fixture.detectChanges();

      expect(component.showSearchDate()).toBe(true);
      expect(component.showYearMonth()).toBe(true);
      expect(component.showEditDelete()).toBe(true);
      expect(component.recordType()).toBe('water');
      expect(component.showTotal()).toBe(true);
      expect(component.hasDetails()).toBe(true);
      expect(component.allowCollapse()).toBe(true);
      expect(component.helpTitleKey()).toBe('HOME.RECORDS_HELP_TITLE');
      expect(component.totalLabelKey()).toBe('HOME.TOTAL');
      expect(component.valuesNoteKey()).toBe('HOME.ALL_VALUES_IN_LITERS');
    });

    it('should default sort option to date-desc', () => {
      fixture.componentRef.setInput('records', []);
      fixture.detectChanges();
      expect((component as any).sortOption()).toBe('date-desc');
    });

    it('should initialize sortOption from defaultSortOption input default', () => {
      // The constructor reads defaultSortOption() at creation time,
      // so sortOption matches the input signal's default value ('date-desc')
      fixture.componentRef.setInput('records', []);
      fixture.detectChanges();
      expect((component as any).sortOption()).toBe('date-desc');
    });

    it('should default pagination size to 5', () => {
      fixture.componentRef.setInput('records', []);
      fixture.detectChanges();
      expect((component as any).paginationSize()).toBe(5);
    });

    it('should start on page 1', () => {
      fixture.componentRef.setInput('records', []);
      fixture.detectChanges();
      expect((component as any).currentPage()).toBe(1);
    });
  });

  describe('Collapse State', () => {
    it('should default to collapsed when no stored preference', () => {
      localStorageServiceMock.getPreference.mockReturnValue(null);
      fixture.componentRef.setInput('records', []);
      fixture.detectChanges();
      expect((component as any).isCollapsed()).toBe(true);
    });

    it('should restore collapsed state from localStorage as true', () => {
      localStorageServiceMock.getPreference.mockReturnValue('true');
      fixture.componentRef.setInput('records', []);
      fixture.detectChanges();
      expect((component as any).isCollapsed()).toBe(true);
    });

    it('should restore collapsed state from localStorage as false', () => {
      localStorageServiceMock.getPreference.mockReturnValue('false');
      fixture.componentRef.setInput('records', []);
      fixture.detectChanges();
      expect((component as any).isCollapsed()).toBe(false);
    });

    it('should use the correct localStorage key based on recordType', () => {
      fixture.componentRef.setInput('records', []);
      fixture.componentRef.setInput('recordType', 'electricity');
      fixture.detectChanges();
      expect(localStorageServiceMock.getPreference).toHaveBeenCalledWith(
        'detailed_records_for_electricity_are_collapsed',
      );
    });

    it('should toggle collapse from true to false', () => {
      localStorageServiceMock.getPreference.mockReturnValue('true');
      fixture.componentRef.setInput('records', [makeRecord('2024-01-15')]);
      fixture.detectChanges();

      expect((component as any).isCollapsed()).toBe(true);
      (component as any).toggleCollapse();
      expect((component as any).isCollapsed()).toBe(false);
    });

    it('should toggle collapse from false to true', () => {
      localStorageServiceMock.getPreference.mockReturnValue('false');
      fixture.componentRef.setInput('records', [makeRecord('2024-01-15')]);
      fixture.detectChanges();

      expect((component as any).isCollapsed()).toBe(false);
      (component as any).toggleCollapse();
      expect((component as any).isCollapsed()).toBe(true);
    });

    it('should persist collapse state to localStorage on toggle', () => {
      localStorageServiceMock.getPreference.mockReturnValue('true');
      fixture.componentRef.setInput('records', [makeRecord('2024-01-15')]);
      fixture.componentRef.setInput('recordType', 'heating');
      fixture.detectChanges();

      (component as any).toggleCollapse();
      expect(localStorageServiceMock.setPreference).toHaveBeenCalledWith(
        'detailed_records_for_heating_are_collapsed',
        'false',
      );
    });
  });

  describe('Filtering - Date Range', () => {
    const records: GenericRecord[] = [
      makeRecord('2024-01-15'),
      makeRecord('2024-03-20'),
      makeRecord('2024-06-10'),
      makeRecord('2024-09-05'),
      makeRecord('2024-12-25'),
    ];

    beforeEach(() => {
      fixture.componentRef.setInput('records', records);
      fixture.detectChanges();
    });

    it('should return all records when no filters are active', () => {
      expect((component as any).filteredRecords().length).toBe(5);
    });

    it('should filter by start date', () => {
      (component as any).startDate.set('2024-06-01');
      const filtered = (component as any).filteredRecords();
      expect(filtered.length).toBe(3);
      expect(filtered.every((r: GenericRecord) => new Date(r.date) >= new Date('2024-06-01'))).toBe(
        true,
      );
    });

    it('should filter by end date', () => {
      (component as any).endDate.set('2024-06-30');
      const filtered = (component as any).filteredRecords();
      expect(filtered.length).toBe(3);
    });

    it('should filter by both start and end date', () => {
      (component as any).startDate.set('2024-03-01');
      (component as any).endDate.set('2024-09-30');
      const filtered = (component as any).filteredRecords();
      expect(filtered.length).toBe(3);
    });

    it('should return empty when date range excludes all records', () => {
      (component as any).startDate.set('2025-01-01');
      (component as any).endDate.set('2025-12-31');
      expect((component as any).filteredRecords().length).toBe(0);
    });

    it('should include record on exact start date boundary', () => {
      (component as any).startDate.set('2024-01-15');
      const filtered = (component as any).filteredRecords();
      expect(filtered.length).toBe(5);
    });

    it('should include record on exact end date boundary', () => {
      (component as any).endDate.set('2024-12-25');
      const filtered = (component as any).filteredRecords();
      expect(filtered.length).toBe(5);
    });
  });

  describe('Filtering - Year and Month', () => {
    const records: GenericRecord[] = [
      makeRecord('2023-05-10'),
      makeRecord('2024-01-15'),
      makeRecord('2024-05-20'),
      makeRecord('2024-08-10'),
      makeRecord('2025-01-05'),
    ];

    beforeEach(() => {
      fixture.componentRef.setInput('records', records);
      fixture.detectChanges();
    });

    it('should filter by year', () => {
      (component as any).searchYear.set(2024);
      const filtered = (component as any).filteredRecords();
      expect(filtered.length).toBe(3);
      expect(filtered.every((r: GenericRecord) => new Date(r.date).getFullYear() === 2024)).toBe(
        true,
      );
    });

    it('should filter by month (0-indexed)', () => {
      (component as any).searchMonth.set(0); // January
      const filtered = (component as any).filteredRecords();
      expect(filtered.length).toBe(2); // Jan 2024 + Jan 2025
    });

    it('should filter by both year and month', () => {
      (component as any).searchYear.set(2024);
      (component as any).searchMonth.set(0); // January
      const filtered = (component as any).filteredRecords();
      expect(filtered.length).toBe(1);
    });

    it('should return empty when year has no records', () => {
      (component as any).searchYear.set(2020);
      expect((component as any).filteredRecords().length).toBe(0);
    });

    it('should return empty when month has no records in selected year', () => {
      (component as any).searchYear.set(2024);
      (component as any).searchMonth.set(11); // December
      expect((component as any).filteredRecords().length).toBe(0);
    });

    it('should combine date range with year filter', () => {
      (component as any).startDate.set('2024-01-01');
      (component as any).endDate.set('2024-12-31');
      (component as any).searchYear.set(2024);
      const filtered = (component as any).filteredRecords();
      expect(filtered.length).toBe(3);
    });
  });

  describe('Available Years', () => {
    it('should return unique years sorted descending', () => {
      fixture.componentRef.setInput('records', [
        makeRecord('2022-03-10'),
        makeRecord('2024-01-15'),
        makeRecord('2024-06-10'),
        makeRecord('2023-12-25'),
      ]);
      fixture.detectChanges();

      const years = (component as any).availableYears();
      expect(years).toEqual([2024, 2023, 2022]);
    });

    it('should return empty array when no records', () => {
      fixture.componentRef.setInput('records', []);
      fixture.detectChanges();
      expect((component as any).availableYears()).toEqual([]);
    });

    it('should handle records all in the same year', () => {
      fixture.componentRef.setInput('records', [
        makeRecord('2024-01-01'),
        makeRecord('2024-06-15'),
        makeRecord('2024-12-31'),
      ]);
      fixture.detectChanges();

      expect((component as any).availableYears()).toEqual([2024]);
    });
  });

  describe('isFilterActive', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('records', []);
      fixture.detectChanges();
    });

    it('should be false when no filters are set', () => {
      expect((component as any).isFilterActive()).toBe(false);
    });

    it('should be true when startDate is set', () => {
      (component as any).startDate.set('2024-01-01');
      expect((component as any).isFilterActive()).toBe(true);
    });

    it('should be true when endDate is set', () => {
      (component as any).endDate.set('2024-12-31');
      expect((component as any).isFilterActive()).toBe(true);
    });

    it('should be true when searchYear is set', () => {
      (component as any).searchYear.set(2024);
      expect((component as any).isFilterActive()).toBe(true);
    });

    it('should be true when searchMonth is set', () => {
      (component as any).searchMonth.set(5);
      expect((component as any).isFilterActive()).toBe(true);
    });

    it('should be true when month is 0 (January) — falsy but valid', () => {
      (component as any).searchMonth.set(0);
      expect((component as any).isFilterActive()).toBe(true);
    });
  });

  describe('Reset Filters', () => {
    it('should clear all filters and reset page', () => {
      fixture.componentRef.setInput('records', []);
      fixture.detectChanges();

      (component as any).startDate.set('2024-01-01');
      (component as any).endDate.set('2024-12-31');
      (component as any).searchYear.set(2024);
      (component as any).searchMonth.set(5);
      (component as any).currentPage.set(3);

      (component as any).resetFilters();

      expect((component as any).startDate()).toBeNull();
      expect((component as any).endDate()).toBeNull();
      expect((component as any).searchYear()).toBeNull();
      expect((component as any).searchMonth()).toBeNull();
      expect((component as any).currentPage()).toBe(1);
    });
  });

  describe('Sorting', () => {
    const records: GenericRecord[] = [
      makeWaterRecord('2024-03-15', 10, 5, 8, 3), // total 26, kitchen 15, bathroom 11
      makeWaterRecord('2024-01-10', 20, 10, 15, 5), // total 50, kitchen 30, bathroom 20
      makeWaterRecord('2024-06-20', 5, 2, 3, 1), // total 11, kitchen 7, bathroom 4
    ];

    const totalFn = (r: GenericRecord) =>
      (r['kitchenWarm'] || 0) +
      (r['kitchenCold'] || 0) +
      (r['bathroomWarm'] || 0) +
      (r['bathroomCold'] || 0);

    beforeEach(() => {
      fixture.componentRef.setInput('records', records);
      fixture.componentRef.setInput('calculateTotalFn', totalFn);
      fixture.detectChanges();
    });

    it('should sort by date descending by default', () => {
      const displayed = (component as any).displayedRecords();
      expect(new Date(displayed[0].date).getMonth()).toBe(5); // June
      expect(new Date(displayed[1].date).getMonth()).toBe(2); // March
      expect(new Date(displayed[2].date).getMonth()).toBe(0); // January
    });

    it('should sort by date ascending', () => {
      (component as any).setSortOption('date-asc');
      const displayed = (component as any).displayedRecords();
      expect(new Date(displayed[0].date).getMonth()).toBe(0); // January
      expect(new Date(displayed[2].date).getMonth()).toBe(5); // June
    });

    it('should sort by total descending', () => {
      (component as any).setSortOption('total-desc');
      const displayed = (component as any).displayedRecords();
      expect(totalFn(displayed[0])).toBe(50);
      expect(totalFn(displayed[2])).toBe(11);
    });

    it('should sort by total ascending', () => {
      (component as any).setSortOption('total-asc');
      const displayed = (component as any).displayedRecords();
      expect(totalFn(displayed[0])).toBe(11);
      expect(totalFn(displayed[2])).toBe(50);
    });

    it('should sort water records by kitchen descending', () => {
      (component as any).setSortOption('kitchen-desc');
      const displayed = (component as any).displayedRecords();
      expect(displayed[0]['kitchenWarm'] + displayed[0]['kitchenCold']).toBe(30);
    });

    it('should sort water records by kitchen ascending', () => {
      (component as any).setSortOption('kitchen-asc');
      const displayed = (component as any).displayedRecords();
      expect(displayed[0]['kitchenWarm'] + displayed[0]['kitchenCold']).toBe(7);
    });

    it('should sort water records by bathroom descending', () => {
      (component as any).setSortOption('bathroom-desc');
      const displayed = (component as any).displayedRecords();
      expect(displayed[0]['bathroomWarm'] + displayed[0]['bathroomCold']).toBe(20);
    });

    it('should sort water records by bathroom ascending', () => {
      (component as any).setSortOption('bathroom-asc');
      const displayed = (component as any).displayedRecords();
      expect(displayed[0]['bathroomWarm'] + displayed[0]['bathroomCold']).toBe(4);
    });

    it('should return stable order for unknown sort option on non-water records', () => {
      const genericRecords = [
        makeRecord('2024-01-10', { value: 100 }),
        makeRecord('2024-06-20', { value: 200 }),
      ];
      fixture.componentRef.setInput('records', genericRecords);
      fixture.detectChanges();
      (component as any).setSortOption('bathroom-desc');

      const displayed = (component as any).displayedRecords();
      expect(displayed.length).toBe(2);
    });
  });

  describe('Pagination', () => {
    const createRecords = (count: number): GenericRecord[] =>
      Array.from({ length: count }, (_, i) =>
        makeRecord(
          `2024-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
        ),
      );

    it('should return first page of records', () => {
      fixture.componentRef.setInput('records', createRecords(12));
      fixture.detectChanges();
      expect((component as any).displayedRecords().length).toBe(5);
    });

    it('should calculate total pages correctly', () => {
      fixture.componentRef.setInput('records', createRecords(12));
      fixture.detectChanges();
      expect((component as any).totalPages()).toBe(3); // ceil(12/5)
    });

    it('should calculate total pages as 1 for records <= page size', () => {
      fixture.componentRef.setInput('records', createRecords(3));
      fixture.detectChanges();
      expect((component as any).totalPages()).toBe(1);
    });

    it('should navigate to next page', () => {
      fixture.componentRef.setInput('records', createRecords(12));
      fixture.detectChanges();

      (component as any).nextPage();
      expect((component as any).currentPage()).toBe(2);
      expect((component as any).displayedRecords().length).toBe(5);
    });

    it('should show remaining records on last page', () => {
      fixture.componentRef.setInput('records', createRecords(12));
      fixture.detectChanges();

      (component as any).currentPage.set(3);
      expect((component as any).displayedRecords().length).toBe(2); // 12 - 5 - 5
    });

    it('should not go past the last page', () => {
      fixture.componentRef.setInput('records', createRecords(12));
      fixture.detectChanges();

      (component as any).currentPage.set(3);
      (component as any).nextPage();
      expect((component as any).currentPage()).toBe(3);
    });

    it('should navigate to previous page', () => {
      fixture.componentRef.setInput('records', createRecords(12));
      fixture.detectChanges();

      (component as any).currentPage.set(2);
      (component as any).prevPage();
      expect((component as any).currentPage()).toBe(1);
    });

    it('should not go below page 1', () => {
      fixture.componentRef.setInput('records', createRecords(12));
      fixture.detectChanges();

      (component as any).prevPage();
      expect((component as any).currentPage()).toBe(1);
    });

    it('should reset to page 1 when pagination size changes', () => {
      fixture.componentRef.setInput('records', createRecords(20));
      fixture.detectChanges();

      (component as any).currentPage.set(3);
      (component as any).onPaginationSizeChange(10);

      expect((component as any).paginationSize()).toBe(10);
      expect((component as any).currentPage()).toBe(1);
    });

    it('should show all records when page size is larger than total', () => {
      fixture.componentRef.setInput('records', createRecords(3));
      fixture.detectChanges();

      (component as any).onPaginationSizeChange(50);
      expect((component as any).displayedRecords().length).toBe(3);
      expect((component as any).totalPages()).toBe(1);
    });

    it('should handle zero records gracefully', () => {
      fixture.componentRef.setInput('records', []);
      fixture.detectChanges();

      expect((component as any).displayedRecords().length).toBe(0);
      expect((component as any).totalPages()).toBe(0);
    });
  });

  describe('Computed Texts', () => {
    it('should generate page-of text', () => {
      fixture.componentRef.setInput('records', [
        makeRecord('2024-01-01'),
        makeRecord('2024-02-01'),
        makeRecord('2024-03-01'),
      ]);
      fixture.detectChanges();

      (component as any).pageOfText();
      expect(languageServiceMock.translate).toHaveBeenCalledWith('HOME.PAGE_OF', {
        current: 1,
        total: 1,
      });
    });

    it('should generate showing-records text', () => {
      fixture.componentRef.setInput('records', [
        makeRecord('2024-01-01'),
        makeRecord('2024-02-01'),
      ]);
      fixture.detectChanges();

      (component as any).showingRecordsText();
      const calls = languageServiceMock.translate.mock.calls;
      const matchingCall = calls.find((c: unknown[]) => c[0] === 'HOME.SHOWING_RECORDS');
      expect(matchingCall).toBeTruthy();
      expect((matchingCall as any)[1].total).toBe(2);
    });
  });

  describe('Event Emitters', () => {
    const record = makeRecord('2024-05-15', { value: 42 });

    beforeEach(() => {
      fixture.componentRef.setInput('records', [record]);
      fixture.detectChanges();
    });

    it('should emit editRecord when onEditRecord is called', () => {
      const spy = vi.fn();
      component.editRecord.subscribe(spy);

      (component as any).onEditRecord(record);
      expect(spy).toHaveBeenCalledWith(record);
    });

    it('should emit deleteRecord when onDeleteRecord is called', () => {
      const spy = vi.fn();
      component.deleteRecord.subscribe(spy);

      (component as any).onDeleteRecord(record);
      expect(spy).toHaveBeenCalledWith(record);
    });

    it('should emit deleteAllRecords with filtered records', () => {
      const spy = vi.fn();
      component.deleteAllRecords.subscribe(spy);

      (component as any).onDeleteAllRecords();
      expect(spy).toHaveBeenCalledWith([record]);
    });

    it('should emit deleteAllRecords with only filtered records when filter is active', () => {
      const records = [
        makeRecord('2024-01-15'),
        makeRecord('2024-06-20'),
        makeRecord('2024-12-25'),
      ];
      fixture.componentRef.setInput('records', records);
      fixture.detectChanges();

      (component as any).searchYear.set(2024);
      (component as any).searchMonth.set(0); // January

      const spy = vi.fn();
      component.deleteAllRecords.subscribe(spy);

      (component as any).onDeleteAllRecords();
      expect(spy).toHaveBeenCalledWith([records[0]]);
    });
  });

  describe('Help Modal', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('records', []);
      fixture.detectChanges();
    });

    it('should open help modal', () => {
      (component as any).showHelp();
      expect((component as any).showHelpModal()).toBe(true);
    });

    it('should close help modal', () => {
      (component as any).showHelp();
      (component as any).closeHelp();
      expect((component as any).showHelpModal()).toBe(false);
    });
  });

  describe('isYearDisabled', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('records', []);
      fixture.detectChanges();
    });

    it('should not disable any year when no date range set', () => {
      expect((component as any).isYearDisabled(2020)).toBe(false);
      expect((component as any).isYearDisabled(2030)).toBe(false);
    });

    it('should disable years before startDate year', () => {
      (component as any).startDate.set('2024-01-01');
      expect((component as any).isYearDisabled(2023)).toBe(true);
      expect((component as any).isYearDisabled(2024)).toBe(false);
      expect((component as any).isYearDisabled(2025)).toBe(false);
    });

    it('should disable years after endDate year', () => {
      (component as any).endDate.set('2024-12-31');
      expect((component as any).isYearDisabled(2023)).toBe(false);
      expect((component as any).isYearDisabled(2024)).toBe(false);
      expect((component as any).isYearDisabled(2025)).toBe(true);
    });

    it('should constrain to range when both dates set', () => {
      (component as any).startDate.set('2023-06-01');
      (component as any).endDate.set('2025-03-31');

      expect((component as any).isYearDisabled(2022)).toBe(true);
      expect((component as any).isYearDisabled(2023)).toBe(false);
      expect((component as any).isYearDisabled(2024)).toBe(false);
      expect((component as any).isYearDisabled(2025)).toBe(false);
      expect((component as any).isYearDisabled(2026)).toBe(true);
    });
  });

  describe('isMonthDisabled', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('records', []);
      fixture.detectChanges();
    });

    it('should not disable any month when no filters set', () => {
      for (let m = 0; m < 12; m++) {
        expect((component as any).isMonthDisabled(m)).toBe(false);
      }
    });

    describe('with year selected', () => {
      it('should disable months before startDate month in same year', () => {
        (component as any).startDate.set('2024-03-15');
        (component as any).searchYear.set(2024);

        expect((component as any).isMonthDisabled(1)).toBe(true); // Feb
        expect((component as any).isMonthDisabled(2)).toBe(false); // Mar
        expect((component as any).isMonthDisabled(5)).toBe(false); // Jun
      });

      it('should disable months after endDate month in same year', () => {
        (component as any).endDate.set('2024-08-20');
        (component as any).searchYear.set(2024);

        expect((component as any).isMonthDisabled(7)).toBe(false); // Aug
        expect((component as any).isMonthDisabled(8)).toBe(true); // Sep
        expect((component as any).isMonthDisabled(11)).toBe(true); // Dec
      });

      it('should not disable months for a year after startDate year', () => {
        (component as any).startDate.set('2023-10-01');
        (component as any).searchYear.set(2024);

        expect((component as any).isMonthDisabled(0)).toBe(false);
        expect((component as any).isMonthDisabled(11)).toBe(false);
      });

      it('should disable all months if selected year is before start year', () => {
        (component as any).startDate.set('2024-01-01');
        (component as any).searchYear.set(2023);

        for (let m = 0; m < 12; m++) {
          expect((component as any).isMonthDisabled(m)).toBe(true);
        }
      });

      it('should disable all months if selected year is after end year', () => {
        (component as any).endDate.set('2024-12-31');
        (component as any).searchYear.set(2025);

        for (let m = 0; m < 12; m++) {
          expect((component as any).isMonthDisabled(m)).toBe(true);
        }
      });
    });

    describe('without year selected - date range constraints', () => {
      it('should disable months outside range within same year', () => {
        (component as any).startDate.set('2024-03-01');
        (component as any).endDate.set('2024-08-31');

        expect((component as any).isMonthDisabled(1)).toBe(true); // Feb
        expect((component as any).isMonthDisabled(2)).toBe(false); // Mar
        expect((component as any).isMonthDisabled(7)).toBe(false); // Aug
        expect((component as any).isMonthDisabled(8)).toBe(true); // Sep
        expect((component as any).isMonthDisabled(11)).toBe(true); // Dec
      });

      it('should not disable any month when range spans >= 12 months', () => {
        (component as any).startDate.set('2023-01-01');
        (component as any).endDate.set('2024-01-01');

        for (let m = 0; m < 12; m++) {
          expect((component as any).isMonthDisabled(m)).toBe(false);
        }
      });

      it('should handle cross-year range (e.g. Nov to Feb)', () => {
        (component as any).startDate.set('2023-11-01');
        (component as any).endDate.set('2024-02-28');

        // Valid months: Nov(10), Dec(11), Jan(0), Feb(1)
        expect((component as any).isMonthDisabled(0)).toBe(false); // Jan
        expect((component as any).isMonthDisabled(1)).toBe(false); // Feb
        expect((component as any).isMonthDisabled(2)).toBe(true); // Mar
        expect((component as any).isMonthDisabled(9)).toBe(true); // Oct
        expect((component as any).isMonthDisabled(10)).toBe(false); // Nov
        expect((component as any).isMonthDisabled(11)).toBe(false); // Dec
      });

      it('should handle single-month range', () => {
        (component as any).startDate.set('2024-06-01');
        (component as any).endDate.set('2024-06-30');

        expect((component as any).isMonthDisabled(5)).toBe(false); // June
        expect((component as any).isMonthDisabled(4)).toBe(true); // May
        expect((component as any).isMonthDisabled(6)).toBe(true); // July
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty records array for all computeds', () => {
      fixture.componentRef.setInput('records', []);
      fixture.detectChanges();

      expect((component as any).filteredRecords()).toEqual([]);
      expect((component as any).displayedRecords()).toEqual([]);
      expect((component as any).availableYears()).toEqual([]);
      expect((component as any).totalPages()).toBe(0);
      expect((component as any).isFilterActive()).toBe(false);
    });

    it('should handle single record', () => {
      fixture.componentRef.setInput('records', [makeRecord('2024-06-15')]);
      fixture.detectChanges();

      expect((component as any).filteredRecords().length).toBe(1);
      expect((component as any).displayedRecords().length).toBe(1);
      expect((component as any).totalPages()).toBe(1);
      expect((component as any).availableYears()).toEqual([2024]);
    });

    it('should handle records with same date', () => {
      fixture.componentRef.setInput('records', [
        makeRecord('2024-06-15', { value: 10 }),
        makeRecord('2024-06-15', { value: 20 }),
      ]);
      fixture.detectChanges();

      expect((component as any).filteredRecords().length).toBe(2);
      expect((component as any).availableYears()).toEqual([2024]);
    });

    it('should handle pagination with exactly page-size records', () => {
      const records = Array.from({ length: 5 }, (_, i) =>
        makeRecord(`2024-01-${String(i + 1).padStart(2, '0')}`),
      );
      fixture.componentRef.setInput('records', records);
      fixture.detectChanges();

      expect((component as any).totalPages()).toBe(1);
      expect((component as any).displayedRecords().length).toBe(5);
    });

    it('should handle calculateTotalFn that returns 0 for all records', () => {
      const records = [
        makeRecord('2024-01-01', { value: 0 }),
        makeRecord('2024-02-01', { value: 0 }),
      ];
      fixture.componentRef.setInput('records', records);
      fixture.componentRef.setInput('calculateTotalFn', () => 0);
      fixture.detectChanges();

      (component as any).setSortOption('total-desc');
      expect((component as any).displayedRecords().length).toBe(2);
    });

    it('should handle rapid filter changes without errors', () => {
      fixture.componentRef.setInput('records', [
        makeRecord('2024-01-15'),
        makeRecord('2024-06-15'),
        makeRecord('2024-12-15'),
      ]);
      fixture.detectChanges();

      (component as any).searchYear.set(2024);
      (component as any).searchMonth.set(0);
      (component as any).startDate.set('2024-01-01');
      (component as any).endDate.set('2024-06-30');
      (component as any).resetFilters();
      (component as any).searchYear.set(2024);
      (component as any).searchMonth.set(11);

      expect((component as any).filteredRecords().length).toBe(1);
    });

    it('should handle new records input reactively', () => {
      fixture.componentRef.setInput('records', [makeRecord('2024-01-15')]);
      fixture.detectChanges();
      expect((component as any).filteredRecords().length).toBe(1);

      fixture.componentRef.setInput('records', [
        makeRecord('2024-01-15'),
        makeRecord('2024-06-20'),
      ]);
      fixture.detectChanges();
      expect((component as any).filteredRecords().length).toBe(2);
    });

    it('should handle records at year boundaries', () => {
      fixture.componentRef.setInput('records', [
        makeRecord('2023-12-31'),
        makeRecord('2024-01-01'),
      ]);
      fixture.detectChanges();

      (component as any).searchYear.set(2023);
      expect((component as any).filteredRecords().length).toBe(1);

      (component as any).searchYear.set(2024);
      expect((component as any).filteredRecords().length).toBe(1);
    });

    it('should handle month 0 (January) correctly in filter — not falsy-skipped', () => {
      fixture.componentRef.setInput('records', [
        makeRecord('2024-01-15'),
        makeRecord('2024-02-15'),
      ]);
      fixture.detectChanges();

      (component as any).searchMonth.set(0);
      expect((component as any).filteredRecords().length).toBe(1);
      expect(new Date((component as any).filteredRecords()[0].date).getMonth()).toBe(0);
    });
  });

  describe('Sort Options Configuration', () => {
    it('should have default sort options', () => {
      fixture.componentRef.setInput('records', []);
      fixture.detectChanges();

      const options = component.sortOptions();
      expect(options.length).toBe(8);
      expect(options[0]).toEqual({
        value: 'date-desc',
        labelKey: 'HOME.SORT.DATE_DESC',
        direction: '↓',
      });
    });

    it('should accept custom sort options', () => {
      const customOptions: SortOptionConfig[] = [
        { value: 'date-desc', labelKey: 'CUSTOM.NEWEST', direction: '↓' },
        { value: 'date-asc', labelKey: 'CUSTOM.OLDEST', direction: '↑' },
      ];
      fixture.componentRef.setInput('records', []);
      fixture.componentRef.setInput('sortOptions', customOptions);
      fixture.detectChanges();

      expect(component.sortOptions().length).toBe(2);
      expect(component.sortOptions()[0].labelKey).toBe('CUSTOM.NEWEST');
    });

    it('should update sort option via setSortOption', () => {
      fixture.componentRef.setInput('records', []);
      fixture.detectChanges();

      (component as any).setSortOption('total-asc');
      expect((component as any).sortOption()).toBe('total-asc');
    });
  });
});
