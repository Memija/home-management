import { Injectable, inject } from '@angular/core';
import { PredictionStatsService } from './prediction-stats.service';
import { PredictionResult, MIN_RECORDS_FOR_PREDICTION } from '../models/prediction.models';
import { calculateLinearRegression } from '../utils/chart-calculation.utils';

interface IntervalGeometry {
  readonly timestamps: number[];
  readonly daysDiffs: number[];
  readonly midpointMonths: number[];
  readonly totalDays: number;
}

/**
 * Core prediction math: daily-rate extraction, historical accuracy evaluation,
 * and building the full PredictionResult object.
 * Consumed exclusively by PredictionService.
 */
@Injectable({
  providedIn: 'root',
})
export class PredictionCalculationService {
  private readonly statsService = inject(PredictionStatsService);
  private readonly geometryCache = new WeakMap<{ date: Date | string }[], IntervalGeometry>();
  private readonly intervalRatesCache = new WeakMap<unknown[], Map<string, (number | null)[]>>();

  private getIntervalGeometry(records: { date: Date | string }[]): IntervalGeometry {
    const cached = this.geometryCache.get(records);
    if (cached && cached.timestamps.length === records.length) {
      return cached;
    }

    const len = records.length;
    const timestamps = new Array<number>(len);
    const daysDiffs = new Array<number>(len);
    const midpointMonths = new Array<number>(len);

    if (len > 0) {
      const first = records[0].date;
      let prevMs = first instanceof Date ? first.getTime() : new Date(first).getTime();
      timestamps[0] = prevMs;
      daysDiffs[0] = 0;
      midpointMonths[0] = 0;

      for (let i = 1; i < len; i++) {
        const curr = records[i].date;
        const currentMs = curr instanceof Date ? curr.getTime() : new Date(curr).getTime();
        timestamps[i] = currentMs;
        const daysDiff = (currentMs - prevMs) / (1000 * 3600 * 24);
        daysDiffs[i] = daysDiff;
        if (daysDiff > 0) {
          const midpointMs = prevMs + (currentMs - prevMs) / 2;
          midpointMonths[i] = new Date(midpointMs).getMonth();
          prevMs = currentMs;
        } else {
          midpointMonths[i] = 0;
          prevMs = currentMs;
        }
      }
    }

    const totalDays = len >= 2 ? (timestamps[len - 1] - timestamps[0]) / (1000 * 3600 * 24) : 0;
    const geometry: IntervalGeometry = { timestamps, daysDiffs, midpointMonths, totalDays };
    this.geometryCache.set(records, geometry);
    return geometry;
  }

  private getIntervalRates(
    records: { date: Date | string }[],
    incrementalData: unknown[],
    category: string,
  ): (number | null)[] {
    let byCategory = this.intervalRatesCache.get(incrementalData);
    if (byCategory) {
      const cached = byCategory.get(category);
      if (cached && cached.length === records.length) {
        return cached;
      }
    } else {
      byCategory = new Map<string, (number | null)[]>();
      this.intervalRatesCache.set(incrementalData, byCategory);
    }

    const { daysDiffs } = this.getIntervalGeometry(records);
    const intervalRates: (number | null)[] = new Array(records.length).fill(null);

    for (let i = 1; i < records.length; i++) {
      const daysDiff = daysDiffs[i];
      if (daysDiff <= 0) continue;

      const inc = incrementalData[i - 1] as Record<string, unknown> | undefined;
      const delta = this.calculateIntervalDelta(inc, category);
      const dailyRate = delta / daysDiff;

      // Only include non-negative rates
      if (dailyRate >= 0) {
        intervalRates[i] = dailyRate;
      }
    }

    byCategory.set(category, intervalRates);
    return intervalRates;
  }

  /**
   * Calculate daily consumption rates between consecutive readings using properly
   * computed incremental data.
   * Returns rates alongside the calendar month they represent (midpoint of the interval).
   * @param category The specific sub-category to calculate for, or 'total' for the sum.
   */
  calculateDailyRatesWithMonths(
    records: { date: Date | string }[],
    incrementalData: unknown[],
    category = 'total',
  ): { rate: number; month: number }[] {
    const results: { rate: number; month: number }[] = [];
    if (records.length < 2) return results;

    const { midpointMonths } = this.getIntervalGeometry(records);
    const intervalRates = this.getIntervalRates(records, incrementalData, category);

    for (let i = 1; i < records.length; i++) {
      const dailyRate = intervalRates[i];
      if (dailyRate !== null) {
        results.push({ rate: dailyRate, month: midpointMonths[i] });
      }
    }

    return results;
  }

  private calculateIntervalDelta(
    inc: Record<string, unknown> | undefined,
    category: string,
  ): number {
    if (!inc) return 0;
    if ('rooms' in inc) {
      return this.calculateHeatingDelta(inc['rooms'] as Record<string, number>, category);
    }
    if ('value' in inc) {
      return Number(inc['value']) || 0;
    }
    return this.calculateWaterDelta(inc, category);
  }

