import { Injectable } from '@angular/core';
import { STABLE_THRESHOLD } from '../models/prediction.models';

/**
 * Pure statistical helper functions used by PredictionCalculationService.
 * Has no external Angular service dependencies.
 */
@Injectable({
  providedIn: 'root',
})
export class PredictionStatsService {
  /**
   * Weighted moving average that gives more importance to recent data
   * and blends with the regression prediction.
   */
  weightedMovingAverage(rates: number[], regressionPrediction: number): number {
    if (rates.length === 0) return regressionPrediction;

    // Take last N rates for the moving average (up to 6)
    const windowSize = Math.min(rates.length, 6);
    const recentRates = rates.slice(-windowSize);

    // Exponential weights: more recent = higher weight
    let weightedSum = 0;
    let totalWeight = 0;

    for (let i = 0; i < recentRates.length; i++) {
      const weight = i + 1; // 1, 2, 3, ... (latest has highest weight)
      weightedSum += recentRates[i] * weight;
      totalWeight += weight;
    }

    const movingAvg = weightedSum / totalWeight;

    // Blend: 60% moving average + 40% regression for stability
    return movingAvg * 0.6 + regressionPrediction * 0.4;
  }

  /**
   * Calculate trend direction and percentage change.
   */
  calculateTrend(dailyRates: number[]): {
    trend: 'rising' | 'falling' | 'stable';
    trendPercentage: number;
  } {
    if (dailyRates.length < 2) {
      return { trend: 'stable', trendPercentage: 0 };
    }

    // Compare first half average to second half average
    const midpoint = Math.floor(dailyRates.length / 2);
    const firstHalf = dailyRates.slice(0, midpoint);
    const secondHalf = dailyRates.slice(midpoint);

    const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;

    if (firstAvg === 0) {
      return {
        trend: secondAvg > 0 ? 'rising' : 'stable',
        trendPercentage: secondAvg > 0 ? 100 : 0,
      };
    }

    const percentageChange = ((secondAvg - firstAvg) / firstAvg) * 100;
    const roundedPercentage = Math.round(Math.abs(percentageChange));

    let trend: 'rising' | 'falling' | 'stable';
    if (percentageChange > STABLE_THRESHOLD) {
      trend = 'rising';
    } else if (percentageChange < -STABLE_THRESHOLD) {
      trend = 'falling';
    } else {
      trend = 'stable';
    }

    return { trend, trendPercentage: roundedPercentage };
  }

  /**
   * Calculate confidence level based on data density and variance.
   */
  calculateConfidence(
    dailyRates: number[],
    records: { date: Date | string }[],
  ): 'high' | 'medium' | 'low' {
    // Factor 1: Number of data points
    const dataScore = dailyRates.length >= 10 ? 3 : dailyRates.length >= 6 ? 2 : 1;

    // Factor 2: Variance (coefficient of variation)
    const mean = dailyRates.reduce((s, v) => s + v, 0) / dailyRates.length;
    let varianceScore = 1;
    if (mean > 0) {
      const variance =
        dailyRates.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / dailyRates.length;
      const cv = Math.sqrt(variance) / mean;
      varianceScore = cv < 0.3 ? 3 : cv < 0.6 ? 2 : 1;
    }

    // Factor 3: Recency (how recent is the last data point)
    const lastDate = new Date(records[records.length - 1].date);
    const daysSinceLastRecord =
      (Date.now() - lastDate.getTime()) / (1000 * 3600 * 24);
    const recencyScore = daysSinceLastRecord < 45 ? 3 : daysSinceLastRecord < 90 ? 2 : 1;

    const totalScore = dataScore + varianceScore + recencyScore;

    if (totalScore >= 7) return 'high';
    if (totalScore >= 5) return 'medium';
    return 'low';
  }

  /**
   * Calculate per-month seasonal daily rates from historical data.
   * For each calendar month (0=Jan … 11=Dec), computes the average daily rate
   * from all readings that fall in that month. For months with no data,
   * interpolates from neighboring months. Returns an array of 12 entries
   * with expected/min/max.
   */
  calculateMonthlyRates(
    ratesWithMonths: { rate: number; month: number }[],
    overallMean: number,
    overallSd: number,
  ): Array<{ expected: number; min: number; max: number }> {
    const format = (v: number): number => {
      if (v < 100) return Math.round(v * 10) / 10;
      return Math.round(v);
    };

    // Group rates by month
    const monthBuckets: number[][] = Array.from({ length: 12 }, () => []);
    for (const { rate, month } of ratesWithMonths) {
      monthBuckets[month].push(rate);
    }

    // Count how many months have data
    const monthsWithData = monthBuckets.filter(b => b.length > 0).length;

    // If fewer than 6 months have data, seasonal patterns aren't reliable —
    // fall back to flat rate for all months
    if (monthsWithData < 6) {
      const effectiveSd = Math.min(
        Math.max(overallSd, overallMean * 0.1),
        overallMean * 0.5,
      );
      return Array.from({ length: 12 }, () => ({
        expected: format(overallMean),
        min: format(Math.max(0, overallMean - effectiveSd)),
        max: format(overallMean + effectiveSd),
      }));
    }

    // Compute raw monthly averages (null for months with no data)
    const rawMonthlyAvg: (number | null)[] = monthBuckets.map(bucket =>
      bucket.length > 0
        ? bucket.reduce((s, v) => s + v, 0) / bucket.length
        : null,
    );

    // Interpolate missing months from nearest neighbors (circular)
    const monthlyAvg: number[] = rawMonthlyAvg.map((avg, i) => {
      if (avg !== null) return avg;

      // Find nearest non-null neighbors in both directions
      let leftDist = 0;
      let rightDist = 0;
      let leftVal = overallMean;
      let rightVal = overallMean;

      for (let d = 1; d <= 6; d++) {
        const li = (i - d + 12) % 12;
        if (rawMonthlyAvg[li] !== null) {
          leftVal = rawMonthlyAvg[li]!;
          leftDist = d;
          break;
        }
      }
      for (let d = 1; d <= 6; d++) {
        const ri = (i + d) % 12;
        if (rawMonthlyAvg[ri] !== null) {
          rightVal = rawMonthlyAvg[ri]!;
          rightDist = d;
          break;
        }
      }

      if (leftDist === 0 && rightDist === 0) return overallMean;
      if (leftDist === 0) return rightVal;
      if (rightDist === 0) return leftVal;

      // Weighted interpolation based on distance
      const totalDist = leftDist + rightDist;
      return (leftVal * rightDist + rightVal * leftDist) / totalDist;
    });

    // Compute per-month standard deviations for min/max bounds
    return monthlyAvg.map((avg, i) => {
      const bucket = monthBuckets[i];
      let monthSd: number;

      if (bucket.length >= 2) {
        const variance = bucket.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / bucket.length;
        monthSd = Math.sqrt(variance);
      } else {
        // Use overall SD scaled proportionally
        monthSd = overallSd * (avg / (overallMean || 1));
      }

      // Clamp the SD
      const effectiveSd = Math.min(
        Math.max(monthSd, avg * 0.1),
        avg * 0.5,
      );

      return {
        expected: format(avg),
        min: format(Math.max(0, avg - effectiveSd)),
        max: format(avg + effectiveSd),
      };
    });
  }
}
