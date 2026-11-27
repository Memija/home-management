import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConsumptionMotivationService } from './consumption-motivation.service';
import { MOTIVATION_MESSAGE_POOL_SIZE } from '../models/motivation.model';
import {
  ConsumptionRecord,
  DynamicHeatingRecord,
  ElectricityRecord,
} from '../models/records.model';

describe('ConsumptionMotivationService', () => {
  let service: ConsumptionMotivationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConsumptionMotivationService],
    });
    service = TestBed.inject(ConsumptionMotivationService);
  });

  describe('Insufficient or invalid data', () => {
    it('should return null when water records have fewer than 3 readings', () => {
      const records: ConsumptionRecord[] = [
        {
          date: new Date('2026-01-01T12:00:00Z'),
          kitchenWarm: 10,
          kitchenCold: 20,
          bathroomWarm: 30,
          bathroomCold: 40,
        },
        {
          date: new Date('2026-01-11T12:00:00Z'),
          kitchenWarm: 20,
          kitchenCold: 40,
          bathroomWarm: 60,
          bathroomCold: 80,
        },
      ];

      expect(service.evaluateWater([])).toBeNull();
      expect(service.evaluateWater(records)).toBeNull();
    });

    it('should return null when records contain invalid dates leaving fewer than 3 valid entries', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2026-01-01T12:00:00Z'), value: 100 },
        { date: new Date('2026-01-11T12:00:00Z'), value: 200 },
        { date: new Date('invalid-date'), value: 300 },
      ];

      expect(service.evaluateElectricity(records)).toBeNull();
    });

    it('should return null when duplicate dates produce fewer than 2 positive intervals', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2026-01-01T12:00:00Z'), value: 100 },
        { date: new Date('2026-01-01T12:00:00Z'), value: 150 },
        { date: new Date('2026-01-11T12:00:00Z'), value: 250 },
      ];

      expect(service.evaluateElectricity(records)).toBeNull();
    });

    it('should return null when heating records omit rooms data', () => {
      const dateOnlyStubs = [
        { date: new Date('2026-01-01T12:00:00Z') },
        { date: new Date('2026-01-11T12:00:00Z') },
        { date: new Date('2026-01-21T12:00:00Z') },
      ];

      expect(service.evaluateHeating(dateOnlyStubs)).toBeNull();
    });

    it('should return null safely when non-array input is passed', () => {
      expect(service.evaluateWater(null as unknown as ConsumptionRecord[])).toBeNull();
      expect(service.evaluateHeating(null as unknown as DynamicHeatingRecord[])).toBeNull();
      expect(service.evaluateElectricity(null as unknown as ElectricityRecord[])).toBeNull();
    });
  });

  describe('3-record interval comparison (latest vs historical baseline)', () => {
    it('should detect notable water savings when latest daily rate drops by 25%', () => {
      // Unsorted on purpose to verify chronological sorting
      // Interval 1 (10 days): +1000 L -> 100 L/day
      // Interval 2 (10 days): +750 L -> 75 L/day (-25%)
      const records: ConsumptionRecord[] = [
        {
          date: new Date('2026-01-21T12:00:00Z'),
          kitchenWarm: 0,
          kitchenCold: 0,
          bathroomWarm: 500,
          bathroomCold: 1250,
        },
        {
          date: new Date('2026-01-01T12:00:00Z'),
          kitchenWarm: 0,
          kitchenCold: 0,
          bathroomWarm: 0,
          bathroomCold: 0,
        },
        {
          date: new Date('2026-01-11T12:00:00Z'),
          kitchenWarm: 0,
          kitchenCold: 0,
          bathroomWarm: 300,
          bathroomCold: 700,
        },
      ];

      const insight = service.evaluateWater(records);

      expect(insight).not.toBeNull();
      expect(insight?.state).toBe('saving');
      expect(insight?.changePercent).toBe(25);
      expect(insight?.latestDailyRate).toBe(75);
      expect(insight?.baselineDailyRate).toBe(100);
      expect(insight?.isNotable).toBe(true);
      expect(insight?.unit).toBe('L');
      expect(insight?.titleKey).toBe('MOTIVATION.WATER.SAVING_TITLE');
      expect(insight?.messageKey).toMatch(/^MOTIVATION\.WATER\.SAVING_\d+$/);
      expect(insight?.messageParams).toEqual({ percent: 25 });
    });

    it('should detect stable electricity consumption when change is within 3% threshold', () => {
      // Interval 1 (10 days): 100 kWh -> 10 kWh/day
      // Interval 2 (10 days): 102 kWh -> 10.2 kWh/day (+2% <= 3%)
      const records: ElectricityRecord[] = [
        { date: new Date('2026-01-01T12:00:00Z'), value: 1000 },
        { date: new Date('2026-01-11T12:00:00Z'), value: 1100 },
        { date: new Date('2026-01-21T12:00:00Z'), value: 1202 },
      ];

      const insight = service.evaluateElectricity(records);

      expect(insight?.state).toBe('stable');
      expect(insight?.isNotable).toBe(false);
      expect(insight?.titleKey).toBe('MOTIVATION.ELECTRICITY.STABLE_TITLE');
      expect(insight?.messageKey).toMatch(/^MOTIVATION\.ELECTRICITY\.STABLE_\d+$/);
    });

    it('should detect non-notable spike when usage increases between 4% and 9%', () => {
      // Interval 1 (10 days): 100 kWh -> 10 kWh/day
      // Interval 2 (10 days): 107 kWh -> 10.7 kWh/day (+7%)
      const records: ElectricityRecord[] = [
        { date: new Date('2026-01-01T12:00:00Z'), value: 500 },
        { date: new Date('2026-01-11T12:00:00Z'), value: 600 },
        { date: new Date('2026-01-21T12:00:00Z'), value: 707 },
      ];

      const insight = service.evaluateElectricity(records);

      expect(insight?.state).toBe('spike');
      expect(insight?.changePercent).toBe(7);
      expect(insight?.isNotable).toBe(false);
    });

    it('should detect notable spike when electricity usage increases by 30%', () => {
      // Interval 1 (10 days): 100 kWh -> 10 kWh/day
      // Interval 2 (10 days): 130 kWh -> 13 kWh/day (+30%)
      const records: ElectricityRecord[] = [
        { date: new Date('2026-01-01T12:00:00Z'), value: 500 },
        { date: new Date('2026-01-11T12:00:00Z'), value: 600 },
        { date: new Date('2026-01-21T12:00:00Z'), value: 730 },
      ];

      const insight = service.evaluateElectricity(records);

      expect(insight?.state).toBe('spike');
      expect(insight?.changePercent).toBe(30);
      expect(insight?.isNotable).toBe(true);
      expect(insight?.titleKey).toBe('MOTIVATION.ELECTRICITY.SPIKE_TITLE');
    });
  });

  describe('Hybrid trend blending (4+ records) & specialized adjustments', () => {
    it('should blend latest interval change with multi-interval trend when 4+ records exist', () => {
      // 4 intervals of 10 days each:
      // Rates: 10, 10, 8, 6 kWh/day
      // Baseline (first 3): (10 + 10 + 8) / 3 = 9.333 -> latestDiffPct = (6 - 9.333)/9.333 = -35.71%
      // Overall trend: first half avg = 10, second half avg = 7 -> falling 30% (-30%)
      // Blended: -35.71 * 0.6 + (-30) * 0.4 = -33.43% -> 33% saving
      const records: ElectricityRecord[] = [
        { date: new Date('2026-01-01T12:00:00Z'), value: 100 },
        { date: new Date('2026-01-11T12:00:00Z'), value: 200 },
        { date: new Date('2026-01-21T12:00:00Z'), value: 300 },
        { date: new Date('2026-01-31T12:00:00Z'), value: 380 },
        { date: new Date('2026-02-10T12:00:00Z'), value: 440 },
      ];

      const insight = service.evaluateElectricity(records);

      expect(insight?.state).toBe('saving');
      expect(insight?.changePercent).toBe(33);
      expect(insight?.isNotable).toBe(true);
    });

    it('should adjust water consumption properly when confirmed meter changes exist', () => {
      // Interval 1 (10 days): bathroomCold 1000 -> 2000 (+1000 L = 100 L/day)
      // Interval 2 (10 days): meter replaced, bathroomCold resets to 0 and reaches 1000 (+1000 L = 100 L/day)
      const records: ConsumptionRecord[] = [
        {
          date: new Date('2026-01-01T12:00:00Z'),
          kitchenWarm: 0,
          kitchenCold: 0,
          bathroomWarm: 0,
          bathroomCold: 1000,
        },
        {
          date: new Date('2026-01-11T12:00:00Z'),
          kitchenWarm: 0,
          kitchenCold: 0,
          bathroomWarm: 0,
          bathroomCold: 2000,
        },
        {
          date: new Date('2026-01-21T12:00:00Z'),
          kitchenWarm: 0,
          kitchenCold: 0,
          bathroomWarm: 0,
          bathroomCold: 1000,
        },
      ];

      const insight = service.evaluateWater(records, ['2026-01-21']);

      expect(insight?.state).toBe('stable');
      expect(insight?.latestDailyRate).toBe(100);
    });

    it('should classify summer off-season zero heating rate as stable instead of artificial saving', () => {
      // 7 monthly readings across winter -> summer so off-season detection (>= 6 months) activates
      const records: DynamicHeatingRecord[] = [
        { date: new Date('2026-01-01T12:00:00Z'), rooms: { living: 100 } },
        { date: new Date('2026-02-01T12:00:00Z'), rooms: { living: 250 } },
        { date: new Date('2026-03-01T12:00:00Z'), rooms: { living: 370 } },
        { date: new Date('2026-04-01T12:00:00Z'), rooms: { living: 430 } },
        { date: new Date('2026-05-01T12:00:00Z'), rooms: { living: 450 } },
        { date: new Date('2026-06-01T12:00:00Z'), rooms: { living: 450 } },
        { date: new Date('2026-07-01T12:00:00Z'), rooms: { living: 450 } },
      ];

      const insight = service.evaluateHeating(records);

      expect(insight?.state).toBe('stable');
      expect(insight?.changePercent).toBe(0);
      expect(insight?.isNotable).toBe(false);
    });

    it('should blend latest interval increase with rising multi-interval trend when 4+ records exist', () => {
      // 4 intervals of 10 days each:
      // Rates: 10, 10, 12, 14 kWh/day
      // Baseline (first 3): (10 + 10 + 12) / 3 = 10.667 -> latestDiffPct = +31.25%
      // Overall trend: first half avg = 10, second half avg = 13 -> rising +30%
      // Blended: 31.25 * 0.6 + 30 * 0.4 = +30.75% -> 31% spike
      const records: ElectricityRecord[] = [
        { date: new Date('2026-01-01T12:00:00Z'), value: 100 },
        { date: new Date('2026-01-11T12:00:00Z'), value: 200 },
        { date: new Date('2026-01-21T12:00:00Z'), value: 300 },
        { date: new Date('2026-01-31T12:00:00Z'), value: 420 },
        { date: new Date('2026-02-10T12:00:00Z'), value: 560 },
      ];

      const insight = service.evaluateElectricity(records);

      expect(insight?.state).toBe('spike');
      expect(insight?.changePercent).toBe(31);
      expect(insight?.isNotable).toBe(true);
    });

    it('should handle zero historical baseline rate for both positive and zero latest rates', () => {
      const zeroToPositive: ElectricityRecord[] = [
        { date: new Date('2026-01-01T12:00:00Z'), value: 100 },
        { date: new Date('2026-01-11T12:00:00Z'), value: 100 },
        { date: new Date('2026-01-21T12:00:00Z'), value: 150 },
      ];
      const spikeFromZero = service.evaluateElectricity(zeroToPositive);
      expect(spikeFromZero?.state).toBe('spike');
      expect(spikeFromZero?.changePercent).toBe(100);
      expect(spikeFromZero?.isNotable).toBe(true);

      const allZeroIntervals: ElectricityRecord[] = [
        { date: new Date('2026-01-01T12:00:00Z'), value: 100 },
        { date: new Date('2026-01-11T12:00:00Z'), value: 100 },
        { date: new Date('2026-01-21T12:00:00Z'), value: 100 },
      ];
      const stableZero = service.evaluateElectricity(allZeroIntervals);
      expect(stableZero?.state).toBe('stable');
      expect(stableZero?.changePercent).toBe(0);
      expect(stableZero?.isNotable).toBe(false);
    });

    it('should provide percentage-only messageParams without explicit daily rate or unit', () => {
      const highRateWater: ConsumptionRecord[] = [
        {
          date: new Date('2026-01-01T12:00:00Z'),
          kitchenWarm: 0,
          kitchenCold: 0,
          bathroomWarm: 0,
          bathroomCold: 0,
        },
        {
          date: new Date('2026-01-11T12:00:00Z'),
          kitchenWarm: 0,
          kitchenCold: 0,
          bathroomWarm: 0,
          bathroomCold: 1500,
        },
        {
          date: new Date('2026-01-21T12:00:00Z'),
          kitchenWarm: 0,
          kitchenCold: 0,
          bathroomWarm: 0,
          bathroomCold: 2746,
        },
      ];

      // Latest interval: 124.6 L/day vs 150 L/day baseline -> 17% saving
      const waterInsight = service.evaluateWater(highRateWater);
      expect(waterInsight?.messageParams).toEqual({ percent: 17 });
      expect(waterInsight?.messageParams).not.toHaveProperty('rate');
      expect(waterInsight?.messageParams).not.toHaveProperty('unit');

      const decimalElectricity: ElectricityRecord[] = [
        { date: new Date('2026-01-01T12:00:00Z'), value: 0 },
        { date: new Date('2026-01-11T12:00:00Z'), value: 100 },
        { date: new Date('2026-01-21T12:00:00Z'), value: 215.6 },
      ];
      // Latest interval: 11.56 kWh/day vs 10 kWh/day baseline -> 16% spike
      const electricityInsight = service.evaluateElectricity(decimalElectricity);
      expect(electricityInsight?.messageParams).toEqual({ percent: 16 });
      expect(electricityInsight?.messageParams).not.toHaveProperty('rate');
      expect(electricityInsight?.messageParams).not.toHaveProperty('unit');
    });
  });

  describe('Tip cycling and automatic rotation', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('should cycle through the full message pool independently per tracker before wrapping', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-21T12:00:00Z'));

      const waterRecords: ConsumptionRecord[] = [
        {
          date: new Date('2026-01-01T12:00:00Z'),
          kitchenWarm: 0,
          kitchenCold: 0,
          bathroomWarm: 0,
          bathroomCold: 0,
        },
        {
          date: new Date('2026-01-11T12:00:00Z'),
          kitchenWarm: 0,
          kitchenCold: 0,
          bathroomWarm: 0,
          bathroomCold: 1000,
        },
        {
          date: new Date('2026-01-21T12:00:00Z'),
          kitchenWarm: 0,
          kitchenCold: 0,
          bathroomWarm: 0,
          bathroomCold: 1800,
        },
      ];
      const electricityRecords: ElectricityRecord[] = [
        { date: new Date('2026-01-01T12:00:00Z'), value: 100 },
        { date: new Date('2026-01-11T12:00:00Z'), value: 200 },
        { date: new Date('2026-01-21T12:00:00Z'), value: 300 },
      ];

      const initialElectricityKey = service.evaluateElectricity(electricityRecords)?.messageKey;
      const seenWaterKeys = new Set<string>();
      const firstWaterKey = service.evaluateWater(waterRecords)!.messageKey;

      expect(service.getTipIndex('water')).toBe(0);

      for (let step = 0; step < MOTIVATION_MESSAGE_POOL_SIZE; step++) {
        const currentKey = service.evaluateWater(waterRecords)!.messageKey;
        seenWaterKeys.add(currentKey);
        service.nextTip('water');
      }

      // Cycled through all 10 distinct messages and wrapped back to the first key
      expect(seenWaterKeys.size).toBe(MOTIVATION_MESSAGE_POOL_SIZE);
      expect(service.getTipIndex('water')).toBe(0);
      expect(service.evaluateWater(waterRecords)?.messageKey).toBe(firstWaterKey);

      // Electricity tracker remained untouched while cycling water
      expect(service.evaluateElectricity(electricityRecords)?.messageKey).toBe(
        initialElectricityKey,
      );
    });

    it('should automatically rotate motivational messages across calendar days and when new readings are added', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-21T12:00:00Z'));

      const threeRecords: ElectricityRecord[] = [
        { date: new Date('2026-01-01T12:00:00Z'), value: 100 },
        { date: new Date('2026-01-11T12:00:00Z'), value: 200 },
        { date: new Date('2026-01-21T12:00:00Z'), value: 300 },
      ];

      const dayOneKey = service.evaluateElectricity(threeRecords)?.messageKey;

      // Visiting the next day automatically advances to a fresh tip
      vi.setSystemTime(new Date('2026-01-22T12:00:00Z'));
      const dayTwoKey = service.evaluateElectricity(threeRecords)?.messageKey;
      expect(dayTwoKey).not.toBe(dayOneKey);

      // Adding a new reading on the same day also rotates to a fresh tip
      const fourRecords: ElectricityRecord[] = [
        ...threeRecords,
        { date: new Date('2026-01-31T12:00:00Z'), value: 400 },
      ];
      const afterNewReadingKey = service.evaluateElectricity(fourRecords)?.messageKey;
      expect(afterNewReadingKey).not.toBe(dayTwoKey);
    });
  });
});
