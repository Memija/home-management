import { PredictionResult } from '../../../models/prediction.models';
import {
  DailyRates,
  PredictionPeriod,
  PredictionPoint,
  PredictionSeriesData,
} from './chart-prediction.types';

export function getPredictionMonths(predictionPeriod: PredictionPeriod): number {
  switch (predictionPeriod) {
    case 30:
      return 1;
    case 90:
      return 3;
    case 180:
      return 6;
    case 3650:
      return 120;
    default:
      return 12;
  }
}

export function findLastValueIndex(actualValues: (number | null)[]): {
  index: number;
  value: number;
} {
  for (let i = actualValues.length - 1; i >= 0; i--) {
    if (actualValues[i] !== null && actualValues[i] !== undefined) {
      return { index: i, value: actualValues[i] as number };
    }
  }
  return { index: -1, value: 0 };
}

export function getPredictionDailyRates(
  singlePred: PredictionResult,
  predictionPeriod: PredictionPeriod,
): DailyRates {
  switch (predictionPeriod) {
    case 30:
      return { rate: singlePred.daily30, min: singlePred.daily30Min, max: singlePred.daily30Max };
    case 90:
      return { rate: singlePred.daily90, min: singlePred.daily90Min, max: singlePred.daily90Max };
    case 180:
      return {
        rate: singlePred.dailyHalfYear,
        min: singlePred.dailyHalfYearMin,
        max: singlePred.dailyHalfYearMax,
      };
    case 3650:
      return {
        rate: singlePred.dailyDecade,
        min: singlePred.dailyDecadeMin,
        max: singlePred.dailyDecadeMax,
      };
    default:
      return {
        rate: singlePred.dailyYear,
        min: singlePred.dailyYearMin,
        max: singlePred.dailyYearMax,
      };
  }
}

export function calculatePredictionPoint(
  singlePred: PredictionResult,
  calendarMonth: number,
  rates: DailyRates,
  hasSeasonalData: boolean,
  chartType: string,
): PredictionPoint {
  if (
    chartType === 'heating' &&
    hasSeasonalData &&
    singlePred.monthlyRates![calendarMonth].expected === 0
  ) {
    return { expected: 0, min: 0, max: 0 };
  }

  if (hasSeasonalData) {
    const historicalAvg = singlePred.averageDaily || 1;
    const factor = rates.rate / historicalAvg;
    const factorMin = rates.min / historicalAvg;
    const factorMax = rates.max / historicalAvg;
    return {
      expected: Math.round(singlePred.monthlyRates![calendarMonth].expected * factor * 10) / 10,
      min: Math.round(singlePred.monthlyRates![calendarMonth].min * factorMin * 10) / 10,
      max: Math.round(singlePred.monthlyRates![calendarMonth].max * factorMax * 10) / 10,
    };
  }

  return {
    expected: Math.round(rates.rate * 10) / 10,
    min: Math.round(rates.min * 10) / 10,
    max: Math.round(rates.max * 10) / 10,
  };
}

export function generatePredictionData(
  actualValues: (number | null)[],
  singlePred: PredictionResult,
  originalLabelsLength: number,
  predictionMonths: number,
  lastRecordDate: Date,
  predictionPeriod: PredictionPeriod,
  chartType = 'water',
): PredictionSeriesData {
  const { index: lastValueIndex, value: lastValue } = findLastValueIndex(actualValues);
  const totalLength = originalLabelsLength + predictionMonths;
  const predDataExpected: (number | null)[] = new Array(totalLength).fill(null);
  const predDataMin: (number | null)[] = new Array(totalLength).fill(null);
  const predDataMax: (number | null)[] = new Array(totalLength).fill(null);

  if (lastValueIndex === -1) {
    return { predDataExpected, predDataMin, predDataMax };
  }

  predDataExpected[lastValueIndex] = lastValue;
  predDataMin[lastValueIndex] = lastValue;
  predDataMax[lastValueIndex] = lastValue;

  const hasSeasonalData = singlePred.monthlyRates?.length === 12;
  const rates = getPredictionDailyRates(singlePred, predictionPeriod);

  for (let i = lastValueIndex + 1; i < totalLength; i++) {
    const monthOffset = i - lastValueIndex;
    const futureDate = new Date(lastRecordDate);
    futureDate.setMonth(futureDate.getMonth() + monthOffset);
    const calendarMonth = futureDate.getMonth();

    const point = calculatePredictionPoint(
      singlePred,
      calendarMonth,
      rates,
      hasSeasonalData,
      chartType,
    );
    predDataExpected[i] = point.expected;
    predDataMin[i] = point.min;
    predDataMax[i] = point.max;
  }

  return { predDataExpected, predDataMin, predDataMax };
}
