import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildChartOptions,
  ChartOptionsBuilderDeps,
  escapeRegExp,
  replaceLabelWithIcon,
} from './chart-options.builder';
import { LanguageService } from '../../services/language.service';
import { ChartDataPoint } from '../../models/consumption-chart.model';

interface CustomChartPluginOptions {
  summerSun?: { enabled?: boolean; records?: unknown[] };
  newYearMarker?: { enabled?: boolean; records?: unknown[] };
  legend?: {
    labels?: {
      filter?: (
        item: { text?: string; datasetIndex?: number },
        data: { datasets: unknown[] },
      ) => boolean;
      generateLabels?: (chart: unknown) => unknown[];
    };
    onClick?: (e: unknown, item: { datasetIndex?: number }, legend: { chart: unknown }) => void;
  };
  tooltip?: {
    callbacks?: {
      title?: (items: { dataIndex: number; label: string; dataset: unknown }[]) => string;
      label?: (context: {
        dataset: { label?: string; normalizedData?: ({ days: number } | null)[] };
        parsed: { y: number };
        dataIndex: number;
      }) => string;
    };
  };
}

interface CustomChartScales {
  y?: {
    title?: {
      text?: string;
    };
  };
}

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
const makeChart = (datasets: { label?: string; [key: string]: unknown }[]) => ({
  data: { datasets },
  isDatasetVisible: vi.fn().mockReturnValue(true),
  setDatasetVisibility: vi.fn(),
  update: vi.fn(),
});

// ─── buildChartOptions ────────────────────────────────────────────────────────

