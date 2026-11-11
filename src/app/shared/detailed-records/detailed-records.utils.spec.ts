import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SORT_OPTIONS,
  MONTH_TRANSLATION_KEYS,
  filterDetailedRecords,
  getWaterDetailRows,
  isMonthDisabledForRange,
  isMonthDisabledForYear,
  isYearDisabledForRange,
  sortDetailedRecords,
} from './detailed-records.utils';
import type { GenericRecord } from './detailed-records.component';

const makeRecord = (dateStr: string, extras: Partial<GenericRecord> = {}): GenericRecord => ({
  date: new Date(dateStr),
  ...extras,
});

describe('detailed-records.utils', () => {
  describe('DEFAULT_SORT_OPTIONS and MONTH_TRANSLATION_KEYS', () => {
    it('should contain 8 default sort options starting with date-desc', () => {
      expect(DEFAULT_SORT_OPTIONS).toHaveLength(8);
      expect(DEFAULT_SORT_OPTIONS[0]).toEqual({
        value: 'date-desc',
        labelKey: 'HOME.SORT.DATE_DESC',
        direction: '↓',
      });
    });

    it('should contain 12 month translation keys from January to December', () => {
      expect(MONTH_TRANSLATION_KEYS).toHaveLength(12);
      expect(MONTH_TRANSLATION_KEYS[0]).toBe('HOME.MONTHS.JANUARY');
      expect(MONTH_TRANSLATION_KEYS[11]).toBe('HOME.MONTHS.DECEMBER');
    });
  });

  describe('getWaterDetailRows', () => {
    it('should build kitchen, bathroom, and combined total rows', () => {
      const record = makeRecord('2024-01-10', {
        kitchenWarm: 10,
        kitchenCold: 20,
        bathroomWarm: 30,
        bathroomCold: 40,
      });
      const rows = getWaterDetailRows(record);
      expect(rows).toEqual([
        { label: 'HOME.KITCHEN', warm: 10, cold: 20, isTotal: false },
        { label: 'HOME.BATHROOM', warm: 30, cold: 40, isTotal: false },
        { label: '', warm: 40, cold: 60, isTotal: true },
      ]);
    });

    it('should default missing warm/cold values to 0 in combined total row', () => {
      const record = makeRecord('2024-01-10');
      const rows = getWaterDetailRows(record);
      expect(rows[2]).toEqual({ label: '', warm: 0, cold: 0, isTotal: true });
    });
  });

  describe('filterDetailedRecords', () => {
    const records: GenericRecord[] = [
      makeRecord('2023-11-15'),
      makeRecord('2024-01-10'),
      makeRecord('2024-06-20'),
      makeRecord('2024-12-05'),
    ];

    it('should return all records when no filter criteria are active', () => {
      expect(
        filterDetailedRecords(records, {
          startDate: null,
          endDate: null,
          searchYear: null,
          searchMonth: null,
        }),
      ).toEqual(records);
    });

    it('should filter by startDate and endDate', () => {
      const result = filterDetailedRecords(records, {
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        searchYear: null,
        searchMonth: null,
      });

      expect(result).toHaveLength(2);
      expect(result[0].date).toEqual(new Date('2024-01-10'));
      expect(result[1].date).toEqual(new Date('2024-06-20'));
    });

    it('should filter by searchYear and 0-indexed searchMonth (including January = 0)', () => {
      const result = filterDetailedRecords(records, {
        startDate: null,
        endDate: null,
        searchYear: 2024,
        searchMonth: 0,
      });

      expect(result).toHaveLength(1);
      expect(result[0].date).toEqual(new Date('2024-01-10'));
    });
  });

  describe('sortDetailedRecords', () => {
    const waterRecords: GenericRecord[] = [
      makeRecord('2024-02-01', {
        kitchenWarm: 10,
        kitchenCold: 20,
        bathroomWarm: 50,
        bathroomCold: 50,
      }),
      makeRecord('2024-01-01', {
        kitchenWarm: 40,
        kitchenCold: 40,
        bathroomWarm: 5,
        bathroomCold: 5,
      }),
      makeRecord('2024-03-01', {
        kitchenWarm: 20,
        kitchenCold: 30,
        bathroomWarm: 20,
        bathroomCold: 20,
      }),
    ];

    const calcTotal = (r: GenericRecord): number =>
      (r.kitchenWarm ?? 0) + (r.kitchenCold ?? 0) + (r.bathroomWarm ?? 0) + (r.bathroomCold ?? 0);

    it('should sort by date-desc and date-asc without mutating the original array', () => {
      const copy = [...waterRecords];
      const desc = sortDetailedRecords(waterRecords, 'date-desc', calcTotal);
      const asc = sortDetailedRecords(waterRecords, 'date-asc', calcTotal);

      expect(waterRecords).toEqual(copy);
      expect(desc.map((r) => r.date.toISOString().slice(0, 10))).toEqual([
        '2024-03-01',
        '2024-02-01',
        '2024-01-01',
      ]);
      expect(asc.map((r) => r.date.toISOString().slice(0, 10))).toEqual([
        '2024-01-01',
        '2024-02-01',
        '2024-03-01',
      ]);
    });

    it('should sort by total-desc and total-asc', () => {
      const desc = sortDetailedRecords(waterRecords, 'total-desc', calcTotal);
      const asc = sortDetailedRecords(waterRecords, 'total-asc', calcTotal);

      expect(desc.map(calcTotal)).toEqual([130, 90, 90]);
      expect(asc.map(calcTotal)).toEqual([90, 90, 130]);
    });

    it('should sort by kitchen-desc and kitchen-asc when kitchenWarm is present', () => {
      const desc = sortDetailedRecords(waterRecords, 'kitchen-desc', calcTotal);
      const asc = sortDetailedRecords(waterRecords, 'kitchen-asc', calcTotal);

      expect(desc.map((r) => (r.kitchenWarm ?? 0) + (r.kitchenCold ?? 0))).toEqual([80, 50, 30]);
      expect(asc.map((r) => (r.kitchenWarm ?? 0) + (r.kitchenCold ?? 0))).toEqual([30, 50, 80]);
    });

    it('should sort by bathroom-desc and bathroom-asc when bathroomWarm is present', () => {
      const desc = sortDetailedRecords(waterRecords, 'bathroom-desc', calcTotal);
      const asc = sortDetailedRecords(waterRecords, 'bathroom-asc', calcTotal);

      expect(desc.map((r) => (r.bathroomWarm ?? 0) + (r.bathroomCold ?? 0))).toEqual([100, 40, 10]);
      expect(asc.map((r) => (r.bathroomWarm ?? 0) + (r.bathroomCold ?? 0))).toEqual([10, 40, 100]);
    });

    it('should preserve order for unknown sort option', () => {
      const result = sortDetailedRecords(waterRecords, 'unknown-sort', calcTotal);
      expect(result).toEqual(waterRecords);
    });
  });

  describe('isYearDisabledForRange', () => {
    it('should return false when neither start nor end is set', () => {
      expect(isYearDisabledForRange(2024, null, null)).toBe(false);
    });

    it('should disable years before start year or after end year', () => {
      expect(isYearDisabledForRange(2022, '2023-05-01', '2024-08-01')).toBe(true);
      expect(isYearDisabledForRange(2023, '2023-05-01', '2024-08-01')).toBe(false);
      expect(isYearDisabledForRange(2024, '2023-05-01', '2024-08-01')).toBe(false);
      expect(isYearDisabledForRange(2025, '2023-05-01', '2024-08-01')).toBe(true);
    });
  });

  describe('isMonthDisabledForYear', () => {
    it('should disable all months when year is strictly outside start/end years', () => {
      expect(isMonthDisabledForYear(5, 2022, '2023-03-01', '2024-09-01')).toBe(true);
      expect(isMonthDisabledForYear(5, 2025, '2023-03-01', '2024-09-01')).toBe(true);
    });

    it('should disable months before start month in start year and after end month in end year', () => {
      expect(isMonthDisabledForYear(1, 2023, '2023-03-01', '2024-09-01')).toBe(true); // Feb 2023
      expect(isMonthDisabledForYear(2, 2023, '2023-03-01', '2024-09-01')).toBe(false); // Mar 2023
      expect(isMonthDisabledForYear(8, 2024, '2023-03-01', '2024-09-01')).toBe(false); // Sep 2024
      expect(isMonthDisabledForYear(9, 2024, '2023-03-01', '2024-09-01')).toBe(true); // Oct 2024
    });
  });

  describe('isMonthDisabledForRange', () => {
    it('should return false when range spans 11 or more months', () => {
      expect(isMonthDisabledForRange(0, '2023-01-01', '2023-12-31')).toBe(false);
      expect(isMonthDisabledForRange(6, '2023-01-01', '2024-06-01')).toBe(false);
    });

    it('should disable months outside same-year range', () => {
      expect(isMonthDisabledForRange(1, '2024-03-01', '2024-06-30')).toBe(true); // Feb
      expect(isMonthDisabledForRange(2, '2024-03-01', '2024-06-30')).toBe(false); // Mar
      expect(isMonthDisabledForRange(5, '2024-03-01', '2024-06-30')).toBe(false); // Jun
      expect(isMonthDisabledForRange(6, '2024-03-01', '2024-06-30')).toBe(true); // Jul
    });

    it('should disable months between endMonth and startMonth for cross-year range < 11 months', () => {
      // Nov 2023 (10) to Feb 2024 (1) -> valid: 10, 11, 0, 1; disabled: 2..9
      expect(isMonthDisabledForRange(0, '2023-11-01', '2024-02-28')).toBe(false);
      expect(isMonthDisabledForRange(1, '2023-11-01', '2024-02-28')).toBe(false);
      expect(isMonthDisabledForRange(5, '2023-11-01', '2024-02-28')).toBe(true);
      expect(isMonthDisabledForRange(10, '2023-11-01', '2024-02-28')).toBe(false);
    });

    it('should return false when startDate is after endDate', () => {
      expect(isMonthDisabledForRange(5, '2025-06-01', '2024-01-01')).toBe(false);
    });
  });
});