  private calculateHeatingDelta(rooms: Record<string, number>, category: string): number {
    if (category === 'total') {
      let sum = 0;
      for (const roomId in rooms) {
        if (Object.hasOwn(rooms, roomId)) {
          sum += rooms[roomId] || 0;
        }
      }
      return sum;
    }
    return rooms[category] || 0;
  }

  private calculateWaterDelta(inc: Record<string, unknown>, category: string): number {
    const kw = Number(inc['kitchenWarm']) || 0;
    const kc = Number(inc['kitchenCold']) || 0;
    const bw = Number(inc['bathroomWarm']) || 0;
    const bc = Number(inc['bathroomCold']) || 0;

    switch (category) {
      case 'total':
        return kw + kc + bw + bc;
      case 'kitchenTotal':
        return kw + kc;
      case 'bathroomTotal':
        return bw + bc;
      case 'warmTotal':
        return kw + bw;
      case 'coldTotal':
        return kc + bc;
      default:
        return Number(inc[category]) || 0;
    }
  }

  /**
   * Calculate historical accuracy by evaluating past 30-day predictions against actual data.
   * Returns accuracy percentage (0-100) and correction factor (e.g., 1.05).
   */
  calculateHistoricalAccuracy(
    records: { date: Date | string }[],
    incrementalData: unknown[],
    category: string,
  ): {
    accuracy: number | null;
    correctionFactor: number;
    historicalPredictions: (number | null)[];
  } {
    const historicalPredictions: (number | null)[] = new Array(records.length).fill(null);

    if (records.length < MIN_RECORDS_FOR_PREDICTION + 2) {
      return { accuracy: null, correctionFactor: 1.0, historicalPredictions };
    }

    let totalErrorPercentage = 0;
    let totalUnderOver = 0;
    let evaluations = 0;

    // Precompute timestamps and per-interval daily rates once in O(N)
    const { timestamps } = this.getIntervalGeometry(records);
    const intervalRates = this.getIntervalRates(records, incrementalData, category);

    // Seed running dailyRates and incremental linear-regression accumulators
    const dailyRates: number[] = [];
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    const appendRate = (rate: number): void => {
      const x = dailyRates.length;
      dailyRates.push(rate);
      sumX += x;
      sumY += rate;
      sumXY += x * rate;
      sumX2 += x * x;
    };

    for (let i = 1; i <= MIN_RECORDS_FOR_PREDICTION; i++) {
      const rate = intervalRates[i];
      if (rate !== null) {
        appendRate(rate);
      }
    }

    const firstDate = timestamps[0];

    for (let splitIdx = MIN_RECORDS_FOR_PREDICTION; splitIdx < records.length - 1; splitIdx++) {
      if (splitIdx > MIN_RECORDS_FOR_PREDICTION) {
        const addedRate = intervalRates[splitIdx];
        if (addedRate !== null) {
          appendRate(addedRate);
        }
      }

      const n = dailyRates.length;
      if (n < 2) continue;

      const denominator = n * sumX2 - sumX * sumX;
      const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
      const intercept = denominator === 0 ? sumY / n : (sumY - slope * sumX) / n;

      const lastDate = timestamps[splitIdx];
      const totalDays = (lastDate - firstDate) / (1000 * 3600 * 24);
      const pastRecordsCount = splitIdx + 1;
      const avgInterval = pastRecordsCount > 1 ? totalDays / (pastRecordsCount - 1) : 7;

      const regRate = Math.max(0, slope * n + intercept + (slope / (avgInterval || 7)) * 30);
      const expected30 = this.statsService.weightedMovingAverage(dailyRates, regRate);

      // Store the predicted daily rate for the next record (which is at splitIdx + 1)
      historicalPredictions[splitIdx + 1] = expected30;

      const actualNextRate = intervalRates[splitIdx + 1];

      if (actualNextRate !== null) {
        const evalResult = this.recordEvaluationError(expected30, actualNextRate);
        totalErrorPercentage += evalResult.errorPct;
        if (evalResult.evaluated) {
          totalUnderOver += evalResult.underOver;
          evaluations++;
        }
      }
    }

    if (evaluations === 0) {
      return { accuracy: null, correctionFactor: 1.0, historicalPredictions };
    }

    const avgError = totalErrorPercentage / evaluations;
    const accuracy = Math.round((1 - avgError) * 100);
    const rawCorrection = totalUnderOver / evaluations;
    const correctionFactor = Math.max(0.8, Math.min(1.2, rawCorrection));

    // Optional: We do not retroactively apply the final correction factor to the historical
    // predictions because those represent the raw prediction model at that point in time.

    return { accuracy, correctionFactor, historicalPredictions };
  }

