import { TestBed } from '@angular/core/testing';
import { ChartCalculationService } from './chart-calculation.service';
import { WaterAveragesService } from './water-averages.service';
import { ElectricityAveragesService } from './electricity-averages.service';
import { ConsumptionRecord, DynamicHeatingRecord, ElectricityRecord } from '../models/records.model';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('ChartCalculationService', () => {
  let service: ChartCalculationService;
  let waterAveragesServiceSpy: { getCountryData: any };
  let electricityAveragesServiceSpy: { getCountryData: any };

  beforeEach(() => {
    const waterSpy = { getCountryData: vi.fn() };
    const electricitySpy = { getCountryData: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        ChartCalculationService,
        { provide: WaterAveragesService, useValue: waterSpy },
        { provide: ElectricityAveragesService, useValue: electricitySpy }
      ]
    });
    service = TestBed.inject(ChartCalculationService);
    waterAveragesServiceSpy = TestBed.inject(WaterAveragesService) as any;
    electricityAveragesServiceSpy = TestBed.inject(ElectricityAveragesService) as any;
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

    it('should return daily average values for single record', () => {
      waterAveragesServiceSpy.getCountryData.mockReturnValue({
        averageLitersPerPersonPerDay: 10,
        source: 'test',
        year: 2023
      });

      const records: ConsumptionRecord[] = [
        { date: new Date('2023-01-01'), kitchenWarm: 0, kitchenCold: 0, bathroomWarm: 0, bathroomCold: 0 }
      ];

      const result = service.generateComparisonData(records, 1, 'de');
      // Daily values: 10 * 0.15 = 1.5 kitchen, 10 * 0.85 = 8.5 bathroom
      // Kitchen: warm=0.6≈1, cold=0.9≈1
      // Bathroom: warm=3.4≈3, cold=5.1≈5
      expect(result[0].kitchenWarm).toBe(1);
      expect(result[0].kitchenCold).toBe(1);
      expect(result[0].bathroomWarm).toBe(3);
      expect(result[0].bathroomCold).toBe(5);
    });
  });

  describe('generateElectricityComparisonData', () => {
    it('should return empty array if processed data is empty', () => {
      expect(service.generateElectricityComparisonData([], 4, 'DE')).toEqual([]);
    });

    it('should return empty array if family size is 0', () => {
      const records: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 100 }
      ];
      expect(service.generateElectricityComparisonData(records, 0, 'DE')).toEqual([]);
    });

    it('should calculate daily average comparison correctly', () => {
      electricityAveragesServiceSpy.getCountryData.mockReturnValue({
        averageKwhPerPersonPerYear: 3652.5, // ~10 kWh/day per person
        source: 'test',
        year: 2023
      });

      const records: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 100 },
        { date: new Date('2023-01-08'), value: 150 }
      ];

      const result = service.generateElectricityComparisonData(records, 2, 'DE');

      expect(electricityAveragesServiceSpy.getCountryData).toHaveBeenCalledWith('DE');
      // 3652.5 / 365.25 * 2 = 20 kWh/day for family of 2
      // Result should have 3 records (2 + 1 padded)
      expect(result.length).toBe(3);
      expect(result[0].value).toBe(20);
      expect(result[1].value).toBe(20);
      expect(result[2].value).toBe(20);
    });

    it('should pad with extra point at start', () => {
      electricityAveragesServiceSpy.getCountryData.mockReturnValue({
        averageKwhPerPersonPerYear: 365.25,
        source: 'test',
        year: 2023
      });

      const records: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 100 }
      ];

      const result = service.generateElectricityComparisonData(records, 1, 'DE');

      // 1 record + 1 padded = 2
      expect(result.length).toBe(2);
      expect(result[0].value).toBe(1); // 365.25 / 365.25 * 1 = 1
    });

    it('should preserve dates from original records', () => {
      electricityAveragesServiceSpy.getCountryData.mockReturnValue({
        averageKwhPerPersonPerYear: 365.25,
        source: 'test',
        year: 2023
      });

      const records: ElectricityRecord[] = [
        { date: new Date('2023-01-01'), value: 100 },
        { date: new Date('2023-01-08'), value: 150 }
      ];

      const result = service.generateElectricityComparisonData(records, 1, 'DE');

      // Dates should match original records (with padding)
      expect(result[1].date).toEqual(new Date('2023-01-01'));
      expect(result[2].date).toEqual(new Date('2023-01-08'));
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
  });

  const createHeatingRecord = (dateString: string, rooms: { [key: string]: number }): DynamicHeatingRecord => {
    return { date: new Date(dateString), rooms };
  };

  it('should adjust values based on confirmed spikes', () => {
    const records = [
      createHeatingRecord('2023-01-01', { room1: 0 }),
      createHeatingRecord('2023-01-08', { room1: 100 }), // Spike here
      createHeatingRecord('2023-01-15', { room1: 150 }),
    ];
    const spikes = [{ date: '2023-01-08', roomId: 'room1' }];

    const result = service.adjustForNewRooms(records, spikes);

    expect(result[0].rooms['room1']).toBe(0);
    expect(result[1].rooms['room1']).toBe(0); // 100 - 100
    expect(result[2].rooms['room1']).toBe(50); // 150 - 100
  });

  it('should handle meter reset (value < offset) by resetting the offset', () => {
    // Scenario: Spike in 2025, followed by reset in 2026
    const records = [
      // 2025 - Spike confirmed
      createHeatingRecord('2025-11-01', { room1: 0 }),
      createHeatingRecord('2025-11-16', { room1: 1000 }), // Spike! Offset becomes 1000
      createHeatingRecord('2025-12-31', { room1: 1200 }), // Adjusted: 200

      // 2026 - Meter Reset (New Year)
      createHeatingRecord('2026-01-01', { room1: 0 }), // Value 0 < Offset 1000 -> Should reset offset
      createHeatingRecord('2026-01-08', { room1: 44 }), // Value 44. If offset cleared, result 44. If not, 0.
    ];
    const spikes = [{ date: '2025-11-16', roomId: 'room1' }];

    const result = service.adjustForNewRooms(records, spikes);

    // 2025 checks
    expect(result[1].rooms['room1']).toBe(0); // 1000 - 1000
    expect(result[2].rooms['room1']).toBe(200); // 1200 - 1000

    // 2026 checks - CURRENTLY FAILING (returns 0)
    expect(result[3].rooms['room1']).toBe(0); // 0 (reset)
    expect(result[4].rooms['room1']).toBe(44); // 44 (actual usage)
  });

  it('should correctly handle Dec 7 reset scenario (1200 -> 271)', () => {
    const records = [
      createHeatingRecord('2025-11-30', { room_3: 1200 }),
      createHeatingRecord('2025-12-07', { room_3: 271 })
    ];
    // Spike on unrelated date
    const spikes = [{ date: '2025-11-16', roomId: 'room_3' }];

    const result = service.calculateIncrementalData(records, spikes);

    // Dec 7 delta: 271 < 1200 -> 271
    expect((result[0] as any).rooms['room_3']).toBe(271);
  });

  it('should zero out delta if record matches an ignored spike', () => {
    const records = [
      createHeatingRecord('2025-11-09', { room_3: 0 }),
      createHeatingRecord('2025-11-16', { room_3: 1000 })
    ];
    const spikes = [{ date: '2025-11-16', roomId: 'room_3' }];

    const result = service.calculateIncrementalData(records, spikes);

    // Nov 16 delta: 1000. But isSpike=true -> 0.
    expect((result[0] as any).rooms['room_3']).toBe(0);
  });

  describe('calculateDailyAverage (unified)', () => {
    it('should return empty array for empty input regardless of type', () => {
      expect(service.calculateDailyAverage([], [], 'electricity')).toEqual([]);
      expect(service.calculateDailyAverage([], [], 'water')).toEqual([]);
      expect(service.calculateDailyAverage([], [], 'heating')).toEqual([]);
    });

    it('should normalize electricity data correctly', () => {
      const incrementalData: any[] = [
        { date: new Date('2023-01-31'), value: 300 }
      ];
      const originalData: any[] = [
        { date: new Date('2023-01-01'), value: 1000 },
        { date: new Date('2023-01-31'), value: 1300 }
      ];

      const result = service.calculateDailyAverage(incrementalData, originalData, 'electricity');

      expect(result.length).toBe(2);
      expect(result[1]['value']).toBe(10); // 300 / 30 = 10
      expect((result[1] as any).normalized.raw).toBe(300);
    });

    it('should normalize water data correctly', () => {
      const incrementalData: any[] = [
        { date: new Date('2023-01-11'), kitchenWarm: 100, kitchenCold: 200, bathroomWarm: 50, bathroomCold: 150 }
      ];
      const originalData = [
        { date: new Date('2023-01-01'), kitchenWarm: 0, kitchenCold: 0, bathroomWarm: 0, bathroomCold: 0 },
        { date: new Date('2023-01-11'), kitchenWarm: 100, kitchenCold: 200, bathroomWarm: 50, bathroomCold: 150 }
      ];

      const result = service.calculateDailyAverage(incrementalData, originalData, 'water');

      // 10 days interval
      expect(result[1].kitchenWarm).toBe(10); // 100 / 10
      expect(result[1].kitchenCold).toBe(20); // 200 / 10
      expect((result[1] as any).normalized.kitchenWarm).toBe(100);
    });

    it('should normalize heating data correctly', () => {
      const incrementalData: any[] = [
        { date: new Date('2023-01-08'), rooms: { room1: 70, room2: 140 } }
      ];
      const originalData: DynamicHeatingRecord[] = [
        { date: new Date('2023-01-01'), rooms: { room1: 0, room2: 0 } },
        { date: new Date('2023-01-08'), rooms: { room1: 70, room2: 140 } }
      ];

      const result = service.calculateDailyAverage(incrementalData, originalData, 'heating');

      // 7 days interval
      expect((result[1] as any).rooms.room1).toBe(10); // 70 / 7
      expect((result[1] as any).rooms.room2).toBe(20); // 140 / 7
      expect((result[1] as any).normalized.room1).toBe(70);
    });

    it('should pad first record with first original date for all types', () => {
      const electricityIncremental: any[] = [{ date: new Date('2023-01-08'), value: 70 }];
      const electricityOriginal: any[] = [
        { date: new Date('2023-01-01'), value: 1000 },
        { date: new Date('2023-01-08'), value: 1070 }
      ];

      const result = service.calculateDailyAverage(electricityIncremental, electricityOriginal, 'electricity');

      expect(result.length).toBe(2);
      expect(new Date(result[0].date).toISOString().split('T')[0]).toBe('2023-01-01');
    });

    it('should treat intervals < 0.5 days as 1 day', () => {
      const incrementalData: any[] = [
        { date: new Date('2023-01-01T12:00:00'), value: 24 }
      ];
      const originalData: any[] = [
        { date: new Date('2023-01-01T08:00:00'), value: 100 },
        { date: new Date('2023-01-01T12:00:00'), value: 124 }
      ];

      const result = service.calculateDailyAverage(incrementalData, originalData, 'electricity');

      // Short intervals (< 0.5 days) are clamped to 1 day minimum to prevent unrealistic daily averages
      expect(result[1]['value']).toBe(24); // 24 / 1 = 24
      expect((result[1] as any).normalized.days).toBe(1);
    });
  });
});
