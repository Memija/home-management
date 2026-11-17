import {
  ConsumptionRecord,
  calculateBathroomTotal,
  calculateKitchenTotal,
  getDateKey,
  parseSafeDate,
} from '../../models/records.model';
import type { GenericRecord, SortOptionConfig } from './detailed-records.component';

export const DEFAULT_SORT_OPTIONS: SortOptionConfig[] = [
  { value: 'date-desc', labelKey: 'HOME.SORT.DATE_DESC', direction: '↓' },
  { value: 'date-asc', labelKey: 'HOME.SORT.DATE_ASC', direction: '↑' },
  { value: 'total-desc', labelKey: 'HOME.SORT.TOTAL_DESC', direction: '↓' },
  { value: 'total-asc', labelKey: 'HOME.SORT.TOTAL_ASC', direction: '↑' },
  { value: 'kitchen-desc', labelKey: 'HOME.SORT.KITCHEN_DESC', direction: '↓' },
  { value: 'kitchen-asc', labelKey: 'HOME.SORT.KITCHEN_ASC', direction: '↑' },
  { value: 'bathroom-desc', labelKey: 'HOME.SORT.BATHROOM_DESC', direction: '↓' },
  { value: 'bathroom-asc', labelKey: 'HOME.SORT.BATHROOM_ASC', direction: '↑' },
];

export const MONTH_TRANSLATION_KEYS = [
  'HOME.MONTHS.JANUARY',
  'HOME.MONTHS.FEBRUARY',
  'HOME.MONTHS.MARCH',
  'HOME.MONTHS.APRIL',
  'HOME.MONTHS.MAY',
  'HOME.MONTHS.JUNE',
  'HOME.MONTHS.JULY',
  'HOME.MONTHS.AUGUST',
  'HOME.MONTHS.SEPTEMBER',
  'HOME.MONTHS.OCTOBER',
  'HOME.MONTHS.NOVEMBER',
  'HOME.MONTHS.DECEMBER',
] as const;

export interface WaterDetailRow {
  label: string;
  warm: number | undefined;
  cold: number | undefined;
  isTotal: boolean;
}

/**
 * Builds the 3 water detail rows (Kitchen, Bathroom, Combined Totals) for a record.
 */
export function getWaterDetailRows(record: GenericRecord): WaterDetailRow[] {
  return [
    { label: 'HOME.KITCHEN', warm: record.kitchenWarm, cold: record.kitchenCold, isTotal: false },
    {
      label: 'HOME.BATHROOM',
      warm: record.bathroomWarm,
      cold: record.bathroomCold,
      isTotal: false,
    },
    {
      label: '',
      warm: (record.kitchenWarm || 0) + (record.bathroomWarm || 0),
      cold: (record.kitchenCold || 0) + (record.bathroomCold || 0),
      isTotal: true,
    },
  ];
}

export interface RecordFilterCriteria {
  startDate: string | null;
  endDate: string | null;
  searchYear: number | null;
  searchMonth: number | null;
}

/**
 * Filters records by date range, year, and month in a single pass.
 */
export function filterDetailedRecords(
  records: GenericRecord[],
  criteria: RecordFilterCriteria,
): GenericRecord[] {
  const { startDate, endDate, searchYear, searchMonth } = criteria;

  if (!startDate && !endDate && !searchYear && searchMonth === null) {
    return records;
  }

  return records.filter((r) => {
    const date = parseSafeDate(r.date);
    if (searchYear && date.getFullYear() !== searchYear) return false;
    if (searchMonth !== null && date.getMonth() !== searchMonth) return false;
    if (startDate || endDate) {
      const key = getDateKey(date);
      if (startDate && key < startDate) return false;
      if (endDate && key > endDate) return false;
    }
    return true;
  });
}

function isSortedByDateAsc(records: GenericRecord[]): boolean {
  let prevTime = parseSafeDate(records[0].date).getTime();
  for (let i = 1; i < records.length; i++) {
    const currTime = parseSafeDate(records[i].date).getTime();
    if (currTime < prevTime) return false;
    prevTime = currTime;
  }
  return true;
}

/**
 * Sorts a copy of records according to the selected sort option and total calculator
 * using precomputed sort keys (O(N) key extraction instead of O(N log N)).
 */
