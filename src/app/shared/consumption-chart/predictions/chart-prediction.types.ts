import { LanguageService } from '../../../services/language.service';
import { ChartDataPoint } from '../../../models/consumption-chart.model';
import { MultiPredictionResult, PredictionResult } from '../../../models/prediction.models';
import { AppChartDataset } from '../../../models/records.model';

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

export interface DailyRates {
  rate: number;
  min: number;
  max: number;
}

export interface PredictionPoint {
  expected: number;
  min: number;
  max: number;
}

export interface PredictionSeriesData {
  predDataExpected: (number | null)[];
  predDataMin: (number | null)[];
  predDataMax: (number | null)[];
}

export interface SubcategoryPredictionContext {
  datasets: AppChartDataset[];
  labels: string[];
  categories: Record<string, PredictionResult>;
  deps: PredictionBuilderDeps;
  originalLabelsLength: number;
  predictionMonths: number;
  lastRecordDate: Date;
}
