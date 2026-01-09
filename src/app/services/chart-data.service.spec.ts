import { TestBed } from '@angular/core/testing';
import { ChartDataService } from './chart-data.service';
import { LanguageService } from './language.service';
import { ChartCalculationService } from './chart-calculation.service';
import { WaterChartService, ChartDataParams } from './water-chart.service';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ConsumptionRecord, HeatingRecord } from '../models/records.model';

describe('ChartDataService', () => {
  let service: ChartDataService;
  let languageServiceMock: any;
  let calculationServiceMock: any;
  let waterChartServiceMock: any;

  beforeEach(() => {
    languageServiceMock = {
      translate: vi.fn((key: string) => key),
    };

    calculationServiceMock = {
      calculateIncrementalData: vi.fn(),
      generateComparisonData: vi.fn(),
    };

    waterChartServiceMock = {
      getWaterChartData: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ChartDataService,
        { provide: LanguageService, useValue: languageServiceMock },
        { provide: ChartCalculationService, useValue: calculationServiceMock },
        { provide: WaterChartService, useValue: waterChartServiceMock },
      ],
    });

    service = TestBed.inject(ChartDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateIncrementalData', () => {
    it('should call calculationService.calculateIncrementalData', () => {
      const records: ConsumptionRecord[] = [];
      service.calculateIncrementalData(records);
      expect(calculationServiceMock.calculateIncrementalData).toHaveBeenCalledWith(records);
    });
  });

  describe('generateComparisonData', () => {
    it('should call calculationService.generateComparisonData', () => {
      const records: ConsumptionRecord[] = [];
      service.generateComparisonData(records, 4, 'DE');
      expect(calculationServiceMock.generateComparisonData).toHaveBeenCalledWith(records, 4, 'DE');
    });
  });

  describe('getWaterChartData', () => {
    it('should call waterChartService.getWaterChartData', () => {
      const params: ChartDataParams = {
        records: [],
        labels: [],
        view: 'total',
        mode: 'total',
      };
      service.getWaterChartData(params);
      expect(waterChartServiceMock.getWaterChartData).toHaveBeenCalledWith(params);
    });
  });

  describe('getHeatingChartData', () => {
    const mockHeatingRecords: HeatingRecord[] = [
      {
        date: new Date('2023-01-01'),
        livingRoom: 10,
        bedroom: 5,
        kitchen: 3,
        bathroom: 2,
      },
      {
        date: new Date('2023-01-08'),
        livingRoom: 12,
        bedroom: 6,
        kitchen: 4,
        bathroom: 3,
      },
    ];
    const labels = ['Week 1', 'Week 2'];

    it('should return total view data', () => {
      const params: ChartDataParams<HeatingRecord> = {
        records: mockHeatingRecords,
        labels: labels,
        view: 'total',
        mode: 'total',
      };

      const result = service.getHeatingChartData(params);

      expect(result.labels).toEqual(labels);
      expect(result.datasets.length).toBe(1);
      expect(result.datasets[0].label).toBe('CHART.TOTAL_WEEKLY_CONSUMPTION');
      expect(result.datasets[0].data).toEqual([20, 25]); // 10+5+3+2=20, 12+6+4+3=25
    });

    it('should return incremental total view data', () => {
      const params: ChartDataParams<HeatingRecord> = {
        records: mockHeatingRecords,
        labels: labels,
        view: 'total',
        mode: 'incremental',
      };

      const result = service.getHeatingChartData(params);

      expect(result.labels).toEqual(['Week 2']);
      expect(result.datasets[0].label).toBe('CHART.INCREMENTAL_CONSUMPTION');
    });

    it('should return by-room view data', () => {
      const params: ChartDataParams<HeatingRecord> = {
        records: mockHeatingRecords,
        labels: labels,
        view: 'by-room',
        mode: 'total',
      };

      const result = service.getHeatingChartData(params);

      expect(result.labels).toEqual(labels);
      expect(result.datasets.length).toBe(4);
      expect(result.datasets[0].label).toBe('CHART.LIVING_ROOM');
      expect(result.datasets[0].data).toEqual([10, 12]);
      expect(result.datasets[1].label).toBe('CHART.BEDROOM');
      expect(result.datasets[1].data).toEqual([5, 6]);
      expect(result.datasets[2].label).toBe('CHART.KITCHEN');
      expect(result.datasets[2].data).toEqual([3, 4]);
      expect(result.datasets[3].label).toBe('CHART.BATHROOM');
      expect(result.datasets[3].data).toEqual([2, 3]);
    });

    it('should return by-room view data for detailed view', () => {
      const params: ChartDataParams<HeatingRecord> = {
        records: mockHeatingRecords,
        labels: labels,
        view: 'detailed',
        mode: 'total',
      };

      const result = service.getHeatingChartData(params);
      expect(result.datasets.length).toBe(4);
      expect(result.datasets[0].label).toBe('CHART.LIVING_ROOM');
    });

    it('should return by-room view data for by-type view', () => {
      const params: ChartDataParams<HeatingRecord> = {
        records: mockHeatingRecords,
        labels: labels,
        view: 'by-type',
        mode: 'total',
      };

      const result = service.getHeatingChartData(params);
      expect(result.datasets.length).toBe(4);
      expect(result.datasets[0].label).toBe('CHART.LIVING_ROOM');
    });
  });
});
