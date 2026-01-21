import { TestBed } from '@angular/core/testing';
import { ChartDataService } from './chart-data.service';
import { LanguageService } from './language.service';
import { ChartCalculationService } from './chart-calculation.service';
import { WaterChartService, ChartDataParams } from './water-chart.service';
import { HeatingAveragesService } from './heating-averages.service';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ConsumptionRecord, DynamicHeatingRecord } from '../models/records.model';

describe('ChartDataService', () => {
  let service: ChartDataService;
  let languageServiceMock: any;
  let calculationServiceMock: any;
  let waterChartServiceMock: any;
  let heatingAveragesServiceMock: any;

  beforeEach(() => {
    languageServiceMock = {
      translate: vi.fn((key: string) => key),
    };

    calculationServiceMock = {
      calculateIncrementalData: vi.fn(),
      generateComparisonData: vi.fn(),
      generateTrendlineData: vi.fn((data: number[]) => {
        // Simple mock: return same data for trendline
        return data.map((_, i) => data[0] + (i * ((data[data.length - 1] - data[0]) / (data.length - 1 || 1))));
      }),
    };

    waterChartServiceMock = {
      getWaterChartData: vi.fn(),
    };

    heatingAveragesServiceMock = {
      getAverageKwhPerYear: vi.fn((country: string) => {
        // Return different values based on country for testing
        if (country === 'DE') return 13500;
        if (country === 'FI') return 18000;
        if (country === 'ET') return 400;
        return 10000; // Default
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        ChartDataService,
        { provide: LanguageService, useValue: languageServiceMock },
        { provide: ChartCalculationService, useValue: calculationServiceMock },
        { provide: WaterChartService, useValue: waterChartServiceMock },
        { provide: HeatingAveragesService, useValue: heatingAveragesServiceMock },
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

    // New tests for trendlines
    describe('trendline support', () => {
      it('should add trendline dataset when showTrendline is true', () => {
        const params: ChartDataParams<DynamicHeatingRecord> = {
          records: mockHeatingRecords,
          labels: labels,
          view: 'total',
          mode: 'total',
          roomNames,
          roomIds,
          showTrendline: true
        };

        const result = service.getHeatingChartData(params);

        expect(result.datasets.length).toBe(2); // Data + trendline
        expect(result.datasets[1].label).toBe('CHART.TRENDLINE');
        expect(calculationServiceMock.generateTrendlineData).toHaveBeenCalled();
      });

      it('should not add trendline when showTrendline is false', () => {
        const params: ChartDataParams<DynamicHeatingRecord> = {
          records: mockHeatingRecords,
          labels: labels,
          view: 'total',
          mode: 'total',
          roomNames,
          roomIds,
          showTrendline: false
        };

        const result = service.getHeatingChartData(params);

        expect(result.datasets.length).toBe(1);
      });

      it('should add trendlines per room in by-room view', () => {
        const params: ChartDataParams<DynamicHeatingRecord> = {
          records: mockHeatingRecords,
          labels: labels,
          view: 'by-room',
          mode: 'total',
          roomNames,
          roomIds,
          showTrendline: true
        };

        const result = service.getHeatingChartData(params);

        // 4 rooms + 4 trendlines = 8 datasets
        expect(result.datasets.length).toBe(8);
        expect(result.datasets[1].label).toContain('CHART.TRENDLINE');
      });
    });

    // New tests for country average comparison
    describe('country average comparison', () => {
      it('should add country average line when showAverageComparison is true in incremental mode', () => {
        const params: ChartDataParams<DynamicHeatingRecord> = {
          records: mockHeatingRecords,
          labels: labels,
          view: 'total',
          mode: 'incremental',
          roomNames,
          roomIds,
          showAverageComparison: true,
          country: 'DE'
        };

        const result = service.getHeatingChartData(params);

        // Find the country average dataset
        const avgDataset = result.datasets.find(d => d.label === 'CHART.COUNTRY_AVERAGE');
        expect(avgDataset).toBeDefined();
        expect(heatingAveragesServiceMock.getAverageKwhPerYear).toHaveBeenCalledWith('DE');
      });

      it('should not add country average in total mode', () => {
        const params: ChartDataParams<DynamicHeatingRecord> = {
          records: mockHeatingRecords,
          labels: labels,
          view: 'total',
          mode: 'total',
          roomNames,
          roomIds,
          showAverageComparison: true,
          country: 'DE'
        };

        const result = service.getHeatingChartData(params);

        const avgDataset = result.datasets.find(d => d.label === 'CHART.COUNTRY_AVERAGE');
        expect(avgDataset).toBeUndefined();
      });

      it('should use correct country average for different countries', () => {
        const paramsDE: ChartDataParams<DynamicHeatingRecord> = {
          records: mockHeatingRecords,
          labels: labels,
          view: 'by-room',
          mode: 'incremental',
          roomNames,
          roomIds,
          showAverageComparison: true,
          country: 'FI'
        };

        service.getHeatingChartData(paramsDE);

        expect(heatingAveragesServiceMock.getAverageKwhPerYear).toHaveBeenCalledWith('FI');
      });
    });

    // Test for empty datasets filtering
    describe('filterEmptyDatasets', () => {
      it('should filter out rooms with no data', () => {
        const recordsWithEmptyRoom: DynamicHeatingRecord[] = [
          {
            date: new Date('2023-01-01'),
            rooms: { 'room1': 10, 'room2': 0, 'room3': 5, 'room4': 0 }
          },
          {
            date: new Date('2023-01-08'),
            rooms: { 'room1': 12, 'room2': 0, 'room3': 6, 'room4': 0 }
          },
        ];

        const params: ChartDataParams<DynamicHeatingRecord> = {
          records: recordsWithEmptyRoom,
          labels: labels,
          view: 'by-room',
          mode: 'total',
          roomNames,
          roomIds,
          showTrendline: false
        };

        const result = service.getHeatingChartData(params);

        // Should only have 2 datasets (room1 and room3 have data)
        expect(result.datasets.length).toBe(2);
        expect(result.datasets[0].label).toBe('Living Room');
        expect(result.datasets[1].label).toBe('Kitchen');
      });
    });
  });
});

