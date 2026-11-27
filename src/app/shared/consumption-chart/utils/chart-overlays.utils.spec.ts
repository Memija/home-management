import { describe, expect, it } from 'vitest';
import {
  computeActiveChartOverlays,
  hasAvailableChartOverlays,
  hasSufficientTrendlinePoints,
  isChartAverageComparisonDisabled,
} from './chart-overlays.utils';

describe('chart-overlays.utils', () => {
  it('should check minimum point counts for trendline across display modes', () => {
    expect(hasSufficientTrendlinePoints(2, 'total')).toBe(true);
    expect(hasSufficientTrendlinePoints(1, 'total')).toBe(false);
    expect(hasSufficientTrendlinePoints(2, 'incremental')).toBe(false);
    expect(hasSufficientTrendlinePoints(3, 'incremental')).toBe(true);
  });

  it('should determine overlay availability and average comparison disabled state', () => {
    expect(hasAvailableChartOverlays('home', 'incremental')).toBe(false);
    expect(hasAvailableChartOverlays('heating', 'total')).toBe(true);
    expect(hasAvailableChartOverlays('water', 'total')).toBe(false);
    expect(hasAvailableChartOverlays('water', 'incremental')).toBe(true);

    expect(isChartAverageComparisonDisabled('water', 0, 5)).toBe(true);
    expect(isChartAverageComparisonDisabled('heating', 0, 5)).toBe(false);
    expect(isChartAverageComparisonDisabled('water', 2, 2)).toBe(true);
    expect(isChartAverageComparisonDisabled('water', 2, 3)).toBe(false);
  });

  it('should count active overlays accurately', () => {
    expect(
      computeActiveChartOverlays({
        chartType: 'water',
        mode: 'incremental',
        dataLength: 4,
        familySize: 3,
        showTrendline: true,
        showAverageComparison: true,
        hasPrediction: true,
        showPredictions: true,
        showPastForecast: false,
      }),
    ).toBe(3);

    expect(
      computeActiveChartOverlays({
        chartType: 'home',
        mode: 'incremental',
        dataLength: 10,
        familySize: 4,
        showTrendline: true,
        showAverageComparison: true,
        hasPrediction: true,
        showPredictions: true,
        showPastForecast: true,
      }),
    ).toBe(0);
  });
});
