import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildChartOptions, ChartOptionsBuilderDeps } from './chart-options.builder';
import { LanguageService } from '../../services/language.service';
import { ChartDataPoint } from '../../models/consumption-chart.model';

// ─── Shared test helpers ──────────────────────────────────────────────────────

/**
 * Creates a minimal LanguageService stub.
 * By default translate() returns the key itself, making assertions
 * independent of the actual translation strings.
 */
const makeLangService = (translations: Record<string, string> = {}): LanguageService =>
  ({
    translate: vi.fn().mockImplementation((key: string) => translations[key] ?? key),
    formatDate: vi.fn().mockReturnValue('Monday, 1 January 2024'),
  }) as unknown as LanguageService;

const makeDataPoint = (date: string): ChartDataPoint => ({
  date: new Date(date),
  value: 100,
});

/**
 * Creates a minimal Chart.js chart stub with spies on the methods used by
 * the legend click handler.
 */
const makeChart = (datasets: Array<{ label?: string;[key: string]: unknown }>) => ({
  data: { datasets },
  isDatasetVisible: vi.fn().mockReturnValue(true),
  setDatasetVisibility: vi.fn(),
  update: vi.fn(),
});

// ─── buildChartOptions ────────────────────────────────────────────────────────

describe('buildChartOptions', () => {
  const makeDeps = (chartType: ChartOptionsBuilderDeps['chartType'] = 'water'): ChartOptionsBuilderDeps => ({
    languageService: makeLangService(),
    chartType,
    getData: () => [],
  });

  it('should return responsive options', () => {
    const options = buildChartOptions(makeDeps());
    expect(options?.responsive).toBe(true);
    expect(options?.maintainAspectRatio).toBe(false);
  });

  describe('Y-axis unit label', () => {
    it('should use kWh label for heating', () => {
      const langService = makeLangService({ 'CHART.AXIS_KWH': 'kWh', 'CHART.AXIS_LITERS': 'L' });
      const options = buildChartOptions({ languageService: langService, chartType: 'heating', getData: () => [] });
      expect((options?.scales as any)?.y?.title?.text).toBe('kWh');
    });

    it('should use kWh label for electricity', () => {
      const langService = makeLangService({ 'CHART.AXIS_KWH': 'kWh', 'CHART.AXIS_LITERS': 'L' });
      const options = buildChartOptions({ languageService: langService, chartType: 'electricity', getData: () => [] });
      expect((options?.scales as any)?.y?.title?.text).toBe('kWh');
    });

    it('should use liters label for water', () => {
      const langService = makeLangService({ 'CHART.AXIS_KWH': 'kWh', 'CHART.AXIS_LITERS': 'L' });
      const options = buildChartOptions({ languageService: langService, chartType: 'water', getData: () => [] });
      expect((options?.scales as any)?.y?.title?.text).toBe('L');
    });

    it('should use liters label for home', () => {
      const langService = makeLangService({ 'CHART.AXIS_KWH': 'kWh', 'CHART.AXIS_LITERS': 'L' });
      const options = buildChartOptions({ languageService: langService, chartType: 'home', getData: () => [] });
      expect((options?.scales as any)?.y?.title?.text).toBe('L');
    });
  });

  describe('summerSun plugin', () => {
    it('should enable summerSun only for heating', () => {
      const options = buildChartOptions(makeDeps('heating'));
      expect((options?.plugins as any)?.summerSun?.enabled).toBe(true);
    });

    it('should disable summerSun for water', () => {
      const options = buildChartOptions(makeDeps('water'));
      expect((options?.plugins as any)?.summerSun?.enabled).toBe(false);
    });

    it('should disable summerSun for electricity', () => {
      const options = buildChartOptions(makeDeps('electricity'));
      expect((options?.plugins as any)?.summerSun?.enabled).toBe(false);
    });

    it('should pass getData records to summerSun for heating', () => {
      const points = [makeDataPoint('2024-01-15')];
      const options = buildChartOptions({
        languageService: makeLangService(),
        chartType: 'heating',
        getData: () => points,
      });
      expect((options?.plugins as any)?.summerSun?.records).toBe(points);
    });

    it('should pass empty array to summerSun for non-heating types', () => {
      const options = buildChartOptions({
        languageService: makeLangService(),
        chartType: 'water',
        getData: () => [makeDataPoint('2024-01-15')],
      });
      expect((options?.plugins as any)?.summerSun?.records).toEqual([]);
    });
  });

  describe('newYearMarker plugin', () => {
    it('should always be enabled', () => {
      for (const chartType of ['water', 'home', 'heating', 'electricity'] as const) {
        const options = buildChartOptions(makeDeps(chartType));
        expect((options?.plugins as any)?.newYearMarker?.enabled).toBe(true);
      }
    });

    it('should pass getData records for all chart types', () => {
      const points = [makeDataPoint('2024-01-15')];
      const options = buildChartOptions({
        languageService: makeLangService(),
        chartType: 'water',
        getData: () => points,
      });
      expect((options?.plugins as any)?.newYearMarker?.records).toBe(points);
    });
  });
});

