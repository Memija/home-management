import { ChartConfiguration } from 'chart.js';
import { LanguageService } from '../../../services/language.service';
import { AppChartDataset } from '../../../models/records.model';
import type { PredictionBuilderDeps } from './chart-prediction.types';
import { getPredictionMonths } from './chart-prediction-series.utils';
import { extendTrendlinesAndAverages } from './chart-prediction-trendlines.utils';
import {
  drawSubcategoryPredictions,
  drawTotalPredictions,
} from './chart-prediction-datasets.builder';
import { reorderDatasets } from './chart-prediction-reorder.utils';

export type { PredictionBuilderDeps };
export type { PredictionPeriod } from './chart-prediction.types';

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
  const {
    languageService,
    chartType,
    getData,
    prediction,
    predictionPeriod,
    showPredictions,
    showPastForecast,
  } = deps;
  const pred = prediction;

  if (!pred || (!showPredictions && !showPastForecast)) {
    return chartData;
  }

  // Find the main data dataset
  const mainDataset = chartData.datasets[0];
  if (!mainDataset?.data) {
    return chartData;
  }

  const labels = [...(chartData.labels || [])] as string[];
  const datasets = chartData.datasets.map((ds) => ({
    ...ds,
    data: [...(ds.data || [])],
  })) as AppChartDataset[];

  const predictionMonths = getPredictionMonths(predictionPeriod);

  // 1. Pad all existing datasets to the length of original labels (before predictions)
  const originalLabelsLength = labels.length;
  padDatasets(datasets, originalLabelsLength);

  const data = getData();
  const lastRecordDate = new Date(data.at(-1)!.date);

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
    drawTotalPredictions(
      datasets,
      labels,
      pred,
      deps,
      originalLabelsLength,
      predictionMonths,
      lastRecordDate,
    );
  } else {
    drawSubcategoryPredictions(
      datasets,
      labels,
      pred,
      deps,
      originalLabelsLength,
      predictionMonths,
      lastRecordDate,
    );
    reorderDatasets(datasets);
  }

  return { labels, datasets };
}

function padDatasets(datasets: AppChartDataset[], targetLength: number): void {
  datasets.forEach((ds) => {
    if (ds.data) {
      const currentLength = ds.data.length;
      if (currentLength < targetLength) {
        const padding = new Array(targetLength - currentLength).fill(null);
        ds.data = [...ds.data, ...padding];
      }
    }
  });
}

function padDatasetsForFuture(datasets: AppChartDataset[], predictionMonths: number): void {
  datasets.forEach((ds) => {
    if (ds.data) {
      ds.data = [...ds.data, ...new Array(predictionMonths).fill(null)];
    }
  });
}

function extendLabels(
  labels: string[],
  lastRecordDate: Date,
  predictionMonths: number,
  languageService: LanguageService,
): void {
  for (let m = 1; m <= predictionMonths; m++) {
    const futureDate = new Date(lastRecordDate);
    futureDate.setMonth(futureDate.getMonth() + m);
    const label = languageService.formatDate(futureDate, { month: 'short', year: 'numeric' });
    labels.push(label);
  }
}
