import { describe, it, expect } from 'vitest';
import {
  calculateWaterTotal,
  calculateKitchenTotal,
  calculateBathroomTotal,
  calculateElectricityTotal,
  calculateDynamicHeatingTotal,
  getDateKey,
  isWaterRecordAllZero,
  isElectricityRecordAllZero,
  isDynamicHeatingRecordAllZero,
  filterZeroPlaceholders,
  mergeRecords,
  ConsumptionRecord,
  ElectricityRecord,
  DynamicHeatingRecord
} from './records.model';

describe('Records Model Utils', () => {

  describe('Calculation Functions', () => {
    const waterRecord: ConsumptionRecord = {
      date: new Date('2023-01-01'),
      kitchenWarm: 10,
      kitchenCold: 20,
      bathroomWarm: 30,
      bathroomCold: 40
    };

    const dynamicHeatingRecord: DynamicHeatingRecord = {
      date: new Date('2023-01-01'),
      rooms: {
        'room1': 10,
        'room2': 20
      }
    };

    const electricityRecord: ElectricityRecord = {
      date: new Date('2023-01-01'),
      value: 150
    };

    it('should calculate water total correctly', () => {
      expect(calculateWaterTotal(waterRecord)).toBe(100);
    });

    it('should calculate kitchen total correctly', () => {
      expect(calculateKitchenTotal(waterRecord)).toBe(30);
    });

    it('should calculate bathroom total correctly', () => {
      expect(calculateBathroomTotal(waterRecord)).toBe(70);
    });

    it('should calculate dynamic heating total correctly', () => {
      expect(calculateDynamicHeatingTotal(dynamicHeatingRecord)).toBe(30);
    });

    it('should handle dynamic heating total with undefined values', () => {
      const record = { ...dynamicHeatingRecord, rooms: { 'room1': 10, 'room2': undefined } } as unknown as DynamicHeatingRecord;
      expect(calculateDynamicHeatingTotal(record)).toBe(10);
    });

    it('should calculate electricity total correctly', () => {
      expect(calculateElectricityTotal(electricityRecord)).toBe(150);
    });

    it('should return zero for electricity record with zero value', () => {
      const record: ElectricityRecord = { date: new Date(), value: 0 };
      expect(calculateElectricityTotal(record)).toBe(0);
    });
  });

  describe('Date Utilities', () => {
    it('should get normalized date key', () => {
      const date1 = new Date('2023-01-01T10:00:00');
      const date2 = new Date('2023-01-01T20:00:00');
      expect(getDateKey(date1)).toBe('2023-01-01');
      expect(getDateKey(date2)).toBe('2023-01-01');
    });

    it('should handle single digit months and days', () => {
      const date = new Date('2023-01-01');
      expect(getDateKey(date)).toBe('2023-01-01');
    });

    it('should handle double digit months and days', () => {
      const date = new Date('2023-10-10');
      expect(getDateKey(date)).toBe('2023-10-10');
    });
  });

  describe('Zero Checks', () => {
    it('should identify all-zero water record', () => {
      const record: ConsumptionRecord = {
        date: new Date(),
        kitchenWarm: 0,
        kitchenCold: 0,
        bathroomWarm: 0,
        bathroomCold: 0
      };
      expect(isWaterRecordAllZero(record)).toBe(true);
    });

    it('should identify non-zero water record', () => {
      const record: ConsumptionRecord = {
        date: new Date(),
        kitchenWarm: 0,
        kitchenCold: 1,
        bathroomWarm: 0,
        bathroomCold: 0
      };
      expect(isWaterRecordAllZero(record)).toBe(false);
    });

    it('should identify all-zero dynamic heating record', () => {
      const record: DynamicHeatingRecord = {
        date: new Date(),
        rooms: { 'room1': 0, 'room2': 0 }
      };
      expect(isDynamicHeatingRecordAllZero(record)).toBe(true);
    });

    it('should identify non-zero dynamic heating record', () => {
      const record: DynamicHeatingRecord = {
        date: new Date(),
        rooms: { 'room1': 0, 'room2': 1 }
      };
      expect(isDynamicHeatingRecordAllZero(record)).toBe(false);
    });

    it('should identify all-zero electricity record', () => {
      const record: ElectricityRecord = {
        date: new Date(),
        value: 0
      };
      expect(isElectricityRecordAllZero(record)).toBe(true);
    });

    it('should identify non-zero electricity record', () => {
      const record: ElectricityRecord = {
        date: new Date(),
        value: 100
      };
      expect(isElectricityRecordAllZero(record)).toBe(false);
    });
  });



  describe('Filtering and Merging', () => {
    it('should filter all zero records regardless of date', () => {
      const records = [
        { date: new Date('2023-01-01'), val: 10 },
        { date: new Date('2023-01-02'), val: 0 }, // Zero - filtered
        { date: new Date('2023-01-03'), val: 5 },
        { date: new Date('2023-01-04'), val: 0 }  // Zero - filtered
      ];
      const isAllZero = (r: any) => r.val === 0;

      const { filtered, skippedCount } = filterZeroPlaceholders(records, isAllZero);

      expect(filtered.length).toBe(2);
      expect(filtered[0].val).toBe(10);
      expect(filtered[1].val).toBe(5);
      expect(skippedCount).toBe(2);
    });

    it('should not filter non-zero records', () => {
      const records = [
        { date: new Date('2023-01-01'), val: 10 },
        { date: new Date('2023-01-02'), val: 5 }
      ];
      const isAllZero = (r: any) => r.val === 0;

      const { filtered, skippedCount } = filterZeroPlaceholders(records, isAllZero);

      expect(filtered.length).toBe(2);
      expect(skippedCount).toBe(0);
    });

    it('should handle empty records in filterZeroPlaceholders', () => {
      const { filtered, skippedCount } = filterZeroPlaceholders([], () => true);
      expect(filtered.length).toBe(0);
      expect(skippedCount).toBe(0);
    });

    it('should merge records correctly', () => {
      const existing = [{ date: new Date('2023-01-01'), val: 1 }];
      const incoming = [{ date: new Date('2023-01-02'), val: 2 }];

      const result = mergeRecords(existing, incoming);
      expect(result.length).toBe(2);
      expect((result[0] as any).val).toBe(1);
      expect((result[1] as any).val).toBe(2);
    });

    it('should overwrite existing records with same date', () => {
      const existing = [{ date: new Date('2023-01-01'), val: 1 }];
      const incoming = [{ date: new Date('2023-01-01'), val: 2 }];

      const result = mergeRecords(existing, incoming);
      expect(result.length).toBe(1);
      expect((result[0] as any).val).toBe(2);
    });

    it('should sort merged records by date', () => {
      const existing = [{ date: new Date('2023-01-03'), val: 3 }];
      const incoming = [{ date: new Date('2023-01-01'), val: 1 }, { date: new Date('2023-01-02'), val: 2 }];

      const result = mergeRecords(existing, incoming);
      expect(result.length).toBe(3);
      expect((result[0] as any).val).toBe(1);
      expect((result[1] as any).val).toBe(2);
      expect((result[2] as any).val).toBe(3);
    });
  });
});
