import { ChartConfiguration } from 'chart.js';
import { ConsumptionRecord, ComparisonData, AppChartDataset } from '../models/records.model';

export interface WaterCategoryConfig {
  key: 'bathroomWarm' | 'kitchenWarm' | 'bathroomCold' | 'kitchenCold';
  labelKey: string;
  avgLabelKey: string;
  color: string;
  bg: string;
  trendColor: string;
}

export interface PairedWaterCategoryConfig {
  categoryId: string;
  labelKey: string;
  trendPrefixKey: string;
  avgLabelKey: string;
  backgroundColor: string;
  borderColor: string;
  extractRecordSum: (r: ConsumptionRecord) => number | null;
  extractComparisonSum: (d: ComparisonData) => number | null;
}

export const WATER_DETAILED_CATEGORIES: WaterCategoryConfig[] = [
  {
    key: 'bathroomWarm',
    labelKey: 'CHART.BATHROOM_WARM',
    avgLabelKey: 'CHART.BATHROOM_WARM_AVG',
    color: '#ff9f40',
    bg: 'rgba(255, 159, 64, 0.1)',
    trendColor: '#ffcd56',
  },
  {
    key: 'kitchenWarm',
    labelKey: 'CHART.KITCHEN_WARM',
    avgLabelKey: 'CHART.KITCHEN_WARM_AVG',
    color: '#ff6384',
    bg: 'rgba(255, 99, 132, 0.1)',
    trendColor: '#ff6384',
  },
  {
    key: 'bathroomCold',
    labelKey: 'CHART.BATHROOM_COLD',
    avgLabelKey: 'CHART.BATHROOM_COLD_AVG',
    color: '#4bc0c0',
    bg: 'rgba(75, 192, 192, 0.1)',
    trendColor: '#4bc0c0',
  },
  {
    key: 'kitchenCold',
    labelKey: 'CHART.KITCHEN_COLD',
    avgLabelKey: 'CHART.KITCHEN_COLD_AVG',
    color: '#36a2eb',
    bg: 'rgba(54, 162, 235, 0.1)',
    trendColor: '#36a2eb',
  },
];

export const WATER_BY_ROOM_CATEGORIES: PairedWaterCategoryConfig[] = [
  {
    categoryId: 'kitchenTotal',
    labelKey: 'CHART.KITCHEN_TOTAL',
    trendPrefixKey: 'CHART.KITCHEN',
    avgLabelKey: 'CHART.KITCHEN_AVERAGE',
    backgroundColor: 'rgba(23, 162, 184, 0.5)',
    borderColor: '#17a2b8',
    extractRecordSum: (r) => sumNullable2(r.kitchenWarm, r.kitchenCold),
    extractComparisonSum: (d) => sumNullable2(d.kitchenWarm, d.kitchenCold),
  },
  {
    categoryId: 'bathroomTotal',
    labelKey: 'CHART.BATHROOM_TOTAL',
    trendPrefixKey: 'CHART.BATHROOM',
    avgLabelKey: 'CHART.BATHROOM_AVERAGE',
    backgroundColor: 'rgba(108, 117, 125, 0.5)',
    borderColor: '#6c757d',
    extractRecordSum: (r) => sumNullable2(r.bathroomWarm, r.bathroomCold),
    extractComparisonSum: (d) => sumNullable2(d.bathroomWarm, d.bathroomCold),
  },
];

export const WATER_BY_TYPE_CATEGORIES: PairedWaterCategoryConfig[] = [
  {
    categoryId: 'warmTotal',
    labelKey: 'CHART.WARM_WATER_TOTAL',
    trendPrefixKey: 'CHART.WARM_WATER_TOTAL',
    avgLabelKey: 'CHART.WARM_WATER_AVG',
    backgroundColor: 'rgba(255, 193, 7, 0.5)',
    borderColor: '#ffc107',
    extractRecordSum: (r) => sumNullable2(r.kitchenWarm, r.bathroomWarm),
    extractComparisonSum: (d) => sumNullable2(d.kitchenWarm, d.bathroomWarm),
  },
  {
    categoryId: 'coldTotal',
    labelKey: 'CHART.COLD_WATER_TOTAL',
    trendPrefixKey: 'CHART.COLD_WATER_TOTAL',
    avgLabelKey: 'CHART.COLD_WATER_AVG',
    backgroundColor: 'rgba(108, 117, 125, 0.5)',
    borderColor: '#6c757d',
    extractRecordSum: (r) => sumNullable2(r.kitchenCold, r.bathroomCold),
    extractComparisonSum: (d) => sumNullable2(d.kitchenCold, d.bathroomCold),
  },
];

