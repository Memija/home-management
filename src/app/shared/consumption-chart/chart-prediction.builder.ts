import { ChartConfiguration } from 'chart.js';
import { LanguageService } from '../../services/language.service';
import { AppChartDataset } from '../../models/records.model';
import { ChartDataPoint } from '../../models/consumption-chart.model';
import { PredictionResult, MultiPredictionResult } from '../../models/prediction.models';

export type PredictionPeriod = 30 | 90 | 180 | 365 | 3650;

export interface PredictionBuilderDeps {
  languageService: LanguageService;
  chartType: 'water' | 'home' | 'heating' | 'electricity';
  currentView: () => string;
  getData: () => ChartDataPoint[];
  prediction: MultiPredictionResult | null;
  predictionPeriod: PredictionPeriod;
  showPredictions: boolean;
  showPastForecast: boolean;
}

/**
 * Appends prediction datasets (expected, min/max band, past forecast, trendline extensions)
 * to existing chart data.
 *
 * This function is pure given its `deps` inputs and never touches the DOM.
 */
export function appendPredictionDatasets(
  chartData: ChartConfiguration['data'],
  deps: PredictionBuilderDeps,
): ChartConfiguration['data'] {
  const { languageService, chartType, getData, prediction, predictionPeriod, showPredictions, showPastForecast } = deps;
  const pred = prediction;

  if (!pred || (!showPredictions && !showPastForecast)) {
    return chartData;
  }

  // Predictions are only shown in incremental mode (daily average)
  // The caller is responsible for checking displayMode before calling this function.

  // Find the main data dataset
  const mainDataset = chartData.datasets[0];
  if (!mainDataset || !mainDataset.data) {
    return chartData;
  }

  const labels = [...(chartData.labels || [])] as string[];
  const datasets = chartData.datasets.map(ds => ({
    ...ds,
    data: [...(ds.data || [])]
  })) as any[];

  const predictionMonths = getPredictionMonths(predictionPeriod);

  // 1. Pad all existing datasets to the length of original labels (before predictions)
  const originalLabelsLength = labels.length;
  padDatasets(datasets, originalLabelsLength);

  const data = getData();
  const lastRecordDate = new Date(data[data.length - 1].date);

  if (showPredictions) {
    // 2. Pad existing datasets with null for the future months and extend labels
    padDatasetsForFuture(datasets, predictionMonths);
    extendLabels(labels, lastRecordDate, predictionMonths, languageService);

    // 3. Extend trendlines and country average comparison lines into the prediction zone.
    extendTrendlinesAndAverages(datasets, originalLabelsLength, predictionMonths, languageService);
  }

  // 4. Draw prediction datasets
  const view = deps.currentView();

  if (view === 'total' || chartType === 'electricity' || chartType === 'home') {
    drawTotalPredictions(datasets, labels, pred, deps, originalLabelsLength, predictionMonths, lastRecordDate);
  } else {
    drawSubcategoryPredictions(datasets, labels, pred, deps, originalLabelsLength, predictionMonths, lastRecordDate);
    reorderDatasets(datasets);
  }

  return { labels, datasets };
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function getPredictionMonths(predictionPeriod: PredictionPeriod): number {
  return predictionPeriod === 30 ? 1 :
    predictionPeriod === 90 ? 3 :
      predictionPeriod === 180 ? 6 :
        predictionPeriod === 3650 ? 120 : 12;
}

function padDatasets(datasets: AppChartDataset[], targetLength: number): void {
  datasets.forEach(ds => {
    if (ds.data) {
      const currentLength = ds.data.length;
      if (currentLength < targetLength) {
        const padding = Array(targetLength - currentLength).fill(null);
        ds.data = [...ds.data, ...padding];
      }
    }
  });
}

function padDatasetsForFuture(datasets: AppChartDataset[], predictionMonths: number): void {
  datasets.forEach(ds => {
    if (ds.data) {
      ds.data = [...ds.data, ...Array(predictionMonths).fill(null)];
    }
  });
}

function extendLabels(labels: string[], lastRecordDate: Date, predictionMonths: number, languageService: LanguageService): void {
  for (let m = 1; m <= predictionMonths; m++) {
    const futureDate = new Date(lastRecordDate);
    futureDate.setMonth(futureDate.getMonth() + m);
    const label = languageService.formatDate(futureDate, { month: 'short', year: 'numeric' });
    labels.push(label);
  }
}

function extendTrendlinesAndAverages(datasets: AppChartDataset[], originalLabelsLength: number, predictionMonths: number, languageService: LanguageService): void {
  const existingDatasetCount = datasets.length;
  for (let i = 0; i < existingDatasetCount; i++) {
    const ds = datasets[i];
    const bdash = ds.borderDash as number[] | undefined;
    const dsData = ds.data as (number | null)[];

    const isTrendline = ds.label?.includes(languageService.translate('CHART.TRENDLINE'));
    const isCountryAverage = bdash && bdash[0] === 5; // [5, 5] dash = country/comparison average

    if (!isTrendline && !isCountryAverage) continue; // skip data datasets

    // Find the last real value (i.e., just before the null-padded prediction zone)
    let lastActualIdx = -1;
    let lastActualVal = 0;
    for (let j = originalLabelsLength - 1; j >= 0; j--) {
      if (dsData[j] !== null && dsData[j] !== undefined) {
        lastActualIdx = j;
        lastActualVal = dsData[j] as number;
        break;
      }
    }
    if (lastActualIdx === -1) continue;

    // Country average: extend flat at the last value (the reference does not change)
    if (isCountryAverage) {
      for (let j = originalLabelsLength; j < dsData.length; j++) {
        dsData[j] = lastActualVal;
      }
    }

    // Trendline: extend the linear regression into the predicted portion
    if (isTrendline) {
      const predTrendData: (number | null)[] = Array(originalLabelsLength + predictionMonths).fill(null);
      predTrendData[lastActualIdx] = lastActualVal; // anchor at last real point

      // The trendline is a straight line — calculate slope from the last two points
      let slope = 0;
      if (lastActualIdx >= 1) {
        const prevVal = dsData[lastActualIdx - 1] as number;
        slope = lastActualVal - prevVal;
      }

      for (let j = lastActualIdx + 1; j < predTrendData.length; j++) {
        const steps = j - lastActualIdx;
        const projected = lastActualVal + (slope * steps);
        predTrendData[j] = Math.max(0, projected);
      }

      // Apply 50% opacity so predicted portion reads as distinct from historical
      const origColor = ds.borderColor as string;
      const predColor = origColor?.startsWith('#') && origColor.length === 7
        ? origColor + '80'
        : origColor;

      datasets.push({
        label: ds.label, // same label — hidden from legend via isPredictionExtension
        data: predTrendData as any[],
        type: 'line',
        borderColor: predColor,
        backgroundColor: 'rgba(0, 0, 0, 0)',
        borderDash: [3, 6],   // slightly wider gap than historical [3,3] to differentiate
        borderWidth: ds.borderWidth ?? 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0.4,
        spanGaps: true,
        isPredictionExtension: true,
        trendlineFor: (ds as AppChartDataset).trendlineFor,
      } as AppChartDataset);
    }
  }
}

function generatePredictionData(
  actualValues: (number | null)[],
  singlePred: PredictionResult,
  originalLabelsLength: number,
  predictionMonths: number,
  lastRecordDate: Date,
  predictionPeriod: PredictionPeriod
) {
  let lastValueIndex = -1;
  let lastValue = 0;
  for (let i = actualValues.length - 1; i >= 0; i--) {
    if (actualValues[i] !== null && actualValues[i] !== undefined) {
      lastValueIndex = i;
      lastValue = actualValues[i] as number;
      break;
    }
  }

  const hasSeasonalData = singlePred.monthlyRates && singlePred.monthlyRates.length === 12;
  const predDataExpected: (number | null)[] = Array(originalLabelsLength + predictionMonths).fill(null);
  const predDataMin: (number | null)[] = Array(originalLabelsLength + predictionMonths).fill(null);
  const predDataMax: (number | null)[] = Array(originalLabelsLength + predictionMonths).fill(null);

  if (lastValueIndex !== -1) {
    predDataExpected[lastValueIndex] = lastValue;
    predDataMin[lastValueIndex] = lastValue;
    predDataMax[lastValueIndex] = lastValue;

    for (let i = lastValueIndex + 1; i < predDataExpected.length; i++) {
      const monthOffset = i - lastValueIndex;
      const futureDate = new Date(lastRecordDate);
      futureDate.setMonth(futureDate.getMonth() + monthOffset);
      const calendarMonth = futureDate.getMonth();

      const dailyRate =
        predictionPeriod === 30 ? singlePred.daily30 :
          predictionPeriod === 90 ? singlePred.daily90 :
            predictionPeriod === 180 ? singlePred.dailyHalfYear :
              predictionPeriod === 3650 ? singlePred.dailyDecade : singlePred.dailyYear;
      const dailyRateMin =
        predictionPeriod === 30 ? singlePred.daily30Min :
          predictionPeriod === 90 ? singlePred.daily90Min :
            predictionPeriod === 180 ? singlePred.dailyHalfYearMin :
              predictionPeriod === 3650 ? singlePred.dailyDecadeMin : singlePred.dailyYearMin;
      const dailyRateMax =
        predictionPeriod === 30 ? singlePred.daily30Max :
          predictionPeriod === 90 ? singlePred.daily90Max :
            predictionPeriod === 180 ? singlePred.dailyHalfYearMax :
              predictionPeriod === 3650 ? singlePred.dailyDecadeMax : singlePred.dailyYearMax;

      if (hasSeasonalData) {
        const historicalAvg = singlePred.averageDaily || 1; // avoid division by zero
        const scaleFactor = dailyRate / historicalAvg;
        const scaleFactorMin = dailyRateMin / historicalAvg;
        const scaleFactorMax = dailyRateMax / historicalAvg;

        predDataExpected[i] = Math.round(singlePred.monthlyRates![calendarMonth].expected * scaleFactor * 10) / 10;
        predDataMin[i] = Math.round(singlePred.monthlyRates![calendarMonth].min * scaleFactorMin * 10) / 10;
        predDataMax[i] = Math.round(singlePred.monthlyRates![calendarMonth].max * scaleFactorMax * 10) / 10;
      } else {
        predDataExpected[i] = Math.round(dailyRate * 10) / 10;
        predDataMin[i] = Math.round(dailyRateMin * 10) / 10;
        predDataMax[i] = Math.round(dailyRateMax * 10) / 10;
      }
    }
  }

  return { predDataExpected, predDataMin, predDataMax };
}

function drawTotalPredictions(
  datasets: AppChartDataset[],
  labels: string[],
  pred: MultiPredictionResult,
  deps: PredictionBuilderDeps,
  originalLabelsLength: number,
  predictionMonths: number,
  lastRecordDate: Date
): void {
  let color = '#1976d2';
  let fillBgColor = 'rgba(25, 118, 210, 0.08)';
  if (deps.chartType === 'electricity') {
    color = '#ffc107';
    fillBgColor = 'rgba(255, 193, 7, 0.08)';
  } else if (deps.chartType === 'heating') {
    color = '#f57c00';
    fillBgColor = 'rgba(245, 124, 0, 0.08)';
  }

  const { predDataExpected, predDataMin, predDataMax } = generatePredictionData(
    datasets[0].data as (number | null)[],
    pred.total,
    originalLabelsLength,
    predictionMonths,
    lastRecordDate,
    deps.predictionPeriod
  );

  if (deps.showPredictions) {
    datasets.push({
      label: deps.languageService.translate('PREDICTIONS.MIN'),
      data: predDataMin as any[],
      type: 'line',
      borderColor: 'rgba(0, 0, 0, 0)',
      backgroundColor: 'rgba(0, 0, 0, 0)',
      borderWidth: 0,
      pointRadius: 0,
      pointHitRadius: 0,
      fill: false,
      tension: 0.4,
      spanGaps: true,
    });

    datasets.push({
      label: deps.languageService.translate('PREDICTIONS.MAX'),
      data: predDataMax as any[],
      type: 'line',
      borderColor: 'rgba(0, 0, 0, 0)',
      backgroundColor: fillBgColor,
      borderWidth: 0,
      pointRadius: 0,
      pointHitRadius: 0,
      fill: '-1',
      tension: 0.4,
      spanGaps: true,
    });

    datasets.push({
      label: deps.languageService.translate('CHART.CONSUMPTION_PREDICTION'),
      data: predDataExpected as any[],
      type: 'line',
      borderColor: color,
      backgroundColor: 'rgba(0, 0, 0, 0)',
      borderDash: [4, 4],
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: color,
      pointBorderColor: '#fff',
      fill: false,
      tension: 0.4,
      spanGaps: true,
    });
  }

  if (deps.showPastForecast && pred.total.historicalPredictions) {
    // historicalPredictions[0] is always null.
    // historicalPredictions[i] is the prediction for the interval ending at records[i],
    // which maps to labels[i-1]. So we slice from index 1 to align with labels.
    const rawPast = pred.total.historicalPredictions.slice(1);
    const pastData: (number | null)[] = rawPast.slice(0, labels.length);
    while (pastData.length < labels.length) {
      pastData.push(null);
    }

    datasets.push({
      label: deps.languageService.translate('CHART.PAST_FORECAST'),
      data: pastData as any[],
      type: 'line',
      borderColor: '#9333ea', // distinct purple for past forecast
      backgroundColor: 'rgba(0, 0, 0, 0)',
      borderDash: [2, 2],
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 4,
      pointBackgroundColor: '#9333ea',
      pointBorderColor: '#fff',
      fill: false,
      tension: 0.4,
      spanGaps: true,
    });
  }
}

function drawSubcategoryPredictions(
  datasets: AppChartDataset[],
  labels: string[],
  pred: MultiPredictionResult,
  deps: PredictionBuilderDeps,
  originalLabelsLength: number,
  predictionMonths: number,
  lastRecordDate: Date
): void {
  const categories = pred.categories || {};

  const waterColors: Record<string, string> = {
    kitchenWarm: '#ff6384',
    kitchenCold: '#36a2eb',
    bathroomWarm: '#ff9f40',
    bathroomCold: '#4bc0c0',
    kitchenTotal: '#17a2b8',
    bathroomTotal: '#6c757d',
    warmTotal: '#ffc107',
    coldTotal: '#6c757d', // Matches chart data service fallback
  };

  // Find the right datasets
  const initialDatasetCount = datasets.length;
  for (let i = 0; i < initialDatasetCount; i++) {
    const ds = datasets[i];
    // Skip datasets that are already trendlines, averages, or predictions
    if (ds.borderDash || ds.type === 'line') continue;

    let categoryKey: string | null = null;
    let color = '#000';

    // Use categoryId metadata set by the chart data service
    if (ds.categoryId) {
      categoryKey = ds.categoryId as string;
      color = (ds.borderColor as string) || waterColors[categoryKey] || '#000';
    }

    if (categoryKey && categories[categoryKey]) {
      const shortLabel = ds.label ? ds.label.replace(/\s*\(.*\)/, '') : '';
      const { predDataExpected, predDataMin, predDataMax } = generatePredictionData(
        ds.data as (number | null)[],
        categories[categoryKey],
        originalLabelsLength,
        predictionMonths,
        lastRecordDate,
        deps.predictionPeriod
      );

      if (deps.showPredictions) {
        const fillBgColor = (ds.backgroundColor as string) || (color + '20');

        datasets.push({
          label: deps.languageService.translate('PREDICTIONS.MIN'),
          data: predDataMin as any[],
          type: 'line',
          borderColor: 'rgba(0, 0, 0, 0)',
          backgroundColor: 'rgba(0, 0, 0, 0)',
          borderWidth: 0,
          pointRadius: 0,
          pointHitRadius: 0,
          fill: false,
          tension: 0.4,
          spanGaps: true,
          categoryId: categoryKey,
        } as any);

        datasets.push({
          label: deps.languageService.translate('PREDICTIONS.MAX'),
          data: predDataMax as any[],
          type: 'line',
          borderColor: 'rgba(0, 0, 0, 0)',
          backgroundColor: fillBgColor,
          borderWidth: 0,
          pointRadius: 0,
          pointHitRadius: 0,
          fill: '-1',
          tension: 0.4,
          spanGaps: true,
          categoryId: categoryKey,
        } as any);

        datasets.push({
          label: `${shortLabel} - ${deps.languageService.translate('CHART.CONSUMPTION_PREDICTION')}`,
          data: predDataExpected as any[],
          type: 'line',
          borderColor: color,
          backgroundColor: 'rgba(0, 0, 0, 0)',
          borderDash: [4, 4],
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: color,
          pointBorderColor: '#fff',
          fill: false,
          tension: 0.4,
          spanGaps: true,
          categoryId: categoryKey,
        } as any);
      }

      if (deps.showPastForecast && categories[categoryKey].historicalPredictions) {
        // historicalPredictions[0] is always null — slice from index 1 to align with labels
        const rawPast = categories[categoryKey].historicalPredictions!.slice(1);
        const pastData: (number | null)[] = rawPast.slice(0, labels.length);
        while (pastData.length < labels.length) {
          pastData.push(null);
        }

        datasets.push({
          label: `${shortLabel} - ${deps.languageService.translate('CHART.PAST_FORECAST')}`,
          data: pastData as any[],
          type: 'line',
          borderColor: color, // matching category color, but thinner with different dash
          backgroundColor: 'rgba(0, 0, 0, 0)',
          borderDash: [2, 2],
          borderWidth: 1,
          pointRadius: 2,
          pointHoverRadius: 4,
          pointBackgroundColor: color,
          pointBorderColor: '#fff',
          fill: false,
          tension: 0.4,
          spanGaps: true,
          categoryId: categoryKey,
        } as any);
      }
    }
  }
}

function reorderDatasets(datasets: AppChartDataset[]): void {
  // Reorder datasets so that all datasets belonging to the same category are grouped together
  const groupedDatasets: AppChartDataset[] = [];
  const otherDatasets: AppChartDataset[] = [];
  const categoryIds = Array.from(
    new Set(
      datasets
        .map(ds => (ds as AppChartDataset).categoryId || (ds as AppChartDataset).trendlineFor)
        .filter(Boolean),
    ),
  );

  categoryIds.forEach(catId => {
    groupedDatasets.push(
      ...datasets.filter(
        ds =>
          (ds as AppChartDataset).categoryId === catId ||
          (ds as AppChartDataset).trendlineFor === catId,
      ),
    );
  });

  otherDatasets.push(
    ...datasets.filter(
      ds => !(ds as AppChartDataset).categoryId && !(ds as AppChartDataset).trendlineFor,
    ),
  );

  datasets.length = 0;
  datasets.push(...groupedDatasets, ...otherDatasets);
}
