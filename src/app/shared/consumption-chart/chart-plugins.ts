import { Chart } from 'chart.js';
import { DynamicHeatingRecord, calculateDynamicHeatingTotal } from '../../models/records.model';

/**
 * Custom plugin to highlight no-consumption periods with yellow background and boundary lines.
 * Used for heating charts to show summer periods when no heating is used.
 */
export const summerSunPlugin = {
    id: 'summerSun',
    beforeDatasetsDraw(chart: Chart, _args: object, options: { enabled?: boolean; records?: (DynamicHeatingRecord | { date: Date })[] }) {
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

        // Find contiguous periods with no consumption change
        const periods: { startIndex: number; endIndex: number }[] = [];
        let periodStart: number | null = null;

        for (let i = 1; i < records.length; i++) {
            const currentTotal = getTotal(records[i]);
            const prevTotal = getTotal(records[i - 1]);
            const isFlat = currentTotal === prevTotal;

            if (isFlat && periodStart === null) {
                periodStart = i - 1; // Start at previous point
            } else if (!isFlat && periodStart !== null) {
                periods.push({ startIndex: periodStart, endIndex: i - 1 });
                periodStart = null;
            }
        }
        // Close any open period
        if (periodStart !== null) {
            periods.push({ startIndex: periodStart, endIndex: records.length - 1 });
        }

        // Draw each period
        periods.forEach(period => {
            // Only draw if period has at least 2 flat points
            if (period.endIndex - period.startIndex < 1) return;

            const xStart = xScale.getPixelForValue(period.startIndex);
            const xEnd = xScale.getPixelForValue(period.endIndex);
            const width = xEnd - xStart;

            // Draw yellowish background
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 180, 0.5)'; // Light yellow with transparency
            ctx.fillRect(xStart, chartArea.top, width, chartArea.bottom - chartArea.top);

            // Draw vertical boundary lines
            ctx.strokeStyle = '#FFD700'; // Gold color
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]); // Dashed line

            // Start line
            ctx.beginPath();
            ctx.moveTo(xStart, chartArea.top);
            ctx.lineTo(xStart, chartArea.bottom);
            ctx.stroke();

            // End line
            ctx.beginPath();
            ctx.moveTo(xEnd, chartArea.top);
            ctx.lineTo(xEnd, chartArea.bottom);
            ctx.stroke();

            // Draw single sun in center of period
            const centerX = (xStart + xEnd) / 2;
            const centerY = chartArea.top + 20;

            ctx.setLineDash([]); // Reset to solid
            ctx.fillStyle = '#FFA500'; // Orange
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('☼', centerX, centerY);

            ctx.restore();
        });
    }
};

/**
 * Plugin to mark new year boundaries (when meter values reset).
 * Shows a vertical line with a star and year label.
 */
export const newYearMarkerPlugin = {
    id: 'newYearMarker',
    beforeDatasetsDraw(chart: Chart, _args: object, options: { enabled?: boolean; records?: { date: Date }[] }) {
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
        yearChanges.forEach(index => {
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
    }
};

/**
 * Register all custom chart plugins.
 * Call this once at application startup.
 */
export function registerChartPlugins(): void {
    Chart.register(summerSunPlugin);
    Chart.register(newYearMarkerPlugin);
}
