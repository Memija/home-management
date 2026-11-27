import { Chart, ChartConfiguration, ChartEvent, LegendItem } from 'chart.js';
import { LanguageService } from '../../../services/language.service';
import { AppChartDataset } from '../../../models/records.model';
import { ChartDataPoint } from '../../../models/consumption-chart.model';
import { buildTooltipOptions, MobileTooltipReadout } from './chart-tooltip.builder';

export type { MobileReadoutItem, MobileTooltipReadout } from './chart-tooltip.builder';

export interface ChartOptionsBuilderDeps {
  languageService: LanguageService;
  chartType: 'water' | 'home' | 'heating' | 'electricity';
  getData: () => ChartDataPoint[];
  onMobileTooltip?: (readout: MobileTooltipReadout | null) => void;
}

// ─── Legend helpers ───────────────────────────────────────────────────────────

/**
 * Filters legend items so that prediction min/max band datasets and trendline
 * extension overlays are hidden from the legend (they are implied by the main
 * prediction dataset entry).
 */
function buildLegendFilter(languageService: LanguageService) {
  const minTranslation = languageService.translate('PREDICTIONS.MIN');
  const maxTranslation = languageService.translate('PREDICTIONS.MAX');
  return (legendItem: LegendItem, data: ChartConfiguration['data']): boolean => {
    const label = legendItem.text;
    if (label === minTranslation || label === maxTranslation) return false;
    // Hide prediction extension overlays (predicted trendline continuations)
    const ds = data.datasets?.[legendItem.datasetIndex ?? -1];
    if (ds && (ds as AppChartDataset).isPredictionExtension) return false;
    return true;
  };
}

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function buildLabelRegex(label: string): RegExp | null {
  if (!label) return null;
  const escaped = escapeRegExp(label);
  // eslint-disable-next-line security/detect-non-literal-regexp -- label is escaped with escapeRegExp and sourced from internal i18n
  return new RegExp(
    String.raw`(\s*[(（\[]\s*${escaped}\s*[)）\]]|\s*[-—–]\s*${escaped}\s*|${escaped})`,
    'giu',
  );
}

/**
 * Replaces occurrences of a translated label (with optional leading separators like " - " or " ("
 * and optional closing parens) with a compact icon symbol.
 */
export function replaceLabelWithIcon(
  text: string,
  label: string,
  icon: string,
  compiledPattern?: RegExp | null,
  labelLower?: string,
): string {
  if (!label) return text;
  const normalizedLabel = labelLower ?? label.toLowerCase();
  if (!text.toLowerCase().includes(normalizedLabel)) return text;
  const pattern = compiledPattern ?? buildLabelRegex(label);
  if (!pattern) return text;
  return text
    .replace(pattern, ` ${icon}`)
    .replace(/\s{2,}/g, ' ')
    .trim();
}

type CompiledLabelReplacement = readonly [
  label: string,
  icon: string,
  pattern: RegExp | null,
  labelLower: string,
];

function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth <= 768;
}

function createLabelReplacements(languageService: LanguageService): CompiledLabelReplacement[] {
  const rawPairs: [string, string][] = [
    [languageService.translate('CHART.CONSUMPTION_PREDICTION'), '🔮'],
    [languageService.translate('CHART.TRENDLINE'), '📈'],
    [languageService.translate('CHART.COUNTRY_AVERAGE'), '🌐'],
    [languageService.translate('CHART.PAST_FORECAST'), '🎯'],
    [languageService.translate('CHART.INCREMENTAL_CONSUMPTION'), '📅'],
    [languageService.translate('CHART.DISPLAY_MODE_INCREMENTAL'), '📅'],
    [languageService.translate('CHART.TOTAL_WEEKLY_CONSUMPTION'), '∑'],
    [languageService.translate('CHART.DISPLAY_MODE_TOTAL'), '∑'],
    [languageService.translate('CHART.TOTAL_CONSUMPTION'), '∑'],
  ];
  return rawPairs.map(([label, icon]) => [
    label,
    icon,
    buildLabelRegex(label),
    label.toLowerCase(),
  ]);
}

function applyLabelReplacements(text: string, replacements: CompiledLabelReplacement[]): string {
  let result = text;
  let resultLower = result.toLowerCase();
  for (const [label, icon, pattern, labelLower] of replacements) {
    if (labelLower && resultLower.includes(labelLower)) {
      result = replaceLabelWithIcon(result, label, icon, pattern, labelLower);
      resultLower = result.toLowerCase();
    }
  }
  return result;
}

export function buildCompactLabelFormatter(
  languageService: LanguageService,
): (label: string) => string {
  let cachedReplacements: CompiledLabelReplacement[] | null = null;
  return (label: string): string => {
    if (!label) return '';
    cachedReplacements ??= createLabelReplacements(languageService);
    return applyLabelReplacements(label, cachedReplacements);
  };
}

