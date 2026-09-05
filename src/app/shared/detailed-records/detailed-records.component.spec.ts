import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  DetailedRecordsComponent,
  GenericRecord,
  SortOptionConfig,
} from './detailed-records.component';
import { LanguageService } from '../../services/language.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { Component, Pipe, PipeTransform, signal, Input, Output, EventEmitter } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { DatePickerComponent } from '../date-picker/date-picker.component';
import { HelpModalComponent, HelpStep } from '../help-modal/help-modal.component';
import { vi, afterEach } from 'vitest';
import { DetailedRecordsHarness } from './detailed-records.harness';
import { getHarness } from '../../../testing';

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
  @Input() steps: HelpStep[] = [];
  @Output() closeModal = new EventEmitter<void>();
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
  let languageServiceMock: {
    currentLang: import('@angular/core').WritableSignal<string>;
    translate: ReturnType<typeof vi.fn>;
  };
  let localStorageServiceMock: {
    getPreference: ReturnType<typeof vi.fn>;
    setPreference: ReturnType<typeof vi.fn>;
  };

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
      component.records = [];
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should have correct default input values', () => {
      component.records = [];
      fixture.detectChanges();

      expect(component.showSearchDate).toBe(true);
      expect(component.showYearMonth).toBe(true);
      expect(component.showEditDelete).toBe(true);
      expect(component.recordType).toBe('water');
      expect(component.showTotal).toBe(true);
      expect(component.hasDetails).toBe(true);
      expect(component.allowCollapse).toBe(true);
      expect(component.helpTitleKey).toBe('HOME.RECORDS_HELP_TITLE');
      expect(component.totalLabelKey).toBe('HOME.TOTAL');
      expect(component.valuesNoteKey).toBe('HOME.ALL_VALUES_IN_LITERS');
    });

    it('should default sort option to date-desc', () => {
      component.records = [];
      fixture.detectChanges();
      expect(component['sortOption']()).toBe('date-desc');
    });

    it('should initialize sortOption from defaultSortOption input default', () => {
      // The constructor reads defaultSortOption() at creation time,
      // so sortOption matches the input signal's default value ('date-desc')
      component.records = [];
      fixture.detectChanges();
      expect(component['sortOption']()).toBe('date-desc');
    });

    it('should default pagination size to 5', () => {
      component.records = [];
      fixture.detectChanges();
      expect(component['paginationSize']()).toBe(5);
    });

    it('should start on page 1', () => {
      component.records = [];
      fixture.detectChanges();
      expect(component['currentPage']()).toBe(1);
    });
  });

  describe('Collapse State', () => {
    it('should default to collapsed when no stored preference', () => {
      localStorageServiceMock.getPreference.mockReturnValue(null);
      component.records = [];
      fixture.detectChanges();
      expect(component['isCollapsed']()).toBe(true);
    });

    it('should restore collapsed state from localStorage as true', () => {
      localStorageServiceMock.getPreference.mockReturnValue('true');
      component.records = [];
      fixture.detectChanges();
      expect(component['isCollapsed']()).toBe(true);
    });

    it('should restore collapsed state from localStorage as false', () => {
      localStorageServiceMock.getPreference.mockReturnValue('false');
      component.records = [];
      fixture.detectChanges();
      expect(component['isCollapsed']()).toBe(false);
    });

    it('should use the correct localStorage key based on recordType', () => {
      component.records = [];
      component.recordType = 'electricity';
      fixture.detectChanges();
      expect(localStorageServiceMock.getPreference).toHaveBeenCalledWith(
        'detailed_records_for_electricity_are_collapsed',
      );
    });

    it('should toggle collapse from true to false', () => {
      localStorageServiceMock.getPreference.mockReturnValue('true');
      component.records = [makeRecord('2024-01-15')];
      fixture.detectChanges();

      expect(component['isCollapsed']()).toBe(true);
      component['toggleCollapse']();
      expect(component['isCollapsed']()).toBe(false);
    });

    it('should toggle collapse from false to true', () => {
      localStorageServiceMock.getPreference.mockReturnValue('false');
      component.records = [makeRecord('2024-01-15')];
      fixture.detectChanges();

      expect(component['isCollapsed']()).toBe(false);
      component['toggleCollapse']();
      expect(component['isCollapsed']()).toBe(true);
    });

    it('should persist collapse state to localStorage on toggle', () => {
      localStorageServiceMock.getPreference.mockReturnValue('true');
      component.records = [makeRecord('2024-01-15')];
      component.recordType = 'heating';
      fixture.detectChanges();

      component['toggleCollapse']();
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
      component.records = records;
      fixture.detectChanges();
    });

    it('should return all records when no filters are active', () => {
      expect(component['filteredRecords']().length).toBe(5);
    });

    it('should filter by start date', () => {
      component['startDate'].set('2024-06-01');
      const filtered = component['filteredRecords']();
      expect(filtered.length).toBe(3);
      expect(filtered.every((r: GenericRecord) => new Date(r.date) >= new Date('2024-06-01'))).toBe(
        true,
      );
    });

    it('should filter by end date', () => {
      component['endDate'].set('2024-06-30');
      const filtered = component['filteredRecords']();
      expect(filtered.length).toBe(3);
    });

    it('should filter by both start and end date', () => {
      component['startDate'].set('2024-03-01');
      component['endDate'].set('2024-09-30');
      const filtered = component['filteredRecords']();
      expect(filtered.length).toBe(3);
    });

    it('should return empty when date range excludes all records', () => {
      component['startDate'].set('2025-01-01');
      component['endDate'].set('2025-12-31');
      expect(component['filteredRecords']().length).toBe(0);
    });

    it('should include record on exact start date boundary', () => {
      component['startDate'].set('2024-01-15');
      const filtered = component['filteredRecords']();
      expect(filtered.length).toBe(5);
    });

    it('should include record on exact end date boundary', () => {
      component['endDate'].set('2024-12-25');
      const filtered = component['filteredRecords']();
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
      component.records = records;
      fixture.detectChanges();
    });

    it('should filter by year', () => {
      component['searchYear'].set(2024);
      const filtered = component['filteredRecords']();
      expect(filtered.length).toBe(3);
      expect(filtered.every((r: GenericRecord) => new Date(r.date).getFullYear() === 2024)).toBe(
        true,
      );
    });

    it('should filter by month (0-indexed)', () => {
      component['searchMonth'].set(0); // January
      const filtered = component['filteredRecords']();
      expect(filtered.length).toBe(2); // Jan 2024 + Jan 2025
    });

    it('should filter by both year and month', () => {
      component['searchYear'].set(2024);
      component['searchMonth'].set(0); // January
      const filtered = component['filteredRecords']();
      expect(filtered.length).toBe(1);
    });

    it('should return empty when year has no records', () => {
      component['searchYear'].set(2020);
      expect(component['filteredRecords']().length).toBe(0);
    });

    it('should return empty when month has no records in selected year', () => {
      component['searchYear'].set(2024);
      component['searchMonth'].set(11); // December
      expect(component['filteredRecords']().length).toBe(0);
    });

    it('should combine date range with year filter', () => {
      component['startDate'].set('2024-01-01');
      component['endDate'].set('2024-12-31');
      component['searchYear'].set(2024);
      const filtered = component['filteredRecords']();
      expect(filtered.length).toBe(3);
    });
  });

  describe('Available Years', () => {
    it('should return unique years sorted descending', () => {
      component.records = [
        makeRecord('2022-03-10'),
        makeRecord('2024-01-15'),
        makeRecord('2024-06-10'),
        makeRecord('2023-12-25'),
      ];
      fixture.detectChanges();

      const years = component['availableYears']();
      expect(years).toEqual([2024, 2023, 2022]);
    });

    it('should return empty array when no records', () => {
      component.records = [];
      fixture.detectChanges();
      expect(component['availableYears']()).toEqual([]);
    });

    it('should handle records all in the same year', () => {
      component.records = [
        makeRecord('2024-01-01'),
        makeRecord('2024-06-15'),
        makeRecord('2024-12-31'),
      ];
      fixture.detectChanges();

      expect(component['availableYears']()).toEqual([2024]);
    });
  });

  describe('isFilterActive', () => {
    beforeEach(() => {
      component.records = [];
      fixture.detectChanges();
    });

    it('should be false when no filters are set', () => {
      expect(component['isFilterActive']()).toBe(false);
    });

    it('should be true when startDate is set', () => {
      component['startDate'].set('2024-01-01');
      expect(component['isFilterActive']()).toBe(true);
    });

    it('should be true when endDate is set', () => {
      component['endDate'].set('2024-12-31');
      expect(component['isFilterActive']()).toBe(true);
    });

    it('should be true when searchYear is set', () => {
      component['searchYear'].set(2024);
      expect(component['isFilterActive']()).toBe(true);
    });

    it('should be true when searchMonth is set', () => {
      component['searchMonth'].set(5);
      expect(component['isFilterActive']()).toBe(true);
    });

    it('should be true when month is 0 (January) — falsy but valid', () => {
      component['searchMonth'].set(0);
      expect(component['isFilterActive']()).toBe(true);
    });
  });

  describe('Reset Filters', () => {
    it('should clear all filters and reset page', () => {
      component.records = [];
      fixture.detectChanges();

      component['startDate'].set('2024-01-01');
      component['endDate'].set('2024-12-31');
      component['searchYear'].set(2024);
      component['searchMonth'].set(5);
      component['currentPage'].set(3);

      component['resetFilters']();

      expect(component['startDate']()).toBeNull();
      expect(component['endDate']()).toBeNull();
      expect(component['searchYear']()).toBeNull();
      expect(component['searchMonth']()).toBeNull();
      expect(component['currentPage']()).toBe(1);
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
      component.records = records;
      component.calculateTotalFn = totalFn;
      fixture.detectChanges();
    });

    it('should sort by date descending by default', () => {
      const displayed = component['displayedRecords']();
      expect(new Date(displayed[0].date).getMonth()).toBe(5); // June
      expect(new Date(displayed[1].date).getMonth()).toBe(2); // March
      expect(new Date(displayed[2].date).getMonth()).toBe(0); // January
    });

    it('should sort by date ascending', () => {
      component['setSortOption']('date-asc');
      const displayed = component['displayedRecords']();
      expect(new Date(displayed[0].date).getMonth()).toBe(0); // January
      expect(new Date(displayed[2].date).getMonth()).toBe(5); // June
    });

    it('should sort by total descending', () => {
      component['setSortOption']('total-desc');
      const displayed = component['displayedRecords']();
      expect(totalFn(displayed[0])).toBe(50);
      expect(totalFn(displayed[2])).toBe(11);
    });

    it('should sort by total ascending', () => {
      component['setSortOption']('total-asc');
      const displayed = component['displayedRecords']();
      expect(totalFn(displayed[0])).toBe(11);
      expect(totalFn(displayed[2])).toBe(50);
    });

    it('should sort water records by kitchen descending', () => {
      component['setSortOption']('kitchen-desc');
      const displayed = component['displayedRecords']();
      expect(Number(displayed[0]['kitchenWarm']) + Number(displayed[0]['kitchenCold'])).toBe(30);
    });

    it('should sort water records by kitchen ascending', () => {
      component['setSortOption']('kitchen-asc');
      const displayed = component['displayedRecords']();
      expect(Number(displayed[0]['kitchenWarm']) + Number(displayed[0]['kitchenCold'])).toBe(7);
    });

    it('should sort water records by bathroom descending', () => {
      component['setSortOption']('bathroom-desc');
      const displayed = component['displayedRecords']();
      expect(Number(displayed[0]['bathroomWarm']) + Number(displayed[0]['bathroomCold'])).toBe(20);
    });

    it('should sort water records by bathroom ascending', () => {
      component['setSortOption']('bathroom-asc');
      const displayed = component['displayedRecords']();
      expect(Number(displayed[0]['bathroomWarm']) + Number(displayed[0]['bathroomCold'])).toBe(4);
    });

    it('should return stable order for unknown sort option on non-water records', () => {
      const genericRecords = [
        makeRecord('2024-01-10', { value: 100 }),
        makeRecord('2024-06-20', { value: 200 }),
      ];
      component.records = genericRecords;
      fixture.detectChanges();
      component['setSortOption']('bathroom-desc');

      const displayed = component['displayedRecords']();
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
      component.records = createRecords(12);
      fixture.detectChanges();
      expect(component['displayedRecords']().length).toBe(5);
    });

    it('should calculate total pages correctly', () => {
      component.records = createRecords(12);
      fixture.detectChanges();
      expect(component['totalPages']()).toBe(3); // ceil(12/5)
    });

    it('should calculate total pages as 1 for records <= page size', () => {
      component.records = createRecords(3);
      fixture.detectChanges();
      expect(component['totalPages']()).toBe(1);
    });

    it('should navigate to next page', () => {
      component.records = createRecords(12);
      fixture.detectChanges();

      component['nextPage']();
      expect(component['currentPage']()).toBe(2);
      expect(component['displayedRecords']().length).toBe(5);
    });

    it('should show remaining records on last page', () => {
      component.records = createRecords(12);
      fixture.detectChanges();

      component['currentPage'].set(3);
      expect(component['displayedRecords']().length).toBe(2); // 12 - 5 - 5
    });

    it('should not go past the last page', () => {
      component.records = createRecords(12);
      fixture.detectChanges();

      component['currentPage'].set(3);
      component['nextPage']();
      expect(component['currentPage']()).toBe(3);
    });

    it('should navigate to previous page', () => {
      component.records = createRecords(12);
      fixture.detectChanges();

      component['currentPage'].set(2);
      component['prevPage']();
      expect(component['currentPage']()).toBe(1);
    });

    it('should not go below page 1', () => {
      component.records = createRecords(12);
      fixture.detectChanges();

      component['prevPage']();
      expect(component['currentPage']()).toBe(1);
    });

    it('should reset to page 1 when pagination size changes', () => {
      component.records = createRecords(20);
      fixture.detectChanges();

      component['currentPage'].set(3);
      component['onPaginationSizeChange'](10);

      expect(component['paginationSize']()).toBe(10);
      expect(component['currentPage']()).toBe(1);
    });

    it('should show all records when page size is larger than total', () => {
      component.records = createRecords(3);
      fixture.detectChanges();

      component['onPaginationSizeChange'](50);
      expect(component['displayedRecords']().length).toBe(3);
      expect(component['totalPages']()).toBe(1);
    });

    it('should handle zero records gracefully', () => {
      component.records = [];
      fixture.detectChanges();

      expect(component['displayedRecords']().length).toBe(0);
      expect(component['totalPages']()).toBe(0);
    });
  });

  describe('Computed Texts', () => {
    it('should generate page-of text', () => {
      component.records = [
        makeRecord('2024-01-01'),
        makeRecord('2024-02-01'),
        makeRecord('2024-03-01'),
      ];
      fixture.detectChanges();

      component['pageOfText']();
      expect(languageServiceMock.translate).toHaveBeenCalledWith('HOME.PAGE_OF', {
        current: 1,
        total: 1,
      });
    });

    it('should generate showing-records text', () => {
      component.records = [makeRecord('2024-01-01'), makeRecord('2024-02-01')];
      fixture.detectChanges();

      component['showingRecordsText']();
      const calls = (languageServiceMock.translate as import('vitest').Mock).mock.calls;
      const matchingCall = calls.find((c: unknown[]) => c[0] === 'HOME.SHOWING_RECORDS');
      expect(matchingCall).toBeTruthy();
      expect((matchingCall?.[1] as { total?: number })?.total).toBe(2);
    });
  });

  describe('Event Emitters', () => {
    const record = makeRecord('2024-05-15', { value: 42 });

    beforeEach(() => {
      component.records = [record];
      fixture.detectChanges();
    });

    it('should emit editRecord when onEditRecord is called', () => {
      const spy = vi.fn();
      component.editRecord.subscribe(spy);

      component['onEditRecord'](record);
      expect(spy).toHaveBeenCalledWith(record);
    });

    it('should emit deleteRecord when onDeleteRecord is called', () => {
      const spy = vi.fn();
      component.deleteRecord.subscribe(spy);

      component['onDeleteRecord'](record);
      expect(spy).toHaveBeenCalledWith(record);
    });

    it('should emit deleteAllRecords with filtered records', () => {
      const spy = vi.fn();
      component.deleteAllRecords.subscribe(spy);

      component['onDeleteAllRecords']();
      expect(spy).toHaveBeenCalledWith([record]);
    });

    it('should emit deleteAllRecords with only filtered records when filter is active', () => {
      const records = [
        makeRecord('2024-01-15'),
        makeRecord('2024-06-20'),
        makeRecord('2024-12-25'),
      ];
      component.records = records;
      fixture.detectChanges();

      component['searchYear'].set(2024);
      component['searchMonth'].set(0); // January

      const spy = vi.fn();
      component.deleteAllRecords.subscribe(spy);

      component['onDeleteAllRecords']();
      expect(spy).toHaveBeenCalledWith([records[0]]);
    });
  });

  describe('Help Modal', () => {
    beforeEach(() => {
      component.records = [];
      fixture.detectChanges();
    });

    it('should open help modal', () => {
      component['showHelp']();
      expect(component['showHelpModal']()).toBe(true);
    });

    it('should close help modal', () => {
      component['showHelp']();
      component['closeHelp']();
      expect(component['showHelpModal']()).toBe(false);
    });
  });

  describe('isYearDisabled', () => {
    beforeEach(() => {
      component.records = [];
      fixture.detectChanges();
    });

    it('should not disable any year when no date range set', () => {
      expect(component['isYearDisabled'](2020)).toBe(false);
      expect(component['isYearDisabled'](2030)).toBe(false);
    });

    it('should disable years before startDate year', () => {
      component['startDate'].set('2024-01-01');
      expect(component['isYearDisabled'](2023)).toBe(true);
      expect(component['isYearDisabled'](2024)).toBe(false);
      expect(component['isYearDisabled'](2025)).toBe(false);
    });

    it('should disable years after endDate year', () => {
      component['endDate'].set('2024-12-31');
      expect(component['isYearDisabled'](2023)).toBe(false);
      expect(component['isYearDisabled'](2024)).toBe(false);
      expect(component['isYearDisabled'](2025)).toBe(true);
    });

    it('should constrain to range when both dates set', () => {
      component['startDate'].set('2023-06-01');
      component['endDate'].set('2025-03-31');

      expect(component['isYearDisabled'](2022)).toBe(true);
      expect(component['isYearDisabled'](2023)).toBe(false);
      expect(component['isYearDisabled'](2024)).toBe(false);
      expect(component['isYearDisabled'](2025)).toBe(false);
      expect(component['isYearDisabled'](2026)).toBe(true);
    });
  });

  describe('isMonthDisabled', () => {
    beforeEach(() => {
      component.records = [];
      fixture.detectChanges();
    });

    it('should not disable any month when no filters set', () => {
      for (let m = 0; m < 12; m++) {
        expect(component['isMonthDisabled'](m)).toBe(false);
      }
    });

    describe('with year selected', () => {
      it('should disable months before startDate month in same year', () => {
        component['startDate'].set('2024-03-15');
        component['searchYear'].set(2024);

        expect(component['isMonthDisabled'](1)).toBe(true); // Feb
        expect(component['isMonthDisabled'](2)).toBe(false); // Mar
        expect(component['isMonthDisabled'](5)).toBe(false); // Jun
      });

      it('should disable months after endDate month in same year', () => {
        component['endDate'].set('2024-08-20');
        component['searchYear'].set(2024);

        expect(component['isMonthDisabled'](7)).toBe(false); // Aug
        expect(component['isMonthDisabled'](8)).toBe(true); // Sep
        expect(component['isMonthDisabled'](11)).toBe(true); // Dec
      });

      it('should not disable months for a year after startDate year', () => {
        component['startDate'].set('2023-10-01');
        component['searchYear'].set(2024);

        expect(component['isMonthDisabled'](0)).toBe(false);
        expect(component['isMonthDisabled'](11)).toBe(false);
      });

      it('should disable all months if selected year is before start year', () => {
        component['startDate'].set('2024-01-01');
        component['searchYear'].set(2023);

        for (let m = 0; m < 12; m++) {
          expect(component['isMonthDisabled'](m)).toBe(true);
        }
      });

      it('should disable all months if selected year is after end year', () => {
        component['endDate'].set('2024-12-31');
        component['searchYear'].set(2025);

        for (let m = 0; m < 12; m++) {
          expect(component['isMonthDisabled'](m)).toBe(true);
        }
      });
    });

    describe('without year selected - date range constraints', () => {
      it('should disable months outside range within same year', () => {
        component['startDate'].set('2024-03-01');
        component['endDate'].set('2024-08-31');

        expect(component['isMonthDisabled'](1)).toBe(true); // Feb
        expect(component['isMonthDisabled'](2)).toBe(false); // Mar
        expect(component['isMonthDisabled'](7)).toBe(false); // Aug
        expect(component['isMonthDisabled'](8)).toBe(true); // Sep
        expect(component['isMonthDisabled'](11)).toBe(true); // Dec
      });

      it('should not disable any month when range spans >= 12 months', () => {
        component['startDate'].set('2023-01-01');
        component['endDate'].set('2024-01-01');

        for (let m = 0; m < 12; m++) {
          expect(component['isMonthDisabled'](m)).toBe(false);
        }
      });

      it('should handle cross-year range (e.g. Nov to Feb)', () => {
        component['startDate'].set('2023-11-01');
        component['endDate'].set('2024-02-28');

        // Valid months: Nov(10), Dec(11), Jan(0), Feb(1)
        expect(component['isMonthDisabled'](0)).toBe(false); // Jan
        expect(component['isMonthDisabled'](1)).toBe(false); // Feb
        expect(component['isMonthDisabled'](2)).toBe(true); // Mar
        expect(component['isMonthDisabled'](9)).toBe(true); // Oct
        expect(component['isMonthDisabled'](10)).toBe(false); // Nov
        expect(component['isMonthDisabled'](11)).toBe(false); // Dec
      });

      it('should handle single-month range', () => {
        component['startDate'].set('2024-06-01');
        component['endDate'].set('2024-06-30');

        expect(component['isMonthDisabled'](5)).toBe(false); // June
        expect(component['isMonthDisabled'](4)).toBe(true); // May
        expect(component['isMonthDisabled'](6)).toBe(true); // July
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty records array for all computeds', () => {
      component.records = [];
      fixture.detectChanges();

      expect(component['filteredRecords']()).toEqual([]);
      expect(component['displayedRecords']()).toEqual([]);
      expect(component['availableYears']()).toEqual([]);
      expect(component['totalPages']()).toBe(0);
      expect(component['isFilterActive']()).toBe(false);
    });

    it('should handle single record', () => {
      component.records = [makeRecord('2024-06-15')];
      fixture.detectChanges();

      expect(component['filteredRecords']().length).toBe(1);
      expect(component['displayedRecords']().length).toBe(1);
      expect(component['totalPages']()).toBe(1);
      expect(component['availableYears']()).toEqual([2024]);
    });

    it('should handle records with same date', () => {
      component.records = [
        makeRecord('2024-06-15', { value: 10 }),
        makeRecord('2024-06-15', { value: 20 }),
      ];
      fixture.detectChanges();

      expect(component['filteredRecords']().length).toBe(2);
      expect(component['availableYears']()).toEqual([2024]);
    });

    it('should handle pagination with exactly page-size records', () => {
      const records = Array.from({ length: 5 }, (_, i) =>
        makeRecord(`2024-01-${String(i + 1).padStart(2, '0')}`),
      );
      component.records = records;
      fixture.detectChanges();

      expect(component['totalPages']()).toBe(1);
      expect(component['displayedRecords']().length).toBe(5);
    });

    it('should handle calculateTotalFn that returns 0 for all records', () => {
      const records = [
        makeRecord('2024-01-01', { value: 0 }),
        makeRecord('2024-02-01', { value: 0 }),
      ];
      component.records = records;
      component.calculateTotalFn = () => 0;
      fixture.detectChanges();

      component['setSortOption']('total-desc');
      expect(component['displayedRecords']().length).toBe(2);
    });

    it('should handle rapid filter changes without errors', () => {
      component.records = [
        makeRecord('2024-01-15'),
        makeRecord('2024-06-15'),
        makeRecord('2024-12-15'),
      ];
      fixture.detectChanges();

      component['searchYear'].set(2024);
      component['searchMonth'].set(0);
      component['startDate'].set('2024-01-01');
      component['endDate'].set('2024-06-30');
      component['resetFilters']();
      component['searchYear'].set(2024);
      component['searchMonth'].set(11);

      expect(component['filteredRecords']().length).toBe(1);
    });

    it('should handle new records input reactively', () => {
      component.records = [makeRecord('2024-01-15')];
      fixture.detectChanges();
      expect(component['filteredRecords']().length).toBe(1);

      component.records = [makeRecord('2024-01-15'), makeRecord('2024-06-20')];
      fixture.detectChanges();
      expect(component['filteredRecords']().length).toBe(2);
    });

    it('should handle records at year boundaries', () => {
      component.records = [makeRecord('2023-12-31'), makeRecord('2024-01-01')];
      fixture.detectChanges();

      component['searchYear'].set(2023);
      expect(component['filteredRecords']().length).toBe(1);

      component['searchYear'].set(2024);
      expect(component['filteredRecords']().length).toBe(1);
    });

    it('should handle month 0 (January) correctly in filter — not falsy-skipped', () => {
      component.records = [makeRecord('2024-01-15'), makeRecord('2024-02-15')];
      fixture.detectChanges();

      component['searchMonth'].set(0);
      expect(component['filteredRecords']().length).toBe(1);
      expect(new Date(component['filteredRecords']()[0].date).getMonth()).toBe(0);
    });
  });

  describe('Sort Options Configuration', () => {
    it('should have default sort options', () => {
      component.records = [];
      fixture.detectChanges();

      const options = component.sortOptions;
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
      component.records = [];
      component.sortOptions = customOptions;
      fixture.detectChanges();

      expect(component.sortOptions.length).toBe(2);
      expect(component.sortOptions[0].labelKey).toBe('CUSTOM.NEWEST');
    });

    it('should update sort option via setSortOption', () => {
      component.records = [];
      fixture.detectChanges();

      component['setSortOption']('total-asc');
      expect(component['sortOption']()).toBe('total-asc');
    });
  });

  describe('Using DetailedRecordsHarness', () => {
    let harness: DetailedRecordsHarness;

    beforeEach(async () => {
      harness = await getHarness(fixture, DetailedRecordsHarness);
    });

    it('should read title text via harness', async () => {
      expect(await harness.getTitleText()).toBe('HOME.DETAILED_RECORDS');
    });

    it('should show no records message when empty', async () => {
      fixture.componentRef.setInput('records', []);
      expect(await harness.hasNoRecordsMessage()).toBe(true);
      expect(await harness.getRecordCount()).toBe(0);
    });

    it('should list records and trigger delete-all via harness', async () => {
      const records = [
        makeWaterRecord('2026-01-15', 10, 20, 15, 25),
        makeWaterRecord('2026-02-15', 12, 22, 16, 26),
      ];
      fixture.componentRef.setInput('records', records);
      fixture.componentRef.setInput('showEditDelete', true);

      expect(await harness.hasNoRecordsMessage()).toBe(false);
      expect(await harness.getRecordCount()).toBe(2);

      const deleteAllSpy = vi.fn();
      component.deleteAllRecords.subscribe(deleteAllSpy);

      await harness.clickDeleteAll();
      expect(deleteAllSpy).toHaveBeenCalledTimes(1);
    });

    it('should trigger edit and delete record events via harness', async () => {
      const records = [makeWaterRecord('2026-01-15', 10, 20, 15, 25)];
      fixture.componentRef.setInput('records', records);
      fixture.componentRef.setInput('showEditDelete', true);

      const editSpy = vi.fn();
      const deleteSpy = vi.fn();
      component.editRecord.subscribe(editSpy);
      component.deleteRecord.subscribe(deleteSpy);

      await harness.clickEditRecord(0);
      expect(editSpy).toHaveBeenCalledWith(records[0]);

      await harness.clickDeleteRecord(0);
      expect(deleteSpy).toHaveBeenCalledWith(records[0]);
    });
  });
});