/**
 * Fast two-argument nullable sum without rest-array allocation
 */
export function sumNullable2(
  a: number | undefined | null,
  b: number | undefined | null,
): number | null {
  let sum = 0;
  let hasValid = false;
  if (typeof a === 'number' && !Number.isNaN(a)) {
    sum += a;
    hasValid = true;
  }
  if (typeof b === 'number' && !Number.isNaN(b)) {
    sum += b;
    hasValid = true;
  }
  return hasValid ? sum : null;
}

/**
 * Fast four-argument nullable sum without rest-array allocation
 */
export function sumNullable4(
  a: number | undefined | null,
  b: number | undefined | null,
  c: number | undefined | null,
  d: number | undefined | null,
): number | null {
  let sum = 0;
  let hasValid = false;
  if (typeof a === 'number' && !Number.isNaN(a)) {
    sum += a;
    hasValid = true;
  }
  if (typeof b === 'number' && !Number.isNaN(b)) {
    sum += b;
    hasValid = true;
  }
  if (typeof c === 'number' && !Number.isNaN(c)) {
    sum += c;
    hasValid = true;
  }
  if (typeof d === 'number' && !Number.isNaN(d)) {
    sum += d;
    hasValid = true;
  }
  return hasValid ? sum : null;
}

/**
 * Sum nullable numeric values, returning null if all inputs are null/undefined/NaN
 */
export function sumNullable(...values: (number | undefined | null)[]): number | null {
  let sum = 0;
  let hasValid = false;
  for (const v of values) {
    if (v !== undefined && v !== null && typeof v === 'number' && !Number.isNaN(v)) {
      sum += v;
      hasValid = true;
    }
  }
  return hasValid ? sum : null;
}

/**
 * Filter out datasets where all values are 0 (no data entered for that category)
 */
export function filterEmptyDatasets(
  datasets: ChartConfiguration['data']['datasets'],
): ChartConfiguration['data']['datasets'] {
  return datasets.filter((dataset) => {
    if (!dataset.data || !Array.isArray(dataset.data)) return true;
    return dataset.data.some(
      (value: unknown) =>
        value !== 0 &&
        value !== null &&
        value !== undefined &&
        !(typeof value === 'number' && Number.isNaN(value)),
    );
  });
}

/**
 * Build datasets for a paired water chart view (by-room or by-type), including optional trendlines and comparisons.
 */
export function buildPairedWaterViewDatasets(params: {
  recs: ConsumptionRecord[];
  categories: PairedWaterCategoryConfig[];
  suffix: string;
  showComparison: boolean;
  comparisonData: ComparisonData[];
  showTrendline?: boolean;
  translateFn: (key: string) => string;
  generateTrendlineFn: (dataPoints: number[]) => number[];
}): ChartConfiguration['data']['datasets'] {
  const {
    recs,
    categories,
    suffix,
    showComparison,
    comparisonData,
    showTrendline,
    translateFn,
    generateTrendlineFn,
  } = params;

  const seriesList = categories.map((cat) => {
    let hasData = false;
    const data = recs.map((r) => {
      const val = cat.extractRecordSum(r);
      if ((val || 0) > 0) hasData = true;
      return val;
    });
    return {
      cat,
      data,
      hasData,
    };
  });

  const datasets: AppChartDataset[] = seriesList.map(({ cat, data }) => ({
    data,
    label: translateFn(cat.labelKey) + suffix,
    backgroundColor: cat.backgroundColor,
    borderColor: cat.borderColor,
    borderWidth: 1,
    tension: 0.4,
    categoryId: cat.categoryId,
  }));

  if (showTrendline && recs.length >= 2) {
    for (const { cat, data, hasData } of seriesList) {
      if (hasData) {
        const trendData = generateTrendlineFn(data.map((v) => v || 0));
        datasets.push({
          data: trendData,
          label: `${translateFn(cat.trendPrefixKey)} ${translateFn('CHART.TRENDLINE')}`,
          type: 'line',
          borderColor: cat.borderColor,
          borderWidth: 2,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false,
          trendlineFor: cat.categoryId,
        } as AppChartDataset);
      }
    }
  }

  if (showComparison && comparisonData.length > 0) {
    const firstComp = comparisonData[0];
    for (const { cat, hasData } of seriesList) {
      if (hasData) {
        const avgVal = cat.extractComparisonSum(firstComp);
        datasets.push({
          type: 'line',
          label: translateFn(cat.avgLabelKey),
          data: new Array<number | null>(comparisonData.length).fill(avgVal),
          borderColor: cat.borderColor,
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
          tension: 0.4,
        });
      }
    }
  }

  return filterEmptyDatasets(datasets);
}
