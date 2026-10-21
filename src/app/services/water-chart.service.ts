import { Injectable, inject } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { LanguageService } from './language.service';
import { ChartCalculationService } from './chart-calculation.service';
import { ConsumptionRecord, ComparisonData, AppChartDataset } from '../models/records.model';

export type ChartView = 'total' | 'by-room' | 'by-type' | 'detailed';
export type DisplayMode = 'total' | 'incremental';

export interface ChartDataParams<T = ConsumptionRecord> {
  records: T[];
  originalRecords?: T[]; // Passed when mode is 'incremental' to provide date context
  labels: string[];
  view: ChartView;
  mode: DisplayMode;
  showTrendline?: boolean;
  showAverageComparison?: boolean;
  country?: string;
  familySize?: number;
  roomNames?: string[]; // For heating chart: actual room names
  roomIds?: string[]; // For heating chart: actual room IDs to map data
  roomColors?: { border: string; bg: string }[]; // For heating chart: room-specific colors
}

interface WaterCategoryConfig {
  key: 'bathroomWarm' | 'kitchenWarm' | 'bathroomCold' | 'kitchenCold';
  labelKey: string;
  avgLabelKey: string;
  color: string;
  bg: string;
  trendColor: string;
}

const WATER_DETAILED_CATEGORIES: WaterCategoryConfig[] = [
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

@Injectable({
  providedIn: 'root',
})
export class WaterChartService {
  private readonly languageService = inject(LanguageService);
  private readonly calculationService = inject(ChartCalculationService);

  getWaterChartData(params: ChartDataParams): ChartConfiguration['data'] {
    const {
      records: recs,
      labels,
      view,
      mode,
      showTrendline,
      showAverageComparison,
      country,
      familySize,
    } = params;
    const chartLabels = labels; // Use all labels
    const showComparison =
      (familySize ?? 0) > 0 && mode === 'incremental' && (showAverageComparison ?? false);
    const comparisonData = showComparison
      ? this.calculationService.generateComparisonData(recs, familySize ?? 0, country ?? '')
      : [];
    // Trendline only makes sense for incremental mode (total consumption always goes up)
    const effectiveShowTrendline = mode === 'incremental' && (showTrendline ?? false);

    switch (view) {
      case 'total':
        return this.getWaterTotalView(
          recs,
          chartLabels,
          showComparison,
          comparisonData,
          mode,
          effectiveShowTrendline,
        );
      case 'by-room':
        return this.getWaterByRoomView(
          recs,
          chartLabels,
          showComparison,
          comparisonData,
          mode,
          effectiveShowTrendline,
        );
      case 'by-type':
        return this.getWaterByTypeView(
          recs,
          chartLabels,
          showComparison,
          comparisonData,
          mode,
          effectiveShowTrendline,
        );
      case 'detailed':
        return this.getWaterDetailedView(
          recs,
          chartLabels,
          showComparison,
          comparisonData,
          mode,
          effectiveShowTrendline,
        );
    }
  }

  private getWaterTotalView(
    recs: ConsumptionRecord[],
    labels: string[],
    showComparison: boolean,
    comparisonData: ComparisonData[],
    mode: DisplayMode,
    showTrendline?: boolean,
  ): ChartConfiguration['data'] {
    const datasets: ChartConfiguration['data']['datasets'] = [
      {
        data: recs.map((r) =>
          this.sumNullable(r.kitchenWarm, r.kitchenCold, r.bathroomWarm, r.bathroomCold),
        ),
        label:
          mode === 'incremental'
            ? this.languageService.translate('CHART.INCREMENTAL_CONSUMPTION')
            : this.languageService.translate('CHART.TOTAL_WEEKLY_CONSUMPTION'),
        backgroundColor: 'rgba(0, 123, 255, 0.5)',
        borderColor: '#007bff',
        borderWidth: 1,
        fill: true,
        tension: 0.4,
      },
    ];

    if (showComparison && comparisonData.length > 0) {
      datasets.push({
        data: comparisonData.map((d) =>
          this.sumNullable(d.kitchenWarm, d.kitchenCold, d.bathroomWarm, d.bathroomCold),
        ),
        label: this.languageService.translate('CHART.COUNTRY_AVERAGE'),
        type: 'line',
        borderColor: '#dc3545',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
        tension: 0.4,
      });
    }

    if (showTrendline && recs.length > 1) {
      const dataPoints = recs.map(
        (r) => this.sumNullable(r.kitchenWarm, r.kitchenCold, r.bathroomWarm, r.bathroomCold) || 0,
      );
      const trendData = this.calculationService.generateTrendlineData(dataPoints);

      datasets.push({
        data: trendData,
        label: this.languageService.translate('CHART.TRENDLINE'),
        type: 'line',
        borderColor: this.calculationService.getTrendColor(trendData),
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
      });
    }

    return { labels, datasets: this.filterEmptyDatasets(datasets) };
  }

  private getWaterByRoomView(
    recs: ConsumptionRecord[],
    labels: string[],
    showComparison: boolean,
    comparisonData: ComparisonData[],
    mode: DisplayMode,
    showTrendline?: boolean,
  ): ChartConfiguration['data'] {
    // Check if each category has data
    const kitchenData = recs.map((r) => this.sumNullable(r.kitchenWarm, r.kitchenCold));
    const bathroomData = recs.map((r) => this.sumNullable(r.bathroomWarm, r.bathroomCold));
    const hasKitchenData = kitchenData.some((v) => (v || 0) > 0);
    const hasBathroomData = bathroomData.some((v) => (v || 0) > 0);

    const suffix =
      mode === 'incremental'
        ? ` (${this.languageService.translate('CHART.INCREMENTAL_CONSUMPTION')})`
        : '';

    const datasets: AppChartDataset[] = [
      {
        data: kitchenData,
        label: this.languageService.translate('CHART.KITCHEN_TOTAL') + suffix,
        backgroundColor: 'rgba(23, 162, 184, 0.5)',
        borderColor: '#17a2b8',
        borderWidth: 1,
        tension: 0.4,
        categoryId: 'kitchenTotal',
      },
      {
        data: bathroomData,
        label: this.languageService.translate('CHART.BATHROOM_TOTAL') + suffix,
        backgroundColor: 'rgba(108, 117, 125, 0.5)',
        borderColor: '#6c757d',
        borderWidth: 1,
        tension: 0.4,
        categoryId: 'bathroomTotal',
      },
    ];

    // Add trendlines for each category if enabled
    if (showTrendline && recs.length >= 2) {
      if (hasKitchenData) {
        const kitchenTrend = this.calculationService.generateTrendlineData(
          kitchenData.map((v) => v || 0),
        );
        datasets.push({
          data: kitchenTrend,
          label:
            this.languageService.translate('CHART.KITCHEN') +
            ' ' +
            this.languageService.translate('CHART.TRENDLINE'),
          type: 'line',
          borderColor: '#17a2b8', // Kitchen color
          borderWidth: 2,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false,
          trendlineFor: 'kitchenTotal',
        } as AppChartDataset);
      }
      if (hasBathroomData) {
        const bathroomTrend = this.calculationService.generateTrendlineData(
          bathroomData.map((v) => v || 0),
        );
        datasets.push({
          data: bathroomTrend,
          label:
            this.languageService.translate('CHART.BATHROOM') +
            ' ' +
            this.languageService.translate('CHART.TRENDLINE'),
          type: 'line',
          borderColor: '#6c757d', // Bathroom color
          borderWidth: 2,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false,
          trendlineFor: 'bathroomTotal',
        } as AppChartDataset);
      }
    }

    if (showComparison && comparisonData.length > 0) {
      // Only show average if corresponding real data exists
      if (hasKitchenData) {
        datasets.push({
          type: 'line',
          label: this.languageService.translate('CHART.KITCHEN_AVERAGE'),
          data: comparisonData.map((d) => this.sumNullable(d.kitchenWarm, d.kitchenCold)),
          borderColor: '#17a2b8',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
          tension: 0.4,
        });
      }
      if (hasBathroomData) {
        datasets.push({
          type: 'line',
          label: this.languageService.translate('CHART.BATHROOM_AVERAGE'),
          data: comparisonData.map((d) => this.sumNullable(d.bathroomWarm, d.bathroomCold)),
          borderColor: '#6c757d',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
          tension: 0.4,
        });
      }
    }

    return { labels, datasets: this.filterEmptyDatasets(datasets) };
  }

  private getWaterByTypeView(
    recs: ConsumptionRecord[],
    labels: string[],
    showComparison: boolean,
    comparisonData: ComparisonData[],
    mode: DisplayMode,
    showTrendline?: boolean,
  ): ChartConfiguration['data'] {
    // Check if each category has data
    const warmData = recs.map((r) => this.sumNullable(r.kitchenWarm, r.bathroomWarm));
    const coldData = recs.map((r) => this.sumNullable(r.kitchenCold, r.bathroomCold));
    const hasWarmData = warmData.some((v) => (v || 0) > 0);
    const hasColdData = coldData.some((v) => (v || 0) > 0);

    const suffix =
      mode === 'incremental'
        ? ` (${this.languageService.translate('CHART.INCREMENTAL_CONSUMPTION')})`
        : '';

    const datasets: ChartConfiguration['data']['datasets'] = [
      {
        data: warmData,
        label: this.languageService.translate('CHART.WARM_WATER_TOTAL') + suffix,
        backgroundColor: 'rgba(255, 193, 7, 0.5)',
        borderColor: '#ffc107',
        borderWidth: 1,
        tension: 0.4,
        categoryId: 'warmTotal',
      } as AppChartDataset,
      {
        data: coldData,
        label: this.languageService.translate('CHART.COLD_WATER_TOTAL') + suffix,
        backgroundColor: 'rgba(108, 117, 125, 0.5)',
        borderColor: '#6c757d',
        borderWidth: 1,
        tension: 0.4,
        categoryId: 'coldTotal',
      } as AppChartDataset,
    ];

    // Add trendlines for each category if enabled
    if (showTrendline && recs.length >= 2) {
      if (hasWarmData) {
        const warmTrend = this.calculationService.generateTrendlineData(
          warmData.map((v) => v || 0),
        );
        datasets.push({
          data: warmTrend,
          label:
            this.languageService.translate('CHART.WARM_WATER_TOTAL') +
            ' ' +
            this.languageService.translate('CHART.TRENDLINE'),
          type: 'line',
          borderColor: '#ffc107', // Warm color
          borderWidth: 2,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false,
          trendlineFor: 'warmTotal',
        } as AppChartDataset);
      }
      if (hasColdData) {
        const coldTrend = this.calculationService.generateTrendlineData(
          coldData.map((v) => v || 0),
        );
        datasets.push({
          data: coldTrend,
          label:
            this.languageService.translate('CHART.COLD_WATER_TOTAL') +
            ' ' +
            this.languageService.translate('CHART.TRENDLINE'),
          type: 'line',
          borderColor: '#6c757d', // Cold color
          borderWidth: 2,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false,
          trendlineFor: 'coldTotal',
        } as AppChartDataset);
      }
    }

    if (showComparison && comparisonData.length > 0) {
      // Only show average if corresponding real data exists
      if (hasWarmData) {
        datasets.push({
          type: 'line',
          label: this.languageService.translate('CHART.WARM_WATER_AVG'),
          data: comparisonData.map((d) => this.sumNullable(d.kitchenWarm, d.bathroomWarm)),
          borderColor: '#ffc107',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
          tension: 0.4,
        });
      }
      if (hasColdData) {
        datasets.push({
          type: 'line',
          label: this.languageService.translate('CHART.COLD_WATER_AVG'),
          data: comparisonData.map((d) => this.sumNullable(d.kitchenCold, d.bathroomCold)),
          borderColor: '#6c757d',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
          tension: 0.4,
        });
      }
    }

    return { labels, datasets: this.filterEmptyDatasets(datasets) };
  }

  private getWaterDetailedView(
    recs: ConsumptionRecord[],
    labels: string[],
    showComparison: boolean,
    comparisonData: ComparisonData[],
    mode: DisplayMode,
    showTrendline?: boolean,
  ): ChartConfiguration['data'] {
    const suffix =
      mode === 'incremental'
        ? ` (${this.languageService.translate('CHART.INCREMENTAL_CONSUMPTION')})`
        : '';
    const pointRadius = recs.length === 1 ? 8 : 3;
    const datasets: ChartConfiguration['data']['datasets'] = [];

    const categoryDataMap = new Map<string, (number | null)[]>();
    for (const cat of WATER_DETAILED_CATEGORIES) {
      const data = recs.map((r) => this.sumNullable(r[cat.key]));
      categoryDataMap.set(cat.key, data);

      datasets.push({
        label: this.languageService.translate(cat.labelKey) + suffix,
        data,
        borderColor: cat.color,
        backgroundColor: cat.bg,
        fill: false,
        tension: 0.4,
        pointRadius,
        categoryId: cat.key,
      } as AppChartDataset);
    }

    if (showTrendline && recs.length >= 2) {
      this.appendCategoryTrendlines(datasets, categoryDataMap);
    }

    if (showComparison && comparisonData.length > 0) {
      this.appendCategoryComparisons(datasets, comparisonData, categoryDataMap);
    }

    return { labels, datasets: this.filterEmptyDatasets(datasets) };
  }

  private appendCategoryTrendlines(
    datasets: ChartConfiguration['data']['datasets'],
    categoryDataMap: Map<string, (number | null)[]>,
  ): void {
    for (const cat of WATER_DETAILED_CATEGORIES) {
      const data = categoryDataMap.get(cat.key) || [];
      const hasData = data.some((v) => (v || 0) > 0);
      if (hasData) {
        const trendData = this.calculationService.generateTrendlineData(data.map((v) => v || 0));
        datasets.push({
          data: trendData,
          label: `${this.languageService.translate(cat.labelKey)} ${this.languageService.translate('CHART.TRENDLINE')}`,
          type: 'line',
          borderColor: cat.trendColor,
          borderWidth: 2,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false,
          trendlineFor: cat.key,
        } as AppChartDataset);
      }
    }
  }

  private appendCategoryComparisons(
    datasets: ChartConfiguration['data']['datasets'],
    comparisonData: ComparisonData[],
    categoryDataMap: Map<string, (number | null)[]>,
  ): void {
    for (const cat of WATER_DETAILED_CATEGORIES) {
      const data = categoryDataMap.get(cat.key) || [];
      const hasData = data.some((v) => (v || 0) > 0);
      if (hasData) {
        datasets.push({
          label: this.languageService.translate(cat.avgLabelKey),
          data: comparisonData.map((r) => r[cat.key] || 0),
          borderColor: cat.trendColor,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          borderDash: [5, 5],
          pointRadius: 0,
        });
      }
    }
  }

  /**
   * Filter out datasets where all values are 0 (no data entered for that category)
   */
  private filterEmptyDatasets(
    datasets: ChartConfiguration['data']['datasets'],
  ): ChartConfiguration['data']['datasets'] {
    return datasets.filter((dataset) => {
      if (!dataset.data || !Array.isArray(dataset.data)) return true;
      // Keep dataset if at least one value is non-zero
      return dataset.data.some(
        (value: unknown) => typeof value === 'number' && !Number.isNaN(value) && value !== 0,
      );
    });
  }

  private sumNullable(...values: (number | undefined | null)[]): number | null {
    const valid = values.filter(
      (v) => v !== undefined && v !== null && typeof v === 'number' && !Number.isNaN(v),
    );
    if (valid.length === 0) return null;
    return valid.reduce((sum, v) => (sum as number) + (v as number), 0) as number;
  }
}
