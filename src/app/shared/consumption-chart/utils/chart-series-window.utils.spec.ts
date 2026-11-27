import { describe, expect, it } from 'vitest';
import { DynamicHeatingRecord, ElectricityRecord } from '../../../models/records.model';
import {
  aggregateRecordsMonthly,
  filterRecordsByTimeRange,
  isChartGranularity,
  isChartTimeRange,
  prepareWindowedRecords,
  resolveDefaultTimeRange,
} from './chart-series-window.utils';

function makeElectricityPoint(dateStr: string, value: number): ElectricityRecord {
  return {
    date: new Date(dateStr),
    value,
  };
}

function makeHeatingPoint(dateStr: string, rooms: Record<string, number>): DynamicHeatingRecord {
  return {
    date: new Date(dateStr),
    rooms,
  };
}

describe('chart-series-window.utils', () => {
  it('should validate time range and granularity type guards', () => {
    expect(isChartTimeRange('3m')).toBe(true);
    expect(isChartTimeRange('6m')).toBe(true);
    expect(isChartTimeRange('1y')).toBe(true);
    expect(isChartTimeRange('all')).toBe(true);
    expect(isChartTimeRange('invalid')).toBe(false);
    expect(isChartTimeRange(null)).toBe(false);

    expect(isChartGranularity('raw')).toBe(true);
    expect(isChartGranularity('monthly')).toBe(true);
    expect(isChartGranularity('weekly')).toBe(false);
  });

  it('should default to 1y on mobile when points > 24 and all otherwise', () => {
    expect(resolveDefaultTimeRange(30, true)).toBe('1y');
    expect(resolveDefaultTimeRange(24, true)).toBe('all');
    expect(resolveDefaultTimeRange(50, false)).toBe('all');
  });

  it('should aggregate multiple intra-month readings to end-of-month and merge heating rooms', () => {
    const electricityRecords: ElectricityRecord[] = [
      makeElectricityPoint('2025-01-05', 100),
      makeElectricityPoint('2025-01-25', 140),
      makeElectricityPoint('2025-02-10', 175),
      makeElectricityPoint('2025-02-27', 210),
    ];

    const monthlyElectricity = aggregateRecordsMonthly(electricityRecords);
    expect(monthlyElectricity).toHaveLength(2);
    expect(monthlyElectricity[0].value).toBe(140);
    expect(monthlyElectricity[1].value).toBe(210);

    const heatingRecords: DynamicHeatingRecord[] = [
      makeHeatingPoint('2025-01-05', { living: 10, bedroom: 5 }),
      makeHeatingPoint('2025-01-25', { living: 18 }),
      makeHeatingPoint('2025-02-10', { bedroom: 12 }),
      makeHeatingPoint('2025-02-27', { living: 25 }),
    ];

    const monthlyHeating = aggregateRecordsMonthly(heatingRecords);
    expect(monthlyHeating).toHaveLength(2);
    expect(monthlyHeating[0].rooms).toEqual({ living: 18, bedroom: 5 });
    expect(monthlyHeating[1].rooms).toEqual({ living: 25, bedroom: 12 });
  });

  it('should keep original records if monthly aggregation produces fewer than 2 buckets', () => {
    const sameMonth = [
      makeElectricityPoint('2025-03-01', 10),
      makeElectricityPoint('2025-03-10', 20),
      makeElectricityPoint('2025-03-20', 30),
    ];
    expect(aggregateRecordsMonthly(sameMonth)).toBe(sameMonth);
  });

  it('should filter by trailing time range anchored to last reading and optionally keep baseline', () => {
    const records = [
      makeElectricityPoint('2024-01-15', 100),
      makeElectricityPoint('2024-06-15', 200),
      makeElectricityPoint('2024-10-15', 300),
      makeElectricityPoint('2024-11-15', 350),
      makeElectricityPoint('2025-01-15', 400),
    ];

    const threeMonthsTotal = filterRecordsByTimeRange(records, '3m', false);
    expect(threeMonthsTotal.map((r) => r.value)).toEqual([300, 350, 400]);

    const threeMonthsIncremental = filterRecordsByTimeRange(records, '3m', true);
    expect(threeMonthsIncremental.map((r) => r.value)).toEqual([200, 300, 350, 400]);

    expect(filterRecordsByTimeRange(records, 'all', false)).toBe(records);
  });

  it('should combine monthly aggregation and range slicing via prepareWindowedRecords', () => {
    const records = [
      makeElectricityPoint('2024-01-05', 50),
      makeElectricityPoint('2024-01-20', 70),
      makeElectricityPoint('2024-08-10', 150),
      makeElectricityPoint('2024-11-02', 200),
      makeElectricityPoint('2024-11-28', 220),
      makeElectricityPoint('2024-12-20', 260),
    ];

    const result = prepareWindowedRecords(records, '3m', 'monthly', false);
    expect(result.map((r) => r.value)).toEqual([220, 260]);
  });
});
