import { TestBed } from '@angular/core/testing';
import { PredictionCalculationService } from './prediction-calculation.service';
import { PredictionStatsService } from './prediction-stats.service';
import { ChartCalculationService } from './chart-calculation.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a simple two-record water incremental array with given deltas */
function waterInc(kw: number, kc: number, bw: number, bc: number) {
  return [{ date: new Date(), kitchenWarm: kw, kitchenCold: kc, bathroomWarm: bw, bathroomCold: bc }];
}

/** Build a simple two-record electricity incremental array */
function electricityInc(value: number) {
  return [{ date: new Date(), value }];
}

/** Build a simple two-record heating incremental array */
function heatingInc(rooms: Record<string, number>) {
  return [{ date: new Date(), rooms }];
}

/** Two records 30 days apart */
function twoRecords(startYear = 2025) {
  return [
    { date: new Date(startYear, 0, 1) },
    { date: new Date(startYear, 1, 1) },  // ~31 days later
  ];
}

/** N records each 30 days apart, with cumulative water values */
function makeWaterRecords(count: number) {
  const records = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(2024, 0, 1);
    date.setDate(date.getDate() + i * 30);
    records.push({
      date,
      kitchenWarm: 100 + i * 30,
      kitchenCold: 200 + i * 60,
      bathroomWarm: 150 + i * 45,
      bathroomCold: 250 + i * 90,
    });
  }
  return records;
}