// ─── Legend filter (buildLegendFilter) ───────────────────────────────────────

describe('legend filter', () => {
  const getFilter = (translations: Record<string, string> = {}) => {
    const langService = makeLangService(translations);
    const options = buildChartOptions({
      languageService: langService,
      chartType: 'water',
      getData: () => [],
    });
    return (options?.plugins as any)?.legend?.labels?.filter as Function;
  };

  const makeData = (datasets: Array<{ label?: string;[key: string]: unknown }>) => ({ datasets });

  it('should hide dataset labelled as PREDICTIONS.MIN translation', () => {
    const filter = getFilter({ 'PREDICTIONS.MIN': 'Min', 'PREDICTIONS.MAX': 'Max' });
    const legendItem = { text: 'Min', datasetIndex: 0 };
    expect(filter(legendItem, makeData([{ label: 'Min' }]))).toBe(false);
  });

  it('should hide dataset labelled as PREDICTIONS.MAX translation', () => {
    const filter = getFilter({ 'PREDICTIONS.MIN': 'Min', 'PREDICTIONS.MAX': 'Max' });
    const legendItem = { text: 'Max', datasetIndex: 0 };
    expect(filter(legendItem, makeData([{ label: 'Max' }]))).toBe(false);
  });

  it('should hide dataset with isPredictionExtension flag', () => {
    const filter = getFilter();
    const legendItem = { text: 'Kitchen Warm (predicted)', datasetIndex: 0 };
    const data = makeData([{ label: 'Kitchen Warm (predicted)', isPredictionExtension: true }]);
    expect(filter(legendItem, data)).toBe(false);
  });

  it('should show normal datasets', () => {
    const filter = getFilter({ 'PREDICTIONS.MIN': 'Min', 'PREDICTIONS.MAX': 'Max' });
    const legendItem = { text: 'Kitchen Warm', datasetIndex: 0 };
    expect(filter(legendItem, makeData([{ label: 'Kitchen Warm' }]))).toBe(true);
  });

  it('should show dataset when datasetIndex is undefined', () => {
    const filter = getFilter();
    const legendItem = { text: 'Something' };
    expect(filter(legendItem, makeData([]))).toBe(true);
  });
});

// ─── Legend click handler ─────────────────────────────────────────────────────

