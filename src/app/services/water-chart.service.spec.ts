import { TestBed } from '@angular/core/testing';
import { WaterChartService, ChartDataParams } from './water-chart.service';
import { LanguageService } from './language.service';
import { ChartCalculationService } from './chart-calculation.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConsumptionRecord } from '../models/records.model';

describe('WaterChartService', () => {
  let service: WaterChartService;
  let mockLanguageService: any;
  let mockCalculationService: any;

  beforeEach(() => {
    mockLanguageService = {
      translate: vi.fn().mockImplementation((key) => key)
    };

    mockCalculationService = {
      generateComparisonData: vi.fn().mockReturnValue([
        { kitchenWarm: 5, kitchenCold: 5, bathroomWarm: 5, bathroomCold: 5 }
      ]),
      generateTrendlineData: vi.fn().mockReturnValue([10, 20, 30])
    };

    TestBed.configureTestingModule({
      providers: [
        WaterChartService,
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: ChartCalculationService, useValue: mockCalculationService }
      ]
    });
    service = TestBed.inject(WaterChartService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  const baseRecords: ConsumptionRecord[] = [
      { date: new Date('2023-01-01'), kitchenWarm: 10, kitchenCold: 10, bathroomWarm: 10, bathroomCold: 10 },
      { date: new Date('2023-01-02'), kitchenWarm: 15, kitchenCold: 15, bathroomWarm: 15, bathroomCold: 15 }
  ];
  const baseLabels = ['Jan 1', 'Jan 2'];

  describe('getWaterChartData', () => {
      it('should return total view data', () => {
          const params: ChartDataParams = {
              records: baseRecords,
              labels: baseLabels,
              view: 'total',
              mode: 'total'
          };

          const data = service.getWaterChartData(params);
          expect(data.datasets.length).toBeGreaterThan(0);
          expect(data.datasets[0].label).toBe('CHART.TOTAL_WEEKLY_CONSUMPTION');
          expect(data.datasets[0].data).toEqual([40, 60]);
      });

      it('should include trendline in incremental mode if enabled', () => {
          const params: ChartDataParams = {
              records: baseRecords,
              labels: baseLabels,
              view: 'total',
              mode: 'incremental', // Trendline only in incremental
              showTrendline: true
          };

          // incremental mode usually means labels should be sliced in service?
          // The service does `const chartLabels = mode === 'incremental' ? labels.slice(1) : labels;`
          // But it passes `recs` (all records) to `getWaterTotalView`.
          // `getWaterTotalView` maps `recs` to data.
          // Wait, if mode is incremental, we usually display differences?
          // The service implementation of `getWaterChartData` just passes `recs` as is to views.
          // It only slices labels.
          // If the caller (component) handles the record transformation (calculating diffs) before calling service?
          // Looking at service code, it takes `records: T[]`.
          // It does NOT transform records to differences.
          // So the component likely passes already processed records (if incremental) OR the service expects raw records and the labels are just shifted?

          // Actually, `WaterChartService` seems to be purely formatting data for Chart.js.
          // The label slicing suggests the first label is dropped (start date) and we show consumption between dates?
          // But if `recs` has same length as `labels` (original), slicing labels implies data should also be sliced or `recs` passed are already 1 less?

          // Let's assume input is correct for the logic.

          const data = service.getWaterChartData(params);
          // Check if trendline dataset exists
          const trendDataset = data.datasets.find(d => d.label === 'CHART.TRENDLINE');
          expect(trendDataset).toBeDefined();
          expect(mockCalculationService.generateTrendlineData).toHaveBeenCalled();
      });

      it('should include comparison data if enabled', () => {
          const params: ChartDataParams = {
              records: baseRecords,
              labels: baseLabels,
              view: 'total',
              mode: 'incremental',
              showAverageComparison: true,
              familySize: 2,
              country: 'de'
          };

          const data = service.getWaterChartData(params);
          const compDataset = data.datasets.find(d => d.label === 'CHART.COUNTRY_AVERAGE');
          expect(compDataset).toBeDefined();
          expect(mockCalculationService.generateComparisonData).toHaveBeenCalled();
      });

      it('should return by-room view data', () => {
          const params: ChartDataParams = {
              records: baseRecords,
              labels: baseLabels,
              view: 'by-room',
              mode: 'total'
          };

          const data = service.getWaterChartData(params);
          expect(data.datasets.length).toBeGreaterThan(0);
          // Check for Kitchen Total and Bathroom Total
          expect(data.datasets.some(d => d.label === 'CHART.KITCHEN_TOTAL')).toBe(true);
          expect(data.datasets.some(d => d.label === 'CHART.BATHROOM_TOTAL')).toBe(true);
      });

      it('should return by-type view data', () => {
          const params: ChartDataParams = {
              records: baseRecords,
              labels: baseLabels,
              view: 'by-type',
              mode: 'total'
          };

          const data = service.getWaterChartData(params);
          expect(data.datasets.some(d => d.label === 'CHART.WARM_WATER_TOTAL')).toBe(true);
          expect(data.datasets.some(d => d.label === 'CHART.COLD_WATER_TOTAL')).toBe(true);
      });

      it('should return detailed view data', () => {
          const params: ChartDataParams = {
              records: baseRecords,
              labels: baseLabels,
              view: 'detailed',
              mode: 'total'
          };

          const data = service.getWaterChartData(params);
          expect(data.datasets.some(d => d.label === 'CHART.KITCHEN_WARM')).toBe(true);
          expect(data.datasets.some(d => d.label === 'CHART.KITCHEN_COLD')).toBe(true);
          expect(data.datasets.some(d => d.label === 'CHART.BATHROOM_WARM')).toBe(true);
          expect(data.datasets.some(d => d.label === 'CHART.BATHROOM_COLD')).toBe(true);
      });
  });

  describe('filterEmptyDatasets', () => {
      it('should remove datasets with no data', () => {
          // Pass records with 0 for some fields
          const zeroRecords: ConsumptionRecord[] = [
              { date: new Date(), kitchenWarm: 0, kitchenCold: 0, bathroomWarm: 10, bathroomCold: 10 }
          ];

          const params: ChartDataParams = {
              records: zeroRecords,
              labels: ['Label'],
              view: 'by-room',
              mode: 'total'
          };

          const data = service.getWaterChartData(params);
          // Kitchen total should be 0 (0+0)
          // Bathroom total 20

          // filterEmptyDatasets: value !== 0 && value !== null
          // If kitchen data is [0], it should be filtered out.

          const kitchenDataset = data.datasets.find(d => d.label === 'CHART.KITCHEN_TOTAL');
          expect(kitchenDataset).toBeUndefined();

          const bathroomDataset = data.datasets.find(d => d.label === 'CHART.BATHROOM_TOTAL');
          expect(bathroomDataset).toBeDefined();
      });
  });
});
