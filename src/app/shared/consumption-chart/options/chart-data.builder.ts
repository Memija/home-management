import { ChartConfiguration } from 'chart.js';
import { ChartDataService, ChartView, DisplayMode } from '../../../services/chart-data.service';
import { LanguageService } from '../../../services/language.service';
import { ChartDataPoint } from '../../../models/consumption-chart.model';
import { MultiPredictionResult } from '../../../models/prediction.models';
import {
  ConsumptionRecord,
  DynamicHeatingRecord,
  ElectricityRecord,
} from '../../../models/records.model';
import { generateSmartLabels } from '../utils/chart-labels.utils';
import {
  appendPredictionDatasets,
  PredictionPeriod,
} from '../predictions/chart-prediction.builder';

export interface BuildChartDataParams {
  chartDataService: ChartDataService;
  languageService: LanguageService;
  chartType: 'water' | 'home' | 'heating' | 'electricity';
  records: ChartDataPoint[];
  view: ChartView;
  mode: DisplayMode;
  ignoredSpikes: { date: string; roomId: string }[];
  showTrendline: boolean;
  showAverageComparison: boolean;
  country: string;
  familySize: number;
  roomNames: string[];
  roomIds: string[];
  roomColors: { border: string; bg: string }[];
  prediction: MultiPredictionResult | null;
  predictionPeriod: PredictionPeriod;
  showPredictions: boolean;
  showPastForecast: boolean;
}

/**
 * Builds the Chart.js data configuration for Water, Electricity, Heating, or Home charts,
 * including incremental transformation and optional ML prediction datasets.
 */
export function buildConsumptionChartData(
  params: BuildChartDataParams,
): ChartConfiguration['data'] {
  const {
    chartDataService,
    languageService,
    chartType,
    records,
    view,
    mode,
    ignoredSpikes,
    showTrendline,
    showAverageComparison,
    country,
    familySize,
    roomNames,
    roomIds,
    roomColors,
    prediction,
    predictionPeriod,
    showPredictions,
    showPastForecast,
  } = params;

  const labels = generateSmartLabels(records, languageService);
  const processedData =
    mode === 'incremental'
      ? chartDataService.calculateIncrementalData(records, ignoredSpikes)
      : records;

  let resultData: ChartConfiguration['data'];

  if (chartType === 'water') {
    resultData = chartDataService.getWaterChartData({
      records: processedData as ConsumptionRecord[],
      originalRecords: records as ConsumptionRecord[],
      labels,
      view,
      mode,
      showTrendline,
      showAverageComparison,
      country: country ?? '',
      familySize: familySize ?? 0,
    });
  } else if (chartType === 'electricity') {
    resultData = chartDataService.getElectricityChartData({
      records: processedData as unknown as ElectricityRecord[],
      originalRecords: records as unknown as ElectricityRecord[],
      labels,
      view,
      mode,
      showTrendline,
      showAverageComparison,
      country: country ?? 'DE',
      familySize: familySize ?? 0,
    });
  } else if (chartType === 'home') {
    resultData = chartDataService.getWaterChartData({
      records: processedData as ConsumptionRecord[],
      originalRecords: records as ConsumptionRecord[],
      labels,
      view,
      mode,
      showTrendline: false,
      showAverageComparison: false,
      country: '',
      familySize: 0,
    });
  } else {
    resultData = chartDataService.getHeatingChartData({
      records: processedData as unknown as DynamicHeatingRecord[],
      originalRecords: records as unknown as DynamicHeatingRecord[],
      labels,
      view,
      mode,
      roomNames,
      roomIds,
      roomColors,
      showTrendline,
      showAverageComparison,
      country: country ?? 'DE',
    });
  }

  if (mode !== 'incremental') {
    return resultData;
  }

  return appendPredictionDatasets(resultData, {
    languageService,
    chartType,
    currentView: () => view,
    getData: () => records,
    prediction,
    predictionPeriod,
    showPredictions,
    showPastForecast,
  });
}