/**
 * Generates compact legend labels on mobile screens by substituting lengthy suffix strings
 * (e.g., " - Consumption prediction" or " (Daily Average Consumption)") with concise symbols/icons.
 */
function buildGenerateLabels(
  languageService: LanguageService,
  compactFormatter?: (label: string) => string,
) {
  const formatLabel = compactFormatter ?? buildCompactLabelFormatter(languageService);

  return (chart: Chart): LegendItem[] => {
    const defaultGenerator = Chart.defaults.plugins.legend.labels.generateLabels;
    const items = defaultGenerator(chart);

    if (!isMobileViewport()) {
      return items;
    }

    for (const item of items) {
      if (item.text) {
        item.text = formatLabel(item.text);
      }
    }

    return items;
  };
}

/**
 * Handles legend-item clicks so that clicking a main data series also
 * toggles its related trendline, country-average, and prediction datasets.
 *
 * Uses translate() for all keyword matching so the logic works correctly
 * in all supported languages.
 */
function buildLegendClickHandler(languageService: LanguageService) {
  const predictionsLabel = languageService.translate('CHART.CONSUMPTION_PREDICTION');
  const trendlineLabel = languageService.translate('CHART.TRENDLINE');
  const countryAverageLabel = languageService.translate('CHART.COUNTRY_AVERAGE');
  const totalViewLabel = languageService.translate('CHART.TOTAL_WEEKLY_CONSUMPTION');
  const minLabel = languageService.translate('PREDICTIONS.MIN');
  const maxLabel = languageService.translate('PREDICTIONS.MAX');

  return (_e: ChartEvent, legendItem: LegendItem, legend: { chart: Chart }): void => {
    const chart = legend.chart;
    const clickedIndex = legendItem.datasetIndex;
    if (clickedIndex === undefined) return;

    const clickedDataset = chart.data.datasets[clickedIndex];
    if (!clickedDataset) return;
    const clickedLabel = clickedDataset.label || '';

    // Default toggle behavior for the clicked item
    const isHidden = !chart.isDatasetVisible(clickedIndex);
    chart.setDatasetVisibility(clickedIndex, isHidden);

    // ── Sync prediction min/max band when the expected-prediction line is clicked ──
    if (clickedLabel.includes(predictionsLabel)) {
      syncPredictionBand(chart, clickedDataset, isHidden, minLabel, maxLabel);
    }

    // ── Sync trendline / country-average datasets with their parent series ──
    const isTrendlineOrAverage =
      clickedLabel.includes(trendlineLabel) || clickedLabel.includes(countryAverageLabel);

    if (!isTrendlineOrAverage) {
      syncRelatedDatasets(
        chart,
        clickedIndex,
        clickedLabel,
        isHidden,
        trendlineLabel,
        countryAverageLabel,
        totalViewLabel,
      );
    }

    chart.update();
  };
}

/**
 * When the user clicks a prediction expected-value line, also toggle the
 * transparent min/max band datasets that form its confidence interval.
 */
function syncPredictionBand(
  chart: Chart,
  clickedDataset: ChartConfiguration['data']['datasets'][0],
  isHidden: boolean,
  minLabel: string,
  maxLabel: string,
): void {
  const clickedCategoryId = (clickedDataset as AppChartDataset | undefined)?.categoryId;

  chart.data.datasets.forEach(
    (dataset: ChartConfiguration['data']['datasets'][0], index: number) => {
      const label = dataset.label || '';
      if (label === minLabel || label === maxLabel) {
        // In total mode there is no categoryId. In by-room mode, match categoryId.
        if (!clickedCategoryId || (dataset as AppChartDataset).categoryId === clickedCategoryId) {
          chart.setDatasetVisibility(index, isHidden);
        }
      }
    },
  );
}

/**
 * When a main data series is clicked, also toggle its linked trendline and
 * country-average overlay datasets.
 *
 * Two cases:
 * - Total view: the trendline/average datasets have no category prefix, so we
 *   detect the total-view series by its translated label and do an exact match.
 * - Category view (by-room, by-type, detailed): we extract the category name
 *   from the clicked label and find related datasets by prefix.
 */
