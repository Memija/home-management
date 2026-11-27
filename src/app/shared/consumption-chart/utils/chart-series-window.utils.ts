import { ChartDataPoint } from '../../../models/consumption-chart.model';
import { parseSafeDate } from '../../../models/records.model';

export type ChartTimeRange = '3m' | '6m' | '1y' | 'all';
export type ChartGranularity = 'raw' | 'monthly';

export const CHART_TIME_RANGES: readonly ChartTimeRange[] = ['3m', '6m', '1y', 'all'] as const;

const RANGE_MONTHS: Record<Exclude<ChartTimeRange, 'all'>, number> = {
  '3m': 3,
  '6m': 6,
  '1y': 12,
};

const MOBILE_SMART_RANGE_THRESHOLD = 24;

export function isChartTimeRange(value: string | null): value is ChartTimeRange {
  return value === '3m' || value === '6m' || value === '1y' || value === 'all';
}

export function isChartGranularity(value: string | null): value is ChartGranularity {
  return value === 'raw' || value === 'monthly';
}

/**
 * Resolves the default time range when no user preference is saved:
 * defaults to '1y' on mobile viewports when historical points exceed 24, otherwise 'all'.
 */
export function resolveDefaultTimeRange(
  dataLength: number,
  isMobileViewport: boolean,
): ChartTimeRange {
  if (isMobileViewport && dataLength > MOBILE_SMART_RANGE_THRESHOLD) {
    return '1y';
  }
  return 'all';
}

function getMonthKey(dateValue: Date | string): string {
  const d = parseSafeDate(dateValue);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function hasRoomsMap(
  record: ChartDataPoint,
): record is ChartDataPoint & { rooms: Record<string, number> } {
  return 'rooms' in record && Boolean(record.rooms) && typeof record.rooms === 'object';
}

function mergeRecordIntoMonthBucket<T extends ChartDataPoint>(existing: T, incoming: T): T {
  if (hasRoomsMap(existing) && hasRoomsMap(incoming)) {
    return {
      ...existing,
      ...incoming,
      rooms: {
        ...existing.rooms,
        ...incoming.rooms,
      },
    };
  }

  return { ...existing, ...incoming };
}

/**
 * Collapses high-frequency cumulative readings into one end-of-month reading per calendar month.
 * Preserves exact cumulative progression and multi-room heating state.
 */
export function aggregateRecordsMonthly<T extends ChartDataPoint>(records: T[]): T[] {
  if (records.length <= 2) {
    return records;
  }

  const buckets = new Map<string, T>();
  for (const record of records) {
    const key = getMonthKey(record.date);
    const prev = buckets.get(key);
    buckets.set(key, prev ? mergeRecordIntoMonthBucket(prev, record) : record);
  }

  const aggregated = Array.from(buckets.values());
  return aggregated.length >= 2 ? aggregated : records;
}

/**
 * Filters sorted records to the selected trailing time window anchored to the latest reading.
 * Includes one preceding baseline reading when available so incremental deltas remain accurate,
 * and always retains at least 2 points when records.length >= 2.
 */
export function filterRecordsByTimeRange<T extends ChartDataPoint>(
  records: T[],
  range: ChartTimeRange,
  includeBaselineRecord = false,
): T[] {
  if (range === 'all' || records.length <= 2) {
    return records;
  }

  const lastDate = parseSafeDate(records[records.length - 1].date);
  const cutoff = new Date(lastDate);
  cutoff.setMonth(cutoff.getMonth() - RANGE_MONTHS[range]);
  const cutoffMs = cutoff.getTime();

  let firstMatchIndex = records.findIndex((rec) => parseSafeDate(rec.date).getTime() >= cutoffMs);
  if (firstMatchIndex === -1) {
    return records.slice(-2);
  }

  if (includeBaselineRecord && firstMatchIndex > 0) {
    firstMatchIndex -= 1;
  }

  const maxStartIndex = Math.max(0, records.length - 2);
  const startIndex = Math.min(firstMatchIndex, maxStartIndex);
  return startIndex === 0 ? records : records.slice(startIndex);
}

/**
 * Applies optional monthly aggregation followed by trailing time-range filtering.
 */
export function prepareWindowedRecords<T extends ChartDataPoint>(
  records: T[],
  range: ChartTimeRange,
  granularity: ChartGranularity,
  isIncrementalMode: boolean,
): T[] {
  const base = granularity === 'monthly' ? aggregateRecordsMonthly(records) : records;
  return filterRecordsByTimeRange(base, range, isIncrementalMode);
}
