import { Chart, ChartConfiguration, TooltipModel } from 'chart.js';
import { LanguageService } from '../../../services/language.service';
import { AppChartDataset, parseSafeDate } from '../../../models/records.model';
import { ChartDataPoint } from '../../../models/consumption-chart.model';

/**
 * Minimal structural subset of Chart.js's `TooltipItem` read by our callbacks.
 * Using a structural supertype makes callbacks contravariantly assignable to both
 * `TooltipItem<keyof ChartTypeRegistry>` and concrete `TooltipItem<'line'>` across all TS versions.
 */
export interface TooltipItemLike {
  readonly dataIndex: number;
  readonly label?: string;
  readonly raw?: unknown;
  readonly parsed?: unknown;
  readonly dataset?: {
    readonly label?: string;
    readonly borderColor?: unknown;
    readonly backgroundColor?: unknown;
    readonly data?: readonly unknown[];
    readonly categoryId?: string;
    readonly isPredictionExtension?: boolean;
    readonly normalizedData?: readonly unknown[];
  };
  readonly chart?: {
    readonly data?: {
      readonly datasets?: ChartConfiguration['data']['datasets'];
    };
  };
}

export interface MobileReadoutItem {
  readonly label: string;
  readonly valueText: string;
  readonly color: string;
}

export interface MobileTooltipReadout {
  readonly dateText: string;
  readonly periodNote?: string;
  readonly items: readonly MobileReadoutItem[];
}

export interface BuildTooltipOptionsDeps {
  languageService: LanguageService;
  chartType: 'water' | 'home' | 'heating' | 'electricity';
  getData: () => ChartDataPoint[];
  mobile: boolean;
  compactLabel: (label: string) => string;
  onMobileTooltip?: (readout: MobileTooltipReadout | null) => void;
}

const DESKTOP_TOOLTIP_DATE_OPTIONS = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
} as const;

const MOBILE_TOOLTIP_DATE_OPTIONS = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
} as const;

function extractNumericY(item: { raw?: unknown; parsed?: unknown }): number | null {
  if (item.raw === null) {
    return null;
  }
  if (typeof item.parsed === 'object' && item.parsed !== null && 'y' in item.parsed) {
    const yVal = (item.parsed as { y: number | null | undefined }).y;
    if (yVal === null || yVal === undefined || Number.isNaN(Number(yVal))) {
      return null;
    }
    return Number(yVal);
  }
  if (item.parsed === null || item.parsed === undefined) {
    return null;
  }
  const num = Number(item.parsed);
  return Number.isNaN(num) ? null : num;
}

function resolvePointDate(data: ChartDataPoint[], dataIndex: number): Date | null {
  const pastDataLength = data.length;
  if (dataIndex >= 0 && dataIndex < pastDataLength) {
    return parseSafeDate(data[dataIndex].date);
  }
  if (pastDataLength > 0 && dataIndex >= pastDataLength) {
    const monthOffset = dataIndex - pastDataLength + 1;
    const futureDate = new Date(parseSafeDate(data[pastDataLength - 1].date));
    futureDate.setMonth(futureDate.getMonth() + monthOffset);
    return futureDate;
  }
  return null;
}

function resolveDatasetColor(dataset: ChartConfiguration['data']['datasets'][number]): string {
  const border = dataset.borderColor;
  if (typeof border === 'string' && border && border !== 'rgba(0, 0, 0, 0)') {
    return border;
  }
  const bg = dataset.backgroundColor;
  if (typeof bg === 'string' && bg && bg !== 'rgba(0, 0, 0, 0)') {
    return bg;
  }
  return '#3b82f6';
}

function resolvePredictionRange(
  datasets: ChartConfiguration['data']['datasets'] | undefined,
  dataset: AppChartDataset,
  dataIndex: number,
  minLabel: string,
  maxLabel: string,
): { min: number; max: number } | null {
  if (!datasets) return null;
  const categoryId = dataset.categoryId;
  let minVal: number | null = null;
  let maxVal: number | null = null;

  for (const candidate of datasets) {
    const candidateDs = candidate as AppChartDataset;
    if (categoryId && candidateDs.categoryId !== categoryId) continue;
    const rawVal = candidate.data?.[dataIndex];
    if (typeof rawVal !== 'number' || Number.isNaN(rawVal)) continue;
    if (candidate.label === minLabel) {
      minVal = Math.round(rawVal);
    } else if (candidate.label === maxLabel) {
      maxVal = Math.round(rawVal);
    }
  }

  if (minVal === null || maxVal === null || minVal === maxVal) {
    return null;
  }
  return { min: minVal, max: maxVal };
}

