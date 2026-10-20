import { Chart } from 'chart.js';
import {
  AppChartDataset,
  DynamicHeatingRecord,
  calculateDynamicHeatingTotal,
} from '../../../models/records.model';

/**
 * Period descriptor for summer sun highlight zones (historical or predicted).
 */
export interface SummerSunPeriod {
  startIndex: number;
  endIndex: number;
  isPrediction?: boolean;
}

function getHeatingRecordTotal(record: DynamicHeatingRecord | { date: Date }): number {
  if ('rooms' in record && typeof record.rooms === 'object') {
    return calculateDynamicHeatingTotal(record as DynamicHeatingRecord);
  }
  return 0;
}

function findHistoricalPeriods(
  records: (DynamicHeatingRecord | { date: Date })[],
): SummerSunPeriod[] {
  const historicalPeriods: SummerSunPeriod[] = [];
  let histPeriodStart: number | null = null;

  for (let i = 1; i < records.length; i++) {
    const isFlat = getHeatingRecordTotal(records[i]) === getHeatingRecordTotal(records[i - 1]);

    if (isFlat && histPeriodStart === null) {
      histPeriodStart = i - 1;
    } else if (!isFlat && histPeriodStart !== null) {
      historicalPeriods.push({
        startIndex: histPeriodStart,
        endIndex: i - 1,
        isPrediction: false,
      });
      histPeriodStart = null;
    }
  }

  if (histPeriodStart !== null) {
    historicalPeriods.push({
      startIndex: histPeriodStart,
      endIndex: records.length - 1,
      isPrediction: false,
    });
  }

  return historicalPeriods;
}

function getActivePredictionDatasets(chart: Chart): AppChartDataset[] {
  const datasets = (chart.data?.datasets || []) as AppChartDataset[];
  const predDatasets = datasets.filter(
    (ds) =>
      Boolean(ds.data) &&
      ds.borderDash?.[0] === 4 &&
      ds.borderDash?.[1] === 4 &&
      !ds.isPredictionExtension,
  );
  if (predDatasets.length === 0) return [];

  const visible = predDatasets.filter((ds) => {
    const dsIdx = (chart.data?.datasets || []).indexOf(ds);
    return typeof chart.isDatasetVisible === 'function' ? chart.isDatasetVisible(dsIdx) : true;
  });
  return visible.length > 0 ? visible : predDatasets;
}

function findPredictedPeriods(chart: Chart, historyLength: number): SummerSunPeriod[] {
  const labelsLength = chart.data?.labels?.length || 0;
  if (labelsLength <= historyLength) return [];

  const activePredDatasets = getActivePredictionDatasets(chart);
  if (activePredDatasets.length === 0) return [];

  const predictedPeriods: SummerSunPeriod[] = [];
  let predPeriodStart: number | null = null;

  for (let i = historyLength; i < labelsLength; i++) {
    const isZero = activePredDatasets.every((ds) => (ds.data as (number | null)[])[i] === 0);

    if (isZero && predPeriodStart === null) {
      predPeriodStart = i;
    } else if (!isZero && predPeriodStart !== null) {
      predictedPeriods.push({
        startIndex: predPeriodStart,
        endIndex: i - 1,
        isPrediction: true,
      });
      predPeriodStart = null;
    }
  }

  if (predPeriodStart !== null) {
    predictedPeriods.push({
      startIndex: predPeriodStart,
      endIndex: labelsLength - 1,
      isPrediction: true,
    });
  }

  return predictedPeriods;
}