export function sortDetailedRecords(
  records: GenericRecord[],
  sortOption: string,
  calculateTotal: (record: GenericRecord) => number,
): GenericRecord[] {
  if (records.length <= 1) {
    return [...records];
  }

  if (sortOption === 'date-asc' && isSortedByDateAsc(records)) {
    return [...records];
  }
  if (sortOption === 'date-desc' && isSortedByDateAsc(records)) {
    const reversed = new Array<GenericRecord>(records.length);
    for (let i = 0; i < records.length; i++) {
      reversed[i] = records[records.length - 1 - i];
    }
    return reversed;
  }

  let keyFn: ((r: GenericRecord) => number) | null = null;
  let descending = true;

  switch (sortOption) {
    case 'date-desc':
      keyFn = (r) => parseSafeDate(r.date).getTime();
      descending = true;
      break;
    case 'date-asc':
      keyFn = (r) => parseSafeDate(r.date).getTime();
      descending = false;
      break;
    case 'total-desc':
      keyFn = calculateTotal;
      descending = true;
      break;
    case 'total-asc':
      keyFn = calculateTotal;
      descending = false;
      break;
    case 'kitchen-desc':
      keyFn = (r) =>
        'kitchenWarm' in r ? calculateKitchenTotal(r as unknown as ConsumptionRecord) : 0;
      descending = true;
      break;
    case 'kitchen-asc':
      keyFn = (r) =>
        'kitchenWarm' in r ? calculateKitchenTotal(r as unknown as ConsumptionRecord) : 0;
      descending = false;
      break;
    case 'bathroom-desc':
      keyFn = (r) =>
        'bathroomWarm' in r ? calculateBathroomTotal(r as unknown as ConsumptionRecord) : 0;
      descending = true;
      break;
    case 'bathroom-asc':
      keyFn = (r) =>
        'bathroomWarm' in r ? calculateBathroomTotal(r as unknown as ConsumptionRecord) : 0;
      descending = false;
      break;
    default:
      return [...records];
  }

  return records
    .map((record) => ({ record, key: keyFn(record) }))
    .sort((a, b) => (descending ? b.key - a.key : a.key - b.key))
    .map((entry) => entry.record);
}

/**
 * Returns true if the given year is outside the active startDate/endDate range.
 */
export function isYearDisabledForRange(
  year: number,
  start: string | null,
  end: string | null,
): boolean {
  if (start && year < parseSafeDate(start).getFullYear()) {
    return true;
  }
  if (end && year > parseSafeDate(end).getFullYear()) {
    return true;
  }
  return false;
}

/**
 * Returns true if the given 0-indexed month is disabled for a selected year and date range.
 */
export function isMonthDisabledForYear(
  monthIndex: number,
  year: number,
  start: string | null,
  end: string | null,
): boolean {
  if (start) {
    const startDate = parseSafeDate(start);
    if (year < startDate.getFullYear()) return true;
    if (year === startDate.getFullYear() && monthIndex < startDate.getMonth()) return true;
  }

  if (end) {
    const endDate = parseSafeDate(end);
    if (year > endDate.getFullYear()) return true;
    if (year === endDate.getFullYear() && monthIndex > endDate.getMonth()) return true;
  }
  return false;
}

/**
 * Returns true if the given 0-indexed month is disabled for a start/end date range when no year is selected.
 */
export function isMonthDisabledForRange(monthIndex: number, start: string, end: string): boolean {
  const startDate = parseSafeDate(start);
  const endDate = parseSafeDate(end);

  const monthsDiff =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());

  if (monthsDiff >= 11) return false;

  if (startDate.getFullYear() === endDate.getFullYear()) {
    return monthIndex < startDate.getMonth() || monthIndex > endDate.getMonth();
  }

  if (startDate.getFullYear() < endDate.getFullYear()) {
    return monthIndex > endDate.getMonth() && monthIndex < startDate.getMonth();
  }

  return false;
}

export interface DateRangeBounds {
  minYear: number | null;
  minMonth: number | null;
  maxYear: number | null;
  maxMonth: number | null;
}

const ALL_MONTHS_ENABLED: readonly boolean[] = Object.freeze(new Array<boolean>(12).fill(false));

/**
 * Parses start and end date strings once into year/month bounds.
 */
export function computeDateRangeBounds(start: string | null, end: string | null): DateRangeBounds {
  const startDate = start ? parseSafeDate(start) : null;
  const endDate = end ? parseSafeDate(end) : null;
  return {
    minYear: startDate ? startDate.getFullYear() : null,
    minMonth: startDate ? startDate.getMonth() : null,
    maxYear: endDate ? endDate.getFullYear() : null,
    maxMonth: endDate ? endDate.getMonth() : null,
  };
}

/**
 * Computes the 12-month disabled flags using pre-parsed date range bounds.
 */
export function computeDisabledMonths(
  year: number | null,
  bounds: DateRangeBounds,
): readonly boolean[] {
  const { minYear, minMonth, maxYear, maxMonth } = bounds;

  if (year !== null) {
    if (minYear === null && maxYear === null) {
      return ALL_MONTHS_ENABLED;
    }
    return Array.from({ length: 12 }, (_, monthIndex) => {
      if (minYear !== null && (year < minYear || (year === minYear && monthIndex < minMonth!))) {
        return true;
      }
      if (maxYear !== null && (year > maxYear || (year === maxYear && monthIndex > maxMonth!))) {
        return true;
      }
      return false;
    });
  }

  if (minYear !== null && maxYear !== null && minMonth !== null && maxMonth !== null) {
    const monthsDiff = (maxYear - minYear) * 12 + (maxMonth - minMonth);
    if (monthsDiff >= 11 || minYear > maxYear) {
      return ALL_MONTHS_ENABLED;
    }
    return Array.from({ length: 12 }, (_, monthIndex) => {
      if (minYear === maxYear) {
        return monthIndex < minMonth || monthIndex > maxMonth;
      }
      return monthIndex > maxMonth && monthIndex < minMonth;
    });
  }

  return ALL_MONTHS_ENABLED;
}