  private recordEvaluationError(
    expected30: number,
    actualRate: number,
  ): { errorPct: number; underOver: number; evaluated: boolean } {
    if (actualRate <= 0) {
      return { errorPct: 0, underOver: 0, evaluated: false };
    }
    const diff = Math.abs(expected30 - actualRate);
    const errorPct = Math.min(diff / actualRate, 1.0);
    if (expected30 > 0) {
      return { errorPct, underOver: actualRate / expected30, evaluated: true };
    }
    return { errorPct, underOver: 0, evaluated: false };
  }

  /**
   * Build a PredictionResult from daily consumption rates.
   */
  buildPrediction(
    dailyRates: number[],
    ratesWithMonths: { rate: number; month: number }[],
    records: { date: Date | string }[],
    unit: string,
    accuracyData?: {
      accuracy: number | null;
      correctionFactor: number;
      historicalPredictions: (number | null)[];
    },
    isHeating = false,
  ): PredictionResult {
    // Use linear regression on daily rates to extrapolate trend
    const { slope, intercept } = calculateLinearRegression(dailyRates);

    // Calculate average interval in days
    const { totalDays } = this.getIntervalGeometry(records);
    const avgInterval = records.length > 1 ? totalDays / (records.length - 1) : 7;

    // Calculate standard deviation of historical daily rates
    const ratesMean = dailyRates.reduce((sum, r) => sum + r, 0) / dailyRates.length;
    const ratesVariance =
      dailyRates.reduce((sum, r) => sum + Math.pow(r - ratesMean, 2), 0) / dailyRates.length;
    const ratesSd = Math.sqrt(ratesVariance);

    const format = (v: number): number => Math.round(v);

    const getProjectedRange = (daysAhead: number) => {
      const maxTrendDays = Math.min(daysAhead, 365); // Cap trend at 1 year out
      const regRate = Math.max(
        0,
        slope * dailyRates.length + intercept + (slope / (avgInterval || 7)) * maxTrendDays,
      );
      let expected = this.statsService.weightedMovingAverage(dailyRates, regRate);

      // Apply correction factor if available
      const correction = accuracyData?.correctionFactor ?? 1.0;
      expected = expected * correction;

      const effectiveSd = Math.min(Math.max(ratesSd, ratesMean * 0.1), expected * 0.5);

      const timeFactor = Math.sqrt(maxTrendDays / 30);
      const rawMargin = effectiveSd * timeFactor;
      // Cap the margin to 30% of the expected value to prevent wild extremes over longer periods
      const margin = Math.min(rawMargin, expected * 0.3);

      const min = Math.max(0, expected - margin);
      const max = expected + margin;

      return {
        expected: format(expected),
        min: format(min),
        max: format(max),
      };
    };

    const range30 = getProjectedRange(30);
    const range90 = getProjectedRange(90);
    const rangeHalfYear = getProjectedRange(180);
    const rangeYear = getProjectedRange(365);
    const rangeDecade = getProjectedRange(3650);

    // Build seasonal monthly factors from historical data
    const monthlyRates = this.statsService.calculateMonthlyRates(
      ratesWithMonths,
      ratesMean,
      ratesSd,
    );

    // Zero out off-season months for heating based on user's historical data
    if (isHeating) {
      const offSeasonMonths = this.statsService.detectOffSeasonMonths(ratesWithMonths);
      for (const m of offSeasonMonths) {
        monthlyRates[m] = { expected: 0, min: 0, max: 0 };
      }
    }

    // Calculate trend
    const { trend, trendPercentage } = this.statsService.calculateTrend(dailyRates);

    // Calculate confidence
    const confidence = this.statsService.calculateConfidence(dailyRates, records);

    // Average daily consumption
    const historicalAvg = ratesMean;

    return {
      daily30: range30.expected,
      daily30Min: range30.min,
      daily30Max: range30.max,

      daily90: range90.expected,
      daily90Min: range90.min,
      daily90Max: range90.max,

      dailyHalfYear: rangeHalfYear.expected,
      dailyHalfYearMin: rangeHalfYear.min,
      dailyHalfYearMax: rangeHalfYear.max,

      dailyYear: rangeYear.expected,
      dailyYearMin: rangeYear.min,
      dailyYearMax: rangeYear.max,

      dailyDecade: rangeDecade.expected,
      dailyDecadeMin: rangeDecade.min,
      dailyDecadeMax: rangeDecade.max,

      monthlyRates,
      trend,
      trendPercentage: Math.round(trendPercentage),
      confidence,
      averageDaily: format(historicalAvg),
      unit,
      accuracyPercentage: accuracyData?.accuracy ?? undefined,
      appliedCorrection:
        accuracyData?.correctionFactor !== 1.0 ? accuracyData?.correctionFactor : undefined,
      historicalPredictions: accuracyData?.historicalPredictions,
    };
  }
}
