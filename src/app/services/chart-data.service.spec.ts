import { TestBed } from '@angular/core/testing';
import { ChartDataService } from './chart-data.service';
import { LanguageService } from './language.service';
import { ChartCalculationService } from './chart-calculation.service';
import { WaterChartService, ChartDataParams } from './water-chart.service';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ConsumptionRecord, HeatingRecord, DynamicHeatingRecord } from '../models/records.model';

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
    const mockHeatingRecords: DynamicHeatingRecord[] = [
      {
        date: new Date('2023-01-01'),
        rooms: {
          'room1': 10,
          'room2': 5,
          'room3': 3,
          'room4': 2
        }
      },
      {
        date: new Date('2023-01-08'),
        rooms: {
          'room1': 12,
          'room2': 6,
          'room3': 4,
          'room4': 3
        }
      },
    ];
    const labels = ['Week 1', 'Week 2'];
    const roomNames = ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom'];
    const roomIds = ['room1', 'room2', 'room3', 'room4'];

    it('should return total view data', () => {
      const params: ChartDataParams<DynamicHeatingRecord> = {
        records: mockHeatingRecords,
        labels: labels,
        view: 'total',
        mode: 'total',
        roomNames,
        roomIds
      };

      const result = service.getHeatingChartData(params);

      expect(result.labels).toEqual(labels);
      expect(result.datasets.length).toBe(1);
      expect(result.datasets[0].label).toBe('CHART.TOTAL_WEEKLY_CONSUMPTION');
      expect(result.datasets[0].data).toEqual([20, 25]); // 10+5+3+2=20, 12+6+4+3=25
    });

    it('should return incremental total view data', () => {
      const params: ChartDataParams<DynamicHeatingRecord> = {
        records: mockHeatingRecords,
        labels: labels,
        view: 'total',
        mode: 'incremental',
        roomNames,
        roomIds
      };

      const result = service.getHeatingChartData(params);

      expect(result.labels).toEqual(['Week 2']);
      expect(result.datasets[0].label).toBe('CHART.INCREMENTAL_CONSUMPTION');
    });

    it('should return by-room view data', () => {
      const params: ChartDataParams<DynamicHeatingRecord> = {
        records: mockHeatingRecords,
        labels: labels,
        view: 'by-room',
        mode: 'total',
        roomNames,
        roomIds
      };

      const result = service.getHeatingChartData(params);

      expect(result.labels).toEqual(labels);
      expect(result.datasets.length).toBe(4);
      expect(result.datasets[0].label).toBe('Living Room');
      expect(result.datasets[0].data).toEqual([10, 12]);
      expect(result.datasets[1].label).toBe('Bedroom');
      expect(result.datasets[1].data).toEqual([5, 6]);
      expect(result.datasets[2].label).toBe('Kitchen');
      expect(result.datasets[2].data).toEqual([3, 4]);
      expect(result.datasets[3].label).toBe('Bathroom');
      expect(result.datasets[3].data).toEqual([2, 3]);
    });

    it('should return by-room view data for detailed view', () => {
      const params: ChartDataParams<DynamicHeatingRecord> = {
        records: mockHeatingRecords,
        labels: labels,
        view: 'detailed',
        mode: 'total',
        roomNames,
        roomIds
      };

      const result = service.getHeatingChartData(params);
      expect(result.datasets.length).toBe(4);
      expect(result.datasets[0].label).toBe('Living Room');
    });

    it('should return by-room view data for by-type view', () => {
      const params: ChartDataParams<DynamicHeatingRecord> = {
        records: mockHeatingRecords,
        labels: labels,
        view: 'by-type',
        mode: 'total',
        roomNames,
        roomIds
      };

      const result = service.getHeatingChartData(params);
      expect(result.datasets.length).toBe(4);
      expect(result.datasets[0].label).toBe('Living Room');
    });
  });
});
