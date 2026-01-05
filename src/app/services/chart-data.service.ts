import { Injectable, inject } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { LanguageService } from './language.service';
import { ChartCalculationService } from './chart-calculation.service';
import { ConsumptionRecord, HeatingRecord, CombinedData, ComparisonData } from '../models/records.model';
import { WaterChartService, ChartDataParams } from './water-chart.service';

export type { ChartView, DisplayMode, ChartDataParams } from './water-chart.service';

@Injectable({
  providedIn: 'root'
})
export class ChartDataService {
  private languageService = inject(LanguageService);
  private calculationService = inject(ChartCalculationService);
  private waterChartService = inject(WaterChartService);

  /**
   * Calculate incremental (delta) data between consecutive readings
   */
  calculateIncrementalData(recs: (ConsumptionRecord | HeatingRecord)[]): CombinedData[] {
    return this.calculationService.calculateIncrementalData(recs);
  }

  /**
   * Generate comparison data based on country averages
   */
  generateComparisonData(processedData: (ConsumptionRecord | HeatingRecord)[], familySize: number, country: string): ComparisonData[] {
    return this.calculationService.generateComparisonData(processedData, familySize, country);
  }

  /**
   * Generate chart data for water consumption
   */
  getWaterChartData(params: ChartDataParams): ChartConfiguration['data'] {
    return this.waterChartService.getWaterChartData(params);
  }

  /**
   * Generate chart data for heating consumption
   */
  getHeatingChartData(params: ChartDataParams): ChartConfiguration['data'] {
    const { records: recs, labels, view, mode } = params;
    const chartLabels = mode === 'incremental' ? labels.slice(1) : labels;

    const heatingRecs = recs as unknown as HeatingRecord[];

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
  private filterEmptyDatasets(datasets: ChartConfiguration['data']['datasets']): ChartConfiguration['data']['datasets'] {
    return datasets.filter(dataset => {
      if (!dataset.data || !Array.isArray(dataset.data)) return true;
      // Keep dataset if at least one value is non-zero
      return dataset.data.some((value: any) => value !== 0 && value !== null && value !== undefined);
    });
  }
}
