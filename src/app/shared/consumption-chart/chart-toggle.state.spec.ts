import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChartToggleState } from './chart-toggle.state';
import { LocalStorageService } from '../../services/local-storage.service';

const makeStorage = (storedValue: string | null = null): LocalStorageService => ({
  getPreference: vi.fn().mockReturnValue(storedValue),
  setPreference: vi.fn(),
  removePreference: vi.fn(),
} as unknown as LocalStorageService);

describe('ChartToggleState', () => {
  // ─── Trendline ────────────────────────────────────────────────────────────

  describe('getTrendlineVisibility', () => {
    it('should return true when no stored value', () => {
      const state = new ChartToggleState(makeStorage(null), 'water');
      expect(state.getTrendlineVisibility()).toBe(true);
    });

    it('should return true when stored value is "true"', () => {
      const state = new ChartToggleState(makeStorage('true'), 'water');
      expect(state.getTrendlineVisibility()).toBe(true);
    });

    it('should return false when stored value is "false"', () => {
      const state = new ChartToggleState(makeStorage('false'), 'water');
      expect(state.getTrendlineVisibility()).toBe(false);
    });

    it('should read from the correct key per chartType', () => {
      const storage = makeStorage(null);
      const state = new ChartToggleState(storage, 'heating');
      state.getTrendlineVisibility();
      expect(storage.getPreference).toHaveBeenCalledWith('heating_chart_trendline_visible');
    });
  });

  describe('saveTrendlineVisibility', () => {
    it('should write "true" to the correct key', () => {
      const storage = makeStorage();
      new ChartToggleState(storage, 'water').saveTrendlineVisibility(true);
      expect(storage.setPreference).toHaveBeenCalledWith('water_chart_trendline_visible', 'true');
    });

    it('should write "false" to the correct key', () => {
      const storage = makeStorage();
      new ChartToggleState(storage, 'electricity').saveTrendlineVisibility(false);
      expect(storage.setPreference).toHaveBeenCalledWith('electricity_chart_trendline_visible', 'false');
    });
  });

  // ─── Average comparison ───────────────────────────────────────────────────

  describe('getAverageComparisonVisibility', () => {
    it('should default to true for water when no stored value', () => {
      const state = new ChartToggleState(makeStorage(null), 'water');
      expect(state.getAverageComparisonVisibility()).toBe(true);
    });

    it('should default to false for heating when no stored value', () => {
      const state = new ChartToggleState(makeStorage(null), 'heating');
      expect(state.getAverageComparisonVisibility()).toBe(false);
    });

    it('should default to false for electricity when no stored value', () => {
      const state = new ChartToggleState(makeStorage(null), 'electricity');
      expect(state.getAverageComparisonVisibility()).toBe(false);
    });

    it('should default to false for home when no stored value', () => {
      const state = new ChartToggleState(makeStorage(null), 'home');
      expect(state.getAverageComparisonVisibility()).toBe(false);
    });

    it('should return stored true value regardless of chartType default', () => {
      const state = new ChartToggleState(makeStorage('true'), 'heating');
      expect(state.getAverageComparisonVisibility()).toBe(true);
    });

    it('should return stored false value regardless of chartType default', () => {
      const state = new ChartToggleState(makeStorage('false'), 'water');
      expect(state.getAverageComparisonVisibility()).toBe(false);
    });
  });

  describe('saveAverageComparisonVisibility', () => {
    it('should write to the correct key', () => {
      const storage = makeStorage();
      new ChartToggleState(storage, 'water').saveAverageComparisonVisibility(false);
      expect(storage.setPreference).toHaveBeenCalledWith('water_chart_average_visible', 'false');
    });
  });

  // ─── Predictions ──────────────────────────────────────────────────────────

  describe('getPredictionsVisibility', () => {
    it('should return true when no stored value (default on)', () => {
      const state = new ChartToggleState(makeStorage(null), 'water');
      expect(state.getPredictionsVisibility('total')).toBe(true);
    });

    it('should return false when stored value is "false"', () => {
      const state = new ChartToggleState(makeStorage('false'), 'water');
      expect(state.getPredictionsVisibility('total')).toBe(false);
    });

    it('should read from key containing chartType and view', () => {
      const storage = makeStorage(null);
      new ChartToggleState(storage, 'heating').getPredictionsVisibility('by-room');
      expect(storage.getPreference).toHaveBeenCalledWith('heating_by-room_show_predictions');
    });
  });

  describe('savePredictionsVisibility', () => {
    it('should write to key containing chartType and view', () => {
      const storage = makeStorage();
      new ChartToggleState(storage, 'water').savePredictionsVisibility('total', false);
      expect(storage.setPreference).toHaveBeenCalledWith('water_total_show_predictions', 'false');
    });
  });

  // ─── Past forecast ────────────────────────────────────────────────────────

  describe('getPastForecastVisibility', () => {
    it('should return false when no stored value (default off)', () => {
      const state = new ChartToggleState(makeStorage(null), 'water');
      expect(state.getPastForecastVisibility('total')).toBe(false);
    });

    it('should return true when stored value is "true"', () => {
      const state = new ChartToggleState(makeStorage('true'), 'water');
      expect(state.getPastForecastVisibility('total')).toBe(true);
    });

    it('should read from key containing chartType and view', () => {
      const storage = makeStorage(null);
      new ChartToggleState(storage, 'electricity').getPastForecastVisibility('total');
      expect(storage.getPreference).toHaveBeenCalledWith('electricity_total_show_past_forecast');
    });
  });

  describe('savePastForecastVisibility', () => {
    it('should write to key containing chartType and view', () => {
      const storage = makeStorage();
      new ChartToggleState(storage, 'heating').savePastForecastVisibility('by-room', true);
      expect(storage.setPreference).toHaveBeenCalledWith('heating_by-room_show_past_forecast', 'true');
    });
  });
});