function syncRelatedDatasets(
  chart: Chart,
  clickedIndex: number,
  clickedLabel: string,
  isHidden: boolean,
  trendlineLabel: string,
  countryAverageLabel: string,
  totalViewLabel: string,
): void {
  const isTotalView = clickedLabel.includes(totalViewLabel);

  if (isTotalView) {
    // Total view: standalone trendline/average labels — exact match is enough
    chart.data.datasets.forEach(
      (dataset: ChartConfiguration['data']['datasets'][0], index: number) => {
        if (index === clickedIndex) return;
        const label = dataset.label || '';
        if (label === trendlineLabel || label === countryAverageLabel) {
          chart.setDatasetVisibility(index, isHidden);
        }
      },
    );
    return;
  }

  // Category view: strip known suffixes to recover the bare category name
  const suffixesToRemove = [' Total', ' Gesamt', ' Warm', ' Kalt', ' Cold'];
  let category = clickedLabel;
  for (const suffix of suffixesToRemove) {
    if (category.endsWith(suffix)) {
      category = category.slice(0, -suffix.length);
      break;
    }
  }

  // Detailed view labels like "Kitchen Warm" are already the full category name
  if (
    clickedLabel.includes(' Warm') ||
    clickedLabel.includes(' Cold') ||
    clickedLabel.includes(' Kalt')
  ) {
    category = clickedLabel;
  }

  // Find related trendlines and averages for the same category
  chart.data.datasets.forEach(
    (dataset: ChartConfiguration['data']['datasets'][0], index: number) => {
      if (index === clickedIndex) return;
      const label = dataset.label || '';
      const isRelated = label.includes(trendlineLabel) || label.includes(countryAverageLabel);
      if (isRelated && label.startsWith(category)) {
        chart.setDatasetVisibility(index, isHidden);
      }
    },
  );
}

// ─── Scale & mobile layout helpers ───────────────────────────────────────────

export function formatCompactAxisTick(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const m = Math.round((value / 1_000_000) * 10) / 10;
    return `${m}M`;
  }
  if (abs >= 1_000) {
    const k = Math.round((value / 1_000) * 10) / 10;
    return `${k}k`;
  }
  return String(Math.round(value * 10) / 10);
}

function resolveUnitAxisLabel(
  languageService: LanguageService,
  chartType: ChartOptionsBuilderDeps['chartType'],
): string {
  return chartType === 'heating' || chartType === 'electricity'
    ? languageService.translate('CHART.AXIS_KWH')
    : languageService.translate('CHART.AXIS_LITERS');
}

function buildScalesOptions(
  mobile: boolean,
  unitLabel: string,
  dateLabel: string,
): NonNullable<ChartConfiguration['options']>['scales'] {
  if (!mobile) {
    return {
      y: {
        beginAtZero: true,
        title: { display: true, text: unitLabel },
      },
      x: {
        title: { display: true, text: dateLabel },
        ticks: { maxRotation: 45, minRotation: 0 },
      },
    };
  }

  return {
    y: {
      beginAtZero: true,
      title: { display: false, text: unitLabel },
      ticks: {
        maxTicksLimit: 5,
        font: { size: 10 },
        callback: (tickValue: string | number) => formatCompactAxisTick(Number(tickValue)),
      },
    },
    x: {
      title: { display: false, text: dateLabel },
      grid: { display: false },
      ticks: {
        maxRotation: 0,
        minRotation: 0,
        autoSkip: true,
        maxTicksLimit: 5,
        font: { size: 10 },
      },
    },
  };
}

// ─── Main builder ─────────────────────────────────────────────────────────────

/**
 * Builds the Chart.js options object for the consumption chart.
 *
 * Internally composed from focused helper functions for legend, tooltips, zoom, and scales.
 */
export function buildChartOptions(deps: ChartOptionsBuilderDeps): ChartConfiguration['options'] {
  const { languageService, chartType, getData, onMobileTooltip } = deps;
  const mobile = isMobileViewport();
  const unitLabel = resolveUnitAxisLabel(languageService, chartType);
  const dateLabel = languageService.translate('CHART.AXIS_DATE');
  const isHeating = chartType === 'heating';
  const compactLabel = buildCompactLabelFormatter(languageService);

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: mobile
      ? { mode: 'index', intersect: false }
      : { mode: 'nearest', intersect: true },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          ...(mobile ? { boxWidth: 10, boxHeight: 10, padding: 8, font: { size: 11 } } : {}),
          filter: buildLegendFilter(languageService),
          generateLabels: buildGenerateLabels(languageService, compactLabel),
        },
        onClick: buildLegendClickHandler(languageService),
      },
      tooltip: buildTooltipOptions({
        languageService,
        chartType,
        getData,
        mobile,
        compactLabel,
        onMobileTooltip,
      }),
      zoom: {
        pan: { enabled: true, mode: 'x' },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'x',
        },
      },
      // Custom plugins — cast to Record<string, unknown> since their keys aren't in Chart.js's generated types
      ...({
        summerSun: {
          enabled: isHeating,
          records: isHeating ? getData() : [],
        },
        newYearMarker: {
          enabled: true,
          records: getData(),
        },
      } as Record<string, unknown>),
    },
    scales: buildScalesOptions(mobile, unitLabel, dateLabel),
  };
}
