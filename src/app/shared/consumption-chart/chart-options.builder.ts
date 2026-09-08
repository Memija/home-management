import { Chart, ChartConfiguration, ChartEvent, LegendItem, TooltipItem } from 'chart.js';
import { LanguageService } from '../../services/language.service';
import { AppChartDataset } from '../../models/records.model';
import { ChartDataPoint } from '../../models/consumption-chart.model';

export interface ChartOptionsBuilderDeps {
  languageService: LanguageService;
  chartType: 'water' | 'home' | 'heating' | 'electricity';
  getData: () => ChartDataPoint[];
}

// ─── Legend helpers ───────────────────────────────────────────────────────────

/**
 * Filters legend items so that prediction min/max band datasets and trendline
 * extension overlays are hidden from the legend (they are implied by the main
 * prediction dataset entry).
 */
function buildLegendFilter(languageService: LanguageService) {
  return (legendItem: LegendItem, data: ChartConfiguration['data']): boolean => {
    const label = legendItem.text;
    const minTranslation = languageService.translate('PREDICTIONS.MIN');
    const maxTranslation = languageService.translate('PREDICTIONS.MAX');
    if (label === minTranslation || label === maxTranslation) return false;
    // Hide prediction extension overlays (predicted trendline continuations)
    const ds = data.datasets?.[legendItem.datasetIndex ?? -1];
    if (ds && (ds as AppChartDataset).isPredictionExtension) return false;
    return true;
  };
}

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replaces occurrences of a translated label (with optional leading separators like " - " or " ("
 * and optional closing parens) with a compact icon symbol.
 */
export function replaceLabelWithIcon(text: string, label: string, icon: string): string {
  if (!label || !text.toLowerCase().includes(label.toLowerCase())) return text;
  // eslint-disable-next-line security/detect-non-literal-regexp -- label is escaped with escapeRegExp
  const pattern = new RegExp(`(\\s*[-—–(（\\[]\\s*)?${escapeRegExp(label)}(\\s*[)）\\]])?`, 'gi');
  return text.replace(pattern, ` ${icon}`).trim();
}

/**
 * Generates compact legend labels on mobile screens by substituting lengthy suffix strings
 * (e.g., " - Consumption prediction" or " (Daily Average Consumption)") with concise symbols/icons.
 */
function buildGenerateLabels(languageService: LanguageService) {
  return (chart: Chart): LegendItem[] => {
    const defaultGenerator = Chart.defaults.plugins.legend.labels.generateLabels;
    const items = defaultGenerator(chart);

    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      const replacements: [string, string][] = [
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

      items.forEach((item) => {
        let text = item.text || '';
        for (const [label, icon] of replacements) {
          text = replaceLabelWithIcon(text, label, icon);
        }
        item.text = text;
      });
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
    const predictionsLabel = languageService.translate('CHART.CONSUMPTION_PREDICTION');
    if (clickedLabel.includes(predictionsLabel)) {
      syncPredictionBand(chart, clickedDataset, isHidden, languageService);
    }

    // ── Sync trendline / country-average datasets with their parent series ──
    const trendlineLabel = languageService.translate('CHART.TRENDLINE');
    const countryAverageLabel = languageService.translate('CHART.COUNTRY_AVERAGE');
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
        languageService,
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
  languageService: LanguageService,
): void {
  const minLabel = languageService.translate('PREDICTIONS.MIN');
  const maxLabel = languageService.translate('PREDICTIONS.MAX');
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
  languageService: LanguageService,
): void {
  const totalViewLabel = languageService.translate('CHART.TOTAL_WEEKLY_CONSUMPTION');
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

// ─── Tooltip helpers ──────────────────────────────────────────────────────────

/**
 * Builds the tooltip title callback: shows the full locale-aware date for
 * historical data points, and an estimated future date for prediction points.
 */
function buildTooltipTitleCallback(
  languageService: LanguageService,
  getData: () => ChartDataPoint[],
) {
  return (tooltipItems: TooltipItem<keyof import('chart.js').ChartTypeRegistry>[]): string => {
    if (tooltipItems.length === 0) return '';

    const item = tooltipItems[0];
    const dataIndex = item.dataIndex;
    const data = getData();
    const pastDataLength = data.length;

    if (dataIndex < pastDataLength) {
      return languageService.formatDate(new Date(data[dataIndex].date), {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    // Future data point (prediction zone)
    if (pastDataLength > 0) {
      const monthOffset = dataIndex - pastDataLength + 1;
      const futureDate = new Date(data[pastDataLength - 1].date);
      futureDate.setMonth(futureDate.getMonth() + monthOffset);
      return languageService.formatDate(futureDate, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    return item.label;
  };
}

/**
 * Builds the tooltip label callback: formats the value with its unit and
 * appends a normalized-period note for incremental-mode data points.
 */
function buildTooltipLabelCallback(
  languageService: LanguageService,
  chartType: ChartOptionsBuilderDeps['chartType'],
) {
  return (context: TooltipItem<keyof import('chart.js').ChartTypeRegistry>): string => {
    const unit = chartType === 'heating' || chartType === 'electricity' ? 'kWh' : 'L';
    const parsedY =
      typeof context.parsed === 'object' && context.parsed !== null && 'y' in context.parsed
        ? Number((context.parsed as { y: number }).y)
        : Number(context.parsed);
    const val = Math.round(parsedY);
    const datasetLabel = context.dataset?.label ?? '';
    let label = `${datasetLabel}: ${val} ${unit}`;

    const normalizedData = (context.dataset as AppChartDataset).normalizedData;
    const itemNorm = normalizedData?.[context.dataIndex] as { days?: number } | undefined;
    if (itemNorm?.days) {
      const days = Number(itemNorm.days).toFixed(1);
      label += ` ${languageService.translate('CHART.ESTIMATED_MONTHLY', { days })}`;
    }

    return label;
  };
}

// ─── Main builder ─────────────────────────────────────────────────────────────

/**
 * Builds the Chart.js options object for the consumption chart.
 *
 * Internally composed from focused helper functions for legend, tooltips, zoom, and scales.
 */
export function buildChartOptions(deps: ChartOptionsBuilderDeps): ChartConfiguration['options'] {
  const { languageService, chartType, getData } = deps;

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          filter: buildLegendFilter(languageService),
          generateLabels: buildGenerateLabels(languageService),
        },
        onClick: buildLegendClickHandler(languageService),
      },
      tooltip: {
        callbacks: {
          title: buildTooltipTitleCallback(languageService, getData),
          label: buildTooltipLabelCallback(languageService, chartType),
        },
      },
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
          enabled: chartType === 'heating',
          records: chartType === 'heating' ? getData() : [],
        },
        newYearMarker: {
          enabled: true,
          records: getData(),
        },
      } as Record<string, unknown>),
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text:
            chartType === 'heating' || chartType === 'electricity'
              ? languageService.translate('CHART.AXIS_KWH')
              : languageService.translate('CHART.AXIS_LITERS'),
        },
      },
      x: {
        title: { display: true, text: languageService.translate('CHART.AXIS_DATE') },
        ticks: { maxRotation: 45, minRotation: 0 },
      },
    },
  };
}
