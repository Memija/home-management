import { describe, it, expect } from 'vitest';
import {
  calculateWaterTotal,
  calculateKitchenTotal,
  calculateBathroomTotal,
  calculateHeatingTotal,
  calculateDynamicHeatingTotal,
  getDateKey,
  isWaterRecordAllZero,
  isHeatingRecordAllZero,
  isDynamicHeatingRecordAllZero,
  toDynamicHeatingRecord,
  toHeatingRecord,
  filterZeroPlaceholders,
  mergeRecords,
  ConsumptionRecord,
  HeatingRecord,
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

    const heatingRecord: HeatingRecord = {
      date: new Date('2023-01-01'),
      livingRoom: 10,
      bedroom: 20,
      kitchen: 30,
      bathroom: 40
    };

    const dynamicHeatingRecord: DynamicHeatingRecord = {
      date: new Date('2023-01-01'),
      rooms: {
        'room1': 10,
        'room2': 20
      }
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

    it('should calculate heating total correctly', () => {
      expect(calculateHeatingTotal(heatingRecord)).toBe(100);
    });

    it('should calculate dynamic heating total correctly', () => {
      expect(calculateDynamicHeatingTotal(dynamicHeatingRecord)).toBe(30);
    });

    it('should handle dynamic heating total with undefined values', () => {
      const record = { ...dynamicHeatingRecord, rooms: { 'room1': 10, 'room2': undefined } } as unknown as DynamicHeatingRecord;
      expect(calculateDynamicHeatingTotal(record)).toBe(10);
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

    it('should identify all-zero heating record', () => {
      const record: HeatingRecord = {
        date: new Date(),
        livingRoom: 0,
        bedroom: 0,
        kitchen: 0,
        bathroom: 0
      };
      expect(isHeatingRecordAllZero(record)).toBe(true);
    });

    it('should identify non-zero heating record', () => {
      const record: HeatingRecord = {
        date: new Date(),
        livingRoom: 1,
        bedroom: 0,
        kitchen: 0,
        bathroom: 0
      };
      expect(isHeatingRecordAllZero(record)).toBe(false);
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
  });

  describe('Conversion Functions', () => {
    it('should return dynamic record as-is in toDynamicHeatingRecord', () => {
      const dynamic: DynamicHeatingRecord = {
        date: new Date('2023-01-01'),
        rooms: { 'room1': 10 }
      };
      expect(toDynamicHeatingRecord(dynamic)).toBe(dynamic);
    });

    it('should convert legacy to dynamic record', () => {
      const legacy: HeatingRecord = {
        date: new Date('2023-01-01'),
        livingRoom: 10,
        bedroom: 20,
        kitchen: 30,
        bathroom: 40
      };
      const result = toDynamicHeatingRecord(legacy);
      expect(result.date).toBe(legacy.date);
      expect(result.rooms).toEqual({
        room_1: 10,
        room_2: 20,
        room_3: 30,
        room_4: 40
      });
    });

    it('should return legacy record as-is in toHeatingRecord', () => {
      const legacy: HeatingRecord = {
        date: new Date('2023-01-01'),
        livingRoom: 10,
        bedroom: 20,
        kitchen: 30,
        bathroom: 40
      };
      expect(toHeatingRecord(legacy)).toBe(legacy);
    });

    it('should convert dynamic to legacy record', () => {
      const dynamic: DynamicHeatingRecord = {
        date: new Date('2023-01-01'),
        rooms: {
          'room1': 10,
          'room2': 20,
          'room3': 30,
          'room4': 40
        }
      };
      const result = toHeatingRecord(dynamic);
      expect(result.date).toBe(dynamic.date);
      expect(result.livingRoom).toBe(10);
      expect(result.bedroom).toBe(20);
      expect(result.kitchen).toBe(30);
      expect(result.bathroom).toBe(40);
    });

    it('should handle invalid dynamic record in toHeatingRecord', () => {
      const invalid = { date: new Date('2023-01-01') } as unknown as DynamicHeatingRecord;
      const result = toHeatingRecord(invalid);
      expect(result.livingRoom).toBe(0);
      expect(result.bedroom).toBe(0);
      expect(result.kitchen).toBe(0);
      expect(result.bathroom).toBe(0);
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