function extractDaysAtIndex(
  datasets: readonly AppChartDataset[],
  dataIndex: number,
): string | undefined {
  for (const ds of datasets) {
    const itemNorm = ds.normalizedData?.[dataIndex] as { days?: number } | undefined;
    if (itemNorm?.days) {
      return Number(itemNorm.days).toFixed(1);
    }
  }
  return undefined;
}

/**
 * Filters tooltip items so null gaps, prediction extension lines, Min/Max band helpers,
 * and duplicate prediction anchor points at the last historical index are omitted.
 */
export function buildTooltipFilter(
  languageService: LanguageService,
  getData: () => ChartDataPoint[],
) {
  const minLabel = languageService.translate('PREDICTIONS.MIN');
  const maxLabel = languageService.translate('PREDICTIONS.MAX');
  const predictionLabel = languageService.translate('CHART.CONSUMPTION_PREDICTION');

  return (item: TooltipItemLike): boolean => {
    if (extractNumericY(item) === null) return false;
    const ds = item.dataset;
    if (!ds || ds.isPredictionExtension) return false;
    const label = ds.label ?? '';
    if (label === minLabel || label === maxLabel) return false;
    if (label.includes(predictionLabel) && item.dataIndex < getData().length) {
      return false;
    }
    return true;
  };
}

export function buildTooltipTitleCallback(
  languageService: LanguageService,
  getData: () => ChartDataPoint[],
  mobile = false,
) {
  const dateOpts = mobile ? MOBILE_TOOLTIP_DATE_OPTIONS : DESKTOP_TOOLTIP_DATE_OPTIONS;
  return (tooltipItems: readonly TooltipItemLike[]): string => {
    if (tooltipItems.length === 0) return '';
    const item = tooltipItems[0];
    const resolvedDate = resolvePointDate(getData(), item.dataIndex);
    if (resolvedDate) {
      return languageService.formatDate(resolvedDate, dateOpts);
    }
    return item.label ?? '';
  };
}

export function buildTooltipLabelCallback(
  languageService: LanguageService,
  chartType: BuildTooltipOptionsDeps['chartType'],
  mobile = false,
  compactLabel?: (label: string) => string,
) {
  const minLabel = languageService.translate('PREDICTIONS.MIN');
  const maxLabel = languageService.translate('PREDICTIONS.MAX');
  const predictionLabel = languageService.translate('CHART.CONSUMPTION_PREDICTION');

  return (context: TooltipItemLike): string => {
    const unit = chartType === 'heating' || chartType === 'electricity' ? 'kWh' : 'L';
    const numericY = extractNumericY(context) ?? 0;
    const val = Math.round(numericY);
    const rawDatasetLabel = context.dataset?.label ?? '';
    const datasetLabel = mobile && compactLabel ? compactLabel(rawDatasetLabel) : rawDatasetLabel;

    let label = datasetLabel ? `${datasetLabel}: ${val} ${unit}` : `${val} ${unit}`;

    if (rawDatasetLabel.includes(predictionLabel) && context.dataset) {
      const range = resolvePredictionRange(
        context.chart?.data?.datasets,
        context.dataset as AppChartDataset,
        context.dataIndex,
        minLabel,
        maxLabel,
      );
      if (range) {
        label += ` (${range.min}–${range.max} ${unit})`;
      }
    }

    if (!mobile) {
      const normalizedData = context.dataset?.normalizedData;
      const itemNorm = normalizedData?.[context.dataIndex] as { days?: number } | undefined;
      if (itemNorm?.days) {
        const days = Number(itemNorm.days).toFixed(1);
        label += ` ${languageService.translate('CHART.ESTIMATED_MONTHLY', { days })}`;
      }
    }

    return label;
  };
}

function buildExternalMobileHandler(deps: BuildTooltipOptionsDeps) {
  const { languageService, chartType, getData, compactLabel, onMobileTooltip } = deps;
  const unit = chartType === 'heating' || chartType === 'electricity' ? 'kWh' : 'L';
  const minLabel = languageService.translate('PREDICTIONS.MIN');
  const maxLabel = languageService.translate('PREDICTIONS.MAX');
  const predictionLabel = languageService.translate('CHART.CONSUMPTION_PREDICTION');

  return (ctx: { chart: Chart; tooltip: TooltipModel<'line'> }): void => {
    if (!onMobileTooltip) return;
    const { tooltip, chart } = ctx;
    const points = tooltip?.dataPoints;
    if (!tooltip || tooltip.opacity === 0 || !points || points.length === 0) {
      onMobileTooltip(null);
      return;
    }

    const dataIndex = points[0].dataIndex;
    const resolvedDate = resolvePointDate(getData(), dataIndex);
    const dateText = resolvedDate
      ? languageService.formatDate(resolvedDate, MOBILE_TOOLTIP_DATE_OPTIONS)
      : points[0].label;

    const days = extractDaysAtIndex(
      points.map((pt) => pt.dataset as AppChartDataset),
      dataIndex,
    );
    const periodNote = days ? languageService.translate('CHART.DAYS_SHORT', { days }) : undefined;

    const items: MobileReadoutItem[] = points.map((pt) => {
      const numericY = extractNumericY(pt) ?? 0;
      const val = Math.round(numericY);
      const rawLabel = pt.dataset?.label ?? '';
      const shortName = compactLabel(rawLabel);
      let valueText = `${val} ${unit}`;

      if (rawLabel.includes(predictionLabel)) {
        const range = resolvePredictionRange(
          chart?.data?.datasets,
          pt.dataset as AppChartDataset,
          dataIndex,
          minLabel,
          maxLabel,
        );
        if (range) {
          valueText += ` (${range.min}–${range.max})`;
        }
      }

      return {
        label: shortName,
        valueText,
        color: resolveDatasetColor(pt.dataset),
      };
    });

    onMobileTooltip({ dateText, periodNote, items });
  };
}