describe('legend click handler', () => {
  const TRANSLATIONS = {
    'CHART.CONSUMPTION_PREDICTION': 'Prediction',
    'CHART.TRENDLINE': 'Trendline',
    'CHART.COUNTRY_AVERAGE': 'Average',
    // Use a string that is NOT a substring of any category label (e.g. 'Kitchen Total')
    // to avoid the total-view branch triggering for category labels.
    'CHART.TOTAL_WEEKLY_CONSUMPTION': 'Weekly Total View',
    'PREDICTIONS.MIN': 'Min',
    'PREDICTIONS.MAX': 'Max',
  };

  const getHandler = () => {
    const langService = makeLangService(TRANSLATIONS);
    const options = buildChartOptions({
      languageService: langService,
      chartType: 'water',
      getData: () => [],
    });
    return (options?.plugins as any)?.legend?.onClick as Function;
  };

  it('should return early when datasetIndex is undefined', () => {
    const handler = getHandler();
    const chart = makeChart([{ label: 'Kitchen' }]);
    handler({}, { datasetIndex: undefined }, { chart });
    expect(chart.setDatasetVisibility).not.toHaveBeenCalled();
  });

  it('should toggle the clicked dataset visibility', () => {
    const handler = getHandler();
    const chart = makeChart([{ label: 'Kitchen' }]);
    // isDatasetVisible returns true → isHidden = !true = false → setDatasetVisibility(0, false)
    chart.isDatasetVisible.mockReturnValue(true);
    handler({}, { datasetIndex: 0 }, { chart });
    expect(chart.setDatasetVisibility).toHaveBeenCalledWith(0, false);
    expect(chart.update).toHaveBeenCalled();
  });

  describe('prediction band sync', () => {
    it('should toggle Min/Max band datasets when prediction line is clicked', () => {
      const handler = getHandler();
      const datasets = [
        { label: 'Prediction expected' },
        { label: 'Min' },
        { label: 'Max' },
      ];
      const chart = makeChart(datasets);
      chart.isDatasetVisible.mockReturnValue(true);

      handler({}, { datasetIndex: 0 }, { chart });

      expect(chart.setDatasetVisibility).toHaveBeenCalledWith(1, false);
      expect(chart.setDatasetVisibility).toHaveBeenCalledWith(2, false);
    });

    it('should match categoryId when syncing prediction band in by-room mode', () => {
      const handler = getHandler();
      const datasets = [
        { label: 'Prediction expected', categoryId: 'kitchen' },
        { label: 'Min', categoryId: 'kitchen' },
        { label: 'Max', categoryId: 'bathroom' }, // different category — must be skipped
      ];
      const chart = makeChart(datasets);
      chart.isDatasetVisible.mockReturnValue(true);

      handler({}, { datasetIndex: 0 }, { chart });

      expect(chart.setDatasetVisibility).toHaveBeenCalledWith(1, false);
      expect(chart.setDatasetVisibility).not.toHaveBeenCalledWith(2, expect.anything());
    });
  });

  describe('trendline/average sync — total view', () => {
    it('should toggle standalone trendline and average datasets when total series is clicked', () => {
      const handler = getHandler();
      const datasets = [
        // Label must contain the TOTAL_WEEKLY_CONSUMPTION translation ('Weekly Total View')
        { label: 'Weekly Total View' },
        { label: 'Trendline' },
        { label: 'Average' },
        { label: 'Kitchen Warm' }, // unrelated — must not be toggled
      ];
      const chart = makeChart(datasets);
      chart.isDatasetVisible.mockReturnValue(true);

      handler({}, { datasetIndex: 0 }, { chart });

      expect(chart.setDatasetVisibility).toHaveBeenCalledWith(1, false);
      expect(chart.setDatasetVisibility).toHaveBeenCalledWith(2, false);
      expect(chart.setDatasetVisibility).not.toHaveBeenCalledWith(3, expect.anything());
    });
  });

  describe('trendline/average sync — category view', () => {
    it('should toggle category trendline when category series is clicked', () => {
      const handler = getHandler();
      const datasets = [
        { label: 'Kitchen Total' },
        { label: 'Kitchen Trendline' },
        { label: 'Kitchen Average' },
        { label: 'Bathroom Trendline' }, // different category — must not be toggled
      ];
      const chart = makeChart(datasets);
      chart.isDatasetVisible.mockReturnValue(true);

      handler({}, { datasetIndex: 0 }, { chart });

      expect(chart.setDatasetVisibility).toHaveBeenCalledWith(1, false);
      expect(chart.setDatasetVisibility).toHaveBeenCalledWith(2, false);
      expect(chart.setDatasetVisibility).not.toHaveBeenCalledWith(3, expect.anything());
    });

    it('should not sync related datasets when a trendline itself is clicked', () => {
      const handler = getHandler();
      const datasets = [
        { label: 'Kitchen Total' },
        { label: 'Kitchen Trendline' },
      ];
      const chart = makeChart(datasets);
      chart.isDatasetVisible.mockReturnValue(true);

      // Click the trendline (index 1) — syncRelatedDatasets must be skipped
      handler({}, { datasetIndex: 1 }, { chart });

      expect(chart.setDatasetVisibility).toHaveBeenCalledTimes(1);
      expect(chart.setDatasetVisibility).toHaveBeenCalledWith(1, false);
    });
  });
});

// ─── Suffix stripping in syncRelatedDatasets ──────────────────────────────────

