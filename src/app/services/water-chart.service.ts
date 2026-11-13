import { Injectable, inject } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { LanguageService } from './language.service';
import { ChartCalculationService } from './chart-calculation.service';
import { ConsumptionRecord, ComparisonData, AppChartDataset } from '../models/records.model';
import {
  WATER_DETAILED_CATEGORIES,
  WATER_BY_ROOM_CATEGORIES,
  WATER_BY_TYPE_CATEGORIES,
  sumNullable4,
  filterEmptyDatasets,
  buildPairedWaterViewDatasets,
} from '../utils/water-chart.utils';

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
    const chartLabels = labels;
    const showComparison =
      (familySize ?? 0) > 0 && mode === 'incremental' && (showAverageComparison ?? false);
    const comparisonData = showComparison
      ? this.calculationService.generateComparisonData(recs, familySize ?? 0, country ?? '')
      : [];
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
    const totalData = recs.map((r) =>
      sumNullable4(r.kitchenWarm, r.kitchenCold, r.bathroomWarm, r.bathroomCold),
    );

    const datasets: ChartConfiguration['data']['datasets'] = [
      {
        data: totalData,
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
      const firstComp = comparisonData[0];
      const avgVal = sumNullable4(
        firstComp.kitchenWarm,
        firstComp.kitchenCold,
        firstComp.bathroomWarm,
        firstComp.bathroomCold,
      );
      datasets.push({
        data: new Array<number | null>(comparisonData.length).fill(avgVal),
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
      const dataPoints = totalData.map((v) => v || 0);
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

    return { labels, datasets: filterEmptyDatasets(datasets) };
  }

  private getWaterByRoomView(
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

    return {
      labels,
      datasets: buildPairedWaterViewDatasets({
        recs,
        categories: WATER_BY_ROOM_CATEGORIES,
        suffix,
        showComparison,
        comparisonData,
        showTrendline,
        translateFn: (key) => this.languageService.translate(key),
        generateTrendlineFn: (pts) => this.calculationService.generateTrendlineData(pts),
      }),
    };
  }

  private getWaterByTypeView(
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

    return {
      labels,
      datasets: buildPairedWaterViewDatasets({
        recs,
        categories: WATER_BY_TYPE_CATEGORIES,
        suffix,
        showComparison,
        comparisonData,
        showTrendline,
        translateFn: (key) => this.languageService.translate(key),
        generateTrendlineFn: (pts) => this.calculationService.generateTrendlineData(pts),
      }),
    };
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
      const data = recs.map((r) => {
        const v = r[cat.key];
        return typeof v === 'number' && !Number.isNaN(v) ? v : null;
      });
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

    return { labels, datasets: filterEmptyDatasets(datasets) };
  }

  private appendCategoryTrendlines(
    datasets: ChartConfiguration['data']['datasets'],
    categoryDataMap: Map<string, (number | null)[]>,
  ): void {
    for (const cat of WATER_DETAILED_CATEGORIES) {
      const data = categoryDataMap.get(cat.key) || [];
      let hasData = false;
      const numericData = new Array<number>(data.length);
      for (let i = 0; i < data.length; i++) {
        const val = data[i] || 0;
        numericData[i] = val;
        if (val > 0) hasData = true;
      }
      if (hasData) {
        const trendData = this.calculationService.generateTrendlineData(numericData);
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
    const firstComp = comparisonData[0];
    for (const cat of WATER_DETAILED_CATEGORIES) {
      const data = categoryDataMap.get(cat.key) || [];
      if (data.some((v) => (v || 0) > 0)) {
        const avgVal = firstComp[cat.key] || 0;
        datasets.push({
          label: this.languageService.translate(cat.avgLabelKey),
          data: new Array<number>(comparisonData.length).fill(avgVal),
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
}
