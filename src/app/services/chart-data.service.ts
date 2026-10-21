import { Injectable, inject } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { LanguageService } from './language.service';
import { ChartCalculationService } from './chart-calculation.service';
import {
  AppChartDataset,
  ConsumptionRecord,
  DynamicHeatingRecord,
  CombinedData,
  ComparisonData,
  ElectricityRecord,
} from '../models/records.model';
import { WaterChartService, ChartDataParams } from './water-chart.service';
import { HeatingAveragesService } from './heating-averages.service';

export type { ChartView, DisplayMode, ChartDataParams } from './water-chart.service';

@Injectable({
  providedIn: 'root',
})
export class ChartDataService {
  private readonly languageService = inject(LanguageService);
  private readonly calculationService = inject(ChartCalculationService);
  private readonly waterChartService = inject(WaterChartService);
  private readonly heatingAveragesService = inject(HeatingAveragesService);

  /**
   * Calculate incremental (delta) data between consecutive readings
   */
  calculateIncrementalData(
    recs: (ConsumptionRecord | DynamicHeatingRecord | ElectricityRecord)[],
    ignoredSpikes?: { date: string; roomId: string }[],
  ): CombinedData[] {
    return this.calculationService.calculateIncrementalData(recs, ignoredSpikes);
  }

  /**
   * Generate comparison data based on country averages
   */
  generateComparisonData(
    processedData: ConsumptionRecord[],
    familySize: number,
    country: string,
  ): ComparisonData[] {
    return this.calculationService.generateComparisonData(processedData, familySize, country);
  }

  /**
   * Generate chart data for water consumption
   */
  getWaterChartData(params: ChartDataParams): ChartConfiguration['data'] {
    // Normalize incremental water data to daily averages
    if (params.mode === 'incremental' && params.records.length > 1) {
      const incrementalRecs = params.records as unknown as CombinedData[];
      const originalLikeRecs = (params.originalRecords ||
        params.records) as unknown as ConsumptionRecord[];

      const normalized = this.calculationService.calculateDailyAverage(
        incrementalRecs,
        originalLikeRecs,
        'water',
      );

      const result = this.waterChartService.getWaterChartData({
        ...params,
        records: normalized as unknown as ConsumptionRecord[],
      });

      // Attach normalized metadata to datasets for tooltip access
      if (result.datasets) {
        result.datasets.forEach((ds) => {
          (ds as AppChartDataset).normalizedData = normalized.map((r) => r.normalized);
        });
      }
      return result;
    }

    return this.waterChartService.getWaterChartData(params);
  }

  /**
   * Generate chart data for heating consumption
   */
  getHeatingChartData(params: ChartDataParams<DynamicHeatingRecord>): ChartConfiguration['data'] {
    const { heatingRecs, normalizedData } = this.prepareHeatingRecords(params);
    const { labels, view, mode, showAverageComparison, country } = params;

    const showComparison = mode === 'incremental' && (showAverageComparison ?? false);
    const countryAverage = showComparison
      ? this.heatingAveragesService.getAverageKwhPerYear(country ?? 'DE')
      : 0;

    switch (view) {
      case 'total':
        return {
          labels,
          datasets: this.buildHeatingTotalDatasets(
            heatingRecs,
            params,
            normalizedData,
            countryAverage,
          ),
        };
      case 'by-room':
        return {
          labels,
          datasets: this.filterEmptyDatasets(
            this.buildHeatingRoomDatasets(heatingRecs, params, normalizedData, countryAverage),
          ),
        };
      case 'by-type':
      case 'detailed':
        // For heating, by-type and detailed views are the same as by-room
        return this.getHeatingChartData({ ...params, view: 'by-room' });
    }
  }

  private prepareHeatingRecords(params: ChartDataParams<DynamicHeatingRecord>): {
    heatingRecs: DynamicHeatingRecord[];
    normalizedData: unknown[] | undefined;
  } {
    let { records: heatingRecs } = params;
    let normalizedData: unknown[] | undefined;

    if (params.mode === 'incremental' && heatingRecs.length > 1) {
      const incrementalRecs = heatingRecs as unknown as CombinedData[];
      const originalLikeRecs = (params.originalRecords ||
        heatingRecs) as unknown as DynamicHeatingRecord[];

      const normalized = this.calculationService.calculateDailyAverage(
        incrementalRecs,
        originalLikeRecs,
        'heating',
      );
      heatingRecs = normalized as unknown as DynamicHeatingRecord[];
      normalizedData = normalized.map((r) => r.normalized);
    }

    return { heatingRecs, normalizedData };
  }

