import { AppChartDataset } from '../../../models/records.model';
import { MultiPredictionResult } from '../../../models/prediction.models';
import { LanguageService } from '../../../services/language.service';
import { generatePredictionData } from './chart-prediction-series.utils';
import {
  WATER_CATEGORY_COLORS,
  PREDICTION_THEME_COLORS,
  PAST_FORECAST_COLOR,
} from './chart-prediction.constants';
import {
  PredictionBuilderDeps,
  PredictionSeriesData,
  SubcategoryPredictionContext,
} from './chart-prediction.types';

export function drawTotalPredictions(
  datasets: AppChartDataset[],
  labels: string[],
  pred: MultiPredictionResult,
  deps: PredictionBuilderDeps,
  originalLabelsLength: number,
  predictionMonths: number,
  lastRecordDate: Date,
): void {
  const theme = PREDICTION_THEME_COLORS[deps.chartType] ?? PREDICTION_THEME_COLORS.water;
  const color = theme.primary;
  const fillBgColor = theme.fill;

  const { predDataExpected, predDataMin, predDataMax } = generatePredictionData(
    datasets[0].data as (number | null)[],
    pred.total,
    originalLabelsLength,
    predictionMonths,
    lastRecordDate,
    deps.predictionPeriod,
    deps.chartType,
  );

  if (deps.showPredictions) {
    datasets.push(
      {
        label: deps.languageService.translate('PREDICTIONS.MIN'),
        data: predDataMin as (number | null)[],
        type: 'line',
        borderColor: 'rgba(0, 0, 0, 0)',
        backgroundColor: 'rgba(0, 0, 0, 0)',
        borderWidth: 0,
        pointRadius: 0,
        pointHitRadius: 0,
        fill: false,
        tension: 0.4,
        spanGaps: true,
      },
      {
        label: deps.languageService.translate('PREDICTIONS.MAX'),
        data: predDataMax as (number | null)[],
        type: 'line',
        borderColor: 'rgba(0, 0, 0, 0)',
        backgroundColor: fillBgColor,
        borderWidth: 0,
        pointRadius: 0,
        pointHitRadius: 0,
        fill: '-1',
        tension: 0.4,
        spanGaps: true,
      },
      {
        label: deps.languageService.translate('CHART.CONSUMPTION_PREDICTION'),
        data: predDataExpected as (number | null)[],
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
      },
    );
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
      data: pastData as (number | null)[],
      type: 'line',
      borderColor: PAST_FORECAST_COLOR,
      backgroundColor: 'rgba(0, 0, 0, 0)',
      borderDash: [2, 2],
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 4,
      pointBackgroundColor: PAST_FORECAST_COLOR,
      pointBorderColor: '#fff',
      fill: false,
      tension: 0.4,
      spanGaps: true,
    });
  }
}

export function pushCategoryPredictionDatasets(
  datasets: AppChartDataset[],
  categoryKey: string,
  color: string,
  shortLabel: string,
  predData: PredictionSeriesData,
  fillBgColor: string,
  deps: PredictionBuilderDeps,
): void {
  datasets.push(
    {
      label: deps.languageService.translate('PREDICTIONS.MIN'),
      data: predData.predDataMin as (number | null)[],
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
    } as AppChartDataset,
    {
      label: deps.languageService.translate('PREDICTIONS.MAX'),
      data: predData.predDataMax as (number | null)[],
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
    } as AppChartDataset,
    {
      label: `${shortLabel} - ${deps.languageService.translate('CHART.CONSUMPTION_PREDICTION')}`,
      data: predData.predDataExpected as (number | null)[],
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
    } as AppChartDataset,
  );
}

export function pushCategoryPastForecastDataset(
  datasets: AppChartDataset[],
  categoryKey: string,
  color: string,
  shortLabel: string,
  historicalPredictions: (number | null)[],
  labelsLength: number,
  languageService: LanguageService,
): void {
  const rawPast = historicalPredictions.slice(1);
  const pastData: (number | null)[] = rawPast.slice(0, labelsLength);
  while (pastData.length < labelsLength) {
    pastData.push(null);
  }

  datasets.push({
    label: `${shortLabel} - ${languageService.translate('CHART.PAST_FORECAST')}`,
    data: pastData as (number | null)[],
    type: 'line',
    borderColor: color,
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
  } as AppChartDataset);
}

export function processSubcategoryDataset(
  ds: AppChartDataset,
  ctx: SubcategoryPredictionContext,
): void {
  if (ds.borderDash || ds.type === 'line' || !ds.categoryId) {
    return;
  }

  const categoryKey = ds.categoryId as string;
  const categoryPred = ctx.categories[categoryKey];
  if (!categoryPred) {
    return;
  }

  const color = (ds.borderColor as string) || WATER_CATEGORY_COLORS[categoryKey] || '#000';
  const shortLabel = ds.label ? ds.label.split('(')[0].trim() : '';

  if (ctx.deps.showPredictions) {
    const predData = generatePredictionData(
      ds.data as (number | null)[],
      categoryPred,
      ctx.originalLabelsLength,
      ctx.predictionMonths,
      ctx.lastRecordDate,
      ctx.deps.predictionPeriod,
      ctx.deps.chartType,
    );
    const fillBgColor = (ds.backgroundColor as string) || color + '20';
    pushCategoryPredictionDatasets(
      ctx.datasets,
      categoryKey,
      color,
      shortLabel,
      predData,
      fillBgColor,
      ctx.deps,
    );
  }

  if (ctx.deps.showPastForecast && categoryPred.historicalPredictions) {
    pushCategoryPastForecastDataset(
      ctx.datasets,
      categoryKey,
      color,
      shortLabel,
      categoryPred.historicalPredictions,
      ctx.labels.length,
      ctx.deps.languageService,
    );
  }
}

export function drawSubcategoryPredictions(
  datasets: AppChartDataset[],
  labels: string[],
  pred: MultiPredictionResult,
  deps: PredictionBuilderDeps,
  originalLabelsLength: number,
  predictionMonths: number,
  lastRecordDate: Date,
): void {
  const categories = pred.categories || {};
  const ctx: SubcategoryPredictionContext = {
    datasets,
    labels,
    categories,
    deps,
    originalLabelsLength,
    predictionMonths,
    lastRecordDate,
  };

  const initialDatasetCount = datasets.length;
  for (let i = 0; i < initialDatasetCount; i++) {
    processSubcategoryDataset(datasets[i], ctx);
  }
}
