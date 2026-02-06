import { Injectable, inject } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { LanguageService } from './language.service';
import { ChartCalculationService } from './chart-calculation.service';
import { ConsumptionRecord, DynamicHeatingRecord, CombinedData, ComparisonData, ElectricityRecord } from '../models/records.model';
import { WaterChartService, ChartDataParams } from './water-chart.service';
import { HeatingAveragesService } from './heating-averages.service';

export type { ChartView, DisplayMode, ChartDataParams } from './water-chart.service';

@Injectable({
  providedIn: 'root'
})
export class ChartDataService {
  private languageService = inject(LanguageService);
  private calculationService = inject(ChartCalculationService);
  private waterChartService = inject(WaterChartService);
  private heatingAveragesService = inject(HeatingAveragesService);

  /**
   * Calculate incremental (delta) data between consecutive readings
   */
  calculateIncrementalData(recs: (ConsumptionRecord | DynamicHeatingRecord | ElectricityRecord)[], ignoredSpikes?: { date: string, roomId: string }[]): CombinedData[] {
    return this.calculationService.calculateIncrementalData(recs, ignoredSpikes);
  }

  /**
   * Generate comparison data based on country averages
   */
  generateComparisonData(processedData: ConsumptionRecord[], familySize: number, country: string): ComparisonData[] {
    return this.calculationService.generateComparisonData(processedData, familySize, country);
  }

