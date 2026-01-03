import { Injectable, inject } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { LanguageService } from './language.service';
import { ChartCalculationService } from './chart-calculation.service';
import { ConsumptionRecord, HeatingRecord } from '../models/records.model';

export type ChartView = 'total' | 'by-room' | 'by-type' | 'detailed';
export type DisplayMode = 'total' | 'incremental';

export interface ChartDataParams {
  records: (ConsumptionRecord | HeatingRecord)[];
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
  private calculationService = inject(ChartCalculationService);

  /**
   * Calculate incremental (delta) data between consecutive readings
   */
  calculateIncrementalData(recs: (ConsumptionRecord | HeatingRecord)[]): any[] {
    return this.calculationService.calculateIncrementalData(recs);
  }

  /**
   * Generate comparison data based on country averages
   */
  generateComparisonData(processedData: (ConsumptionRecord | HeatingRecord)[], familySize: number, country: string): any[] {
    return this.calculationService.generateComparisonData(processedData, familySize, country);
  }

  /**
   * Generate chart data for water consumption
   */
  getWaterChartData(params: ChartDataParams): ChartConfiguration['data'] {
    const { records: recs, labels, view, mode, showTrendline, showAverageComparison, country, familySize } = params;
    const chartLabels = mode === 'incremental' ? labels.slice(1) : labels;
    const showComparison = (familySize ?? 0) > 0 && mode === 'incremental' && (showAverageComparison ?? false);
    const comparisonData = showComparison ? this.generateComparisonData(recs, familySize ?? 0, country ?? '') : [];
    // Trendline only makes sense for incremental mode (total consumption always goes up)
    const effectiveShowTrendline = mode === 'incremental' && (showTrendline ?? false);

    switch (view) {
      case 'total':
        return this.getWaterTotalView(recs as ConsumptionRecord[], chartLabels, showComparison, comparisonData, effectiveShowTrendline);
      case 'by-room':
        return this.getWaterByRoomView(recs as ConsumptionRecord[], chartLabels, showComparison, comparisonData);
      case 'by-type':
        return this.getWaterByTypeView(recs as ConsumptionRecord[], chartLabels, showComparison, comparisonData);
      case 'detailed':
        return this.getWaterDetailedView(recs as ConsumptionRecord[], chartLabels, showComparison, comparisonData);
    }
  }

  private getWaterTotalView(recs: ConsumptionRecord[], labels: string[], showComparison: boolean, comparisonData: any[], showTrendline?: boolean): ChartConfiguration['data'] {
    const datasets: any[] = [{
      data: recs.map(r => r.kitchenWarm + r.kitchenCold + r.bathroomWarm + r.bathroomCold),
      label: this.languageService.translate('CHART.TOTAL_WEEKLY_CONSUMPTION'),
      backgroundColor: 'rgba(0, 123, 255, 0.5)',
      borderColor: '#007bff',
      borderWidth: 1,
      fill: true
    }];

    if (showComparison && comparisonData.length > 0) {
      datasets.push({
        data: comparisonData.map((d: any) => (d.kitchenWarm || 0) + (d.kitchenCold || 0) + (d.bathroomWarm || 0) + (d.bathroomCold || 0)),
        label: showComparison ? this.languageService.translate('CHART.YOU_VS_AVERAGE', { average: this.languageService.translate('CHART.COUNTRY_AVERAGE') }) : '',
        type: 'line',
        borderColor: '#dc3545',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      });
    }

    if (showTrendline && recs.length > 1) {
      const dataPoints = recs.map(r => r.kitchenWarm + r.kitchenCold + r.bathroomWarm + r.bathroomCold);
      const trendData = this.calculationService.generateTrendlineData(dataPoints);

      datasets.push({
        data: trendData,
        label: this.languageService.translate('CHART.TRENDLINE'),
        type: 'line',
        borderColor: '#28a745',
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      });
    }

    return { labels, datasets: this.filterEmptyDatasets(datasets) };
  }