function drawHistoricalPeriod(
  ctx: CanvasRenderingContext2D,
  xScale: { getPixelForValue: (val: number) => number },
  chartArea: { top: number; bottom: number },
  period: SummerSunPeriod,
): void {
  if (period.endIndex - period.startIndex < 1) return;
  const xStart = xScale.getPixelForValue(period.startIndex);
  const xEnd = xScale.getPixelForValue(period.endIndex);
  const width = xEnd - xStart;
  if (width <= 0) return;

  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 180, 0.5)';
  ctx.fillRect(xStart, chartArea.top, width, chartArea.bottom - chartArea.top);

  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]);

  ctx.beginPath();
  ctx.moveTo(xStart, chartArea.top);
  ctx.lineTo(xStart, chartArea.bottom);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(xEnd, chartArea.top);
  ctx.lineTo(xEnd, chartArea.bottom);
  ctx.stroke();

  const centerX = (xStart + xEnd) / 2;
  const centerY = chartArea.top + 20;

  ctx.setLineDash([]);
  ctx.fillStyle = '#FFA500';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('☼', centerX, centerY);

  ctx.restore();
}

function drawPredictedPeriod(
  ctx: CanvasRenderingContext2D,
  xScale: { getPixelForValue: (val: number) => number },
  chartArea: { top: number; bottom: number },
  period: SummerSunPeriod,
): void {
  let xStart: number;
  let xEnd: number;

  if (period.startIndex === period.endIndex) {
    const centerX = xScale.getPixelForValue(period.startIndex);
    const prevX = xScale.getPixelForValue(period.startIndex - 1);
    const halfStep = Math.abs(centerX - prevX) / 2 || 20;
    xStart = centerX - halfStep;
    xEnd = centerX + halfStep;
  } else {
    xStart = xScale.getPixelForValue(period.startIndex);
    xEnd = xScale.getPixelForValue(period.endIndex);
  }

  const width = xEnd - xStart;
  if (width <= 0) return;

  ctx.save();
  ctx.fillStyle = 'rgba(255, 220, 130, 0.35)';
  ctx.fillRect(xStart, chartArea.top, width, chartArea.bottom - chartArea.top);

  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 3]);

  ctx.beginPath();
  ctx.moveTo(xStart, chartArea.top);
  ctx.lineTo(xStart, chartArea.bottom);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(xEnd, chartArea.top);
  ctx.lineTo(xEnd, chartArea.bottom);
  ctx.stroke();

  const centerX = (xStart + xEnd) / 2;
  const centerY = chartArea.top + 20;

  ctx.setLineDash([]);
  ctx.fillStyle = '#EA580C';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('☼', centerX, centerY);

  ctx.restore();
}

function drawMergedPeriod(
  ctx: CanvasRenderingContext2D,
  xScale: { getPixelForValue: (val: number) => number },
  chartArea: { top: number; bottom: number },
  lastHist: SummerSunPeriod,
  firstPred: SummerSunPeriod,
  historyLength: number,
): void {
  const xStart = xScale.getPixelForValue(lastHist.startIndex);
  const xMid = xScale.getPixelForValue(historyLength - 1);

  let xEnd: number;
  if (firstPred.startIndex === firstPred.endIndex) {
    const currX = xScale.getPixelForValue(firstPred.startIndex);
    const halfStep = Math.abs(currX - xMid) / 2 || 20;
    xEnd = currX + halfStep;
  } else {
    xEnd = xScale.getPixelForValue(firstPred.endIndex);
  }

  const totalWidth = xEnd - xStart;
  if (totalWidth <= 0) return;

  ctx.save();

  if (xMid > xStart) {
    ctx.fillStyle = 'rgba(255, 255, 180, 0.5)';
    ctx.fillRect(xStart, chartArea.top, xMid - xStart, chartArea.bottom - chartArea.top);
  }

  if (xEnd > xMid) {
    ctx.fillStyle = 'rgba(255, 220, 130, 0.35)';
    ctx.fillRect(xMid, chartArea.top, xEnd - xMid, chartArea.bottom - chartArea.top);
  }

  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.moveTo(xStart, chartArea.top);
  ctx.lineTo(xStart, chartArea.bottom);
  ctx.stroke();

  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(xEnd, chartArea.top);
  ctx.lineTo(xEnd, chartArea.bottom);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.moveTo(xMid, chartArea.top);
  ctx.lineTo(xMid, chartArea.bottom);
  ctx.stroke();

  const centerX = (xStart + xEnd) / 2;
  const centerY = chartArea.top + 20;

  ctx.setLineDash([]);
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('☼', centerX, centerY);

  ctx.restore();
}