  /**
   * Generate chart data for water consumption
   */
  getWaterChartData(params: ChartDataParams): ChartConfiguration['data'] {
    // Normalize incremental water data to daily averages
    if (params.mode === 'incremental' && params.records.length > 1) {
      const incrementalRecs = params.records as unknown as CombinedData[];
      const originalLikeRecs = (params.originalRecords || params.records) as unknown as ConsumptionRecord[];

      const normalized = this.calculationService.calculateDailyAverage(incrementalRecs, originalLikeRecs, 'water');

      const result = this.waterChartService.getWaterChartData({
        ...params,
        records: normalized as unknown as ConsumptionRecord[]
      });

      // Attach normalized metadata to datasets for tooltip access
      if (result.datasets) {
        result.datasets.forEach(ds => {
          (ds as any).normalizedData = normalized.map(r => (r as any).normalized);
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
    let { records: heatingRecs } = params;
    const { labels, view, mode, roomNames, roomColors: customRoomColors, showTrendline, showAverageComparison, country } = params;

    let normalizedData: any[] | undefined;

    // Normalize incremental heating data if in incremental mode
    if (mode === 'incremental' && heatingRecs.length > 1) {
      const incrementalRecs = heatingRecs as unknown as CombinedData[];
      const originalLikeRecs = (params.originalRecords || heatingRecs) as unknown as DynamicHeatingRecord[];

      const normalized = this.calculationService.calculateDailyAverage(incrementalRecs, originalLikeRecs, 'heating');
      heatingRecs = normalized as unknown as DynamicHeatingRecord[];

      // Store normalized data to attach later
      normalizedData = normalized.map(r => (r as any).normalized);
    }

    const chartLabels = labels; // Use all labels as we now include first data point

    // Calculate average comparison if enabled (incremental mode only - matches water behavior)
    const showComparison = mode === 'incremental' && (showAverageComparison ?? false);
    const countryAverage = showComparison ? this.heatingAveragesService.getAverageKwhPerYear(country ?? 'DE') : 0;

    // Default room colors for chart datasets (fallback if no custom colors provided)
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
      { border: '#009688', bg: 'rgba(0, 150, 136, 0.1)' }
    ];

    // Determine number of rooms from roomNames
    const roomCount = roomNames?.length || 0;

    // Trendline enabled for heating in any mode (since values reset yearly)
    const effectiveShowTrendline = showTrendline ?? false;

    switch (view) {
      case 'total':
        // Calculate total by summing all room values in the dynamic 'rooms' object
        // Note: We need to iterate over all room keys present in the record
        const totalData = heatingRecs.map(r => {
          let sum = 0;
          if (r.rooms) {
            Object.values(r.rooms).forEach(val => sum += ((val as number) || 0));
          }
          return sum;
        });

        const totalDatasets: ChartConfiguration['data']['datasets'] = [{
          label: mode === 'incremental'
            ? this.languageService.translate('CHART.INCREMENTAL_CONSUMPTION')
            : this.languageService.translate('CHART.TOTAL_WEEKLY_CONSUMPTION'),
          data: totalData,
          borderColor: '#ff6f00',
          backgroundColor: 'rgba(255, 111, 0, 0.1)',
          fill: true,
          tension: 0.4,
          // @ts-expect-error - Custom property for tooltip access
          normalizedData: mode === 'incremental' ? normalizedData : undefined
        }];

        // Add trendline if enabled
        if (effectiveShowTrendline && heatingRecs.length > 1) {
          const trendData = this.calculationService.generateTrendlineData(totalData);

          // Calculate slope to determine trend direction
          // Use first and last points of trendline to calculate overall slope
          const firstVal = trendData[0] as number;
          const lastVal = trendData[trendData.length - 1] as number;
          const slope = lastVal - firstVal;

          // Determine color based on slope direction
          // Red = increasing (bad, consumption going up)
          // Green = decreasing (good, consumption going down)
          // Black = flat (no significant change)
          let trendColor = '#000000'; // Black for flat
          if (slope > 1) {
            trendColor = '#dc3545'; // Red for increasing
          } else if (slope < -1) {
            trendColor = '#28a745'; // Green for decreasing
          }

          totalDatasets.push({
            data: trendData,
            label: this.languageService.translate('CHART.TRENDLINE'),
            type: 'line',
            borderColor: trendColor,
            borderWidth: 2,
            pointRadius: 0,
            fill: false
          });
        }

        // Add country average comparison line if enabled
        if (showComparison && heatingRecs.length > 1) {
          // Annual average divided by approximate number of readings per year
          // Assuming monthly readings: divide by 12
          const monthlyAverage = countryAverage / 12;
          const averageData = chartLabels.map(() => monthlyAverage);
          totalDatasets.push({
            data: averageData,
            label: this.languageService.translate('CHART.COUNTRY_AVERAGE'),
            type: 'line',
            borderColor: '#dc3545',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            tension: 0.4
          });
        }

        return {
          labels: chartLabels,
          datasets: totalDatasets
        };
      case 'by-room':
        // Build datasets dynamically based on configured rooms
        const datasets: ChartConfiguration['data']['datasets'] = [];

        const roomIds = params.roomIds || [];

        for (let i = 0; i < roomCount; i++) {
          const roomName = roomNames?.[i] || `${this.languageService.translate('HEATING.ROOM_LIVING_ROOM').split(' ')[0]} ${i + 1}`;
          const roomId = roomIds[i];

          // Use custom colors if provided, otherwise use defaults
          const colors = customRoomColors?.[i] ?? defaultColors[i % defaultColors.length];

          const roomData = heatingRecs.map(r => {
            if (roomId && r.rooms) return r.rooms[roomId] || 0;
            // Fallback: value at index i from rooms object values
            if (r.rooms) {
              const values = Object.values(r.rooms);
              return values[i] || 0;
            }
            return 0;
          });

          const hasData = roomData.some(v => v > 0);

          datasets.push({
            label: mode === 'incremental' ? `${roomName} (${this.languageService.translate('CHART.INCREMENTAL_CONSUMPTION')})` : roomName,
            data: roomData,
            borderColor: colors.border,
            backgroundColor: colors.bg,
            fill: true,
            tension: 0.4,
            // @ts-expect-error - Custom property for tooltip access
            normalizedData: mode === 'incremental' ? normalizedData : undefined
          });

          // Add trendline for each room if enabled and has data
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
              fill: false
            });
          }
        }

        // Add country average comparison line if enabled (same as total view)
        // Divide by number of rooms for per-room comparison
        if (showComparison && heatingRecs.length > 1 && roomCount > 0) {
          const monthlyAverage = (countryAverage / 12) / roomCount;
          const averageData = chartLabels.map(() => monthlyAverage);
          datasets.push({
            data: averageData,
            label: this.languageService.translate('CHART.COUNTRY_AVERAGE'),
            type: 'line',
            borderColor: '#dc3545',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            tension: 0.4
          });
        }

        return {
          labels: chartLabels,
          datasets: this.filterEmptyDatasets(datasets)
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
      return dataset.data.some((value: unknown) => value !== 0 && value !== null && value !== undefined);
    });
  }
  /**
   * Generate chart data for electricity consumption
   */
  getElectricityChartData(params: ChartDataParams<ElectricityRecord>): ChartConfiguration['data'] {
    const { records: electricityRecs, labels, mode, showTrendline, showAverageComparison, country, familySize } = params;
    // Use all labels
    const chartLabels = labels;

    // Calculate average comparison if enabled (incremental mode only)
    const showComparison = mode === 'incremental' && (showAverageComparison ?? false);
    const comparisonData = showComparison
      ? this.calculationService.generateElectricityComparisonData(electricityRecs, familySize ?? 0, country ?? 'DE')
      : [];

    // Process data based on display mode (handled in component via calculateIncrementalData if needed)
    // But here we need to map records to values
    // NOTE: For electricity, we normalize incremental data to monthly equivalent to avoid "drops" for short intervals
    let dataPoints: number[] = [];
    let normalizedData: any[] | undefined;

    if (mode === 'incremental') {
      // Normalize incremental data to daily averages using original records for accurate date calculations
      const originalLikeRecs = (params.originalRecords || electricityRecs) as unknown as ElectricityRecord[];

      const normalized = this.calculationService.calculateDailyAverage(
        electricityRecs as any as CombinedData[],
        originalLikeRecs,
        'electricity'
      );
      dataPoints = normalized.map(r => (r as any).value);
      normalizedData = normalized.map(r => (r as any).normalized);

    } else {
      dataPoints = electricityRecs.map(r => r.value);
    }

    const datasets: ChartConfiguration['data']['datasets'] = [{
      label: mode === 'incremental'
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
      normalizedData: mode === 'incremental' ? normalizedData : undefined
    }];

    // Add trendline if enabled (incremental mode only)
    if (showTrendline && mode === 'incremental' && electricityRecs.length > 1) {
      const trendData = this.calculationService.generateTrendlineData(dataPoints);

      // Calculate slope to determine trend direction
      const firstVal = trendData[0] as number;
      const lastVal = trendData[trendData.length - 1] as number;
      const slope = lastVal - firstVal;

      let trendColor = '#000000';
      if (slope > 1) {
        trendColor = '#dc3545'; // Red (increasing)
      } else if (slope < -1) {
        trendColor = '#28a745'; // Green (decreasing)
      }

      datasets.push({
        data: trendData,
        label: this.languageService.translate('CHART.TRENDLINE'),
        type: 'line',
        borderColor: trendColor,
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      });
    }

    if (showComparison && comparisonData.length > 0) {
      datasets.push({
        data: comparisonData.map(d => d.value),
        label: this.languageService.translate('CHART.COUNTRY_AVERAGE'),
        type: 'line',
        borderColor: '#dc3545',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
        tension: 0.4
      });
    }

    return {
      labels: chartLabels,
      datasets: this.filterEmptyDatasets(datasets)
    };
  }
}
