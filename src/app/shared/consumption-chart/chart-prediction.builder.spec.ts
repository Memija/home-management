import { describe, it, expect, vi } from 'vitest';
import { appendPredictionDatasets, PredictionBuilderDeps } from './chart-prediction.builder';
import { ChartConfiguration } from 'chart.js';
import { LanguageService } from '../../services/language.service';
import { PredictionResult, MultiPredictionResult } from '../../models/prediction.models';
import { ConsumptionRecord } from '../../models/records.model';

// ─── Test helpers ─────────────────────────────────────────────────────────────

const makeLangService = (): LanguageService =>
  ({
    translate: vi.fn().mockImplementation((key: string) => key),
    formatDate: vi.fn().mockImplementation((_d: Date, opts: Intl.DateTimeFormatOptions) =>
      opts.year ? 'Feb 2024' : 'Feb',
    ),
  }) as unknown as LanguageService;

const makeRec = (dateStr: string): ConsumptionRecord => ({
  date: new Date(dateStr),
  kitchenWarm: 10,
  kitchenCold: 20,
  bathroomWarm: 5,
  bathroomCold: 15,
});

const makePrediction = (overrides: Partial<PredictionResult> = {}): PredictionResult => ({
  daily30: 50,
  daily30Min: 40,
  daily30Max: 60,
  daily90: 48,
  daily90Min: 38,
  daily90Max: 58,
  dailyHalfYear: 47,
  dailyHalfYearMin: 37,
  dailyHalfYearMax: 57,
  dailyYear: 46,
  dailyYearMin: 36,
  dailyYearMax: 56,
  dailyDecade: 45,
  dailyDecadeMin: 35,
  dailyDecadeMax: 55,
  monthlyRates: [],
  trend: 'stable',
  trendPercentage: 0,
  confidence: 'medium',
  averageDaily: 48,
  unit: 'L',
  ...overrides,
});

const makeMultiPrediction = (overrides?: Partial<PredictionResult>): MultiPredictionResult => ({
  total: makePrediction(overrides),
});

/** Minimal chart data with a single bar dataset */
const makeChartData = (dataValues: (number | null)[], labels?: string[]): ChartConfiguration['data'] => ({
  labels: labels ?? dataValues.map((_, i) => `Label${i}`),
  datasets: [{ data: dataValues, label: 'Total' }],
});

