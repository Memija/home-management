import { Injectable, inject } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { LanguageService } from './language.service';
import { WaterAveragesService } from './water-averages.service';

export type ChartView = 'total' | 'by-room' | 'by-type' | 'detailed';
export type DisplayMode = 'total' | 'incremental';

export interface ChartDataParams {
    records: any[];
    labels: string[];
    view: ChartView;
    mode: DisplayMode;
    showTrendline?: boolean;
    showAverageComparison?: boolean;
    country?: string;
    familySize?: number;
}

@Injectable({
    providedIn: 'root'
})
export class ChartDataService {
    private languageService = inject(LanguageService);
    private waterAveragesService = inject(WaterAveragesService);

    /**
     * Calculate incremental (delta) data between consecutive readings
     */
    calculateIncrementalData(recs: any[]): any[] {
        if (recs.length <= 1) return recs;

        const incrementalData: any[] = [];
        for (let i = 1; i < recs.length; i++) {
            const current = recs[i];
            const previous = recs[i - 1];
            const incremental: any = { date: current.date };

            Object.keys(current).forEach(key => {
                if (key !== 'date' && typeof current[key] === 'number') {
                    incremental[key] = Math.max(0, (current[key] as number) - (previous[key] as number));
                }
            });

            incrementalData.push(incremental);
        }

        return incrementalData;
    }

    /**
     * Calculate linear regression (least squares method) for trendline
     */
    calculateLinearRegression(dataPoints: number[]): { slope: number; intercept: number } {
        const n = dataPoints.length;
        if (n < 2) return { slope: 0, intercept: dataPoints[0] || 0 };

        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumX2 = 0;

        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += dataPoints[i];
            sumXY += i * dataPoints[i];
            sumX2 += i * i;
        }

        const denominator = n * sumX2 - sumX * sumX;
        if (denominator === 0) return { slope: 0, intercept: sumY / n };

        const slope = (n * sumXY - sumX * sumY) / denominator;
        const intercept = (sumY - slope * sumX) / n;