  private getWaterByRoomView(recs: ConsumptionRecord[], labels: string[], showComparison: boolean, comparisonData: any[]): ChartConfiguration['data'] {
    // Check if each category has data
    const hasKitchenData = recs.some(r => (r.kitchenWarm + r.kitchenCold) > 0);
    const hasBathroomData = recs.some(r => (r.bathroomWarm + r.bathroomCold) > 0);

    const datasets: any[] = [
      {
        data: recs.map(r => r.kitchenWarm + r.kitchenCold),
        label: this.languageService.translate('CHART.KITCHEN_TOTAL'),
        backgroundColor: 'rgba(23, 162, 184, 0.5)',
        borderColor: '#17a2b8',
        borderWidth: 1
      },
      {
        data: recs.map(r => r.bathroomWarm + r.bathroomCold),
        label: this.languageService.translate('CHART.BATHROOM_TOTAL'),
        backgroundColor: 'rgba(108, 117, 125, 0.5)',
        borderColor: '#6c757d',
        borderWidth: 1
      }
    ];

    if (showComparison && comparisonData.length > 0) {
      // Only show average if corresponding real data exists
      if (hasKitchenData) {
        datasets.push({
          type: 'line',
          label: this.languageService.translate('CHART.KITCHEN_AVERAGE'),
          data: comparisonData.map((d: any) => (d.kitchenWarm || 0) + (d.kitchenCold || 0)),
          borderColor: '#17a2b8',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        });
      }
      if (hasBathroomData) {
        datasets.push({
          type: 'line',
          label: this.languageService.translate('CHART.BATHROOM_AVERAGE'),
          data: comparisonData.map((d: any) => (d.bathroomWarm || 0) + (d.bathroomCold || 0)),
          borderColor: '#6c757d',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        });
      }
    }

    return { labels, datasets: this.filterEmptyDatasets(datasets) };
  }

  private getWaterByTypeView(recs: ConsumptionRecord[], labels: string[], showComparison: boolean, comparisonData: any[]): ChartConfiguration['data'] {
    // Check if each category has data
    const hasWarmData = recs.some(r => (r.kitchenWarm + r.bathroomWarm) > 0);
    const hasColdData = recs.some(r => (r.kitchenCold + r.bathroomCold) > 0);

    const datasets: any[] = [
      {
        data: recs.map(r => r.kitchenWarm + r.bathroomWarm),
        label: this.languageService.translate('CHART.WARM_WATER_TOTAL'),
        backgroundColor: 'rgba(255, 193, 7, 0.5)',
        borderColor: '#ffc107',
        borderWidth: 1
      },
      {
        data: recs.map(r => r.kitchenCold + r.bathroomCold),
        label: this.languageService.translate('CHART.COLD_WATER_TOTAL'),
        backgroundColor: 'rgba(108, 117, 125, 0.5)',
        borderColor: '#6c757d',
        borderWidth: 1
      }
    ];

    if (showComparison && comparisonData.length > 0) {
      // Only show average if corresponding real data exists
      if (hasWarmData) {
        datasets.push({
          type: 'line',
          label: this.languageService.translate('CHART.WARM_WATER_AVG'),
          data: comparisonData.map((d: any) => (d.kitchenWarm || 0) + (d.bathroomWarm || 0)),
          borderColor: '#ffc107',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        });
      }
      if (hasColdData) {
        datasets.push({
          type: 'line',
          label: this.languageService.translate('CHART.COLD_WATER_AVG'),
          data: comparisonData.map((d: any) => (d.kitchenCold || 0) + (d.bathroomCold || 0)),
          borderColor: '#6c757d',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        });
      }
    }

    return { labels, datasets: this.filterEmptyDatasets(datasets) };
  }

