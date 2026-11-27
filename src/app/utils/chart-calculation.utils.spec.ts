import { describe, expect, it } from 'vitest';
import {
  AnyConsumptionRecord,
  CombinedData,
  ConsumptionRecord,
  DynamicHeatingRecord,
  ElectricityRecord,
} from '../models/records.model';
import {
  applyHeatingRoomOffsets,
  applyMeterChangeOffsets,
  calculateLinearRegression,
  computeIncrementalData,
  detectHeatingRoomSpikes,
  detectMeterDrops,
  filterValidDateRecords,
  normalizeToDailyAverage,
} from './chart-calculation.utils';

describe('chart-calculation.utils', () => {
  describe('filterValidDateRecords', () => {
    it('should return the original array reference when all records have valid dates', () => {
      const records = [{ date: new Date('2025-01-01') }, { date: new Date('2025-02-01') }];
      expect(filterValidDateRecords(records)).toBe(records);
    });

    it('should filter out records with invalid or missing dates', () => {
      const valid = { date: new Date('2025-01-01') };
      const invalidDate = { date: new Date('invalid-date') };
      const missingDate = {} as { date: Date };

      const result = filterValidDateRecords([valid, invalidDate, missingDate]);
      expect(result).toEqual([valid]);
    });
  });

  describe('computeIncrementalData', () => {
    it('should return an empty array when fewer than 2 valid records are provided', () => {
      expect(computeIncrementalData([])).toEqual([]);
      expect(
        computeIncrementalData([{ date: new Date('2025-01-01'), value: 100 } as ElectricityRecord]),
      ).toEqual([]);
    });

    it('should calculate water deltas and clamp negative drops to 0', () => {
      const records: ConsumptionRecord[] = [
        {
          date: new Date('2025-01-01'),
          kitchenWarm: 10,
          kitchenCold: 20,
          bathroomWarm: 30,
          bathroomCold: 40,
        },
        {
          date: new Date('2025-02-01'),
          kitchenWarm: 15,
          kitchenCold: 18, // drop -> clamped to 0
          bathroomWarm: 40,
          bathroomCold: 50,
        },
      ];

      const result = computeIncrementalData(records);
      expect(result).toEqual([
        {
          date: new Date('2025-02-01'),
          kitchenWarm: 5,
          kitchenCold: 0,
          bathroomWarm: 10,
          bathroomCold: 10,
        },
      ]);
    });

    it('should calculate electricity deltas and handle meter resets', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2025-01-01'), value: 1000 },
        { date: new Date('2025-02-01'), value: 1250 },
        { date: new Date('2025-03-01'), value: 120 }, // meter reset (< 1250) -> uses currVal (120)
      ];

      const result = computeIncrementalData(records);
      expect(result).toEqual([
        { date: new Date('2025-02-01'), value: 250 },
        { date: new Date('2025-03-01'), value: 120 },
      ]);
    });

    it('should calculate heating room deltas, handle meter resets, and zero out ignored spikes', () => {
      const records: DynamicHeatingRecord[] = [
        {
          date: new Date('2025-01-01'),
          rooms: { living: 100, bedroom: 50 },
        },
        {
          date: new Date('2025-02-01'),
          rooms: { living: 140, bedroom: 20, office: 500 },
        },
      ];

      const result = computeIncrementalData(records, [{ date: '2025-02-01', roomId: 'office' }]);
      expect(result).toEqual([
        {
          date: new Date('2025-02-01'),
          rooms: {
            living: 40,
            bedroom: 20, // currVal (20) < prevVal (50) -> uses currVal
            office: 0, // ignored spike
          },
        },
      ]);
    });
  });

  describe('calculateLinearRegression', () => {
    it('should return slope 0 for empty or single-element arrays', () => {
      expect(calculateLinearRegression([])).toEqual({ slope: 0, intercept: 0 });
      expect(calculateLinearRegression([42])).toEqual({ slope: 0, intercept: 42 });
    });

    it('should compute accurate slope and intercept for linear series', () => {
      const { slope, intercept } = calculateLinearRegression([10, 20, 30, 40]);
      expect(slope).toBeCloseTo(10);
      expect(intercept).toBeCloseTo(10);
    });
  });

  describe('detectMeterDrops', () => {
    it('should return empty array when fewer than 2 valid records exist or no drops occur', () => {
      const single: ConsumptionRecord[] = [
        {
          date: new Date('2025-01-01'),
          kitchenWarm: 10,
          kitchenCold: 10,
          bathroomWarm: 10,
          bathroomCold: 10,
        },
      ];
      expect(detectMeterDrops(single)).toEqual([]);

      const increasing: ConsumptionRecord[] = [
        ...single,
        {
          date: new Date('2025-02-01'),
          kitchenWarm: 12,
          kitchenCold: 15,
          bathroomWarm: 14,
          bathroomCold: 20,
        },
      ];
      expect(detectMeterDrops(increasing)).toEqual([]);
    });

    it('should return ISO date strings where any water meter reading decreased', () => {
      const records: ConsumptionRecord[] = [
        {
          date: new Date('2025-01-01'),
          kitchenWarm: 50,
          kitchenCold: 50,
          bathroomWarm: 50,
          bathroomCold: 50,
        },
        {
          date: new Date('2025-02-01'),
          kitchenWarm: 5,
          kitchenCold: 2,
          bathroomWarm: 55,
          bathroomCold: 60,
        },
      ];

      expect(detectMeterDrops(records)).toEqual(['2025-02-01']);
    });
  });

  describe('applyMeterChangeOffsets', () => {
    it('should return original records if fewer than 2 records or no confirmed dates', () => {
      const records: ConsumptionRecord[] = [
        {
          date: new Date('2025-01-01'),
          kitchenWarm: 50,
          kitchenCold: 50,
          bathroomWarm: 50,
          bathroomCold: 50,
        },
      ];
      expect(applyMeterChangeOffsets(records, ['2025-02-01'])).toBe(records);

      const twoRecords: ConsumptionRecord[] = [
        ...records,
        {
          date: new Date('2025-02-01'),
          kitchenWarm: 5,
          kitchenCold: 55,
          bathroomWarm: 55,
          bathroomCold: 55,
        },
      ];
      expect(applyMeterChangeOffsets(twoRecords, [])).toBe(twoRecords);
    });

    it('should apply per-field cumulative offsets only to fields that dropped on confirmed dates', () => {
      const records: ConsumptionRecord[] = [
        {
          date: new Date('2025-01-01'),
          kitchenWarm: 100,
          kitchenCold: 200,
          bathroomWarm: 300,
          bathroomCold: 400,
        },
        {
          date: new Date('2025-02-01'),
          kitchenWarm: 10, // dropped from 100 -> offset +100
          kitchenCold: 220, // did not drop -> offset 0
          bathroomWarm: 310,
          bathroomCold: 420,
        },
        {
          date: new Date('2025-03-01'),
          kitchenWarm: 25,
          kitchenCold: 240,
          bathroomWarm: 320,
          bathroomCold: 440,
        },
      ];

      const adjusted = applyMeterChangeOffsets(records, ['2025-02-01']);
      expect(adjusted[1].kitchenWarm).toBe(110);
      expect(adjusted[1].kitchenCold).toBe(220);
      expect(adjusted[2].kitchenWarm).toBe(125);
    });
  });

  describe('detectHeatingRoomSpikes', () => {
    it('should return empty array when fewer than 2 valid records exist', () => {
      expect(detectHeatingRoomSpikes([{ date: new Date('2025-01-01'), rooms: { a: 10 } }])).toEqual(
        [],
      );
    });

    it('should detect new room spikes both with and without existing room baselines', () => {
      const withBaseline: DynamicHeatingRecord[] = [
        { date: new Date('2025-01-01'), rooms: { living: 100, newRoom: 0 } },
        { date: new Date('2025-02-01'), rooms: { living: 110, newRoom: 200 } }, // avgOtherDelta = 10, newRoom delta = 200 (> 50 and > 10*5)
      ];
      expect(detectHeatingRoomSpikes(withBaseline)).toEqual([
        { date: '2025-02-01', roomId: 'newRoom', value: 200, averageDelta: 10 },
      ]);

      const withoutBaseline: DynamicHeatingRecord[] = [
        { date: new Date('2025-01-01'), rooms: { newRoom: 0 } },
        { date: new Date('2025-02-01'), rooms: { newRoom: 150 } }, // otherDeltasCount = 0, delta = 150 (> 100)
      ];
      expect(detectHeatingRoomSpikes(withoutBaseline)).toEqual([
        { date: '2025-02-01', roomId: 'newRoom', value: 150, averageDelta: 0 },
      ]);
    });
  });

  describe('applyHeatingRoomOffsets', () => {
    it('should return original records when fewer than 2 records or no ignored spikes', () => {
      const records: DynamicHeatingRecord[] = [
        { date: new Date('2025-01-01'), rooms: { living: 10 } },
      ];
      expect(applyHeatingRoomOffsets(records, [{ date: '2025-02-01', roomId: 'living' }])).toBe(
        records,
      );
      expect(
        applyHeatingRoomOffsets(
          [...records, { date: new Date('2025-02-01'), rooms: { living: 20 } }],
          [],
        ),
      ).toHaveLength(2);
    });

    it('should subtract spike offsets and reset offset if subsequent reading drops below offset', () => {
      const records: DynamicHeatingRecord[] = [
        { date: new Date('2025-01-01'), rooms: { living: 100, attic: 0 } },
        { date: new Date('2025-02-01'), rooms: { living: 120, attic: 500 } }, // spike on attic -> offset = 500
        { date: new Date('2025-03-01'), rooms: { living: 140, attic: 530 } }, // 530 - 500 = 30
        { date: new Date('2025-04-01'), rooms: { living: 160, attic: 15 } }, // rawVal (15) < offset (500) -> resets offset to 0
      ];

      const adjusted = applyHeatingRoomOffsets(records, [{ date: '2025-02-01', roomId: 'attic' }]);
      expect(adjusted[1].rooms['attic']).toBe(0);
      expect(adjusted[2].rooms['attic']).toBe(30);
      expect(adjusted[3].rooms['attic']).toBe(15);
    });
  });

  describe('normalizeToDailyAverage', () => {
    it('should return empty array when incrementalData is empty', () => {
      expect(normalizeToDailyAverage([], [], 'water')).toEqual([]);
    });

    it('should normalize electricity, water, and heating data to daily averages and pad the initial entry', () => {
      const origDates: AnyConsumptionRecord[] = [
        { date: new Date('2025-01-01'), value: 100 },
        { date: new Date('2025-01-11'), value: 200 }, // 10 days
      ];

      const elecInc: CombinedData[] = [{ date: new Date('2025-01-11'), value: 100 }];
      const elecNorm = normalizeToDailyAverage(elecInc, origDates, 'electricity');
      expect(elecNorm).toHaveLength(2);
      expect(elecNorm[0].date).toEqual(new Date('2025-01-01'));
      expect(elecNorm[1]['value']).toBe(10);
      expect(elecNorm[1].normalized).toEqual({ days: 10, raw: 100 });

      const waterInc: CombinedData[] = [
        {
          date: new Date('2025-01-11'),
          kitchenWarm: 20,
          kitchenCold: 30,
          bathroomWarm: 40,
          bathroomCold: 50,
        },
      ];
      const waterNorm = normalizeToDailyAverage(waterInc, origDates, 'water');
      expect(waterNorm[1]['kitchenWarm']).toBe(2);
      expect(waterNorm[1]['bathroomCold']).toBe(5);

      const heatingInc: CombinedData[] = [
        { date: new Date('2025-01-11'), rooms: { living: 50, bedroom: 20 } },
      ];
      const heatingNorm = normalizeToDailyAverage(heatingInc, origDates, 'heating');
      expect((heatingNorm[1]['rooms'] as Record<string, number>)['living']).toBe(5);
      expect((heatingNorm[0]['rooms'] as Record<string, number>)['living']).toBe(5);
    });

    it('should clamp daysDiff <= 0.5 to 1 day and handle missing originalData padding', () => {
      const sameDayOrig: AnyConsumptionRecord[] = [
        { date: new Date('2025-01-01T10:00:00Z'), value: 100 },
        { date: new Date('2025-01-01T12:00:00Z'), value: 125 },
      ];
      const inc: CombinedData[] = [{ date: new Date('2025-01-01T12:00:00Z'), value: 25 }];
      const norm = normalizeToDailyAverage(inc, sameDayOrig, 'electricity');
      expect(norm[1].normalized?.days).toBe(1);
      expect(norm[1]['value']).toBe(25);

      const noOrig = normalizeToDailyAverage(inc, [], 'electricity');
      expect(noOrig).toHaveLength(1);
    });
  });
});
