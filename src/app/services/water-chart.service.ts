import { Injectable, inject } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { LanguageService } from './language.service';
import { ChartCalculationService } from './chart-calculation.service';
import { ConsumptionRecord, HeatingRecord, ComparisonData } from '../models/records.model';

export type ChartView = 'total' | 'by-room' | 'by-type' | 'detailed';
export type DisplayMode = 'total' | 'incremental';

export interface ChartDataParams<T = ConsumptionRecord> {
  records: T[];
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
export class WaterChartService {
  private languageService = inject(LanguageService);
  private calculationService = inject(ChartCalculationService);

  getWaterChartData(params: ChartDataParams): ChartConfiguration['data'] {
    const { records: recs, labels, view, mode, showTrendline, showAverageComparison, country, familySize } = params;
    const chartLabels = mode === 'incremental' ? labels.slice(1) : labels;
    const showComparison = (familySize ?? 0) > 0 && mode === 'incremental' && (showAverageComparison ?? false);
    const comparisonData = showComparison ? this.calculationService.generateComparisonData(recs, familySize ?? 0, country ?? '') : [];
    // Trendline only makes sense for incremental mode (total consumption always goes up)
    const effectiveShowTrendline = mode === 'incremental' && (showTrendline ?? false);

    switch (view) {
      case 'total':
        return this.getWaterTotalView(recs, chartLabels, showComparison, comparisonData, effectiveShowTrendline);
      case 'by-room':
        return this.getWaterByRoomView(recs, chartLabels, showComparison, comparisonData, effectiveShowTrendline);
      case 'by-type':
        return this.getWaterByTypeView(recs, chartLabels, showComparison, comparisonData, effectiveShowTrendline);
      case 'detailed':
        return this.getWaterDetailedView(recs, chartLabels, showComparison, comparisonData, effectiveShowTrendline);
    }
  }

