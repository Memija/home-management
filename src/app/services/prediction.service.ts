import { Injectable, inject } from '@angular/core';
import { ChartCalculationService } from './chart-calculation.service';
import { PredictionCalculationService } from './prediction-calculation.service';
import {
  ConsumptionRecord,
  ElectricityRecord,
  DynamicHeatingRecord,
} from '../models/records.model';
import { MultiPredictionResult, MIN_RECORDS_FOR_PREDICTION } from '../models/prediction.models';

// Re-export models so existing consumers keep their import paths unchanged.
export type { PredictionResult, MultiPredictionResult } from '../models/prediction.models';

/**
 * Public API for consumption predictions.
 * Delegates all math to PredictionCalculationService and PredictionStatsService.
 */
@Injectable({
  providedIn: 'root',
})
export class PredictionService {
  private readonly calculationService = inject(ChartCalculationService);
  private readonly predictionCalculation = inject(PredictionCalculationService);
  private readonly waterCache = new WeakMap<
    ConsumptionRecord[],
    { length: number; result: MultiPredictionResult | null }
  >();
  private readonly electricityCache = new WeakMap<
    ElectricityRecord[],
    { length: number; result: MultiPredictionResult | null }
  >();
  private readonly heatingCache = new WeakMap<
    DynamicHeatingRecord[],
    { length: number; result: MultiPredictionResult | null }
  >();

  /**
   * Generate predictions for water consumption.
   * @param records - Historical water consumption records (sorted by date ascending)
   * @returns MultiPredictionResult or null if insufficient data
   */
  predictWater(records: ConsumptionRecord[]): MultiPredictionResult | null {
    if (records.length < MIN_RECORDS_FOR_PREDICTION) return null;

    const cached = this.waterCache.get(records);
    if (cached && cached.length === records.length) {
      return cached.result;
    }

    const validRecords = this.filterValidDates(records);
    if (validRecords.length < MIN_RECORDS_FOR_PREDICTION) {
      this.waterCache.set(records, { length: records.length, result: null });
      return null;
    }

    const incrementalData = this.calculationService.calculateIncrementalData(validRecords);

    // Total prediction
    const ratesWithMonths = this.predictionCalculation.calculateDailyRatesWithMonths(
      validRecords,
      incrementalData,
      'total',
    );
    const dailyRates = ratesWithMonths.map((r) => r.rate);
    if (dailyRates.length < 2) {
      this.waterCache.set(records, { length: records.length, result: null });
      return null;
    }

    const accuracyData = this.predictionCalculation.calculateHistoricalAccuracy(
      validRecords,
      incrementalData,
      'total',
    );
    const total = this.predictionCalculation.buildPrediction(
      dailyRates,
      ratesWithMonths,
      validRecords,
      'L',
      accuracyData,
    );

    // Category predictions
    const categories: MultiPredictionResult['categories'] = {};
    const keys = [
      'bathroomWarm',
      'kitchenWarm',
      'bathroomCold',
      'kitchenCold',
      'bathroomTotal',
      'kitchenTotal',
      'warmTotal',
      'coldTotal',
    ];

    for (const key of keys) {
      const catRatesWithMonths = this.predictionCalculation.calculateDailyRatesWithMonths(
        validRecords,
        incrementalData,
        key,
      );
      const catDailyRates = catRatesWithMonths.map((r) => r.rate);
      if (catDailyRates.length >= 2) {
        const catAccuracy = this.predictionCalculation.calculateHistoricalAccuracy(
          validRecords,
          incrementalData,
          key,
        );
        categories[key] = this.predictionCalculation.buildPrediction(
          catDailyRates,
          catRatesWithMonths,
          validRecords,
          'L',
          catAccuracy,
        );
      }
    }

    const result: MultiPredictionResult = { total, categories };
    this.waterCache.set(records, { length: records.length, result });
    return result;
  }