const makeDeps = (
  overrides: Partial<PredictionBuilderDeps> = {},
): PredictionBuilderDeps => ({
  languageService: makeLangService(),
  chartType: 'water',
  currentView: () => 'total',
  getData: () => [makeRec('2024-01-15'), makeRec('2024-02-15')],
  prediction: makeMultiPrediction(),
  predictionPeriod: 30,
  showPredictions: true,
  showPastForecast: false,
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('appendPredictionDatasets', () => {
  describe('early-exit conditions', () => {
    it('should return chart data unchanged when prediction is null', () => {
      const chartData = makeChartData([10, 20]);
      const result = appendPredictionDatasets(chartData, makeDeps({ prediction: null }));
      expect(result.datasets).toHaveLength(1);
      expect(result.labels).toHaveLength(2);
    });

    it('should return chart data unchanged when both showPredictions and showPastForecast are false', () => {
      const chartData = makeChartData([10, 20]);
      const result = appendPredictionDatasets(
        chartData,
        makeDeps({ showPredictions: false, showPastForecast: false }),
      );
      expect(result.datasets).toHaveLength(1);
    });

    it('should return chart data unchanged when datasets are empty', () => {
      const chartData: ChartConfiguration['data'] = { labels: [], datasets: [] };
      const result = appendPredictionDatasets(chartData, makeDeps());
      expect(result.datasets).toHaveLength(0);
    });
  });

  describe('showPredictions = true (total view)', () => {
    it('should add 3 prediction datasets (min, max, expected) for total view', () => {
      const chartData = makeChartData([10, 20]);
      const result = appendPredictionDatasets(chartData, makeDeps());
      // Original + min + max + expected
      expect(result.datasets).toHaveLength(4);
    });

    it('should extend labels by predictionMonths for 30-day period', () => {
      const chartData = makeChartData([10, 20]);
      const result = appendPredictionDatasets(chartData, makeDeps({ predictionPeriod: 30 }));
      // Original 2 labels + 1 future month
      expect(result.labels).toHaveLength(3);
    });

    it('should extend labels by 3 months for 90-day period', () => {
      const chartData = makeChartData([10, 20]);
      const result = appendPredictionDatasets(chartData, makeDeps({ predictionPeriod: 90 }));
      expect(result.labels).toHaveLength(5); // 2 original + 3 future
    });

    it('should extend labels by 6 months for 180-day period', () => {
      const chartData = makeChartData([10, 20]);
      const result = appendPredictionDatasets(chartData, makeDeps({ predictionPeriod: 180 }));
      expect(result.labels).toHaveLength(8); // 2 original + 6 future
    });

    it('should extend labels by 12 months for 365-day period', () => {
      const chartData = makeChartData([10, 20]);
      const result = appendPredictionDatasets(chartData, makeDeps({ predictionPeriod: 365 }));
      expect(result.labels).toHaveLength(14); // 2 original + 12 future
    });

    it('should extend labels by 120 months for 3650-day period', () => {
      const chartData = makeChartData([10, 20]);
      const result = appendPredictionDatasets(chartData, makeDeps({ predictionPeriod: 3650 }));
      expect(result.labels).toHaveLength(122); // 2 original + 120 future
    });

    it('should use yellow color for electricity chart predictions', () => {
      const chartData = makeChartData([10, 20]);
      const result = appendPredictionDatasets(
        chartData,
        makeDeps({ chartType: 'electricity', currentView: () => 'total' }),
      );
      const expectedDataset = result.datasets.find((ds) =>
        (ds as any).label?.includes('CHART.CONSUMPTION_PREDICTION'),
      );
      expect((expectedDataset as any)?.borderColor).toBe('#ffc107');
    });

    it('should use orange color for heating chart predictions', () => {
      const chartData = makeChartData([10, 20]);
      const result = appendPredictionDatasets(
        chartData,
        makeDeps({ chartType: 'heating', currentView: () => 'total' }),
      );
      const expectedDataset = result.datasets.find((ds) =>
        (ds as any).label?.includes('CHART.CONSUMPTION_PREDICTION'),
      );
      expect((expectedDataset as any)?.borderColor).toBe('#f57c00');
    });

    it('should use blue color for water chart predictions', () => {
      const chartData = makeChartData([10, 20]);
      const result = appendPredictionDatasets(chartData, makeDeps({ chartType: 'water' }));
      const expectedDataset = result.datasets.find((ds) =>
        (ds as any).label?.includes('CHART.CONSUMPTION_PREDICTION'),
      );
      expect((expectedDataset as any)?.borderColor).toBe('#1976d2');
    });

    it('expected dataset should have dashed border [4, 4]', () => {
      const chartData = makeChartData([10, 20]);
      const result = appendPredictionDatasets(chartData, makeDeps());
      const expectedDataset = result.datasets.find((ds) =>
        (ds as any).label?.includes('CHART.CONSUMPTION_PREDICTION'),
      );
      expect((expectedDataset as any)?.borderDash).toEqual([4, 4]);
    });

    it('min dataset should be transparent', () => {
      const chartData = makeChartData([10, 20]);
      const result = appendPredictionDatasets(chartData, makeDeps());
      const minDataset = result.datasets.find((ds) =>
        (ds as any).label?.includes('PREDICTIONS.MIN'),
      );
      expect((minDataset as any)?.borderColor).toBe('rgba(0, 0, 0, 0)');
    });

    it('prediction data arrays should start with null for past positions', () => {
      const chartData = makeChartData([10, 20]);
      const result = appendPredictionDatasets(chartData, makeDeps({ predictionPeriod: 30 }));
      const expectedDataset = result.datasets.find((ds) =>
        (ds as any).label?.includes('CHART.CONSUMPTION_PREDICTION'),
      );
      // First element at index 0 should be null (only index 1 = last actual, index 2 = future)
      expect((expectedDataset?.data as any[])[0]).toBeNull();
    });

    it('should anchor prediction at last actual data value', () => {
      const chartData = makeChartData([10, 20]);
      const result = appendPredictionDatasets(chartData, makeDeps({ predictionPeriod: 30 }));
      const expectedDataset = result.datasets.find((ds) =>
        (ds as any).label?.includes('CHART.CONSUMPTION_PREDICTION'),
      );
      // Index 1 = last actual value anchor
      expect((expectedDataset?.data as any[])[1]).toBe(20);
    });
  });

  describe('showPastForecast = true', () => {
    it('should add a past forecast dataset when historicalPredictions are available', () => {
      const pred = makeMultiPrediction();
      pred.total.historicalPredictions = [null, 45, 48];
      const chartData = makeChartData([10, 20]);
      const result = appendPredictionDatasets(
        chartData,
        makeDeps({ prediction: pred, showPredictions: false, showPastForecast: true }),
      );
      expect(result.datasets.some((ds) => (ds as any).label?.includes('CHART.PAST_FORECAST'))).toBe(true);
    });

    it('should not add past forecast dataset when historicalPredictions are not available', () => {
      const pred = makeMultiPrediction();
      // No historicalPredictions set
      const chartData = makeChartData([10, 20]);
      const result = appendPredictionDatasets(
        chartData,
        makeDeps({ prediction: pred, showPredictions: false, showPastForecast: true }),
      );
      expect(result.datasets.every((ds) => !(ds as any).label?.includes('CHART.PAST_FORECAST'))).toBe(true);
    });

    it('past forecast dataset should use purple color', () => {
      const pred = makeMultiPrediction();
      pred.total.historicalPredictions = [null, 45, 48];
      const chartData = makeChartData([10, 20]);
      const result = appendPredictionDatasets(
        chartData,
        makeDeps({ prediction: pred, showPredictions: false, showPastForecast: true }),
      );
      const pastDataset = result.datasets.find((ds) =>
        (ds as any).label?.includes('CHART.PAST_FORECAST'),
      );
      expect((pastDataset as any)?.borderColor).toBe('#9333ea');
    });

    it('should align historicalPredictions by slicing from index 1', () => {
      const pred = makeMultiPrediction();
      // Index 0 = null (no previous), index 1 = prediction for record[1], index 2 = for record[2]
      pred.total.historicalPredictions = [null, 45, 48];
      const chartData = makeChartData([10, 20]);
      const result = appendPredictionDatasets(
        chartData,
        makeDeps({ prediction: pred, showPredictions: false, showPastForecast: true }),
      );
      const pastDataset = result.datasets.find((ds) =>
        (ds as any).label?.includes('CHART.PAST_FORECAST'),
      );
      // Sliced from index 1: [45, 48], padded to labels.length (2) → [45, 48]
      expect((pastDataset?.data as any[])[0]).toBe(45);
      expect((pastDataset?.data as any[])[1]).toBe(48);
    });
  });

  describe('trendline extension', () => {
    it('should extend trendline dataset into the prediction zone', () => {
      const trendlineLabel = 'CHART.TRENDLINE';
      const chartData: ChartConfiguration['data'] = {
        labels: ['Jan', 'Feb'],
        datasets: [
          { data: [10, 20], label: 'Total' },
          {
            data: [12, 18],
            label: trendlineLabel,
            borderColor: '#ff0000',
            borderWidth: 1.5,
          },
        ],
      };
      const deps = makeDeps({
        predictionPeriod: 30,
        showPredictions: true,
      });
      // Make translate return the key so trendline detection works
      (deps.languageService.translate as ReturnType<typeof vi.fn>).mockImplementation((k: string) => k);

      const result = appendPredictionDatasets(chartData, deps);
      const extensions = result.datasets.filter((ds) => (ds as any).isPredictionExtension);
      expect(extensions).toHaveLength(1);
    });

    it('trendline extension should have a semi-transparent color (hex + 80)', () => {
      const chartData: ChartConfiguration['data'] = {
        labels: ['Jan', 'Feb'],
        datasets: [
          { data: [10, 20], label: 'Total' },
          {
            data: [12, 18],
            label: 'CHART.TRENDLINE',
            borderColor: '#ff0000',
            borderWidth: 1.5,
          },
        ],
      };
      const deps = makeDeps({ predictionPeriod: 30 });
      (deps.languageService.translate as ReturnType<typeof vi.fn>).mockImplementation((k: string) => k);

      const result = appendPredictionDatasets(chartData, deps);
      const ext = result.datasets.find((ds) => (ds as any).isPredictionExtension);
      expect((ext as any)?.borderColor).toBe('#ff000080');
    });

    it('trendline extension should use wider dash pattern [3, 6]', () => {
      const chartData: ChartConfiguration['data'] = {
        labels: ['Jan', 'Feb'],
        datasets: [
          { data: [10, 20], label: 'Total' },
          { data: [12, 18], label: 'CHART.TRENDLINE', borderColor: '#ff0000' },
        ],
      };
      const deps = makeDeps({ predictionPeriod: 30 });
      (deps.languageService.translate as ReturnType<typeof vi.fn>).mockImplementation((k: string) => k);

      const result = appendPredictionDatasets(chartData, deps);
      const ext = result.datasets.find((ds) => (ds as any).isPredictionExtension);
      expect((ext as any)?.borderDash).toEqual([3, 6]);
    });
  });

  describe('dataset isolation — original data not mutated', () => {
    it('should not mutate the input chartData object', () => {
      const original = makeChartData([10, 20]);
      const originalDatasetCount = original.datasets.length;
      const originalLabelCount = (original.labels as string[]).length;

      appendPredictionDatasets(original, makeDeps());

      expect(original.datasets).toHaveLength(originalDatasetCount);
      expect(original.labels).toHaveLength(originalLabelCount);
    });
  });

  describe('seasonal prediction rates', () => {
    it('should use seasonal monthly rates when available', () => {
      const monthlyRates = Array.from({ length: 12 }, (_, i) => ({
        expected: 40 + i,
        min: 30 + i,
        max: 50 + i,
      }));
      const pred = makeMultiPrediction({ monthlyRates, averageDaily: 48 });
      const chartData = makeChartData([10, 20]);
      const result = appendPredictionDatasets(chartData, makeDeps({ prediction: pred, predictionPeriod: 30 }));
      // Should have prediction datasets added — seasonal path taken
      expect(result.datasets.length).toBeGreaterThan(1);
    });
  });
});
