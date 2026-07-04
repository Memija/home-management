import { TestBed } from '@angular/core/testing';
import { PredictionService } from './prediction.service';
import { PredictionCalculationService } from './prediction-calculation.service';
import { PredictionStatsService } from './prediction-stats.service';
import { ChartCalculationService } from './chart-calculation.service';
import { ConsumptionRecord, ElectricityRecord, DynamicHeatingRecord } from '../models/records.model';

describe('PredictionService', () => {
  let service: PredictionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PredictionService, PredictionCalculationService, PredictionStatsService, ChartCalculationService],
    });
    service = TestBed.inject(PredictionService);
  });

  // --- Helper factories ---

  function makeWaterRecords(count: number, startDate = new Date(2025, 0, 1)): ConsumptionRecord[] {
    const records: ConsumptionRecord[] = [];
    for (let i = 0; i < count; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i * 30); // ~monthly readings
      records.push({
        date,
        kitchenWarm: 100 + i * 10,
        kitchenCold: 200 + i * 15,
        bathroomWarm: 150 + i * 12,
        bathroomCold: 250 + i * 18,
      });
    }
    return records;
  }

  function makeElectricityRecords(count: number, startDate = new Date(2025, 0, 1)): ElectricityRecord[] {
    const records: ElectricityRecord[] = [];
    for (let i = 0; i < count; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i * 30);
      records.push({
        date,
        value: 1000 + i * 200,
      });
    }
    return records;
  }

  function makeHeatingRecords(count: number, startDate = new Date(2025, 0, 1)): DynamicHeatingRecord[] {
    const records: DynamicHeatingRecord[] = [];
    for (let i = 0; i < count; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i * 30);
      records.push({
        date,
        rooms: {
          living: 500 + i * 50,
          bedroom: 300 + i * 30,
        },
      });
    }
    return records;
  }

  // --- Null returns for insufficient data ---

  describe('insufficient data', () => {
    it('should return null for water with 0 records', () => {
      expect(service.predictWater([])).toBeNull();
    });

    it('should return null for water with 3 records', () => {
      expect(service.predictWater(makeWaterRecords(3))).toBeNull();
    });

    it('should return null for electricity with 2 records', () => {
      expect(service.predictElectricity(makeElectricityRecords(2))).toBeNull();
    });

    it('should return null for heating with 1 record', () => {
      expect(service.predictHeating(makeHeatingRecords(1))).toBeNull();
    });

    it('should return null for records with invalid dates', () => {
      const records = [
        { date: new Date('invalid'), kitchenWarm: 10, kitchenCold: 20, bathroomWarm: 15, bathroomCold: 25 },
        { date: new Date('invalid'), kitchenWarm: 20, kitchenCold: 30, bathroomWarm: 25, bathroomCold: 35 },
        { date: new Date('invalid'), kitchenWarm: 30, kitchenCold: 40, bathroomWarm: 35, bathroomCold: 45 },
        { date: new Date('invalid'), kitchenWarm: 40, kitchenCold: 50, bathroomWarm: 45, bathroomCold: 55 },
      ];
      expect(service.predictWater(records)).toBeNull();
    });
  });

  // --- Water predictions ---

  describe('predictWater', () => {
    it('should return a prediction with 4 records', () => {
      const result = service.predictWater(makeWaterRecords(4));
      expect(result).not.toBeNull();
      expect(result!.total.unit).toBe('L');
    });

    it('should have positive prediction daily rates', () => {
      const result = service.predictWater(makeWaterRecords(6));
      expect(result).not.toBeNull();
      expect(result!.total.daily30).toBeGreaterThan(0);
      expect(result!.total.daily90).toBeGreaterThan(0);
      expect(result!.total.dailyHalfYear).toBeGreaterThan(0);
      expect(result!.total.dailyYear).toBeGreaterThan(0);
    });

    it('should have prediction ranges with Min <= Expected <= Max', () => {
      const result = service.predictWater(makeWaterRecords(6));
      expect(result).not.toBeNull();
      expect(result!.total.daily30Min).toBeLessThanOrEqual(result!.total.daily30);
      expect(result!.total.daily30Max).toBeGreaterThanOrEqual(result!.total.daily30);
      expect(result!.total.daily30Min).toBeGreaterThanOrEqual(0);

      expect(result!.total.daily90Min).toBeLessThanOrEqual(result!.total.daily90);
      expect(result!.total.daily90Max).toBeGreaterThanOrEqual(result!.total.daily90);
      expect(result!.total.daily90Min).toBeGreaterThanOrEqual(0);
    });

    it('should detect a rising trend for increasing data', () => {
      const increasingRecords: ConsumptionRecord[] = [];
      let kw = 100, kc = 200, bw = 150, bc = 250;
      for (let i = 0; i < 8; i++) {
        const date = new Date(2025, 0, 1);
        date.setDate(date.getDate() + i * 30);
        const delta = 10 + i * 8; // daily delta is increasing: 10, 18, 26, 34, 42, 50, 58, 66
        kw += delta;
        kc += delta;
        bw += delta;
        bc += delta;
        increasingRecords.push({
          date,
          kitchenWarm: kw,
          kitchenCold: kc,
          bathroomWarm: bw,
          bathroomCold: bc,
        });
      }
      const result = service.predictWater(increasingRecords);
      expect(result).not.toBeNull();
      expect(result!.total.trend).toBe('rising');
    });

    it('should detect a falling trend for decreasing data', () => {
      const records: ConsumptionRecord[] = [];
      for (let i = 0; i < 8; i++) {
        const date = new Date(2025, 0, 1);
        date.setDate(date.getDate() + i * 30);
        records.push({
          date,
          kitchenWarm: 1000 - i * 50, // cumulative but with decreasing increments...
          kitchenCold: 2000 - i * 80, // Actually make them cumulative with decreasing deltas
          bathroomWarm: 1500 - i * 60,
          bathroomCold: 2500 - i * 90,
        });
      }
      // For cumulative meters, we need the values to keep going up but with smaller deltas
      // Let's use a different approach: constant base + decreasing additive
      const decreasingRecords: ConsumptionRecord[] = [];
      let kw = 100, kc = 200, bw = 150, bc = 250;
      for (let i = 0; i < 8; i++) {
        const date = new Date(2025, 0, 1);
        date.setDate(date.getDate() + i * 30);
        const delta = Math.max(1, 50 - i * 8); // 50, 42, 34, 26, 18, 10, 2, 1
        kw += delta;
        kc += delta;
        bw += delta;
        bc += delta;
        decreasingRecords.push({ date, kitchenWarm: kw, kitchenCold: kc, bathroomWarm: bw, bathroomCold: bc });
      }
      const result = service.predictWater(decreasingRecords);
      expect(result).not.toBeNull();
      expect(result!.total.trend).toBe('falling');
    });

    it('should have non-negative daily average', () => {
      const result = service.predictWater(makeWaterRecords(6));
      expect(result).not.toBeNull();
      expect(result!.total.averageDaily).toBeGreaterThanOrEqual(0);
    });
  });

  // --- Electricity predictions ---

  describe('predictElectricity', () => {
    it('should return a prediction with 4 records', () => {
      const result = service.predictElectricity(makeElectricityRecords(4));
      expect(result).not.toBeNull();
      expect(result!.total.unit).toBe('kWh');
    });

    it('should have positive prediction values', () => {
      const result = service.predictElectricity(makeElectricityRecords(6));
      expect(result).not.toBeNull();
      expect(result!.total.daily30).toBeGreaterThan(0);
    });

    it('should calculate confidence level', () => {
      const result = service.predictElectricity(makeElectricityRecords(12));
      expect(result).not.toBeNull();
      expect(['high', 'medium', 'low']).toContain(result!.total.confidence);
    });
  });

  // --- Heating predictions ---

  describe('predictHeating', () => {
    it('should return a prediction with 4 records', () => {
      const result = service.predictHeating(makeHeatingRecords(4));
      expect(result).not.toBeNull();
      expect(result!.total.unit).toBe('kWh');
    });

    it('should have positive prediction values', () => {
      const result = service.predictHeating(makeHeatingRecords(6));
      expect(result).not.toBeNull();
      expect(result!.total.daily30).toBeGreaterThan(0);
    });

    it('should calculate trend percentage', () => {
      const result = service.predictHeating(makeHeatingRecords(8));
      expect(result).not.toBeNull();
      expect(result!.total.trendPercentage).toBeGreaterThanOrEqual(0);
    });
  });

  // --- Confidence scoring ---

  describe('confidence scoring', () => {
    it('should give higher confidence with more data points', () => {
      const few = service.predictWater(makeWaterRecords(4));
      const many = service.predictWater(makeWaterRecords(12));
      expect(few!.total).not.toBeNull();
      expect(many!.total).not.toBeNull();

      const confidenceOrder = { low: 0, medium: 1, high: 2 };
      expect(confidenceOrder[many!.total.confidence]).toBeGreaterThanOrEqual(
        confidenceOrder[few!.total.confidence],
      );
    });
  });

  // --- Trend detection ---

  describe('trend detection', () => {
    it('should detect stable trend for constant consumption', () => {
      // Create records with constant increments
      const records: ConsumptionRecord[] = [];
      let kw = 100, kc = 200, bw = 150, bc = 250;
      for (let i = 0; i < 8; i++) {
        const date = new Date(2025, 0, 1);
        date.setDate(date.getDate() + i * 30);
        kw += 20; kc += 20; bw += 20; bc += 20;
        records.push({ date, kitchenWarm: kw, kitchenCold: kc, bathroomWarm: bw, bathroomCold: bc });
      }
      const result = service.predictWater(records);
      expect(result).not.toBeNull();
      expect(result!.total.trend).toBe('stable');
    });

    it('should return trendPercentage as a non-negative number', () => {
      const result = service.predictWater(makeWaterRecords(6));
      expect(result).not.toBeNull();
      expect(result!.total.trendPercentage).toBeGreaterThanOrEqual(0);
    });
  });

  // --- Monthly seasonal rates ---

  describe('monthly seasonal rates', () => {
    it('should return monthlyRates with 12 entries', () => {
      const result = service.predictElectricity(makeElectricityRecords(6));
      expect(result).not.toBeNull();
      expect(result!.total.monthlyRates).toBeDefined();
      expect(result!.total.monthlyRates!.length).toBe(12);
    });

    it('should have expected/min/max for each month', () => {
      const result = service.predictElectricity(makeElectricityRecords(8));
      expect(result).not.toBeNull();
      for (const month of result!.total.monthlyRates!) {
        expect(month.expected).toBeGreaterThanOrEqual(0);
        expect(month.min).toBeLessThanOrEqual(month.expected);
        expect(month.max).toBeGreaterThanOrEqual(month.expected);
      }
    });

    it('should show seasonal variation with multi-year data', () => {
      // Create 2+ years of electricity data with clear seasonal pattern:
      // High consumption in winter (Dec-Feb), low in summer (Jun-Aug)
      const records: ElectricityRecord[] = [];
      let cumulative = 1000;
      const startDate = new Date(2023, 0, 1);

      for (let i = 0; i < 30; i++) {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + i);
        const month = date.getMonth();

        // Seasonal daily rate pattern
        const winterMonths = [11, 0, 1]; // Dec, Jan, Feb
        const summerMonths = [5, 6, 7]; // Jun, Jul, Aug

        let dailyRate: number;
        if (winterMonths.includes(month)) {
          dailyRate = 12; // High winter usage
        } else if (summerMonths.includes(month)) {
          dailyRate = 5; // Low summer usage
        } else {
          dailyRate = 8; // Moderate spring/autumn
        }

        cumulative += dailyRate * 30;
        records.push({ date, value: cumulative });
      }

      const result = service.predictElectricity(records);
      expect(result).not.toBeNull();
      expect(result!.total.monthlyRates.length).toBe(12);

      // Winter months (Jan=0) should have higher rates than summer (Jul=6)
      const janRate = result!.total.monthlyRates![0].expected;
      const julRate = result!.total.monthlyRates![6].expected;
      expect(janRate).toBeGreaterThan(julRate);
    });

    it('should return monthlyRates for water predictions', () => {
      const result = service.predictWater(makeWaterRecords(6));
      expect(result).not.toBeNull();
      expect(result!.total.monthlyRates).toBeDefined();
      expect(result!.total.monthlyRates.length).toBe(12);
    });

    it('should return monthlyRates for heating predictions', () => {
      const result = service.predictHeating(makeHeatingRecords(6));
      expect(result).not.toBeNull();
      expect(result!.total.monthlyRates).toBeDefined();
      expect(result!.total.monthlyRates.length).toBe(12);
    });
  });
});