  private getWaterTotalView(recs: ConsumptionRecord[], labels: string[], showComparison: boolean, comparisonData: ComparisonData[], showTrendline?: boolean): ChartConfiguration['data'] {
    const datasets: ChartConfiguration['data']['datasets'] = [{
      data: recs.map(r => r.kitchenWarm + r.kitchenCold + r.bathroomWarm + r.bathroomCold),
      label: this.languageService.translate('CHART.TOTAL_WEEKLY_CONSUMPTION'),
      backgroundColor: 'rgba(0, 123, 255, 0.5)',
      borderColor: '#007bff',
      borderWidth: 1,
      fill: true
    }];

    if (showComparison && comparisonData.length > 0) {
      datasets.push({
        data: comparisonData.map(d => (d.kitchenWarm || 0) + (d.kitchenCold || 0) + (d.bathroomWarm || 0) + (d.bathroomCold || 0)),
        label: this.languageService.translate('CHART.COUNTRY_AVERAGE'),
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

  private getWaterByRoomView(recs: ConsumptionRecord[], labels: string[], showComparison: boolean, comparisonData: ComparisonData[], showTrendline?: boolean): ChartConfiguration['data'] {
    // Check if each category has data
    const kitchenData = recs.map(r => r.kitchenWarm + r.kitchenCold);
    const bathroomData = recs.map(r => r.bathroomWarm + r.bathroomCold);
    const hasKitchenData = kitchenData.some(v => v > 0);
    const hasBathroomData = bathroomData.some(v => v > 0);

    const datasets: ChartConfiguration['data']['datasets'] = [
      {
        data: kitchenData,
        label: this.languageService.translate('CHART.KITCHEN_TOTAL'),
        backgroundColor: 'rgba(23, 162, 184, 0.5)',
        borderColor: '#17a2b8',
        borderWidth: 1
      },
      {
        data: bathroomData,
        label: this.languageService.translate('CHART.BATHROOM_TOTAL'),
        backgroundColor: 'rgba(108, 117, 125, 0.5)',
        borderColor: '#6c757d',
        borderWidth: 1
      }
    ];

    // Add trendlines for each category if enabled
    if (showTrendline && recs.length >= 2) {
      if (hasKitchenData) {
        const kitchenTrend = this.calculationService.generateTrendlineData(kitchenData);
        datasets.push({
          data: kitchenTrend,
          label: this.languageService.translate('CHART.KITCHEN') + ' ' + this.languageService.translate('CHART.TRENDLINE'),
          type: 'line',
          borderColor: '#17a2b8',
          borderWidth: 2,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false
        });
      }
      if (hasBathroomData) {
        const bathroomTrend = this.calculationService.generateTrendlineData(bathroomData);
        datasets.push({
          data: bathroomTrend,
          label: this.languageService.translate('CHART.BATHROOM') + ' ' + this.languageService.translate('CHART.TRENDLINE'),
          type: 'line',
          borderColor: '#6c757d',
          borderWidth: 2,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false
        });
      }
    }

    if (showComparison && comparisonData.length > 0) {
      // Only show average if corresponding real data exists
      if (hasKitchenData) {
        datasets.push({
          type: 'line',
          label: this.languageService.translate('CHART.KITCHEN_AVERAGE'),
          data: comparisonData.map(d => (d.kitchenWarm || 0) + (d.kitchenCold || 0)),
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
          data: comparisonData.map(d => (d.bathroomWarm || 0) + (d.bathroomCold || 0)),
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

  private getWaterByTypeView(recs: ConsumptionRecord[], labels: string[], showComparison: boolean, comparisonData: ComparisonData[], showTrendline?: boolean): ChartConfiguration['data'] {
    // Check if each category has data
    const warmData = recs.map(r => r.kitchenWarm + r.bathroomWarm);
    const coldData = recs.map(r => r.kitchenCold + r.bathroomCold);
    const hasWarmData = warmData.some(v => v > 0);
    const hasColdData = coldData.some(v => v > 0);

    const datasets: ChartConfiguration['data']['datasets'] = [
      {
        data: warmData,
        label: this.languageService.translate('CHART.WARM_WATER_TOTAL'),
        backgroundColor: 'rgba(255, 193, 7, 0.5)',
        borderColor: '#ffc107',
        borderWidth: 1
      },
      {
        data: coldData,
        label: this.languageService.translate('CHART.COLD_WATER_TOTAL'),
        backgroundColor: 'rgba(108, 117, 125, 0.5)',
        borderColor: '#6c757d',
        borderWidth: 1
      }
    ];

    // Add trendlines for each category if enabled
    if (showTrendline && recs.length >= 2) {
      if (hasWarmData) {
        const warmTrend = this.calculationService.generateTrendlineData(warmData);
        datasets.push({
          data: warmTrend,
          label: this.languageService.translate('CHART.WARM_WATER_TOTAL') + ' ' + this.languageService.translate('CHART.TRENDLINE'),
          type: 'line',
          borderColor: '#ffc107',
          borderWidth: 2,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false
        });
      }
      if (hasColdData) {
        const coldTrend = this.calculationService.generateTrendlineData(coldData);
        datasets.push({
          data: coldTrend,
          label: this.languageService.translate('CHART.COLD_WATER_TOTAL') + ' ' + this.languageService.translate('CHART.TRENDLINE'),
          type: 'line',
          borderColor: '#6c757d',
          borderWidth: 2,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false
        });
      }
    }

    if (showComparison && comparisonData.length > 0) {
      // Only show average if corresponding real data exists
      if (hasWarmData) {
        datasets.push({
          type: 'line',
          label: this.languageService.translate('CHART.WARM_WATER_AVG'),
          data: comparisonData.map(d => (d.kitchenWarm || 0) + (d.bathroomWarm || 0)),
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
          data: comparisonData.map(d => (d.kitchenCold || 0) + (d.bathroomCold || 0)),
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

  private getWaterDetailedView(recs: ConsumptionRecord[], labels: string[], showComparison: boolean, comparisonData: ComparisonData[], showTrendline?: boolean): ChartConfiguration['data'] {
    // Extract data arrays
    const kitchenWarmData = recs.map(r => r.kitchenWarm);
    const kitchenColdData = recs.map(r => r.kitchenCold);
    const bathroomWarmData = recs.map(r => r.bathroomWarm);
    const bathroomColdData = recs.map(r => r.bathroomCold);

    // Check if each category has data
    const hasKitchenWarmData = kitchenWarmData.some(v => v > 0);
    const hasKitchenColdData = kitchenColdData.some(v => v > 0);
    const hasBathroomWarmData = bathroomWarmData.some(v => v > 0);
    const hasBathroomColdData = bathroomColdData.some(v => v > 0);

    const datasets: ChartConfiguration['data']['datasets'] = [
      {
        label: this.languageService.translate('CHART.KITCHEN_WARM'),
        data: kitchenWarmData,
        borderColor: '#ff6384',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: recs.length === 1 ? 8 : 3
      },
      {
        label: this.languageService.translate('CHART.KITCHEN_COLD'),
        data: kitchenColdData,
        borderColor: '#36a2eb',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: recs.length === 1 ? 8 : 3
      },
      {
        label: this.languageService.translate('CHART.BATHROOM_WARM'),
        data: bathroomWarmData,
        borderColor: '#ffcd56',
        backgroundColor: 'rgba(255, 205, 86, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: recs.length === 1 ? 8 : 3
      },
      {
        label: this.languageService.translate('CHART.BATHROOM_COLD'),
        data: bathroomColdData,
        borderColor: '#4bc0c0',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: recs.length === 1 ? 8 : 3
      }
    ];

    // Add trendlines for each category if enabled
    if (showTrendline && recs.length >= 2) {
      if (hasKitchenWarmData) {
        datasets.push({
          data: this.calculationService.generateTrendlineData(kitchenWarmData),
          label: this.languageService.translate('CHART.KITCHEN_WARM') + ' ' + this.languageService.translate('CHART.TRENDLINE'),
          type: 'line',
          borderColor: '#ff6384',
          borderWidth: 2,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false
        });
      }
      if (hasKitchenColdData) {
        datasets.push({
          data: this.calculationService.generateTrendlineData(kitchenColdData),
          label: this.languageService.translate('CHART.KITCHEN_COLD') + ' ' + this.languageService.translate('CHART.TRENDLINE'),
          type: 'line',
          borderColor: '#36a2eb',
          borderWidth: 2,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false
        });
      }
      if (hasBathroomWarmData) {
        datasets.push({
          data: this.calculationService.generateTrendlineData(bathroomWarmData),
          label: this.languageService.translate('CHART.BATHROOM_WARM') + ' ' + this.languageService.translate('CHART.TRENDLINE'),
          type: 'line',
          borderColor: '#ffcd56',
          borderWidth: 2,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false
        });
      }
      if (hasBathroomColdData) {
        datasets.push({
          data: this.calculationService.generateTrendlineData(bathroomColdData),
          label: this.languageService.translate('CHART.BATHROOM_COLD') + ' ' + this.languageService.translate('CHART.TRENDLINE'),
          type: 'line',
          borderColor: '#4bc0c0',
          borderWidth: 2,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false
        });
      }
    }

    if (showComparison && comparisonData.length > 0) {
      // Only show average if corresponding real data exists
      if (hasKitchenWarmData) {
        datasets.push({
          label: this.languageService.translate('CHART.KITCHEN_WARM_AVG'),
          data: comparisonData.map(r => r.kitchenWarm || 0),
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
          data: comparisonData.map(r => r.kitchenCold || 0),
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
          data: comparisonData.map(r => r.bathroomWarm || 0),
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
          data: comparisonData.map(r => r.bathroomCold || 0),
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
   * Filter out datasets where all values are 0 (no data entered for that category)
   */
  private filterEmptyDatasets(datasets: ChartConfiguration['data']['datasets']): ChartConfiguration['data']['datasets'] {
    return datasets.filter(dataset => {
      if (!dataset.data || !Array.isArray(dataset.data)) return true;
      // Keep dataset if at least one value is non-zero
      return dataset.data.some((value: unknown) => value !== 0 && value !== null && value !== undefined);
    });
  }
}
