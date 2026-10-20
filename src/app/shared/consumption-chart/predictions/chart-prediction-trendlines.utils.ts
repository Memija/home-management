import { AppChartDataset } from '../../../models/records.model';
import { LanguageService } from '../../../services/language.service';

export function findLastActualPoint(
  dsData: (number | null)[],
  maxIndex: number,
): { idx: number; val: number } | null {
  for (let j = maxIndex - 1; j >= 0; j--) {
    if (dsData[j] !== null && dsData[j] !== undefined) {
      return { idx: j, val: dsData[j] as number };
    }
  }
  return null;
}

export function extendCountryAverage(
  dsData: (number | null)[],
  startIdx: number,
  val: number,
): void {
  for (let j = startIdx; j < dsData.length; j++) {
    dsData[j] = val;
  }
}

export function createExtendedTrendlineDataset(
  ds: AppChartDataset,
  dsData: (number | null)[],
  lastPoint: { idx: number; val: number },
  totalPoints: number,
): AppChartDataset {
  const predTrendData: (number | null)[] = new Array(totalPoints).fill(null);
  predTrendData[lastPoint.idx] = lastPoint.val;

  let slope = 0;
  if (lastPoint.idx >= 1) {
    const prevVal = dsData[lastPoint.idx - 1] as number;
    slope = lastPoint.val - prevVal;
  }

  for (let j = lastPoint.idx + 1; j < predTrendData.length; j++) {
    const steps = j - lastPoint.idx;
    predTrendData[j] = Math.max(0, lastPoint.val + slope * steps);
  }

  const origColor = ds.borderColor as string;
  const predColor =
    origColor?.startsWith('#') && origColor.length === 7 ? origColor + '80' : origColor;

  return {
    label: ds.label,
    data: predTrendData as unknown[],
    type: 'line',
    borderColor: predColor,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    borderDash: [3, 6],
    borderWidth: ds.borderWidth ?? 1.5,
    pointRadius: 0,
    fill: false,
    tension: 0.4,
    spanGaps: true,
    isPredictionExtension: true,
    trendlineFor: (ds as AppChartDataset).trendlineFor,
  } as AppChartDataset;
}

export function extendTrendlinesAndAverages(
  datasets: AppChartDataset[],
  originalLabelsLength: number,
  predictionMonths: number,
  languageService: LanguageService,
): void {
  const existingDatasetCount = datasets.length;
  for (let i = 0; i < existingDatasetCount; i++) {
    const ds = datasets[i];
    const bdash = ds.borderDash as number[] | undefined;
    const dsData = ds.data as (number | null)[];

    const isTrendline = ds.label?.includes(languageService.translate('CHART.TRENDLINE'));
    const isCountryAverage = bdash?.[0] === 5; // [5, 5] dash = country/comparison average

    if (!isTrendline && !isCountryAverage) continue;

    const lastPoint = findLastActualPoint(dsData, originalLabelsLength);
    if (!lastPoint) continue;

    if (isCountryAverage) {
      extendCountryAverage(dsData, originalLabelsLength, lastPoint.val);
    } else if (isTrendline) {
      datasets.push(
        createExtendedTrendlineDataset(
          ds,
          dsData,
          lastPoint,
          originalLabelsLength + predictionMonths,
        ),
      );
    }
  }
}