describe('category suffix stripping (syncRelatedDatasets)', () => {
  const TRANSLATIONS = {
    'CHART.CONSUMPTION_PREDICTION': 'Prediction',
    'CHART.TRENDLINE': 'Trendline',
    'CHART.COUNTRY_AVERAGE': 'Average',
    'CHART.TOTAL_WEEKLY_CONSUMPTION': 'Total weekly consumption',
    'PREDICTIONS.MIN': 'Min',
    'PREDICTIONS.MAX': 'Max',
  };

  const clickAndCapture = (
    clickedLabel: string,
    allDatasets: Array<{ label: string }>,
  ) => {
    const langService = makeLangService(TRANSLATIONS);
    const options = buildChartOptions({ languageService: langService, chartType: 'water', getData: () => [] });
    const handler = (options?.plugins as any)?.legend?.onClick as Function;

    const chart = makeChart(allDatasets);
    chart.isDatasetVisible.mockReturnValue(true);

    const clickedIndex = allDatasets.findIndex((d) => d.label === clickedLabel);
    handler({}, { datasetIndex: clickedIndex }, { chart });
    return chart;
  };

  it('should strip " Total" suffix and sync trendline', () => {
    const chart = clickAndCapture('Kitchen Total', [
      { label: 'Kitchen Total' },
      { label: 'Kitchen Trendline' },
      { label: 'Bathroom Trendline' },
    ]);
    expect(chart.setDatasetVisibility).toHaveBeenCalledWith(1, false);
    expect(chart.setDatasetVisibility).not.toHaveBeenCalledWith(2, expect.anything());
  });

  it('should strip " Gesamt" suffix and sync trendline', () => {
    const chart = clickAndCapture('Küche Gesamt', [
      { label: 'Küche Gesamt' },
      { label: 'Küche Trendline' },
      { label: 'Bad Trendline' },
    ]);
    expect(chart.setDatasetVisibility).toHaveBeenCalledWith(1, false);
    expect(chart.setDatasetVisibility).not.toHaveBeenCalledWith(2, expect.anything());
  });

  it('should use the full label as category for " Warm" detailed-view datasets', () => {
    const chart = clickAndCapture('Kitchen Warm', [
      { label: 'Kitchen Warm' },
      { label: 'Kitchen Warm Trendline' },
      { label: 'Bathroom Warm Trendline' },
    ]);
    expect(chart.setDatasetVisibility).toHaveBeenCalledWith(1, false);
    expect(chart.setDatasetVisibility).not.toHaveBeenCalledWith(2, expect.anything());
  });

  it('should use the full label as category for " Kalt" detailed-view datasets', () => {
    const chart = clickAndCapture('Kitchen Kalt', [
      { label: 'Kitchen Kalt' },
      { label: 'Kitchen Kalt Trendline' },
      { label: 'Bathroom Kalt Trendline' },
    ]);
    expect(chart.setDatasetVisibility).toHaveBeenCalledWith(1, false);
    expect(chart.setDatasetVisibility).not.toHaveBeenCalledWith(2, expect.anything());
  });

  it('should use the full label as category for " Cold" detailed-view datasets', () => {
    const chart = clickAndCapture('Kitchen Cold', [
      { label: 'Kitchen Cold' },
      { label: 'Kitchen Cold Trendline' },
      { label: 'Bathroom Cold Trendline' },
    ]);
    expect(chart.setDatasetVisibility).toHaveBeenCalledWith(1, false);
    expect(chart.setDatasetVisibility).not.toHaveBeenCalledWith(2, expect.anything());
  });
});

// ─── Tooltip title callback (buildTooltipTitleCallback) ───────────────────────

describe('tooltip title callback', () => {
  const getTitle = (data: ChartDataPoint[]) => {
    const langService = makeLangService();
    const options = buildChartOptions({
      languageService: langService,
      chartType: 'water',
      getData: () => data,
    });
    return (options?.plugins as any)?.tooltip?.callbacks?.title as Function;
  };

  it('should return empty string when tooltipItems is empty', () => {
    const title = getTitle([]);
    expect(title([])).toBe('');
  });

  it('should call formatDate for a past data point', () => {
    const data = [makeDataPoint('2024-01-15')];
    const langService = makeLangService();
    const options = buildChartOptions({ languageService: langService, chartType: 'water', getData: () => data });
    const title = (options?.plugins as any)?.tooltip?.callbacks?.title as Function;

    title([{ dataIndex: 0, label: '2024-01-15', dataset: {} }]);

    expect(langService.formatDate).toHaveBeenCalledWith(
      new Date(data[0].date),
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
    );
  });

  it('should compute a future date that is one month ahead for the first prediction point', () => {
    const data = [makeDataPoint('2024-01-15'), makeDataPoint('2024-02-15')];
    const langService = makeLangService();
    const options = buildChartOptions({ languageService: langService, chartType: 'water', getData: () => data });
    const title = (options?.plugins as any)?.tooltip?.callbacks?.title as Function;

    // dataIndex 2 = 1 month beyond last historical point (Feb 2024 → Mar 2024)
    title([{ dataIndex: 2, label: 'future', dataset: {} }]);

    const dateArg = (langService.formatDate as ReturnType<typeof vi.fn>).mock.calls[0][0] as Date;
    expect(dateArg.getMonth()).toBe(2); // March (0-indexed)
    expect(dateArg.getFullYear()).toBe(2024);
  });

  it('should return item.label as fallback when there is no historical data', () => {
    const title = getTitle([]);
    const result = title([{ dataIndex: 0, label: 'fallback-label', dataset: {} }]);
    expect(result).toBe('fallback-label');
  });
});

