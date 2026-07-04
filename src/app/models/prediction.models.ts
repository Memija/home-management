/**
 * Prediction result for a consumption type
 */
export interface PredictionResult {
  /** Predicted daily rate at 30 days */
  daily30: number;
  daily30Min: number;
  daily30Max: number;
  /** Predicted daily rate at 90 days */
  daily90: number;
  daily90Min: number;
  daily90Max: number;
  /** Predicted daily rate at 180 days (half year) */
  dailyHalfYear: number;
  dailyHalfYearMin: number;
  dailyHalfYearMax: number;
  /** Predicted daily rate at 365 days (yearly) */
  dailyYear: number;
  dailyYearMin: number;
  dailyYearMax: number;
  /** Predicted daily rate at 3650 days (decade) */
  dailyDecade: number;
  dailyDecadeMin: number;
  dailyDecadeMax: number;
  /** Monthly seasonal factors: index 0=Jan … 11=Dec, each with expected/min/max daily rate */
  monthlyRates: Array<{ expected: number; min: number; max: number }>;
  /** Direction of the consumption trend */
  trend: 'rising' | 'falling' | 'stable';
  /** Percentage change over the last few readings */
  trendPercentage: number;
  /** Confidence level of the prediction */
  confidence: 'high' | 'medium' | 'low';
  /** Average daily consumption based on historical data */
  averageDaily: number;
  /** Unit of measurement */
  unit: string;
  /** Historical accuracy of the prediction algorithm (0-100) */
  accuracyPercentage?: number;
  /** The correction factor automatically applied based on historical accuracy (e.g. 1.05 for +5%) */
  appliedCorrection?: number;
  /** Array of past daily rate predictions for charting (length matches original records) */
  historicalPredictions?: (number | null)[];
}

export interface MultiPredictionResult {
  total: PredictionResult;
  categories?: Record<string, PredictionResult>;
}

/** Minimum number of records required for predictions */
export const MIN_RECORDS_FOR_PREDICTION = 4;

/** Threshold percentage for trend classification */
export const STABLE_THRESHOLD = 3;