/**
 * Custom plugin to highlight no-consumption periods with a sun symbol and background shading.
 * Used for heating charts to show summer periods when no heating is used (both historical and predicted).
 */
export const summerSunPlugin = {
  id: 'summerSun',
  beforeDatasetsDraw(
    chart: Chart,
    _args: object,
    options: { enabled?: boolean; records?: (DynamicHeatingRecord | { date: Date })[] },
  ) {
    if (!options?.enabled || !options?.records) return;

    const ctx = chart.ctx;
    const xScale = chart.scales['x'];
    const chartArea = chart.chartArea;
    const records = options.records;

    if (!xScale || !chartArea || records.length < 2) return;

    const historicalPeriods = findHistoricalPeriods(records);
    const predictedPeriods = findPredictedPeriods(chart, records.length);

    const lastHist = historicalPeriods.at(-1);
    const firstPred = predictedPeriods[0];
    const isConnected =
      lastHist !== undefined &&
      firstPred !== undefined &&
      lastHist.endIndex === records.length - 1 &&
      firstPred.startIndex === records.length;

    let standaloneHist = historicalPeriods;
    let standalonePred = predictedPeriods;

    if (isConnected && lastHist && firstPred) {
      drawMergedPeriod(ctx, xScale, chartArea, lastHist, firstPred, records.length);
      standaloneHist = historicalPeriods.slice(0, -1);
      standalonePred = predictedPeriods.slice(1);
    }

    standaloneHist.forEach((period) => drawHistoricalPeriod(ctx, xScale, chartArea, period));
    standalonePred.forEach((period) => drawPredictedPeriod(ctx, xScale, chartArea, period));
  },
};

/**
 * Plugin to mark new year boundaries (when meter values reset).
 * Shows a vertical line with a star and year label.
 */
export const newYearMarkerPlugin = {
  id: 'newYearMarker',
  beforeDatasetsDraw(
    chart: Chart,
    _args: object,
    options: { enabled?: boolean; records?: { date: Date }[] },
  ) {
    if (!options?.enabled || !options?.records) return;

    const ctx = chart.ctx;
    const xScale = chart.scales['x'];
    const chartArea = chart.chartArea;
    const records = options.records as { date: Date }[];

    if (!xScale || !chartArea || records.length < 2) return;

    // Find indices where year changes
    const yearChanges: number[] = [];
    for (let i = 1; i < records.length; i++) {
      const prevYear = new Date(records[i - 1].date).getFullYear();
      const currYear = new Date(records[i].date).getFullYear();
      if (currYear > prevYear) {
        yearChanges.push(i);
      }
    }

    // Draw marker for each year change
    yearChanges.forEach((index) => {
      const x = xScale.getPixelForValue(index);
      const year = new Date(records[index].date).getFullYear();

      ctx.save();

      // Draw vertical line
      ctx.strokeStyle = '#9C27B0'; // Purple
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]); // Dashed
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();

      // Draw year label with background
      ctx.setLineDash([]);
      const label = `${year}`;
      ctx.font = 'bold 11px Arial';
      const textWidth = ctx.measureText(label).width;
      const padding = 4;
      const boxWidth = textWidth + padding * 2;
      const boxHeight = 16;
      const boxX = x - boxWidth / 2;
      const boxY = chartArea.bottom - boxHeight - 5;

      // Background
      ctx.fillStyle = '#9C27B0';
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

      // Text
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, boxY + boxHeight / 2);

      // Draw star icon at top
      ctx.fillStyle = '#FFD700'; // Gold
      ctx.font = 'bold 16px Arial';
      ctx.fillText('★', x, chartArea.top + 12);

      ctx.restore();
    });
  },
};

/**
 * Register all custom chart plugins.
 * Call this once at application startup.
 */
export function registerChartPlugins(): void {
  Chart.register(summerSunPlugin);
  Chart.register(newYearMarkerPlugin);
}
