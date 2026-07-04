import { LocalStorageService } from '../../services/local-storage.service';

export type ChartTypeKey = 'water' | 'home' | 'heating' | 'electricity';

/**
 * Reads and writes chart toggle preferences from LocalStorage.
 */
export class ChartToggleState {
  constructor(
    private readonly localStorageService: LocalStorageService,
    private readonly chartType: ChartTypeKey,
  ) { }

  // ─── Trendline ────────────────────────────────────────────────────────────

  getTrendlineVisibility(): boolean {
    const key = `${this.chartType}_chart_trendline_visible`;
    const stored = this.localStorageService.getPreference(key);
    return stored === null ? true : stored === 'true';
  }

  saveTrendlineVisibility(visible: boolean): void {
    const key = `${this.chartType}_chart_trendline_visible`;
    this.localStorageService.setPreference(key, visible.toString());
  }

  // ─── Average comparison ───────────────────────────────────────────────────

  getAverageComparisonVisibility(): boolean {
    const key = `${this.chartType}_chart_average_visible`;
    const stored = this.localStorageService.getPreference(key);
    // Default: true for water, false for others
    if (stored === null) {
      return this.chartType === 'water';
    }
    return stored === 'true';
  }

  saveAverageComparisonVisibility(visible: boolean): void {
    const key = `${this.chartType}_chart_average_visible`;
    this.localStorageService.setPreference(key, visible.toString());
  }

  // ─── Predictions ──────────────────────────────────────────────────────────

  getPredictionsVisibility(view: string): boolean {
    const stored = this.localStorageService.getPreference(
      `${this.chartType}_${view}_show_predictions`,
    );
    return stored === null ? true : stored === 'true';
  }

  savePredictionsVisibility(view: string, visible: boolean): void {
    this.localStorageService.setPreference(
      `${this.chartType}_${view}_show_predictions`,
      String(visible),
    );
  }

  // ─── Past forecast ────────────────────────────────────────────────────────

  getPastForecastVisibility(view: string): boolean {
    const stored = this.localStorageService.getPreference(
      `${this.chartType}_${view}_show_past_forecast`,
    );
    return stored === null ? false : stored === 'true';
  }

  savePastForecastVisibility(view: string, visible: boolean): void {
    this.localStorageService.setPreference(
      `${this.chartType}_${view}_show_past_forecast`,
      String(visible),
    );
  }
}