  private getWaterDetailedView(recs: ConsumptionRecord[], labels: string[], showComparison: boolean, comparisonData: any[]): ChartConfiguration['data'] {
    // Check if each category has data
    const hasKitchenWarmData = recs.some(r => r.kitchenWarm > 0);
    const hasKitchenColdData = recs.some(r => r.kitchenCold > 0);
    const hasBathroomWarmData = recs.some(r => r.bathroomWarm > 0);
    const hasBathroomColdData = recs.some(r => r.bathroomCold > 0);

    const datasets: any[] = [
      {
        label: this.languageService.translate('CHART.KITCHEN_WARM'),
        data: recs.map(r => r.kitchenWarm),
        borderColor: '#ff6384',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: recs.length === 1 ? 8 : 3
      },
      {
        label: this.languageService.translate('CHART.KITCHEN_COLD'),
        data: recs.map(r => r.kitchenCold),
        borderColor: '#36a2eb',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: recs.length === 1 ? 8 : 3
      },
      {
        label: this.languageService.translate('CHART.BATHROOM_WARM'),
        data: recs.map(r => r.bathroomWarm),
        borderColor: '#ffcd56',
        backgroundColor: 'rgba(255, 205, 86, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: recs.length === 1 ? 8 : 3
      },
      {
        label: this.languageService.translate('CHART.BATHROOM_COLD'),
        data: recs.map(r => r.bathroomCold),
        borderColor: '#4bc0c0',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: recs.length === 1 ? 8 : 3
      }
    ];

    if (showComparison && comparisonData.length > 0) {
      // Only show average if corresponding real data exists
      if (hasKitchenWarmData) {
        datasets.push({
          label: this.languageService.translate('CHART.KITCHEN_WARM_AVG'),
          data: comparisonData.map((r: any) => r['kitchenWarm'] as number),
          borderColor: '#ff6384',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0,
          borderDash: [5, 5],
          pointRadius: 0
        });
      }
      if (hasKitchenColdData) {
        datasets.push({
          label: this.languageService.translate('CHART.KITCHEN_COLD_AVG'),
          data: comparisonData.map((r: any) => r['kitchenCold'] as number),
          borderColor: '#36a2eb',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0,
          borderDash: [5, 5],
          pointRadius: 0
        });
      }
      if (hasBathroomWarmData) {
        datasets.push({
          label: this.languageService.translate('CHART.BATHROOM_WARM_AVG'),
          data: comparisonData.map((r: any) => r['bathroomWarm'] as number),
          borderColor: '#ffcd56',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0,
          borderDash: [5, 5],
          pointRadius: 0
        });
      }
      if (hasBathroomColdData) {
        datasets.push({
          label: this.languageService.translate('CHART.BATHROOM_COLD_AVG'),
          data: comparisonData.map((r: any) => r['bathroomCold'] as number),
          borderColor: '#4bc0c0',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0,
          borderDash: [5, 5],
          pointRadius: 0
        });
      }
    }

    return { labels, datasets: this.filterEmptyDatasets(datasets) };
  }

  /**
   * Generate chart data for heating consumption
   */
  getHeatingChartData(params: ChartDataParams): ChartConfiguration['data'] {
    const { records: recs, labels, view, mode } = params;
    const chartLabels = mode === 'incremental' ? labels.slice(1) : labels;

    const heatingRecs = recs as HeatingRecord[];

    switch (view) {
      case 'total':
        return {
          labels: chartLabels,
          datasets: [{
            label: mode === 'incremental'
              ? this.languageService.translate('CHART.INCREMENTAL_CONSUMPTION')
              : this.languageService.translate('CHART.TOTAL_WEEKLY_CONSUMPTION'),
            data: heatingRecs.map(r => r.livingRoom + r.bedroom + r.kitchen + r.bathroom),
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
              data: heatingRecs.map(r => r.livingRoom),
              borderColor: '#e91e63',
              backgroundColor: 'rgba(233, 30, 99, 0.1)',
              fill: true,
              tension: 0.4
            },
            {
              label: this.languageService.translate('CHART.BEDROOM'),
              data: heatingRecs.map(r => r.bedroom),
              borderColor: '#9c27b0',
              backgroundColor: 'rgba(156, 39, 176, 0.1)',
              fill: true,
              tension: 0.4
            },
            {
              label: this.languageService.translate('CHART.KITCHEN'),
              data: heatingRecs.map(r => r.kitchen),
              borderColor: '#28a745',
              backgroundColor: 'rgba(40, 167, 69, 0.1)',
              fill: true,
              tension: 0.4
            },
            {
              label: this.languageService.translate('CHART.BATHROOM'),
              data: heatingRecs.map(r => r.bathroom),
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

  /**
   * Filter out datasets where all values are 0 (no data entered for that category)
   */
  private filterEmptyDatasets(datasets: any[]): any[] {
    return datasets.filter(dataset => {
      if (!dataset.data || !Array.isArray(dataset.data)) return true;
      // Keep dataset if at least one value is non-zero
      return dataset.data.some((value: number) => value !== 0 && value !== null && value !== undefined);
    });
  }
}