        return { slope, intercept };
    }

    /**
     * Generate trendline data points from regression
     */
    generateTrendlineData(dataPoints: number[]): number[] {
        const { slope, intercept } = this.calculateLinearRegression(dataPoints);
        return dataPoints.map((_, index) => Math.round(slope * index + intercept));
    }

    /**
     * Generate comparison data based on country averages
     */
    generateComparisonData(processedData: any[], familySize: number, country: string): any[] {
        if (processedData.length === 0 || familySize === 0) return [];

        const countryData = this.waterAveragesService.getCountryData(country);
        const averageLitersPerPersonPerDay = countryData.averageLitersPerPersonPerDay;

        let totalDays = 0;
        if (processedData.length > 1) {
            const firstDate = new Date(processedData[0].date).getTime();
            const lastDate = new Date(processedData[processedData.length - 1].date).getTime();
            totalDays = Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24));
        }
        const averagePeriod = processedData.length > 1 ? totalDays / (processedData.length - 1) : 7;

        return processedData.map((current) => {
            const comparison: any = { date: current.date };
            const totalConsumption = averageLitersPerPersonPerDay * familySize * averagePeriod;

            // Distribute proportionally: Kitchen 15%, Bathroom 85%
            // Within each: Warm 40%, Cold 60%
            const kitchenTotal = totalConsumption * 0.15;
            const bathroomTotal = totalConsumption * 0.85;

            comparison['kitchenWarm'] = Math.round(kitchenTotal * 0.4);
            comparison['kitchenCold'] = Math.round(kitchenTotal * 0.6);
            comparison['bathroomWarm'] = Math.round(bathroomTotal * 0.4);
            comparison['bathroomCold'] = Math.round(bathroomTotal * 0.6);

            return comparison;
        });
    }

    /**
     * Generate chart data for water consumption
     */
    getWaterChartData(params: ChartDataParams): ChartConfiguration['data'] {
        const { records: recs, labels, view, mode, showTrendline, showAverageComparison, country, familySize } = params;
        const chartLabels = mode === 'incremental' ? labels.slice(1) : labels;
        const showComparison = (familySize ?? 0) > 0 && mode === 'incremental' && (showAverageComparison ?? false);
        const comparisonData = showComparison ? this.generateComparisonData(recs, familySize ?? 0, country ?? '') : [];

        switch (view) {
            case 'total':
                return this.getWaterTotalView(recs, chartLabels, showComparison, comparisonData, showTrendline);
            case 'by-room':
                return this.getWaterByRoomView(recs, chartLabels, showComparison, comparisonData);
            case 'by-type':
                return this.getWaterByTypeView(recs, chartLabels, showComparison, comparisonData);
            case 'detailed':
                return this.getWaterDetailedView(recs, chartLabels, showComparison, comparisonData);
        }
    }

    private getWaterTotalView(recs: any[], labels: string[], showComparison: boolean, comparisonData: any[], showTrendline?: boolean): ChartConfiguration['data'] {
        const datasets: any[] = [{
            label: showComparison ? this.languageService.translate('CHART.YOUR_FAMILY') :
                this.languageService.translate('CHART.TOTAL_WEEKLY_CONSUMPTION'),
            data: recs.map(r => (r['kitchenWarm'] as number) + (r['kitchenCold'] as number) + (r['bathroomWarm'] as number) + (r['bathroomCold'] as number)),
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: recs.length === 1 ? 8 : 3,
            pointHoverRadius: 6
        }];

        if (showComparison) {
            datasets.push({
                label: this.languageService.translate('CHART.AVERAGE_FAMILY'),
                data: comparisonData.map(r => (r['kitchenWarm'] as number) + (r['kitchenCold'] as number) + (r['bathroomWarm'] as number) + (r['bathroomCold'] as number)),
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.05)',
                fill: false,
                tension: 0,
                borderDash: [5, 5],
                pointRadius: 0
            });
        }

        if (showTrendline && recs.length >= 2) {
            const totalData = recs.map(r => (r['kitchenWarm'] as number) + (r['kitchenCold'] as number) + (r['bathroomWarm'] as number) + (r['bathroomCold'] as number));
            const trendlineData = this.generateTrendlineData(totalData);
            datasets.push({
                label: this.languageService.translate('CHART.TRENDLINE'),
                data: trendlineData,
                borderColor: '#9b59b6',
                backgroundColor: 'transparent',
                fill: false,
                tension: 0,
                borderDash: [10, 5],
                borderWidth: 2,
                pointRadius: 0
            });
        }

        return { labels, datasets };
    }

    private getWaterByRoomView(recs: any[], labels: string[], showComparison: boolean, comparisonData: any[]): ChartConfiguration['data'] {
        const datasets: any[] = [
            {
                label: this.languageService.translate('CHART.KITCHEN_TOTAL'),
                data: recs.map(r => (r['kitchenWarm'] as number) + (r['kitchenCold'] as number)),
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: recs.length === 1 ? 8 : 3
            },
            {
                label: this.languageService.translate('CHART.BATHROOM_TOTAL'),
                data: recs.map(r => (r['bathroomWarm'] as number) + (r['bathroomCold'] as number)),
                borderColor: '#17a2b8',
                backgroundColor: 'rgba(23, 162, 184, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: recs.length === 1 ? 8 : 3
            }
        ];

        if (showComparison) {
            datasets.push({
                label: this.languageService.translate('CHART.KITCHEN_AVG'),
                data: comparisonData.map(r => (r['kitchenWarm'] as number) + (r['kitchenCold'] as number)),
                borderColor: '#28a745',
                backgroundColor: 'transparent',
                fill: false,
                tension: 0,
                borderDash: [5, 5],
                pointRadius: 0
            });
            datasets.push({
                label: this.languageService.translate('CHART.BATHROOM_AVG'),
                data: comparisonData.map(r => (r['bathroomWarm'] as number) + (r['bathroomCold'] as number)),
                borderColor: '#17a2b8',
                backgroundColor: 'transparent',
                fill: false,
                tension: 0,
                borderDash: [5, 5],
                pointRadius: 0
            });
        }

        return { labels, datasets };
    }

    private getWaterByTypeView(recs: any[], labels: string[], showComparison: boolean, comparisonData: any[]): ChartConfiguration['data'] {
        const datasets: any[] = [
            {
                label: this.languageService.translate('CHART.WARM_WATER_TOTAL'),
                data: recs.map(r => (r['kitchenWarm'] as number) + (r['bathroomWarm'] as number)),
                borderColor: '#dc3545',
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: recs.length === 1 ? 8 : 3
            },
            {
                label: this.languageService.translate('CHART.COLD_WATER_TOTAL'),
                data: recs.map(r => (r['kitchenCold'] as number) + (r['bathroomCold'] as number)),
                borderColor: '#6c757d',
                backgroundColor: 'rgba(108, 117, 125, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: recs.length === 1 ? 8 : 3
            }
        ];

        if (showComparison) {
            datasets.push({
                label: this.languageService.translate('CHART.WARM_AVG'),
                data: comparisonData.map(r => (r['kitchenWarm'] as number) + (r['bathroomWarm'] as number)),
                borderColor: '#dc3545',
                backgroundColor: 'transparent',
                fill: false,
                tension: 0,
                borderDash: [5, 5],
                pointRadius: 0
            });
            datasets.push({
                label: this.languageService.translate('CHART.COLD_AVG'),
                data: comparisonData.map(r => (r['kitchenCold'] as number) + (r['bathroomCold'] as number)),
                borderColor: '#6c757d',
                backgroundColor: 'transparent',
                fill: false,
                tension: 0,
                borderDash: [5, 5],
                pointRadius: 0
            });
        }

        return { labels, datasets };
    }

    private getWaterDetailedView(recs: any[], labels: string[], showComparison: boolean, comparisonData: any[]): ChartConfiguration['data'] {
        const datasets: any[] = [
            {
                label: this.languageService.translate('CHART.KITCHEN_WARM'),
                data: recs.map(r => r['kitchenWarm'] as number),
                borderColor: '#ff6384',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                fill: false,
                tension: 0.4,
                pointRadius: recs.length === 1 ? 8 : 3
            },
            {
                label: this.languageService.translate('CHART.KITCHEN_COLD'),
                data: recs.map(r => r['kitchenCold'] as number),
                borderColor: '#36a2eb',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                fill: false,
                tension: 0.4,
                pointRadius: recs.length === 1 ? 8 : 3
            },
            {
                label: this.languageService.translate('CHART.BATHROOM_WARM'),
                data: recs.map(r => r['bathroomWarm'] as number),
                borderColor: '#ffcd56',
                backgroundColor: 'rgba(255, 205, 86, 0.1)',
                fill: false,
                tension: 0.4,
                pointRadius: recs.length === 1 ? 8 : 3
            },
            {
                label: this.languageService.translate('CHART.BATHROOM_COLD'),
                data: recs.map(r => r['bathroomCold'] as number),
                borderColor: '#4bc0c0',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                fill: false,
                tension: 0.4,
                pointRadius: recs.length === 1 ? 8 : 3
            }
        ];

        if (showComparison) {
            datasets.push(
                {
                    label: this.languageService.translate('CHART.KITCHEN_WARM_AVG'),
                    data: comparisonData.map(r => r['kitchenWarm'] as number),
                    borderColor: '#ff6384',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0,
                    borderDash: [5, 5],
                    pointRadius: 0
                },
                {
                    label: this.languageService.translate('CHART.KITCHEN_COLD_AVG'),
                    data: comparisonData.map(r => r['kitchenCold'] as number),
                    borderColor: '#36a2eb',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0,
                    borderDash: [5, 5],
                    pointRadius: 0
                },
                {
                    label: this.languageService.translate('CHART.BATHROOM_WARM_AVG'),
                    data: comparisonData.map(r => r['bathroomWarm'] as number),
                    borderColor: '#ffcd56',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0,
                    borderDash: [5, 5],
                    pointRadius: 0
                },
                {
                    label: this.languageService.translate('CHART.BATHROOM_COLD_AVG'),
                    data: comparisonData.map(r => r['bathroomCold'] as number),
                    borderColor: '#4bc0c0',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0,
                    borderDash: [5, 5],
                    pointRadius: 0
                }
            );
        }

        return { labels, datasets };
    }

    /**
     * Generate chart data for heating consumption
     */
    getHeatingChartData(params: ChartDataParams): ChartConfiguration['data'] {
        const { records: recs, labels, view, mode } = params;
        const chartLabels = mode === 'incremental' ? labels.slice(1) : labels;

        switch (view) {
            case 'total':
                return {
                    labels: chartLabels,
                    datasets: [{
                        label: mode === 'incremental'
                            ? this.languageService.translate('CHART.INCREMENTAL_CONSUMPTION')
                            : this.languageService.translate('CHART.TOTAL_WEEKLY_CONSUMPTION'),
                        data: recs.map(r => (r['livingRoom'] as number) + (r['bedroom'] as number) + (r['kitchen'] as number) + (r['bathroom'] as number)),
                        borderColor: '#ff6f00',
                        backgroundColor: 'rgba(255, 111, 0, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                };
            case 'by-room':
                return {
                    labels: chartLabels,
                    datasets: [
                        {
                            label: this.languageService.translate('CHART.LIVING_ROOM'),
                            data: recs.map(r => r['livingRoom'] as number),
                            borderColor: '#e91e63',
                            backgroundColor: 'rgba(233, 30, 99, 0.1)',
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: this.languageService.translate('CHART.BEDROOM'),
                            data: recs.map(r => r['bedroom'] as number),
                            borderColor: '#9c27b0',
                            backgroundColor: 'rgba(156, 39, 176, 0.1)',
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: this.languageService.translate('CHART.KITCHEN'),
                            data: recs.map(r => r['kitchen'] as number),
                            borderColor: '#28a745',
                            backgroundColor: 'rgba(40, 167, 69, 0.1)',
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: this.languageService.translate('CHART.BATHROOM'),
                            data: recs.map(r => r['bathroom'] as number),
                            borderColor: '#ffa726',
                            backgroundColor: 'rgba(255, 167, 38, 0.1)',
                            fill: true,
                            tension: 0.4
                        }
                    ]
                };
            case 'by-type':
            case 'detailed':
                // For heating, by-type and detailed views are the same as by-room
                return this.getHeatingChartData({ ...params, view: 'by-room' });
        }
    }
}