  private buildHeatingTotalDatasets(
    heatingRecs: DynamicHeatingRecord[],
    params: ChartDataParams<DynamicHeatingRecord>,
    normalizedData: unknown[] | undefined,
    countryAverage: number,
  ): ChartConfiguration['data']['datasets'] {
    const { mode, showTrendline, showAverageComparison, labels } = params;
    const showComparison = mode === 'incremental' && (showAverageComparison ?? false);
    const effectiveShowTrendline = showTrendline ?? false;

    const totalData = heatingRecs.map((r) => {
      let sum = 0;
      if (r.rooms) {
        Object.values(r.rooms).forEach((val) => (sum += (val as number) || 0));
      }
      return sum;
    });

    const datasets: ChartConfiguration['data']['datasets'] = [
      {
        label:
          mode === 'incremental'
            ? this.languageService.translate('CHART.INCREMENTAL_CONSUMPTION')
            : this.languageService.translate('CHART.TOTAL_WEEKLY_CONSUMPTION'),
        data: totalData,
        borderColor: '#ff6f00',
        backgroundColor: 'rgba(255, 111, 0, 0.1)',
        fill: true,
        tension: 0.4,
        // @ts-expect-error - Custom property for tooltip access
        normalizedData: mode === 'incremental' ? normalizedData : undefined,
      },
    ];

    if (effectiveShowTrendline && heatingRecs.length > 1) {
      const trendData = this.calculationService.generateTrendlineData(totalData);
      const trendColor = this.calculationService.getTrendColor(trendData);

      datasets.push({
        data: trendData,
        label: this.languageService.translate('CHART.TRENDLINE'),
        type: 'line',
        borderColor: trendColor,
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
      });
    }

    if (showComparison && heatingRecs.length > 1) {
      const monthlyAverage = countryAverage / 12;
      const averageData = labels.map(() => monthlyAverage);
      datasets.push({
        data: averageData,
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

    return datasets;
  }

  private buildHeatingRoomDatasets(
    heatingRecs: DynamicHeatingRecord[],
    params: ChartDataParams<DynamicHeatingRecord>,
    normalizedData: unknown[] | undefined,
    countryAverage: number,
  ): AppChartDataset[] {
    const {
      mode,
      roomNames,
      roomColors: customRoomColors,
      showTrendline,
      showAverageComparison,
      roomIds = [],
      labels,
    } = params;

    const datasets: AppChartDataset[] = [];
    const defaultColors = [
      { border: '#e91e63', bg: 'rgba(233, 30, 99, 0.1)' },
      { border: '#9c27b0', bg: 'rgba(156, 39, 176, 0.1)' },
      { border: '#28a745', bg: 'rgba(40, 167, 69, 0.1)' },
      { border: '#ffa726', bg: 'rgba(255, 167, 38, 0.1)' },
      { border: '#00bcd4', bg: 'rgba(0, 188, 212, 0.1)' },
      { border: '#795548', bg: 'rgba(121, 85, 72, 0.1)' },
      { border: '#607d8b', bg: 'rgba(96, 125, 139, 0.1)' },
      { border: '#ff5722', bg: 'rgba(255, 87, 34, 0.1)' },
      { border: '#3f51b5', bg: 'rgba(63, 81, 181, 0.1)' },
      { border: '#009688', bg: 'rgba(0, 150, 136, 0.1)' },
    ];

    const roomCount = roomNames?.length || 0;
    const effectiveShowTrendline = showTrendline ?? false;

    for (let i = 0; i < roomCount; i++) {
      const roomName =
        roomNames?.[i] ||
        `${this.languageService.translate('HEATING.ROOM_LIVING_ROOM').split(' ')[0]} ${i + 1}`;
      const roomId = roomIds[i];
      const colors = customRoomColors?.[i] ?? defaultColors[i % defaultColors.length];

      const roomData = heatingRecs.map((r) => {
        if (roomId && r.rooms) return r.rooms[roomId] || 0;
        if (r.rooms) {
          const values = Object.values(r.rooms);
          return values[i] || 0;
        }
        return 0;
      });

      const hasData = roomData.some((v) => v > 0);

      datasets.push({
        label:
          mode === 'incremental'
            ? `${roomName} (${this.languageService.translate('CHART.INCREMENTAL_CONSUMPTION')})`
            : roomName,
        data: roomData,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        fill: true,
        tension: 0.4,
        normalizedData: mode === 'incremental' ? normalizedData : undefined,
        categoryId: roomId,
      });

      if (effectiveShowTrendline && hasData && heatingRecs.length >= 2) {
        const trendData = this.calculationService.generateTrendlineData(roomData);
        datasets.push({
          data: trendData,
          label: `${roomName} ${this.languageService.translate('CHART.TRENDLINE')}`,
          type: 'line',
          borderColor: colors.border,
          borderWidth: 2,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false,
          trendlineFor: roomId,
        } as AppChartDataset);
      }
    }

    const showComparison = mode === 'incremental' && (showAverageComparison ?? false);
    if (showComparison && heatingRecs.length > 1 && roomCount > 0) {
      const monthlyAverage = countryAverage / 12 / roomCount;
      const averageData = labels.map(() => monthlyAverage);
      datasets.push({
        data: averageData,
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

    return datasets;
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
        (value: unknown) => value !== 0 && value !== null && value !== undefined,
      );
    });
  }
  /**
   * Generate chart data for electricity consumption
   */
  getElectricityChartData(params: ChartDataParams<ElectricityRecord>): ChartConfiguration['data'] {
    const {
      records: electricityRecs,
      labels,
      mode,
      showTrendline,
      showAverageComparison,
      country,
      familySize,
    } = params;
    // Use all labels
    const chartLabels = labels;

    // Calculate average comparison if enabled (incremental mode only)
    const showComparison = mode === 'incremental' && (showAverageComparison ?? false);
    const comparisonData = showComparison
      ? this.calculationService.generateElectricityComparisonData(
          electricityRecs,
          familySize ?? 0,
          country ?? 'DE',
        )
      : [];

    // Process data based on display mode (handled in component via calculateIncrementalData if needed)
    // But here we need to map records to values
    // NOTE: For electricity, we normalize incremental data to monthly equivalent to avoid "drops" for short intervals
    let dataPoints: number[];
    let normalizedData:
      ({ days: number; raw?: number; [key: string]: number | undefined } | undefined)[] | undefined;

    if (mode === 'incremental') {
      // Normalize incremental data to daily averages using original records for accurate date calculations
      const originalLikeRecs = (params.originalRecords ||
        electricityRecs) as unknown as ElectricityRecord[];

      const normalized = this.calculationService.calculateDailyAverage(
        electricityRecs as unknown as CombinedData[],
        originalLikeRecs,
        'electricity',
      );
      dataPoints = normalized.map((r) => r['value'] as number);
      normalizedData = normalized.map((r) => r.normalized);
    } else {
      dataPoints = electricityRecs.map((r) => r.value);
    }

    const datasets: ChartConfiguration['data']['datasets'] = [
      {
        label:
          mode === 'incremental'
            ? this.languageService.translate('CHART.INCREMENTAL_CONSUMPTION')
            : this.languageService.translate('HOME.HISTORY_TITLE'),
        data: dataPoints,
        borderColor: '#ffc107', // Electricity yellow
        backgroundColor: '#ffc107',
        pointBackgroundColor: '#ffc107',
        pointBorderColor: '#ffc107',
        fill: false,
        tension: 0.4,
        // @ts-expect-error - Custom property for tooltip access
        normalizedData: mode === 'incremental' ? normalizedData : undefined,
      },
    ];

    // Add trendline if enabled (incremental mode only)
    if (showTrendline && mode === 'incremental' && electricityRecs.length > 1) {
      const trendData = this.calculationService.generateTrendlineData(dataPoints);

      const trendColor = this.calculationService.getTrendColor(trendData);

      datasets.push({
        data: trendData,
        label: this.languageService.translate('CHART.TRENDLINE'),
        type: 'line',
        borderColor: trendColor,
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
      });
    }

    if (showComparison && comparisonData.length > 0) {
      datasets.push({
        data: comparisonData.map((d) => d.value),
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

    return {
      labels: chartLabels,
      datasets: this.filterEmptyDatasets(datasets),
    };
  }
}