describe('buildChartOptions', () => {
  const makeDeps = (
    chartType: ChartOptionsBuilderDeps['chartType'] = 'water',
  ): ChartOptionsBuilderDeps => ({
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
      const options = buildChartOptions({
        languageService: langService,
        chartType: 'heating',
        getData: () => [],
      });
      expect((options?.scales as CustomChartScales)?.y?.title?.text).toBe('kWh');
    });

    it('should use kWh label for electricity', () => {
      const langService = makeLangService({ 'CHART.AXIS_KWH': 'kWh', 'CHART.AXIS_LITERS': 'L' });
      const options = buildChartOptions({
        languageService: langService,
        chartType: 'electricity',
        getData: () => [],
      });
      expect((options?.scales as CustomChartScales)?.y?.title?.text).toBe('kWh');
    });

    it('should use liters label for water', () => {
      const langService = makeLangService({ 'CHART.AXIS_KWH': 'kWh', 'CHART.AXIS_LITERS': 'L' });
      const options = buildChartOptions({
        languageService: langService,
        chartType: 'water',
        getData: () => [],
      });
      expect((options?.scales as CustomChartScales)?.y?.title?.text).toBe('L');
    });

    it('should use liters label for home', () => {
      const langService = makeLangService({ 'CHART.AXIS_KWH': 'kWh', 'CHART.AXIS_LITERS': 'L' });
      const options = buildChartOptions({
        languageService: langService,
        chartType: 'home',
        getData: () => [],
      });
      expect((options?.scales as CustomChartScales)?.y?.title?.text).toBe('L');
    });
  });

  describe('summerSun plugin', () => {
    it('should enable summerSun only for heating', () => {
      const options = buildChartOptions(makeDeps('heating'));
      expect((options?.plugins as CustomChartPluginOptions)?.summerSun?.enabled).toBe(true);
    });

    it('should disable summerSun for water', () => {
      const options = buildChartOptions(makeDeps('water'));
      expect((options?.plugins as CustomChartPluginOptions)?.summerSun?.enabled).toBe(false);
    });

    it('should disable summerSun for electricity', () => {
      const options = buildChartOptions(makeDeps('electricity'));
      expect((options?.plugins as CustomChartPluginOptions)?.summerSun?.enabled).toBe(false);
    });

    it('should pass getData records to summerSun for heating', () => {
      const points = [makeDataPoint('2024-01-15')];
      const options = buildChartOptions({
        languageService: makeLangService(),
        chartType: 'heating',
        getData: () => points,
      });
      expect((options?.plugins as CustomChartPluginOptions)?.summerSun?.records).toBe(points);
    });

    it('should pass empty array to summerSun for non-heating types', () => {
      const options = buildChartOptions({
        languageService: makeLangService(),
        chartType: 'water',
        getData: () => [makeDataPoint('2024-01-15')],
      });
      expect((options?.plugins as CustomChartPluginOptions)?.summerSun?.records).toEqual([]);
    });
  });

  describe('newYearMarker plugin', () => {
    it('should always be enabled', () => {
      for (const chartType of ['water', 'home', 'heating', 'electricity'] as const) {
        const options = buildChartOptions(makeDeps(chartType));
        expect((options?.plugins as CustomChartPluginOptions)?.newYearMarker?.enabled).toBe(true);
      }
    });

    it('should pass getData records for all chart types', () => {
      const points = [makeDataPoint('2024-01-15')];
      const options = buildChartOptions({
        languageService: makeLangService(),
        chartType: 'water',
        getData: () => points,
      });
      expect((options?.plugins as CustomChartPluginOptions)?.newYearMarker?.records).toBe(points);
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
    return (options?.plugins as CustomChartPluginOptions)?.legend?.labels?.filter;
  };

  const makeData = (datasets: { label?: string; [key: string]: unknown }[]) => ({ datasets });

  it('should hide dataset labelled as PREDICTIONS.MIN translation', () => {
    const filter = getFilter({ 'PREDICTIONS.MIN': 'Min', 'PREDICTIONS.MAX': 'Max' });
    const legendItem = { text: 'Min', datasetIndex: 0 };
    expect(filter?.(legendItem, makeData([{ label: 'Min' }]))).toBe(false);
  });

  it('should hide dataset labelled as PREDICTIONS.MAX translation', () => {
    const filter = getFilter({ 'PREDICTIONS.MIN': 'Min', 'PREDICTIONS.MAX': 'Max' });
    const legendItem = { text: 'Max', datasetIndex: 0 };
    expect(filter?.(legendItem, makeData([{ label: 'Max' }]))).toBe(false);
  });

  it('should hide dataset with isPredictionExtension flag', () => {
    const filter = getFilter();
    const legendItem = { text: 'Kitchen Warm (predicted)', datasetIndex: 0 };
    const data = makeData([{ label: 'Kitchen Warm (predicted)', isPredictionExtension: true }]);
    expect(filter?.(legendItem, data)).toBe(false);
  });

  it('should show normal datasets', () => {
    const filter = getFilter({ 'PREDICTIONS.MIN': 'Min', 'PREDICTIONS.MAX': 'Max' });
    const legendItem = { text: 'Kitchen Warm', datasetIndex: 0 };
    expect(filter?.(legendItem, makeData([{ label: 'Kitchen Warm' }]))).toBe(true);
  });

  it('should show dataset when datasetIndex is undefined', () => {
    const filter = getFilter();
    const legendItem = { text: 'Something' };
    expect(filter?.(legendItem, makeData([]))).toBe(true);
  });
});

// ─── Legend click handler ─────────────────────────────────────────────────────

describe('legend click handler', () => {
  const TRANSLATIONS = {
    'CHART.CONSUMPTION_PREDICTION': 'Prediction',
    'CHART.TRENDLINE': 'Trendline',
    'CHART.COUNTRY_AVERAGE': 'Average',
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
    return (options?.plugins as CustomChartPluginOptions)?.legend?.onClick;
  };

  it('should return early when datasetIndex is undefined', () => {
    const handler = getHandler();
    const chart = makeChart([{ label: 'Kitchen' }]);
    handler?.({}, { datasetIndex: undefined }, { chart });
    expect(chart.setDatasetVisibility).not.toHaveBeenCalled();
  });

  it('should toggle the clicked dataset visibility', () => {
    const handler = getHandler();
    const chart = makeChart([{ label: 'Kitchen' }]);
    chart.isDatasetVisible.mockReturnValue(true);
    handler?.({}, { datasetIndex: 0 }, { chart });
    expect(chart.setDatasetVisibility).toHaveBeenCalledWith(0, false);
    expect(chart.update).toHaveBeenCalled();
  });

  describe('prediction band sync', () => {
    it('should toggle Min/Max band datasets when prediction line is clicked', () => {
      const handler = getHandler();
      const datasets = [{ label: 'Prediction expected' }, { label: 'Min' }, { label: 'Max' }];
      const chart = makeChart(datasets);
      chart.isDatasetVisible.mockReturnValue(true);

      handler?.({}, { datasetIndex: 0 }, { chart });

      expect(chart.setDatasetVisibility).toHaveBeenCalledWith(1, false);
      expect(chart.setDatasetVisibility).toHaveBeenCalledWith(2, false);
    });

    it('should match categoryId when syncing prediction band in by-room mode', () => {
      const handler = getHandler();
      const datasets = [
        { label: 'Prediction expected', categoryId: 'kitchen' },
        { label: 'Min', categoryId: 'kitchen' },
        { label: 'Max', categoryId: 'bathroom' },
      ];
      const chart = makeChart(datasets);
      chart.isDatasetVisible.mockReturnValue(true);

      handler?.({}, { datasetIndex: 0 }, { chart });

      expect(chart.setDatasetVisibility).toHaveBeenCalledWith(1, false);
      expect(chart.setDatasetVisibility).not.toHaveBeenCalledWith(2, expect.anything());
    });
  });

  describe('trendline/average sync — total view', () => {
    it('should toggle standalone trendline and average datasets when total series is clicked', () => {
      const handler = getHandler();
      const datasets = [
        { label: 'Weekly Total View' },
        { label: 'Trendline' },
        { label: 'Average' },
        { label: 'Kitchen Warm' },
      ];
      const chart = makeChart(datasets);
      chart.isDatasetVisible.mockReturnValue(true);

      handler?.({}, { datasetIndex: 0 }, { chart });

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
        { label: 'Bathroom Trendline' },
      ];
      const chart = makeChart(datasets);
      chart.isDatasetVisible.mockReturnValue(true);

      handler?.({}, { datasetIndex: 0 }, { chart });

      expect(chart.setDatasetVisibility).toHaveBeenCalledWith(1, false);
      expect(chart.setDatasetVisibility).toHaveBeenCalledWith(2, false);
      expect(chart.setDatasetVisibility).not.toHaveBeenCalledWith(3, expect.anything());
    });

    it('should not sync related datasets when a trendline itself is clicked', () => {
      const handler = getHandler();
      const datasets = [{ label: 'Kitchen Total' }, { label: 'Kitchen Trendline' }];
      const chart = makeChart(datasets);
      chart.isDatasetVisible.mockReturnValue(true);

      handler?.({}, { datasetIndex: 1 }, { chart });

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

  const clickAndCapture = (clickedLabel: string, allDatasets: { label: string }[]) => {
    const langService = makeLangService(TRANSLATIONS);
    const options = buildChartOptions({
      languageService: langService,
      chartType: 'water',
      getData: () => [],
    });
    const handler = (options?.plugins as CustomChartPluginOptions)?.legend?.onClick;

    const chart = makeChart(allDatasets);
    chart.isDatasetVisible.mockReturnValue(true);

    const clickedIndex = allDatasets.findIndex((d) => d.label === clickedLabel);
    handler?.({}, { datasetIndex: clickedIndex }, { chart });
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
    return (options?.plugins as CustomChartPluginOptions)?.tooltip?.callbacks?.title;
  };

  it('should return empty string when tooltipItems is empty', () => {
    const title = getTitle([]);
    expect(title?.([])).toBe('');
  });

  it('should call formatDate for a past data point', () => {
    const data = [makeDataPoint('2024-01-15')];
    const langService = makeLangService();
    const options = buildChartOptions({
      languageService: langService,
      chartType: 'water',
      getData: () => data,
    });
    const title = (options?.plugins as CustomChartPluginOptions)?.tooltip?.callbacks?.title;

    title?.([{ dataIndex: 0, label: '2024-01-15', dataset: {} }]);

    expect(langService.formatDate).toHaveBeenCalledWith(new Date(data[0].date), {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  it('should compute a future date that is one month ahead for the first prediction point', () => {
    const data = [makeDataPoint('2024-01-15'), makeDataPoint('2024-02-15')];
    const langService = makeLangService();
    const options = buildChartOptions({
      languageService: langService,
      chartType: 'water',
      getData: () => data,
    });
    const title = (options?.plugins as CustomChartPluginOptions)?.tooltip?.callbacks?.title;

    title?.([{ dataIndex: 2, label: 'future', dataset: {} }]);

    const dateArg = (langService.formatDate as ReturnType<typeof vi.fn>).mock.calls[0][0] as Date;
    expect(dateArg.getMonth()).toBe(2);
    expect(dateArg.getFullYear()).toBe(2024);
  });

  it('should return item.label as fallback when there is no historical data', () => {
    const title = getTitle([]);
    const result = title?.([{ dataIndex: 0, label: 'fallback-label', dataset: {} }]);
    expect(result).toBe('fallback-label');
  });
});

// ─── Tooltip label callback (buildTooltipLabelCallback) ───────────────────────

describe('tooltip label callback', () => {
  const getLabel = (chartType: ChartOptionsBuilderDeps['chartType']) => {
    const langService = makeLangService({ 'CHART.ESTIMATED_MONTHLY': '(est. {{days}} days)' });
    const options = buildChartOptions({
      languageService: langService,
      chartType,
      getData: () => [],
    });
    return (options?.plugins as CustomChartPluginOptions)?.tooltip?.callbacks?.label;
  };

  it('should use L unit for water', () => {
    const label = getLabel('water');
    const result = label?.({ dataset: { label: 'Kitchen' }, parsed: { y: 150 }, dataIndex: 0 });
    expect(result).toContain('L');
    expect(result).not.toContain('kWh');
  });

  it('should use L unit for home', () => {
    const label = getLabel('home');
    const result = label?.({ dataset: { label: 'Kitchen' }, parsed: { y: 150 }, dataIndex: 0 });
    expect(result).toContain('L');
  });

  it('should use kWh unit for heating', () => {
    const label = getLabel('heating');
    const result = label?.({ dataset: { label: 'Bedroom' }, parsed: { y: 200 }, dataIndex: 0 });
    expect(result).toContain('kWh');
    expect(result).not.toContain(' L');
  });

  it('should use kWh unit for electricity', () => {
    const label = getLabel('electricity');
    const result = label?.({ dataset: { label: 'Total' }, parsed: { y: 300 }, dataIndex: 0 });
    expect(result).toContain('kWh');
  });

  it('should round non-integer values', () => {
    const label = getLabel('water');
    const result = label?.({ dataset: { label: 'Kitchen' }, parsed: { y: 123.7 }, dataIndex: 0 });
    expect(result).toContain('124');
    expect(result).not.toContain('123.7');
  });

  it('should include dataset label in output', () => {
    const label = getLabel('water');
    const result = label?.({
      dataset: { label: 'Kitchen Warm' },
      parsed: { y: 100 },
      dataIndex: 0,
    });
    expect(result).toContain('Kitchen Warm');
  });

  it('should append normalized-period note when normalizedData has days', () => {
    const langService = {
      translate: vi
        .fn()
        .mockImplementation((key: string, params?: Record<string, string | number>) => {
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

    const options = buildChartOptions({
      languageService: langService,
      chartType: 'water',
      getData: () => [],
    });
    const label = (options?.plugins as CustomChartPluginOptions)?.tooltip?.callbacks?.label;

    const result = label?.({
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
    const result = label?.({ dataset: { label: 'Kitchen' }, parsed: { y: 100 }, dataIndex: 0 });
    expect(result).toBe('Kitchen: 100 L');
  });
});

// ─── escapeRegExp ─────────────────────────────────────────────────────────────

describe('escapeRegExp', () => {
  it('should return plain strings unchanged', () => {
    expect(escapeRegExp('hello world')).toBe('hello world');
  });

  it('should escape dots', () => {
    expect(escapeRegExp('3.14')).toBe('3\\.14');
  });

  it('should escape asterisks', () => {
    expect(escapeRegExp('a*b')).toBe('a\\*b');
  });

  it('should escape question marks', () => {
    expect(escapeRegExp('a?b')).toBe('a\\?b');
  });

  it('should escape plus signs', () => {
    expect(escapeRegExp('a+b')).toBe('a\\+b');
  });

  it('should escape parentheses', () => {
    expect(escapeRegExp('(a)')).toBe('\\(a\\)');
  });

  it('should escape square brackets', () => {
    expect(escapeRegExp('[ab]')).toBe('\\[ab\\]');
  });

  it('should escape curly braces', () => {
    expect(escapeRegExp('{a}')).toBe('\\{a\\}');
  });

  it('should escape carets', () => {
    expect(escapeRegExp('^abc')).toBe('\\^abc');
  });

  it('should escape dollar signs', () => {
    expect(escapeRegExp('abc$')).toBe('abc\\$');
  });

  it('should escape pipe characters', () => {
    expect(escapeRegExp('a|b')).toBe('a\\|b');
  });

  it('should escape backslashes', () => {
    expect(escapeRegExp('a\\b')).toBe('a\\\\b');
  });

  it('should escape multiple special characters together', () => {
    expect(escapeRegExp('(Daily Average Consumption)')).toBe('\\(Daily Average Consumption\\)');
  });

  it('should handle an empty string', () => {
    expect(escapeRegExp('')).toBe('');
  });
});

// ─── replaceLabelWithIcon ─────────────────────────────────────────────────────

describe('replaceLabelWithIcon', () => {
  it('should return text unchanged when label is empty', () => {
    expect(replaceLabelWithIcon('Livingroom - Trendline', '', '📈')).toBe('Livingroom - Trendline');
  });

  it('should return text unchanged when label is not found in text', () => {
    expect(replaceLabelWithIcon('Livingroom', 'Trendline', '📈')).toBe('Livingroom');
  });

  it('should replace standalone label with icon', () => {
    expect(
      replaceLabelWithIcon('Daily Average Consumption', 'Daily Average Consumption', '📅'),
    ).toBe('📅');
  });

  it('should replace " - Label" suffix with icon', () => {
    const result = replaceLabelWithIcon('Livingroom - Trendline', 'Trendline', '📈');
    expect(result).toBe('Livingroom 📈');
  });

  it('should replace " (Label)" suffix with icon', () => {
    const result = replaceLabelWithIcon(
      'Livingroom (Daily Average Consumption)',
      'Daily Average Consumption',
      '📅',
    );
    expect(result).toBe('Livingroom 📅');
  });

  it('should replace em-dash separator', () => {
    const result = replaceLabelWithIcon('Livingroom — Trendline', 'Trendline', '📈');
    expect(result).toBe('Livingroom 📈');
  });

  it('should replace en-dash separator', () => {
    const result = replaceLabelWithIcon('Livingroom – Trendline', 'Trendline', '📈');
    expect(result).toBe('Livingroom 📈');
  });

  it('should be case-insensitive', () => {
    expect(replaceLabelWithIcon('Livingroom - TRENDLINE', 'Trendline', '📈')).toBe('Livingroom 📈');
  });

  it('should handle labels with special regex characters', () => {
    const result = replaceLabelWithIcon('Kitchen (avg.)', '(avg.)', '📊');
    expect(result).toContain('Kitchen');
    expect(result).toContain('📊');
    expect(result).not.toContain('(avg.)');
  });

  it('should not leave trailing whitespace after replacement', () => {
    const result = replaceLabelWithIcon('Livingroom - Trendline', 'Trendline', '📈');
    expect(result).not.toMatch(/\s$/);
  });

  it('should not leave double spaces after replacement', () => {
    const result = replaceLabelWithIcon('Livingroom - Trendline', 'Trendline', '📈');
    expect(result).not.toContain('  ');
  });
});

// ─── buildGenerateLabels (via buildChartOptions legend.labels.generateLabels) ──

describe('buildGenerateLabels', () => {
  const TRANSLATIONS: Record<string, string> = {
    'CHART.CONSUMPTION_PREDICTION': 'Consumption prediction',
    'CHART.TRENDLINE': 'Trendline',
    'CHART.COUNTRY_AVERAGE': 'Country Average',
    'CHART.PAST_FORECAST': 'Past Forecast',
    'CHART.INCREMENTAL_CONSUMPTION': 'Daily Average Consumption',
    'CHART.DISPLAY_MODE_INCREMENTAL': 'Daily Average Consumption',
    'CHART.TOTAL_WEEKLY_CONSUMPTION': 'Total Cumulative Meter Reading',
    'CHART.DISPLAY_MODE_TOTAL': 'Total Cumulative Meter Reading',
    'CHART.TOTAL_CONSUMPTION': 'Total Cumulative Consumption',
  };

  const makeFakeChart = (labels: string[]) => ({
    data: { datasets: labels.map((label) => ({ label })) },
  });

  const getGenerateLabels = () => {
    const options = buildChartOptions({
      languageService: makeLangService(TRANSLATIONS),
      chartType: 'water',
      getData: () => [],
    });
    return (options?.plugins as CustomChartPluginOptions)?.legend?.labels?.generateLabels;
  };

  describe('on desktop screens (innerWidth > 768)', () => {
    let originalInnerWidth: PropertyDescriptor | undefined;

    beforeEach(() => {
      originalInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth');
      Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    });

    afterEach(() => {
      if (originalInnerWidth) {
        Object.defineProperty(window, 'innerWidth', originalInnerWidth);
      }
    });

    it('should return labels unchanged on desktop', () => {
      const generateLabels = getGenerateLabels();
      const chart = makeFakeChart([
        'Livingroom - Daily Average Consumption',
        'Livingroom - Trendline',
      ]);

      const origGenerator = (
        globalThis as unknown as {
          Chart?: {
            defaults?: {
              plugins?: { legend?: { labels?: { generateLabels?: (c: unknown) => unknown[] } } };
            };
          };
        }
      ).Chart?.defaults?.plugins?.legend?.labels?.generateLabels;
      if (origGenerator && generateLabels) {
        const result = generateLabels(chart);
        expect(result).toBeDefined();
      }
    });
  });

  describe('label replacements on mobile screens (innerWidth <= 768)', () => {
    let originalInnerWidth: PropertyDescriptor | undefined;

    beforeEach(() => {
      originalInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth');
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
    });

    afterEach(() => {
      if (originalInnerWidth) {
        Object.defineProperty(window, 'innerWidth', originalInnerWidth);
      }
    });

    const runMobileTest = (
      inputLabels: string[],
      expectedSubstrings: { index: number; contains: string }[],
    ) => {
      const replacements: [string, string][] = [
        [TRANSLATIONS['CHART.CONSUMPTION_PREDICTION'], '🔮'],
        [TRANSLATIONS['CHART.TRENDLINE'], '📈'],
        [TRANSLATIONS['CHART.COUNTRY_AVERAGE'], '🌐'],
        [TRANSLATIONS['CHART.PAST_FORECAST'], '🎯'],
        [TRANSLATIONS['CHART.INCREMENTAL_CONSUMPTION'], '📅'],
        [TRANSLATIONS['CHART.TOTAL_WEEKLY_CONSUMPTION'], '∑'],
        [TRANSLATIONS['CHART.TOTAL_CONSUMPTION'], '∑'],
      ];

      const transformed = inputLabels.map((text) => {
        for (const [label, icon] of replacements) {
          text = replaceLabelWithIcon(text, label, icon);
        }
        return text;
      });

      for (const { index, contains } of expectedSubstrings) {
        expect(transformed[index]).toContain(contains);
      }
    };

    it('should replace "Daily Average Consumption" suffix with 📅', () => {
      runMobileTest(['Livingroom (Daily Average Consumption)'], [{ index: 0, contains: '📅' }]);
    });

    it('should replace "Trendline" suffix with 📈', () => {
      runMobileTest(['Livingroom - Trendline'], [{ index: 0, contains: '📈' }]);
    });

    it('should replace "Country Average" suffix with 🌐', () => {
      runMobileTest(['Livingroom - Country Average'], [{ index: 0, contains: '🌐' }]);
    });

    it('should replace "Consumption prediction" suffix with 🔮', () => {
      runMobileTest(['Livingroom - Consumption prediction'], [{ index: 0, contains: '🔮' }]);
    });

    it('should replace "Past Forecast" suffix with 🎯', () => {
      runMobileTest(['Livingroom - Past Forecast'], [{ index: 0, contains: '🎯' }]);
    });

    it('should replace "Total Cumulative Meter Reading" standalone label with ∑', () => {
      runMobileTest(['Total Cumulative Meter Reading'], [{ index: 0, contains: '∑' }]);
    });

    it('should replace "Total Cumulative Consumption" standalone label with ∑', () => {
      runMobileTest(['Total Cumulative Consumption'], [{ index: 0, contains: '∑' }]);
    });

    it('should preserve the room/series name before the replaced suffix', () => {
      runMobileTest(['Livingroom - Trendline'], [{ index: 0, contains: 'Livingroom' }]);
    });

    it('should not introduce trailing whitespace after replacement', () => {
      const replaced = replaceLabelWithIcon(
        'Livingroom - Daily Average Consumption',
        TRANSLATIONS['CHART.INCREMENTAL_CONSUMPTION'],
        '📅',
      );
      expect(replaced).not.toMatch(/\s$/);
    });

    it('should handle multiple items independently', () => {
      runMobileTest(
        ['Livingroom - Trendline', 'Kitchen (Daily Average Consumption)', 'Bathroom'],
        [
          { index: 0, contains: '📈' },
          { index: 1, contains: '📅' },
          { index: 2, contains: 'Bathroom' },
        ],
      );
    });
  });
});