/**
 * Builds the idle (latest historical data point) readout for mobile screens
 * so users see the most recent reading at a glance with zero layout shift when scrubbing starts.
 */
export function buildDefaultMobileReadout(
  records: ChartDataPoint[],
  chartData: ChartConfiguration['data'],
  languageService: LanguageService,
  chartType: BuildTooltipOptionsDeps['chartType'],
  compactLabel: (label: string) => string,
): MobileTooltipReadout | null {
  if (records.length === 0 || !chartData.datasets || chartData.datasets.length === 0) {
    return null;
  }

  const minLabel = languageService.translate('PREDICTIONS.MIN');
  const maxLabel = languageService.translate('PREDICTIONS.MAX');
  const predictionLabel = languageService.translate('CHART.CONSUMPTION_PREDICTION');
  const unit = chartType === 'heating' || chartType === 'electricity' ? 'kWh' : 'L';
  const targetIndex = records.length - 1;
  const dateObj = parseSafeDate(records[targetIndex].date);
  const dateText = languageService.formatDate(dateObj, MOBILE_TOOLTIP_DATE_OPTIONS);

  const items: MobileReadoutItem[] = [];
  const activeDatasets: AppChartDataset[] = [];

  for (const ds of chartData.datasets) {
    const appDs = ds as AppChartDataset;
    const rawLabel = ds.label ?? '';
    if (
      appDs.isPredictionExtension ||
      rawLabel === minLabel ||
      rawLabel === maxLabel ||
      rawLabel.includes(predictionLabel)
    ) {
      continue;
    }

    const rawVal = ds.data?.[targetIndex];
    if (typeof rawVal !== 'number' || Number.isNaN(rawVal)) {
      continue;
    }

    activeDatasets.push(appDs);
    items.push({
      label: compactLabel(rawLabel),
      valueText: `${Math.round(rawVal)} ${unit}`,
      color: resolveDatasetColor(ds),
    });
  }

  if (items.length === 0) {
    return null;
  }

  const days = extractDaysAtIndex(activeDatasets, targetIndex);
  const periodNote = days ? languageService.translate('CHART.DAYS_SHORT', { days }) : undefined;

  return { dateText, periodNote, items };
}

export function buildTooltipOptions(
  deps: BuildTooltipOptionsDeps,
): NonNullable<NonNullable<ChartConfiguration['options']>['plugins']>['tooltip'] {
  const { languageService, chartType, getData, mobile, compactLabel, onMobileTooltip } = deps;
  const filter = buildTooltipFilter(languageService, getData);
  const callbacks = {
    title: buildTooltipTitleCallback(languageService, getData, mobile),
    label: buildTooltipLabelCallback(languageService, chartType, mobile, compactLabel),
    ...(mobile
      ? {
          footer: (items: readonly TooltipItemLike[]): string => {
            if (items.length === 0) return '';
            const days = extractDaysAtIndex(
              items.map((it) => (it.dataset ?? {}) as AppChartDataset),
              items[0].dataIndex,
            );
            return days ? languageService.translate('CHART.DAYS_SHORT', { days }) : '';
          },
        }
      : {}),
  };

  if (mobile && onMobileTooltip) {
    return {
      enabled: false,
      filter,
      callbacks,
      external: buildExternalMobileHandler(deps),
    };
  }

  if (mobile) {
    return {
      filter,
      titleFont: { size: 11 },
      bodyFont: { size: 11 },
      footerFont: { size: 10, weight: 'normal' },
      padding: 8,
      boxWidth: 8,
      boxHeight: 8,
      caretSize: 4,
      callbacks,
    };
  }

  return {
    filter,
    callbacks,
  };
}
