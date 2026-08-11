import { Chart } from 'chart.js';
import { DynamicHeatingRecord, calculateDynamicHeatingTotal } from '../../models/records.model';

/**
 * Period descriptor for summer sun highlight zones (historical or predicted).
 */
export interface SummerSunPeriod {
  startIndex: number;
  endIndex: number;
  isPrediction?: boolean;
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

    // Calculate total for a record
    const getTotal = (record: DynamicHeatingRecord | { date: Date }): number => {
      if ('rooms' in record && typeof record.rooms === 'object') {
        return calculateDynamicHeatingTotal(record as DynamicHeatingRecord);
      }
      return 0;
    };

    // 1. Find contiguous historical periods with no consumption change
    const historicalPeriods: SummerSunPeriod[] = [];
    let histPeriodStart: number | null = null;

    for (let i = 1; i < records.length; i++) {
      const currentTotal = getTotal(records[i]);
      const prevTotal = getTotal(records[i - 1]);
      const isFlat = currentTotal === prevTotal;

      if (isFlat && histPeriodStart === null) {
        histPeriodStart = i - 1; // Start at previous point
      } else if (!isFlat && histPeriodStart !== null) {
        historicalPeriods.push({ startIndex: histPeriodStart, endIndex: i - 1, isPrediction: false });
        histPeriodStart = null;
      }
    }
    // Close any open historical period
    if (histPeriodStart !== null) {
      historicalPeriods.push({ startIndex: histPeriodStart, endIndex: records.length - 1, isPrediction: false });
    }

    // 2. Find predicted periods with no consumption (expected rate === 0)
    const predictedPeriods: SummerSunPeriod[] = [];
    const datasets = chart.data?.datasets || [];
    const predDatasets = datasets.filter(
      (ds) =>
        ds.data &&
        (ds as any).borderDash &&
        (ds as any).borderDash[0] === 4 &&
        (ds as any).borderDash[1] === 4 &&
        !(ds as any).isPredictionExtension,
    );

    if (predDatasets.length > 0) {
      const labelsLength = chart.data?.labels?.length || 0;
      const historyLength = records.length;

      if (labelsLength > historyLength) {
        // Filter for visible prediction datasets if legend toggling is used
        const visiblePredDatasets = predDatasets.filter((ds) => {
          const dsIdx = datasets.indexOf(ds);
          return typeof chart.isDatasetVisible === 'function' ? chart.isDatasetVisible(dsIdx) : true;
        });
        const activePredDatasets = visiblePredDatasets.length > 0 ? visiblePredDatasets : predDatasets;

        let predPeriodStart: number | null = null;

        for (let i = historyLength; i < labelsLength; i++) {
          // Check if prediction is 0 at index i across active prediction datasets
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
      }
    }

    // 3. Check if the last historical period connects directly into the first predicted period
    const lastHist = historicalPeriods[historicalPeriods.length - 1];
    const firstPred = predictedPeriods[0];

    const isConnected =
      !!lastHist &&
      !!firstPred &&
      lastHist.endIndex === records.length - 1 &&
      firstPred.startIndex === records.length;

    let standaloneHistorical = historicalPeriods;
    let standalonePredicted = predictedPeriods;

    if (isConnected) {
      // Remove connected ends so they are drawn as one unified merged period
      standaloneHistorical = historicalPeriods.slice(0, -1);
      standalonePredicted = predictedPeriods.slice(1);
    }

    // 4. Draw standalone historical periods
    const drawHistoricalPeriod = (period: SummerSunPeriod) => {
      if (period.endIndex - period.startIndex < 1) return;
      const xStart = xScale.getPixelForValue(period.startIndex);
      const xEnd = xScale.getPixelForValue(period.endIndex);
      const width = xEnd - xStart;
      if (width <= 0) return;

      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 180, 0.5)'; // Light yellow with transparency
      ctx.fillRect(xStart, chartArea.top, width, chartArea.bottom - chartArea.top);

      ctx.strokeStyle = '#FFD700'; // Gold color
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
      ctx.fillStyle = '#FFA500'; // Orange
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('☼', centerX, centerY);

      ctx.restore();
    };

    // 5. Draw standalone predicted periods
    const drawPredictedPeriod = (period: SummerSunPeriod) => {
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
      ctx.fillStyle = 'rgba(255, 220, 130, 0.35)'; // Warmer golden-amber
      ctx.fillRect(xStart, chartArea.top, width, chartArea.bottom - chartArea.top);

      ctx.strokeStyle = '#F59E0B'; // Amber gold
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
      ctx.fillStyle = '#EA580C'; // Warm deep amber/orange
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('☼', centerX, centerY);

      ctx.restore();
    };

    // 6. Draw merged ongoing summer period (current historical + future predicted)
    if (isConnected && lastHist && firstPred) {
      const xStart = xScale.getPixelForValue(lastHist.startIndex);
      const xMid = xScale.getPixelForValue(records.length - 1);

      let xEnd: number;
      if (firstPred.startIndex === firstPred.endIndex) {
        const currX = xScale.getPixelForValue(firstPred.startIndex);
        const halfStep = Math.abs(currX - xMid) / 2 || 20;
        xEnd = currX + halfStep;
      } else {
        xEnd = xScale.getPixelForValue(firstPred.endIndex);
      }

      const totalWidth = xEnd - xStart;
      if (totalWidth > 0) {
        ctx.save();

        // 6a. Historical section background (from xStart to xMid)
        if (xMid > xStart) {
          ctx.fillStyle = 'rgba(255, 255, 180, 0.5)';
          ctx.fillRect(xStart, chartArea.top, xMid - xStart, chartArea.bottom - chartArea.top);
        }

        // 6b. Predicted section background (from xMid to xEnd) - perfectly flush, no white gap
        if (xEnd > xMid) {
          ctx.fillStyle = 'rgba(255, 220, 130, 0.35)';
          ctx.fillRect(xMid, chartArea.top, xEnd - xMid, chartArea.bottom - chartArea.top);
        }

        // 6c. Boundary lines
        // Left boundary (historical start)
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(xStart, chartArea.top);
        ctx.lineTo(xStart, chartArea.bottom);
        ctx.stroke();

        // Right boundary (prediction end)
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(xEnd, chartArea.top);
        ctx.lineTo(xEnd, chartArea.bottom);
        ctx.stroke();

        // Midpoint transition line
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(xMid, chartArea.top);
        ctx.lineTo(xMid, chartArea.bottom);
        ctx.stroke();

        // 6d. Single unified sun in the center of the entire ongoing off-season period
        const centerX = (xStart + xEnd) / 2;
        const centerY = chartArea.top + 20;

        ctx.setLineDash([]);
        ctx.fillStyle = '#F59E0B'; // Warm amber
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☼', centerX, centerY);

        ctx.restore();
      }
    }

    standaloneHistorical.forEach(drawHistoricalPeriod);
    standalonePredicted.forEach(drawPredictedPeriod);
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