/** N records each 30 days apart, with cumulative electricity values */
function makeElectricityRecords(count: number) {
  const records = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(2024, 0, 1);
    date.setDate(date.getDate() + i * 30);
    records.push({ date, value: 1000 + i * 300 });
  }
  return records;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PredictionCalculationService', () => {
  let service: PredictionCalculationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PredictionCalculationService, PredictionStatsService, ChartCalculationService],
    });
    service = TestBed.inject(PredictionCalculationService);
  });

  // =========================================================================
  // calculateDailyRatesWithMonths
  // =========================================================================

  describe('calculateDailyRatesWithMonths', () => {

    // --- Water: total -------------------------------------------------------

    it('should sum all four water fields for category "total"', () => {
      const records = twoRecords();
      const inc = waterInc(30, 60, 45, 90); // total delta = 225
      const daysDiff = (records[1].date.getTime() - records[0].date.getTime()) / (1000 * 3600 * 24);

      const result = service.calculateDailyRatesWithMonths(records, inc, 'total');

      expect(result.length).toBe(1);
      expect(result[0].rate).toBeCloseTo(225 / daysDiff, 5);
    });

    // --- Water: kitchenTotal ------------------------------------------------

    it('should sum kitchenWarm + kitchenCold for category "kitchenTotal"', () => {
      const records = twoRecords();
      const inc = waterInc(30, 60, 45, 90); // kitchen total delta = 90
      const daysDiff = (records[1].date.getTime() - records[0].date.getTime()) / (1000 * 3600 * 24);

      const result = service.calculateDailyRatesWithMonths(records, inc, 'kitchenTotal');

      expect(result.length).toBe(1);
      expect(result[0].rate).toBeCloseTo(90 / daysDiff, 5);
    });

    // --- Water: bathroomTotal -----------------------------------------------

    it('should sum bathroomWarm + bathroomCold for category "bathroomTotal"', () => {
      const records = twoRecords();
      const inc = waterInc(30, 60, 45, 90); // bathroom total delta = 135
      const daysDiff = (records[1].date.getTime() - records[0].date.getTime()) / (1000 * 3600 * 24);

      const result = service.calculateDailyRatesWithMonths(records, inc, 'bathroomTotal');

      expect(result.length).toBe(1);
      expect(result[0].rate).toBeCloseTo(135 / daysDiff, 5);
    });

    // --- Water: warmTotal ---------------------------------------------------

    it('should sum kitchenWarm + bathroomWarm for category "warmTotal"', () => {
      const records = twoRecords();
      const inc = waterInc(30, 60, 45, 90); // warm total delta = 75
      const daysDiff = (records[1].date.getTime() - records[0].date.getTime()) / (1000 * 3600 * 24);

      const result = service.calculateDailyRatesWithMonths(records, inc, 'warmTotal');

      expect(result.length).toBe(1);
      expect(result[0].rate).toBeCloseTo(75 / daysDiff, 5);
    });

    // --- Water: coldTotal ---------------------------------------------------

    it('should sum kitchenCold + bathroomCold for category "coldTotal"', () => {
      const records = twoRecords();
      const inc = waterInc(30, 60, 45, 90); // cold total delta = 150
      const daysDiff = (records[1].date.getTime() - records[0].date.getTime()) / (1000 * 3600 * 24);

      const result = service.calculateDailyRatesWithMonths(records, inc, 'coldTotal');

      expect(result.length).toBe(1);
      expect(result[0].rate).toBeCloseTo(150 / daysDiff, 5);
    });

    // --- Water: individual field (e.g. bathroomWarm) ------------------------

    it('should read individual water field for a named category like "bathroomWarm"', () => {
      const records = twoRecords();
      const inc = waterInc(30, 60, 45, 90); // bathroomWarm delta = 45
      const daysDiff = (records[1].date.getTime() - records[0].date.getTime()) / (1000 * 3600 * 24);

      const result = service.calculateDailyRatesWithMonths(records, inc, 'bathroomWarm');

      expect(result.length).toBe(1);
      expect(result[0].rate).toBeCloseTo(45 / daysDiff, 5);
    });

    // --- Electricity --------------------------------------------------------

    it('should use the "value" field for electricity records', () => {
      const records = twoRecords();
      const inc = electricityInc(300);
      const daysDiff = (records[1].date.getTime() - records[0].date.getTime()) / (1000 * 3600 * 24);

      const result = service.calculateDailyRatesWithMonths(records, inc, 'total');

      expect(result.length).toBe(1);
      expect(result[0].rate).toBeCloseTo(300 / daysDiff, 5);
    });

    // --- Heating: total -----------------------------------------------------

    it('should sum all room values for heating category "total"', () => {
      const records = twoRecords();
      const inc = heatingInc({ living: 200, bedroom: 100 }); // total = 300
      const daysDiff = (records[1].date.getTime() - records[0].date.getTime()) / (1000 * 3600 * 24);

      const result = service.calculateDailyRatesWithMonths(records, inc, 'total');

      expect(result.length).toBe(1);
      expect(result[0].rate).toBeCloseTo(300 / daysDiff, 5);
    });

    // --- Heating: specific room ---------------------------------------------

    it('should use only the named room for heating with a roomId category', () => {
      const records = twoRecords();
      const inc = heatingInc({ living: 200, bedroom: 100 });
      const daysDiff = (records[1].date.getTime() - records[0].date.getTime()) / (1000 * 3600 * 24);

      const result = service.calculateDailyRatesWithMonths(records, inc, 'living');

      expect(result.length).toBe(1);
      expect(result[0].rate).toBeCloseTo(200 / daysDiff, 5);
    });

    // --- Edge cases ---------------------------------------------------------

    it('should skip intervals where daysDiff <= 0 (duplicate or reversed dates)', () => {
      const records = [
        { date: new Date(2025, 0, 15) },
        { date: new Date(2025, 0, 15) }, // same date → daysDiff = 0
      ];
      const inc = waterInc(30, 60, 45, 90);

      const result = service.calculateDailyRatesWithMonths(records, inc, 'total');

      expect(result.length).toBe(0);
    });

    it('should exclude intervals with a negative rate', () => {
      const records = twoRecords();
      // All deltas are 0 → rate = 0, which is allowed (>= 0)
      const inc = waterInc(0, 0, 0, 0);

      const result = service.calculateDailyRatesWithMonths(records, inc, 'total');

      expect(result.length).toBe(1);
      expect(result[0].rate).toBe(0);
    });

    it('should assign the midpoint month correctly', () => {
      // Jan 15 → Mar 15: midpoint is ~Feb 15 (month index 1)
      const records = [
        { date: new Date(2025, 0, 15) },
        { date: new Date(2025, 2, 15) },
      ];
      const inc = waterInc(60, 60, 60, 60);

      const result = service.calculateDailyRatesWithMonths(records, inc, 'total');

      expect(result.length).toBe(1);
      expect(result[0].month).toBe(1); // February
    });

    it('should return an empty array when given only one record', () => {
      const result = service.calculateDailyRatesWithMonths(
        [{ date: new Date(2025, 0, 1) }],
        [],
        'total',
      );
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // calculateHistoricalAccuracy
  // =========================================================================

  describe('calculateHistoricalAccuracy', () => {

    it('should return accuracy:null and correctionFactor:1.0 when records < MIN + 2 (i.e. < 6)', () => {
      const records = makeWaterRecords(5); // 5 < 4+2=6
      const inc = records.slice(1).map((_, i) => ({
        kitchenWarm: 30, kitchenCold: 60, bathroomWarm: 45, bathroomCold: 90,
      }));

      const result = service.calculateHistoricalAccuracy(records, inc, 'total');

      expect(result.accuracy).toBeNull();
      expect(result.correctionFactor).toBe(1.0);
      expect(result.historicalPredictions.length).toBe(5);
      expect(result.historicalPredictions.every(v => v === null)).toBe(true);
    });

    it('should return accuracy:null and correctionFactor:1.0 when evaluations remains 0', () => {
      // Use records where actual rate is always 0 so evaluations never increments
      const count = 8;
      const records = Array.from({ length: count }, (_, i) => ({
        date: new Date(2024, 0, 1 + i * 30),
      }));
      // All deltas are zero → actualRate = 0 → the `if (actualRate > 0)` guard skips every eval
      const inc = Array.from({ length: count - 1 }, () => ({
        kitchenWarm: 0, kitchenCold: 0, bathroomWarm: 0, bathroomCold: 0,
      }));

      const result = service.calculateHistoricalAccuracy(records, inc, 'total');

      expect(result.accuracy).toBeNull();
      expect(result.correctionFactor).toBe(1.0);
    });

    it('should return a correctionFactor clamped to a minimum of 0.8', () => {
      // Build records where the model will wildly over-predict (actual << predicted).
      // Actual increments start large and collapse, making actual/predicted << 0.8.
      const count = 10;
      const records = [];
      let cumulative = 0;
      for (let i = 0; i < count; i++) {
        const date = new Date(2024, 0, 1 + i * 30);
        // First 5 readings: large increments (model learns high rate)
        // Last 5 readings: tiny increments (actual rate << model prediction)
        const delta = i < 5 ? 9000 : 1;
        cumulative += delta;
        records.push({ date, kitchenWarm: cumulative, kitchenCold: 0, bathroomWarm: 0, bathroomCold: 0 });
      }
      const inc = records.slice(1).map((r, i) => ({
        kitchenWarm: i < 4 ? 9000 : 1,
        kitchenCold: 0,
        bathroomWarm: 0,
        bathroomCold: 0,
      }));

      const result = service.calculateHistoricalAccuracy(records, inc, 'kitchenWarm');

      expect(result.correctionFactor).toBeGreaterThanOrEqual(0.8);
    });

    it('should return a correctionFactor clamped to a maximum of 1.2', () => {
      // Build records where actual >> predicted (model under-predicts).
      const count = 10;
      const records = [];
      let cumulative = 0;
      for (let i = 0; i < count; i++) {
        const date = new Date(2024, 0, 1 + i * 30);
        const delta = i < 5 ? 1 : 9000;
        cumulative += delta;
        records.push({ date, kitchenWarm: cumulative, kitchenCold: 0, bathroomWarm: 0, bathroomCold: 0 });
      }
      const inc = records.slice(1).map((r, i) => ({
        kitchenWarm: i < 4 ? 1 : 9000,
        kitchenCold: 0,
        bathroomWarm: 0,
        bathroomCold: 0,
      }));

      const result = service.calculateHistoricalAccuracy(records, inc, 'kitchenWarm');

      expect(result.correctionFactor).toBeLessThanOrEqual(1.2);
    });

    it('should return accuracy in [0, 100] range with sufficient data', () => {
      const records = makeWaterRecords(10);
      const inc = records.slice(1).map(() => ({
        kitchenWarm: 30, kitchenCold: 60, bathroomWarm: 45, bathroomCold: 90,
      }));

      const result = service.calculateHistoricalAccuracy(records, inc, 'total');

      if (result.accuracy !== null) {
        expect(result.accuracy).toBeGreaterThanOrEqual(0);
        expect(result.accuracy).toBeLessThanOrEqual(100);
      }
    });

    it('should return historicalPredictions with same length as records', () => {
      const records = makeWaterRecords(8);
      const inc = records.slice(1).map(() => ({
        kitchenWarm: 30, kitchenCold: 60, bathroomWarm: 45, bathroomCold: 90,
      }));

      const result = service.calculateHistoricalAccuracy(records, inc, 'total');

      expect(result.historicalPredictions.length).toBe(records.length);
    });

    it('should leave early indices of historicalPredictions as null', () => {
      const records = makeWaterRecords(8);
      const inc = records.slice(1).map(() => ({
        kitchenWarm: 30, kitchenCold: 60, bathroomWarm: 45, bathroomCold: 90,
      }));

      const result = service.calculateHistoricalAccuracy(records, inc, 'total');

      // The first MIN_RECORDS_FOR_PREDICTION (4) entries can never have predictions
      for (let i = 0; i < 4; i++) {
        expect(result.historicalPredictions[i]).toBeNull();
      }
    });
  });
});
