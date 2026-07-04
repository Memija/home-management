import { Injectable, inject } from '@angular/core';
import { ChartCalculationService } from './chart-calculation.service';
import { PredictionCalculationService } from './prediction-calculation.service';
import {
  ConsumptionRecord,
  ElectricityRecord,
  DynamicHeatingRecord,
} from '../models/records.model';
import {
  MultiPredictionResult,
  MIN_RECORDS_FOR_PREDICTION,
} from '../models/prediction.models';

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
  private calculationService = inject(ChartCalculationService);
  private predictionCalculation = inject(PredictionCalculationService);

  /**
   * Generate predictions for water consumption.
   * @param records - Historical water consumption records (sorted by date ascending)
   * @returns MultiPredictionResult or null if insufficient data
   */
  predictWater(records: ConsumptionRecord[]): MultiPredictionResult | null {
    if (records.length < MIN_RECORDS_FOR_PREDICTION) return null;

    const validRecords = records.filter(
      (r) => r && r.date && !isNaN(new Date(r.date).getTime()),
    );
    if (validRecords.length < MIN_RECORDS_FOR_PREDICTION) return null;

    const incrementalData = this.calculationService.calculateIncrementalData(validRecords);

    // Total prediction
    const ratesWithMonths = this.predictionCalculation.calculateDailyRatesWithMonths(
      validRecords, incrementalData, 'total',
    );
    const dailyRates = ratesWithMonths.map(r => r.rate);
    if (dailyRates.length < 2) return null;

    const accuracyData = this.predictionCalculation.calculateHistoricalAccuracy(
      validRecords, incrementalData, 'total',
    );
    const total = this.predictionCalculation.buildPrediction(
      dailyRates, ratesWithMonths, validRecords, 'L', accuracyData,
    );

    // Category predictions
    const categories: MultiPredictionResult['categories'] = {};
    const keys = [
      'bathroomWarm', 'kitchenWarm', 'bathroomCold', 'kitchenCold',
      'bathroomTotal', 'kitchenTotal', 'warmTotal', 'coldTotal',
    ];

    for (const key of keys) {
      const catRatesWithMonths = this.predictionCalculation.calculateDailyRatesWithMonths(
        validRecords, incrementalData, key,
      );
      const catDailyRates = catRatesWithMonths.map(r => r.rate);
      if (catDailyRates.length >= 2) {
        const catAccuracy = this.predictionCalculation.calculateHistoricalAccuracy(
          validRecords, incrementalData, key,
        );
        categories[key] = this.predictionCalculation.buildPrediction(
          catDailyRates, catRatesWithMonths, validRecords, 'L', catAccuracy,
        );
      }
    }

    return { total, categories };
  }

  /**
   * Generate predictions for electricity consumption.
   * @param records - Historical electricity consumption records (sorted by date ascending)
   * @returns MultiPredictionResult or null if insufficient data
   */
  predictElectricity(records: ElectricityRecord[]): MultiPredictionResult | null {
    if (records.length < MIN_RECORDS_FOR_PREDICTION) return null;

    const validRecords = records.filter(
      (r) => r && r.date && !isNaN(new Date(r.date).getTime()),
    );
    if (validRecords.length < MIN_RECORDS_FOR_PREDICTION) return null;

    const incrementalData = this.calculationService.calculateIncrementalData(validRecords);
    const ratesWithMonths = this.predictionCalculation.calculateDailyRatesWithMonths(
      validRecords, incrementalData, 'total',
    );
    const dailyRates = ratesWithMonths.map(r => r.rate);

    if (dailyRates.length < 2) return null;

    const accuracyData = this.predictionCalculation.calculateHistoricalAccuracy(
      validRecords, incrementalData, 'total',
    );
    const total = this.predictionCalculation.buildPrediction(
      dailyRates, ratesWithMonths, validRecords, 'kWh', accuracyData,
    );
    return { total };
  }

  /**
   * Generate predictions for heating consumption.
   * @param records - Historical heating consumption records (sorted by date ascending)
   * @returns MultiPredictionResult or null if insufficient data
   */
  predictHeating(records: DynamicHeatingRecord[]): MultiPredictionResult | null {
    if (records.length < MIN_RECORDS_FOR_PREDICTION) return null;

    const validRecords = records.filter(
      (r) => r && r.date && !isNaN(new Date(r.date).getTime()),
    );
    if (validRecords.length < MIN_RECORDS_FOR_PREDICTION) return null;

    const incrementalData = this.calculationService.calculateIncrementalData(validRecords);

    // Total prediction
    const ratesWithMonths = this.predictionCalculation.calculateDailyRatesWithMonths(
      validRecords, incrementalData, 'total',
    );
    const dailyRates = ratesWithMonths.map(r => r.rate);
    if (dailyRates.length < 2) return null;

    const accuracyData = this.predictionCalculation.calculateHistoricalAccuracy(
      validRecords, incrementalData, 'total',
    );
    const total = this.predictionCalculation.buildPrediction(
      dailyRates, ratesWithMonths, validRecords, 'kWh', accuracyData,
    );

    // Category predictions (rooms)
    const categories: MultiPredictionResult['categories'] = {};

    const roomIds = new Set<string>();
    validRecords.forEach(r => {
      if (r.rooms) {
        Object.keys(r.rooms).forEach(id => roomIds.add(id));
      }
    });

    for (const roomId of roomIds) {
      const catRatesWithMonths = this.predictionCalculation.calculateDailyRatesWithMonths(
        validRecords, incrementalData, roomId,
      );
      const catDailyRates = catRatesWithMonths.map(r => r.rate);
      if (catDailyRates.length >= 2) {
        const catAccuracy = this.predictionCalculation.calculateHistoricalAccuracy(
          validRecords, incrementalData, roomId,
        );
        categories[roomId] = this.predictionCalculation.buildPrediction(
          catDailyRates, catRatesWithMonths, validRecords, 'kWh', catAccuracy,
        );
      }
    }

    return { total, categories };
  }
}
