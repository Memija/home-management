import { Injectable, inject } from '@angular/core';
import { ChartCalculationService } from './chart-calculation.service';
import { PredictionStatsService } from './prediction-stats.service';
import { PredictionResult, MIN_RECORDS_FOR_PREDICTION } from '../models/prediction.models';

/**
 * Core prediction math: daily-rate extraction, historical accuracy evaluation,
 * and building the full PredictionResult object.
 * Consumed exclusively by PredictionService.
 */
@Injectable({
  providedIn: 'root',
})
export class PredictionCalculationService {
  private calculationService = inject(ChartCalculationService);
  private statsService = inject(PredictionStatsService);

  /**
   * Calculate daily consumption rates between consecutive readings using properly
   * computed incremental data.
   * Returns rates alongside the calendar month they represent (midpoint of the interval).
   * @param category The specific sub-category to calculate for, or 'total' for the sum.
   */
  calculateDailyRatesWithMonths(
    records: { date: Date | string }[],
    incrementalData: unknown[],
    category: string = 'total',
  ): { rate: number; month: number }[] {
    const results: { rate: number; month: number }[] = [];

    for (let i = 1; i < records.length; i++) {
      const currentDate = new Date(records[i].date);
      const prevDate = new Date(records[i - 1].date);

      const daysDiff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24);
      if (daysDiff <= 0) continue;

      const inc = incrementalData[i - 1] as Record<string, unknown>; // the interval between i-1 and i
      let delta = 0;

      if (inc && 'rooms' in inc) {
        // Heating
        const rooms = inc['rooms'] as Record<string, number>;
        if (category === 'total') {
          delta = Object.values(rooms).reduce((sum, val) => sum + (val || 0), 0);
        } else {
          delta = rooms[category] || 0;
        }
      } else if (inc && 'value' in inc) {
        // Electricity
        delta = Number(inc['value']) || 0;
      } else if (inc) {
        // Water
        if (category === 'total') {
          delta =
            (Number(inc['kitchenWarm']) || 0) +
            (Number(inc['kitchenCold']) || 0) +
            (Number(inc['bathroomWarm']) || 0) +
            (Number(inc['bathroomCold']) || 0);
        } else if (category === 'kitchenTotal') {
          delta = (Number(inc['kitchenWarm']) || 0) + (Number(inc['kitchenCold']) || 0);
        } else if (category === 'bathroomTotal') {
          delta = (Number(inc['bathroomWarm']) || 0) + (Number(inc['bathroomCold']) || 0);
        } else if (category === 'warmTotal') {
          delta = (Number(inc['kitchenWarm']) || 0) + (Number(inc['bathroomWarm']) || 0);
        } else if (category === 'coldTotal') {
          delta = (Number(inc['kitchenCold']) || 0) + (Number(inc['bathroomCold']) || 0);
        } else {
          delta = Number(inc[category]) || 0;
        }
      }

      const dailyRate = delta / daysDiff;

      // Assign to the midpoint month of the interval
      const midpointMs = prevDate.getTime() + (currentDate.getTime() - prevDate.getTime()) / 2;
      const midpointMonth = new Date(midpointMs).getMonth();

      // Only include non-negative rates
      if (dailyRate >= 0) {
        results.push({ rate: dailyRate, month: midpointMonth });
      }
    }

    return results;
  }

  /**
   * Calculate historical accuracy by evaluating past 30-day predictions against actual data.
   * Returns accuracy percentage (0-100) and correction factor (e.g., 1.05).
   */
  calculateHistoricalAccuracy(
    records: { date: Date | string }[],
    incrementalData: unknown[],
    category: string,
  ): { accuracy: number | null; correctionFactor: number; historicalPredictions: (number | null)[] } {
    const historicalPredictions: (number | null)[] = new Array(records.length).fill(null);

    if (records.length < MIN_RECORDS_FOR_PREDICTION + 2) {
      return { accuracy: null, correctionFactor: 1.0, historicalPredictions };
    }

    let totalErrorPercentage = 0;
    let totalUnderOver = 0;
    let evaluations = 0;

    for (let splitIdx = MIN_RECORDS_FOR_PREDICTION; splitIdx < records.length - 1; splitIdx++) {
      const pastRecords = records.slice(0, splitIdx + 1);
      const pastIncremental = incrementalData.slice(0, splitIdx);

      const ratesWithMonths = this.calculateDailyRatesWithMonths(pastRecords, pastIncremental, category);
      const dailyRates = ratesWithMonths.map(r => r.rate);
      if (dailyRates.length < 2) continue;

      const { slope, intercept } = this.calculationService.calculateLinearRegression(dailyRates);

      const firstDate = new Date(pastRecords[0].date).getTime();
      const lastDate = new Date(pastRecords[pastRecords.length - 1].date).getTime();
      const totalDays = (lastDate - firstDate) / (1000 * 3600 * 24);
      const avgInterval = pastRecords.length > 1 ? totalDays / (pastRecords.length - 1) : 7;

      const regRate = Math.max(0, slope * dailyRates.length + intercept + (slope / (avgInterval || 7)) * 30);
      const expected30 = this.statsService.weightedMovingAverage(dailyRates, regRate);

      // Store the predicted daily rate for the next record (which is at splitIdx + 1)
      historicalPredictions[splitIdx + 1] = expected30;

      const actualNextRates = this.calculateDailyRatesWithMonths(
        records.slice(splitIdx, splitIdx + 2),
        incrementalData.slice(splitIdx, splitIdx + 1),
        category,
      );

      if (actualNextRates.length > 0) {
        const actualRate = actualNextRates[0].rate;

        if (actualRate > 0) {
          const diff = Math.abs(expected30 - actualRate);
          const errorPct = diff / actualRate;
          totalErrorPercentage += Math.min(errorPct, 1.0);

          if (expected30 > 0) {
            totalUnderOver += actualRate / expected30;
            evaluations++;
          }
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

  /**
   * Build a PredictionResult from daily consumption rates.
   */
  buildPrediction(
    dailyRates: number[],
    ratesWithMonths: { rate: number; month: number }[],
    records: { date: Date | string }[],
    unit: string,
    accuracyData?: { accuracy: number | null; correctionFactor: number; historicalPredictions: (number | null)[] },
  ): PredictionResult {
    // Use linear regression on daily rates to extrapolate trend
    const { slope, intercept } = this.calculationService.calculateLinearRegression(dailyRates);

    // Calculate average interval in days
    let totalDays = 0;
    if (records.length >= 2) {
      const firstDate = new Date(records[0].date).getTime();
      const lastDate = new Date(records[records.length - 1].date).getTime();
      totalDays = (lastDate - firstDate) / (1000 * 3600 * 24);
    }
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
    const monthlyRates = this.statsService.calculateMonthlyRates(ratesWithMonths, ratesMean, ratesSd);

    // Calculate trend
    const { trend, trendPercentage } = this.statsService.calculateTrend(dailyRates);

    // Calculate confidence
    const confidence = this.statsService.calculateConfidence(dailyRates, records);

    // Average daily consumption
    const historicalAvg = dailyRates.reduce((sum, r) => sum + r, 0) / dailyRates.length;

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
