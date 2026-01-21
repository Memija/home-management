import { TestBed } from '@angular/core/testing';
import { ChartCalculationService } from './chart-calculation.service';
import { WaterAveragesService } from './water-averages.service';
import { ConsumptionRecord, DynamicHeatingRecord } from '../models/records.model';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('ChartCalculationService', () => {
  let service: ChartCalculationService;
  let waterAveragesServiceSpy: { getCountryData: any };

  beforeEach(() => {
    const spy = { getCountryData: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        ChartCalculationService,
        { provide: WaterAveragesService, useValue: spy }
      ]
    });
    service = TestBed.inject(ChartCalculationService);
    waterAveragesServiceSpy = TestBed.inject(WaterAveragesService) as any;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateIncrementalData', () => {
    it('should return empty array for 0 or 1 record', () => {
      expect(service.calculateIncrementalData([])).toEqual([]);
      expect(service.calculateIncrementalData([{ date: new Date(), kitchenWarm: 10, kitchenCold: 10, bathroomWarm: 10, bathroomCold: 10 }])).toEqual([]);
    });

    it('should calculate incremental data for ConsumptionRecord', () => {
      const records: ConsumptionRecord[] = [
        { date: new Date('2023-01-01'), kitchenWarm: 100, kitchenCold: 200, bathroomWarm: 300, bathroomCold: 400 },
        { date: new Date('2023-01-02'), kitchenWarm: 110, kitchenCold: 220, bathroomWarm: 330, bathroomCold: 440 },
        { date: new Date('2023-01-03'), kitchenWarm: 115, kitchenCold: 230, bathroomWarm: 340, bathroomCold: 450 }
      ];

      const result = service.calculateIncrementalData(records);

      expect(result.length).toBe(2);
      expect(result[0]).toEqual({
        date: new Date('2023-01-02'),
        kitchenWarm: 10,
        kitchenCold: 20,
        bathroomWarm: 30,
        bathroomCold: 40
      });
      expect(result[1]).toEqual({
        date: new Date('2023-01-03'),
        kitchenWarm: 5,
        kitchenCold: 10,
        bathroomWarm: 10,
        bathroomCold: 10
      });
    });

    it('should calculate incremental data for DynamicHeatingRecord', () => {
      const records: DynamicHeatingRecord[] = [
        { date: new Date('2023-01-01'), rooms: { 'room1': 100, 'room2': 200, 'room3': 300 } },
        { date: new Date('2023-01-02'), rooms: { 'room1': 110, 'room2': 220, 'room3': 330 } }
      ];

      const result = service.calculateIncrementalData(records);

      expect(result.length).toBe(1);
      expect((result[0] as any).rooms).toEqual({
        room1: 10,
        room2: 20,
        room3: 30
      });
    });

    it('should handle meter reset in DynamicHeatingRecord (value drops)', () => {
      const records: DynamicHeatingRecord[] = [
        { date: new Date('2023-12-31'), rooms: { 'room1': 1000, 'room2': 500 } },
        { date: new Date('2024-01-01'), rooms: { 'room1': 50, 'room2': 520 } } // room1 reset, room2 normal
      ];

      const result = service.calculateIncrementalData(records);

      expect(result.length).toBe(1);
      // room1: 50 < 1000, so use currVal (50) as consumption since reset
      // room2: 520 - 500 = 20 (normal delta)
      expect((result[0] as any).rooms).toEqual({
        room1: 50,
        room2: 20
      });
    });

    it('should handle negative differences (meter reset/error) by clamping to 0', () => {
      const records: ConsumptionRecord[] = [
        { date: new Date('2023-01-01'), kitchenWarm: 100, kitchenCold: 200, bathroomWarm: 300, bathroomCold: 400 },
        { date: new Date('2023-01-02'), kitchenWarm: 90, kitchenCold: 220, bathroomWarm: 330, bathroomCold: 440 }
      ];

      const result = service.calculateIncrementalData(records);

      expect(result[0].kitchenWarm).toBe(0); // 90 - 100 = -10 -> 0
      expect(result[0].kitchenCold).toBe(20);
    });
  });

  describe('calculateLinearRegression', () => {
    it('should return slope 0 and intercept as first point for < 2 points', () => {
      expect(service.calculateLinearRegression([])).toEqual({ slope: 0, intercept: 0 });
      expect(service.calculateLinearRegression([5])).toEqual({ slope: 0, intercept: 5 });
    });

    it('should calculate slope and intercept correctly', () => {
      // y = 2x + 1
      // x: 0, 1, 2
      // y: 1, 3, 5
      const data = [1, 3, 5];
      const result = service.calculateLinearRegression(data);
      expect(result.slope).toBeCloseTo(2);
      expect(result.intercept).toBeCloseTo(1);
    });

    it('should handle horizontal line', () => {
      const data = [5, 5, 5];
      const result = service.calculateLinearRegression(data);
      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(5);
    });
  });

  describe('generateTrendlineData', () => {
    it('should generate trendline points', () => {
      // y = x + 1 => 1, 2, 3
      const data = [1, 2, 3];
      const result = service.generateTrendlineData(data);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should generate trendline for noisy data', () => {
      const data = [1, 3, 2];
      const result = service.generateTrendlineData(data);
      // Math.round(1.5) is 2, Math.round(2) is 2, Math.round(2.5) is 3
      expect(result).toEqual([2, 2, 3]);
    });

    it('should clamp negative trendline values to 0', () => {
      // Steep downward trend that would go negative
      const data = [10, 5, 0];
      const result = service.generateTrendlineData(data);

      // All values should be >= 0
      result.forEach(val => {
        expect(val).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('generateComparisonData', () => {
    it('should return empty if processed data is empty', () => {
      expect(service.generateComparisonData([], 4, 'de')).toEqual([]);
    });

    it('should return empty if family size is 0', () => {
      const records: ConsumptionRecord[] = [
        { date: new Date('2023-01-01'), kitchenWarm: 0, kitchenCold: 0, bathroomWarm: 0, bathroomCold: 0 }
      ];
      expect(service.generateComparisonData(records, 0, 'de')).toEqual([]);
    });

    it('should calculate comparison data correctly', () => {
      waterAveragesServiceSpy.getCountryData.mockReturnValue({
        averageLitersPerPersonPerDay: 100,
        source: 'test',
        year: 2023
      });

      const records: ConsumptionRecord[] = [
        { date: new Date('2023-01-01'), kitchenWarm: 0, kitchenCold: 0, bathroomWarm: 0, bathroomCold: 0 },
        { date: new Date('2023-01-02'), kitchenWarm: 0, kitchenCold: 0, bathroomWarm: 0, bathroomCold: 0 }
      ];

      const result = service.generateComparisonData(records, 2, 'de');

      expect(waterAveragesServiceSpy.getCountryData).toHaveBeenCalledWith('de');
      expect(result.length).toBe(2);
      expect(result[0]).toEqual({
        date: new Date('2023-01-01'),
        kitchenWarm: 12,
        kitchenCold: 18,
        bathroomWarm: 68,
        bathroomCold: 102
      });
    });

    it('should use default 7 days period for single record', () => {
      waterAveragesServiceSpy.getCountryData.mockReturnValue({
        averageLitersPerPersonPerDay: 10,
        source: 'test',
        year: 2023
      });

      const records: ConsumptionRecord[] = [
        { date: new Date('2023-01-01'), kitchenWarm: 0, kitchenCold: 0, bathroomWarm: 0, bathroomCold: 0 }
      ];

      const result = service.generateComparisonData(records, 1, 'de');
      expect(result[0].kitchenWarm).toBe(4);
      expect(result[0].kitchenCold).toBe(6);
      expect(result[0].bathroomWarm).toBe(24);
      expect(result[0].bathroomCold).toBe(36);
    });
  });

  describe('detectMeterChanges', () => {
    it('should return empty for < 2 records', () => {
      expect(service.detectMeterChanges([])).toEqual([]);
    });

    it('should detect meter drops', () => {
      const records: ConsumptionRecord[] = [
        { date: new Date('2023-01-01'), kitchenWarm: 100, kitchenCold: 100, bathroomWarm: 100, bathroomCold: 100 },
        { date: new Date('2023-01-02'), kitchenWarm: 101, kitchenCold: 50, bathroomWarm: 101, bathroomCold: 101 } // Drop in KC
      ];

      const result = service.detectMeterChanges(records);
      expect(result).toEqual([new Date('2023-01-02').toISOString().split('T')[0]]);
    });

    it('should handle multiple drops', () => {
      const records: ConsumptionRecord[] = [
        { date: new Date('2023-01-01'), kitchenWarm: 100, kitchenCold: 100, bathroomWarm: 100, bathroomCold: 100 },
        { date: new Date('2023-01-02'), kitchenWarm: 50, kitchenCold: 101, bathroomWarm: 101, bathroomCold: 101 }, // KW drop
        { date: new Date('2023-01-03'), kitchenWarm: 55, kitchenCold: 102, bathroomWarm: 102, bathroomCold: 102 },
        { date: new Date('2023-01-04'), kitchenWarm: 60, kitchenCold: 103, bathroomWarm: 50, bathroomCold: 103 } // BW drop
      ];

      const result = service.detectMeterChanges(records);
      expect(result).toEqual([
        new Date('2023-01-02').toISOString().split('T')[0],
        new Date('2023-01-04').toISOString().split('T')[0]
      ]);
    });
  });

  describe('adjustForMeterChanges', () => {
    it('should return original records if no confirmed changes', () => {
      const records: ConsumptionRecord[] = [
        { date: new Date('2023-01-01'), kitchenWarm: 100, kitchenCold: 100, bathroomWarm: 100, bathroomCold: 100 },
        { date: new Date('2023-01-02'), kitchenWarm: 105, kitchenCold: 105, bathroomWarm: 105, bathroomCold: 105 }
      ];
      const result = service.adjustForMeterChanges(records, []);
      expect(result).toEqual(records);
      expect(result[0]).toEqual(records[0]);
      expect(result[1]).toEqual(records[1]);
    });

    it('should adjust for confirmed meter change', () => {
      const records: ConsumptionRecord[] = [
        { date: new Date('2023-01-01'), kitchenWarm: 100, kitchenCold: 100, bathroomWarm: 100, bathroomCold: 100 },
        { date: new Date('2023-01-02'), kitchenWarm: 5, kitchenCold: 105, bathroomWarm: 105, bathroomCold: 105 } // KW Drop
      ];
      const changeDate = new Date('2023-01-02').toISOString().split('T')[0];

      const result = service.adjustForMeterChanges(records, [changeDate]);

      // Offset for KW should be prev value (100)
      // 2nd record KW should be 5 + 100 = 105
      expect(result[1].kitchenWarm).toBe(105);
      expect(result[1].kitchenCold).toBe(105);
    });

    it('should maintain offset for subsequent records', () => {
      const records: ConsumptionRecord[] = [
        { date: new Date('2023-01-01'), kitchenWarm: 100, kitchenCold: 100, bathroomWarm: 100, bathroomCold: 100 },
        { date: new Date('2023-01-02'), kitchenWarm: 5, kitchenCold: 105, bathroomWarm: 105, bathroomCold: 105 }, // KW Drop, offset 100
        { date: new Date('2023-01-03'), kitchenWarm: 10, kitchenCold: 110, bathroomWarm: 110, bathroomCold: 110 }
      ];
      const changeDate = new Date('2023-01-02').toISOString().split('T')[0];

      const result = service.adjustForMeterChanges(records, [changeDate]);

      expect(result[1].kitchenWarm).toBe(105);
      expect(result[2].kitchenWarm).toBe(110); // 10 + 100
    });
  });

  describe('detectNewRoomSpikes', () => {
    it('should return empty for < 2 records', () => {
      expect(service.detectNewRoomSpikes([])).toEqual([]);
      expect(service.detectNewRoomSpikes([{ date: new Date(), rooms: { room1: 100 } }])).toEqual([]);
    });

    it('should detect spike when room jumps from 0 to high value', () => {
      const records: DynamicHeatingRecord[] = [
        { date: new Date('2023-01-01'), rooms: { 'room1': 100, 'room2': 0 } },
        { date: new Date('2023-01-02'), rooms: { 'room1': 110, 'room2': 500 } } // room2 spike (0 -> 500)
      ];

      const result = service.detectNewRoomSpikes(records);

      expect(result.length).toBe(1);
      expect(result[0].roomId).toBe('room2');
      expect(result[0].value).toBe(500);
    });

    it('should not detect spike for small values', () => {
      const records: DynamicHeatingRecord[] = [
        { date: new Date('2023-01-01'), rooms: { 'room1': 100, 'room2': 0 } },
        { date: new Date('2023-01-02'), rooms: { 'room1': 110, 'room2': 20 } } // room2: 0 -> 20 (too small)
      ];

      const result = service.detectNewRoomSpikes(records);
      expect(result.length).toBe(0);
    });

    it('should detect multiple spikes on different dates', () => {
      const records: DynamicHeatingRecord[] = [
        { date: new Date('2023-01-01'), rooms: { room1: 100, room2: 0, room3: 0 } },
        { date: new Date('2023-01-02'), rooms: { room1: 110, room2: 600, room3: 0 } }, // room2 spike
        { date: new Date('2023-01-03'), rooms: { room1: 120, room2: 610, room3: 800 } } // room3 spike
      ];

      const result = service.detectNewRoomSpikes(records);

      expect(result.length).toBe(2);
      expect(result.map(s => s.roomId)).toContain('room2');
      expect(result.map(s => s.roomId)).toContain('room3');
    });
  });

  describe('adjustForNewRooms', () => {
    it('should return original records if no spikes to ignore', () => {
      const records: DynamicHeatingRecord[] = [
        { date: new Date('2023-01-01'), rooms: { room1: 100 } },
        { date: new Date('2023-01-02'), rooms: { room1: 110 } }
      ];

      const result = service.adjustForNewRooms(records, []);
      expect(result).toEqual(records);
    });

    it('should adjust for confirmed spike by subtracting offset', () => {
      const records: DynamicHeatingRecord[] = [
        { date: new Date('2023-01-01'), rooms: { room1: 100, room2: 0 } },
        { date: new Date('2023-01-02'), rooms: { room1: 110, room2: 500 } }, // room2 spike
        { date: new Date('2023-01-03'), rooms: { room1: 120, room2: 550 } }
      ];
      const spikeDate = new Date('2023-01-02').toISOString().split('T')[0];

      const result = service.adjustForNewRooms(records, [{ date: spikeDate, roomId: 'room2' }]);

      // room2 should be offset by 500 (spike value)
      expect(result[0].rooms['room2']).toBe(0); // No change for first record
      expect(result[1].rooms['room2']).toBe(0); // 500 - 500 = 0
      expect(result[2].rooms['room2']).toBe(50); // 550 - 500 = 50
      // room1 should be unchanged
      expect(result[1].rooms['room1']).toBe(110);
    });

    it('should handle multiple room spikes', () => {
      const records: DynamicHeatingRecord[] = [
        { date: new Date('2023-01-01'), rooms: { room1: 100, room2: 0, room3: 0 } },
        { date: new Date('2023-01-02'), rooms: { room1: 110, room2: 400, room3: 0 } },
        { date: new Date('2023-01-03'), rooms: { room1: 120, room2: 450, room3: 300 } }
      ];
      const spikes = [
        { date: new Date('2023-01-02').toISOString().split('T')[0], roomId: 'room2' },
        { date: new Date('2023-01-03').toISOString().split('T')[0], roomId: 'room3' }
      ];

      const result = service.adjustForNewRooms(records, spikes);

      expect(result[1].rooms['room2']).toBe(0); // 400 - 400 = 0
      expect(result[2].rooms['room2']).toBe(50); // 450 - 400 = 50
      expect(result[2].rooms['room3']).toBe(0); // 300 - 300 = 0
    });
  });
});

