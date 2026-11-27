import { DisplayMode } from '../../../services/chart-data.service';
import { ChartTypeKey } from './chart-toggle.state';

export interface ActiveOverlayCountParams {
  readonly chartType: ChartTypeKey;
  readonly mode: DisplayMode;
  readonly dataLength: number;
  readonly familySize: number;
  readonly showTrendline: boolean;
  readonly showAverageComparison: boolean;
  readonly hasPrediction: boolean;
  readonly showPredictions: boolean;
  readonly showPastForecast: boolean;
}

export function hasSufficientTrendlinePoints(dataLength: number, mode: DisplayMode): boolean {
  return mode === 'incremental' ? dataLength >= 3 : dataLength >= 2;
}

export function hasAvailableChartOverlays(chartType: ChartTypeKey, mode: DisplayMode): boolean {
  if (chartType === 'home') return false;
  return chartType === 'heating' || mode === 'incremental';
}

export function isChartAverageComparisonDisabled(
  chartType: ChartTypeKey,
  familySize: number,
  dataLength: number,
): boolean {
  return (chartType !== 'heating' && familySize === 0) || dataLength < 3;
}

export function computeActiveChartOverlays(params: ActiveOverlayCountParams): number {
  const {
    chartType,
    mode,
    dataLength,
    familySize,
    showTrendline,
    showAverageComparison,
    hasPrediction,
    showPredictions,
    showPastForecast,
  } = params;

  if (!hasAvailableChartOverlays(chartType, mode)) {
    return 0;
  }

  const isIncremental = mode === 'incremental';
  const trendlineActive = showTrendline && hasSufficientTrendlinePoints(dataLength, mode);
  const avgActive =
    isIncremental &&
    showAverageComparison &&
    !isChartAverageComparisonDisabled(chartType, familySize, dataLength);
  const predEligible = isIncremental && hasPrediction;

  return (
    Number(trendlineActive) +
    Number(avgActive) +
    Number(predEligible && showPredictions) +
    Number(predEligible && showPastForecast)
  );
}
