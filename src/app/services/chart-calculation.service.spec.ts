import { TestBed } from '@angular/core/testing';
import { ChartCalculationService } from './chart-calculation.service';
import { WaterAveragesService } from './water-averages.service';
import { ConsumptionRecord, HeatingRecord } from '../models/records.model';
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

    it('should calculate incremental data for HeatingRecord', () => {
      const records: HeatingRecord[] = [
        { date: new Date('2023-01-01'), livingRoom: 100, bedroom: 200, kitchen: 300, bathroom: 400 },
        { date: new Date('2023-01-02'), livingRoom: 110, bedroom: 220, kitchen: 330, bathroom: 440 }
      ];

      const result = service.calculateIncrementalData(records);

      expect(result.length).toBe(1);
      expect(result[0]).toEqual({
        date: new Date('2023-01-02'),
        livingRoom: 10,
        bedroom: 20,
        kitchen: 30,
        bathroom: 40
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
      // y ~ x
      // 0, 0 -> 0
      // 1, 2 -> 1.5?
      // 2, 2 -> 3?
      // Let's take simple 1, 3, 2.
      // x: 0, 1, 2; y: 1, 3, 2
      // sumX = 3, sumY = 6, sumXY = 0*1 + 1*3 + 2*2 = 7, sumX2 = 5
      // n = 3
      // denom = 3*5 - 3*3 = 15 - 9 = 6
      // slope = (3*7 - 3*6) / 6 = (21 - 18) / 6 = 3/6 = 0.5
      // intercept = (6 - 0.5*3) / 3 = 4.5 / 3 = 1.5
      // points:
      // 0: 1.5 -> round(1.5) = 2
      // 1: 0.5*1 + 1.5 = 2 -> round(2) = 2
      // 2: 0.5*2 + 1.5 = 2.5 -> round(2.5) = 3 (or 2 depending on rounding)

      const data = [1, 3, 2];
      const result = service.generateTrendlineData(data);
      // Math.round(1.5) is 2
      // Math.round(2) is 2
      // Math.round(2.5) is 3
      expect(result).toEqual([2, 2, 3]);
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

      // Period is 1 day.
      // Family size 2.
      // Daily avg = 100 * 2 = 200.
      // Kitchen = 30 (15%), Bathroom = 170 (85%)
      // KW = 30 * 0.4 = 12
      // KC = 30 * 0.6 = 18
      // BW = 170 * 0.4 = 68
      // BC = 170 * 0.6 = 102

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

        // Period 7 days.
        // Family size 1.
        // Total = 10 * 1 * 7 = 70.
        // K = 10.5, B = 59.5
        // KW = 10.5 * 0.4 = 4.2 -> 4
        // KC = 10.5 * 0.6 = 6.3 -> 6
        // BW = 59.5 * 0.4 = 23.8 -> 24
        // BC = 59.5 * 0.6 = 35.7 -> 36

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
          expect(result).toEqual(records); // Actually it returns a new array but contents same
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
});