  /**
   * Generate predictions for electricity consumption.
   * @param records - Historical electricity consumption records (sorted by date ascending)
   * @returns MultiPredictionResult or null if insufficient data
   */
  predictElectricity(records: ElectricityRecord[]): MultiPredictionResult | null {
    if (records.length < MIN_RECORDS_FOR_PREDICTION) return null;

    const cached = this.electricityCache.get(records);
    if (cached && cached.length === records.length) {
      return cached.result;
    }

    const validRecords = this.filterValidDates(records);
    if (validRecords.length < MIN_RECORDS_FOR_PREDICTION) {
      this.electricityCache.set(records, { length: records.length, result: null });
      return null;
    }

    const incrementalData = this.calculationService.calculateIncrementalData(validRecords);
    const ratesWithMonths = this.predictionCalculation.calculateDailyRatesWithMonths(
      validRecords,
      incrementalData,
      'total',
    );
    const dailyRates = ratesWithMonths.map((r) => r.rate);

    if (dailyRates.length < 2) {
      this.electricityCache.set(records, { length: records.length, result: null });
      return null;
    }

    const accuracyData = this.predictionCalculation.calculateHistoricalAccuracy(
      validRecords,
      incrementalData,
      'total',
    );
    const total = this.predictionCalculation.buildPrediction(
      dailyRates,
      ratesWithMonths,
      validRecords,
      'kWh',
      accuracyData,
    );
    const result: MultiPredictionResult = { total };
    this.electricityCache.set(records, { length: records.length, result });
    return result;
  }

  /**
   * Generate predictions for heating consumption.
   * @param records - Historical heating consumption records (sorted by date ascending)
   * @returns MultiPredictionResult or null if insufficient data
   */
  predictHeating(records: DynamicHeatingRecord[]): MultiPredictionResult | null {
    if (records.length < MIN_RECORDS_FOR_PREDICTION) return null;

    const cached = this.heatingCache.get(records);
    if (cached && cached.length === records.length) {
      return cached.result;
    }

    const validRecords = this.filterValidDates(records);
    if (validRecords.length < MIN_RECORDS_FOR_PREDICTION) {
      this.heatingCache.set(records, { length: records.length, result: null });
      return null;
    }

    const incrementalData = this.calculationService.calculateIncrementalData(validRecords);

    // Total prediction
    const ratesWithMonths = this.predictionCalculation.calculateDailyRatesWithMonths(
      validRecords,
      incrementalData,
      'total',
    );
    const dailyRates = ratesWithMonths.map((r) => r.rate);
    if (dailyRates.length < 2) {
      this.heatingCache.set(records, { length: records.length, result: null });
      return null;
    }

    const accuracyData = this.predictionCalculation.calculateHistoricalAccuracy(
      validRecords,
      incrementalData,
      'total',
    );
    const total = this.predictionCalculation.buildPrediction(
      dailyRates,
      ratesWithMonths,
      validRecords,
      'kWh',
      accuracyData,
      true,
    );

    // Category predictions (rooms)
    const categories: MultiPredictionResult['categories'] = {};

    const roomIds = new Set<string>();
    for (const r of validRecords) {
      if (r.rooms) {
        for (const id in r.rooms) {
          if (Object.hasOwn(r.rooms, id)) {
            roomIds.add(id);
          }
        }
      }
    }

    for (const roomId of roomIds) {
      const catRatesWithMonths = this.predictionCalculation.calculateDailyRatesWithMonths(
        validRecords,
        incrementalData,
        roomId,
      );
      const catDailyRates = catRatesWithMonths.map((r) => r.rate);
      if (catDailyRates.length >= 2) {
        const catAccuracy = this.predictionCalculation.calculateHistoricalAccuracy(
          validRecords,
          incrementalData,
          roomId,
        );
        categories[roomId] = this.predictionCalculation.buildPrediction(
          catDailyRates,
          catRatesWithMonths,
          validRecords,
          'kWh',
          catAccuracy,
          true,
        );
      }
    }

    const result: MultiPredictionResult = { total, categories };
    this.heatingCache.set(records, { length: records.length, result });
    return result;
  }

  private filterValidDates<T extends { date?: string | Date }>(records: T[]): T[] {
    const isValid = (r: T): boolean =>
      Boolean(
        r?.date &&
        !Number.isNaN(r.date instanceof Date ? r.date.getTime() : new Date(r.date).getTime()),
      );
    return records.every(isValid) ? records : records.filter(isValid);
  }
}