// ─── Tooltip label callback (buildTooltipLabelCallback) ───────────────────────

describe('tooltip label callback', () => {
  const getLabel = (chartType: ChartOptionsBuilderDeps['chartType']) => {
    const langService = makeLangService({ 'CHART.ESTIMATED_MONTHLY': '(est. {{days}} days)' });
    const options = buildChartOptions({ languageService: langService, chartType, getData: () => [] });
    return (options?.plugins as any)?.tooltip?.callbacks?.label as Function;
  };

  it('should use L unit for water', () => {
    const label = getLabel('water');
    const result = label({ dataset: { label: 'Kitchen' }, parsed: { y: 150 }, dataIndex: 0 });
    expect(result).toContain('L');
    expect(result).not.toContain('kWh');
  });

  it('should use L unit for home', () => {
    const label = getLabel('home');
    const result = label({ dataset: { label: 'Kitchen' }, parsed: { y: 150 }, dataIndex: 0 });
    expect(result).toContain('L');
  });

  it('should use kWh unit for heating', () => {
    const label = getLabel('heating');
    const result = label({ dataset: { label: 'Bedroom' }, parsed: { y: 200 }, dataIndex: 0 });
    expect(result).toContain('kWh');
    expect(result).not.toContain(' L');
  });

  it('should use kWh unit for electricity', () => {
    const label = getLabel('electricity');
    const result = label({ dataset: { label: 'Total' }, parsed: { y: 300 }, dataIndex: 0 });
    expect(result).toContain('kWh');
  });

  it('should round non-integer values', () => {
    const label = getLabel('water');
    const result = label({ dataset: { label: 'Kitchen' }, parsed: { y: 123.7 }, dataIndex: 0 });
    expect(result).toContain('124');
    expect(result).not.toContain('123.7');
  });

  it('should include dataset label in output', () => {
    const label = getLabel('water');
    const result = label({ dataset: { label: 'Kitchen Warm' }, parsed: { y: 100 }, dataIndex: 0 });
    expect(result).toContain('Kitchen Warm');
  });

  it('should append normalized-period note when normalizedData has days', () => {
    // Mock translate to also perform {{param}} interpolation, mimicking the real service
    const langService = {
      translate: vi.fn().mockImplementation((key: string, params?: Record<string, string | number>) => {
        const templates: Record<string, string> = {
          'CHART.ESTIMATED_MONTHLY': '(est. {{days}} days)',
        };
        let result = templates[key] ?? key;
        if (params) {
          Object.entries(params).forEach(([k, v]) => {
            result = result.replace(`{{${k}}}`, String(v));
          });
        }
        return result;
      }),
      formatDate: vi.fn().mockReturnValue('Monday, 1 January 2024'),
    } as unknown as LanguageService;

    const options = buildChartOptions({ languageService: langService, chartType: 'water', getData: () => [] });
    const label = (options?.plugins as any)?.tooltip?.callbacks?.label as Function;

    const result = label({
      dataset: {
        label: 'Kitchen',
        normalizedData: [null, { days: 28.5 }],
      },
      parsed: { y: 100 },
      dataIndex: 1,
    });

    expect(result).toContain('(est. 28.5 days)');
  });

  it('should not append normalized-period note when normalizedData is absent', () => {
    const label = getLabel('water');
    const result = label({ dataset: { label: 'Kitchen' }, parsed: { y: 100 }, dataIndex: 0 });
    expect(result).toBe('Kitchen: 100 L');
  });
});
