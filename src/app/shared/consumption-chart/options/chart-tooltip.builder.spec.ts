import { describe, expect, it, vi } from 'vitest';
import { Chart, ChartConfiguration, ChartTypeRegistry, TooltipModel } from 'chart.js';
import {
  buildDefaultMobileReadout,
  buildTooltipFilter,
  buildTooltipLabelCallback,
  buildTooltipOptions,
  MobileTooltipReadout,
  TooltipItemLike,
} from './chart-tooltip.builder';
import { LanguageService } from '../../../services/language.service';
import { ChartDataPoint } from '../../../models/consumption-chart.model';

const makePoint = (dateStr: string, value = 100): ChartDataPoint => ({
  date: new Date(dateStr),
  value,
});

const makeLanguageStub = (): LanguageService =>
  ({
    translate: vi.fn((key: string, params?: Record<string, string | number>) => {
      const map: Record<string, string> = {
        'PREDICTIONS.MIN': 'Min',
        'PREDICTIONS.MAX': 'Max',
        'CHART.CONSUMPTION_PREDICTION': 'Consumption prediction',
        'CHART.DAYS_SHORT': '{{days}}d avg',
        'CHART.ESTIMATED_MONTHLY': '(Daily Average from {{days}} days)',
      };
      let out = map[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          out = out.replace(`{{${k}}}`, String(v));
        }
      }
      return out;
    }),
    formatDate: vi.fn().mockReturnValue('Jan 15, 2026'),
  }) as unknown as LanguageService;

describe('chart-tooltip.builder', () => {
  it('should filter out null values, Min/Max band helpers, prediction extensions, and anchor duplicates', () => {
    const lang = makeLanguageStub();
    const records: ChartDataPoint[] = [makePoint('2026-01-15'), makePoint('2026-02-15')];
    const filter = buildTooltipFilter(lang, () => records);

    const makeItem = (overrides: Partial<TooltipItemLike>): TooltipItemLike => ({
      raw: 120,
      parsed: { y: 120 },
      dataIndex: 1,
      dataset: { label: 'Water Total' },
      ...overrides,
    });

    expect(filter(makeItem({}))).toBe(true);
    expect(filter(makeItem({ raw: null, parsed: { y: null } }))).toBe(false);
    expect(filter(makeItem({ dataset: { label: 'Min' } }))).toBe(false);
    expect(filter(makeItem({ dataset: { label: 'Max' } }))).toBe(false);
    expect(filter(makeItem({ dataset: { label: 'Trendline', isPredictionExtension: true } }))).toBe(
      false,
    );
    // Duplicate anchor point at historical index (< records.length) is hidden
    expect(filter(makeItem({ dataIndex: 1, dataset: { label: 'Consumption prediction' } }))).toBe(
      false,
    );
    // Future prediction point (>= records.length) is shown
    expect(filter(makeItem({ dataIndex: 2, dataset: { label: 'Consumption prediction' } }))).toBe(
      true,
    );
  });

  it('should append (min–max) confidence range on prediction tooltip labels', () => {
    const lang = makeLanguageStub();
    const labelCb = buildTooltipLabelCallback(lang, 'water', false);

    const text = labelCb({
      dataIndex: 2,
      parsed: { y: 140 },
      dataset: { label: 'Consumption prediction' },
      chart: {
        data: {
          datasets: [
            { label: 'Min', data: [null, 120, 115] },
            { label: 'Max', data: [null, 120, 168] },
            { label: 'Consumption prediction', data: [null, 120, 140] },
          ],
        },
      },
    });

    expect(text).toBe('Consumption prediction: 140 L (115–168 L)');
  });

  it('should disable canvas tooltip on mobile when onMobileTooltip is provided and emit external readout', () => {
    const lang = makeLanguageStub();
    let captured: MobileTooltipReadout | null = null;
    const tooltipOpts = buildTooltipOptions({
      languageService: lang,
      chartType: 'electricity',
      getData: () => [makePoint('2026-01-15'), makePoint('2026-02-15')],
      mobile: true,
      compactLabel: (lbl) => lbl.replace('Consumption prediction', '🔮'),
      onMobileTooltip: (readout) => {
        captured = readout;
      },
    });

    expect(tooltipOpts?.enabled).toBe(false);
    expect(typeof tooltipOpts?.external).toBe('function');

    const mockChart = {
      data: {
        datasets: [
          { label: 'Min', data: [null, 200, 180] },
          { label: 'Max', data: [null, 200, 240] },
        ],
      },
    } as unknown as Chart;

    const activeTooltip = {
      opacity: 1,
      dataPoints: [
        {
          dataIndex: 2,
          label: 'Mar 2026',
          raw: 210,
          parsed: { y: 210 },
          dataset: {
            label: 'Consumption prediction',
            borderColor: '#f59e0b',
            normalizedData: [null, null, { days: 30 }],
          },
        },
      ],
    } as unknown as TooltipModel<keyof ChartTypeRegistry>;

    tooltipOpts?.external?.call(activeTooltip, {
      chart: mockChart,
      tooltip: activeTooltip,
    });

    expect(captured).toEqual({
      dateText: 'Jan 15, 2026',
      periodNote: '30.0d avg',
      items: [
        {
          label: '🔮',
          valueText: '210 kWh (180–240)',
          color: '#f59e0b',
        },
      ],
    });

    // Opacity 0 clears readout
    const hiddenTooltip = {
      opacity: 0,
      dataPoints: [],
    } as unknown as TooltipModel<keyof ChartTypeRegistry>;
    tooltipOpts?.external?.call(hiddenTooltip, {
      chart: mockChart,
      tooltip: hiddenTooltip,
    });
    expect(captured).toBeNull();
  });

  it('should build default idle mobile readout from latest visible historical point', () => {
    const lang = makeLanguageStub();
    const records: ChartDataPoint[] = [makePoint('2026-01-15'), makePoint('2026-02-15')];
    const chartData: ChartConfiguration['data'] = {
      labels: ['Jan', 'Feb', 'Mar'],
      datasets: [
        { label: 'Total', data: [100, 155.4, null], borderColor: '#0ea5e9' },
        { label: 'Min', data: [null, 155.4, 130], borderColor: 'rgba(0, 0, 0, 0)' },
        { label: 'Consumption prediction', data: [null, 155.4, 160], borderColor: '#38bdf8' },
      ],
    };

    const readout = buildDefaultMobileReadout(records, chartData, lang, 'water', (s) => s);

    expect(readout).toEqual({
      dateText: 'Jan 15, 2026',
      periodNote: undefined,
      items: [{ label: 'Total', valueText: '155 L', color: '#0ea5e9' }],
    });
  });
});
