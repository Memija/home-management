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
      calculateDailyAverage: vi.fn((incrementalData: any[], _originalData: any[], type: string) => {
        // Return data with normalized metadata based on type
        if (type === 'electricity') {
          return incrementalData.map(r => ({ ...r, normalized: { days: 7, raw: r.value } }));
        }
        return incrementalData.map(r => ({ ...r, normalized: { days: 7 } }));
      }),
      generateElectricityComparisonData: vi.fn(() => []),
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
      expect(calculationServiceMock.calculateIncrementalData).toHaveBeenCalledWith(records, undefined);
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
      // Expectations updated as we no longer assume specific label format here,
      // but 'CHART.INCREMENTAL_CONSUMPTION' label.
      // And we are mostly testing delegate logic logic here.
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

      // Issue reproduction tests
      describe('incremental mode label alignment', () => {
        it('should return N labels for N electricity records', () => {
          const records: any[] = [
            { date: new Date('2023-01-01'), value: 100 },
            { date: new Date('2023-01-08'), value: 110 },
            { date: new Date('2023-01-15'), value: 125 }
          ];
          const labels = ['Jan 1', 'Jan 8', 'Jan 15'];

          // Mock calc service to return difference - NOW INCLUDES FIRST POINT (from 0)
          calculationServiceMock.calculateIncrementalData.mockReturnValue([
            { date: '2023-01-01', value: 100 }, // First point
            { date: '2023-01-08', value: 10 },
            { date: '2023-01-15', value: 15 }
          ]);

          const params: ChartDataParams<any> = {
            records,
            labels,
            view: 'total',
            mode: 'incremental'
          };

          const result = service.getElectricityChartData(params);

          // Should return all labels
          expect(result.labels?.length).toBe(3);
          expect(result.labels).toEqual(['Jan 1', 'Jan 8', 'Jan 15']);
        });

        it('should delegate water chart data generation', () => {
          const params: ChartDataParams<any> = {
            records: [],
            labels: ['A', 'B'],
            view: 'total',
            mode: 'incremental'
          };

          service.getWaterChartData(params);

          expect(waterChartServiceMock.getWaterChartData).toHaveBeenCalledWith(params);
        });

        it('should return N labels for N heating records in incremental mode', () => {
          const records: any[] = [
            { date: new Date(), rooms: { r1: 10 } },
            { date: new Date(), rooms: { r1: 20 } }
          ];
          const labels = ['Jan 1', 'Jan 8'];

          // Mock N items
          calculationServiceMock.calculateIncrementalData.mockReturnValue([
            { date: 'Jan 1', rooms: { r1: 10 } },
            { date: 'Jan 8', rooms: { r1: 10 } }
          ]);

          const params: ChartDataParams<any> = {
            records,
            labels,
            view: 'total',
            mode: 'incremental',
            roomNames: ['R1'],
            roomIds: ['r1']
          };

          const result = service.getHeatingChartData(params);

          // Heating matches logic (all labels)
          expect(result.labels?.length).toBe(2);
          expect(result.labels).toEqual(['Jan 1', 'Jan 8']);
        });
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

    describe('normalization in incremental mode', () => {
      it('should call calculateDailyAverage and attach normalizedData', () => {
        const params: ChartDataParams<DynamicHeatingRecord> = {
          records: mockHeatingRecords,
          labels: labels,
          view: 'total',
          mode: 'incremental',
          roomNames,
          roomIds
        };

        const result = service.getHeatingChartData(params);

        expect(calculationServiceMock.calculateDailyAverage).toHaveBeenCalled();
        expect((result.datasets[0] as any).normalizedData).toBeDefined();
      });

      it('should not call normalization in total mode', () => {
        calculationServiceMock.calculateDailyAverage.mockClear();

        const params: ChartDataParams<DynamicHeatingRecord> = {
          records: mockHeatingRecords,
          labels: labels,
          view: 'total',
          mode: 'total',
          roomNames,
          roomIds
        };

        service.getHeatingChartData(params);

        expect(calculationServiceMock.calculateDailyAverage).not.toHaveBeenCalled();
      });
    });
  });

  describe('getWaterChartData normalization', () => {
    it('should call calculateDailyAverageForWater in incremental mode', () => {
      const records: any[] = [
        { date: new Date('2023-01-01'), kitchenWarm: 10, kitchenCold: 20, bathroomWarm: 30, bathroomCold: 40 },
        { date: new Date('2023-01-08'), kitchenWarm: 15, kitchenCold: 25, bathroomWarm: 35, bathroomCold: 45 }
      ];

      waterChartServiceMock.getWaterChartData.mockReturnValue({
        labels: ['Jan 1', 'Jan 8'],
        datasets: [{ label: 'Test', data: [1, 2] }]
      });

      const params: ChartDataParams = {
        records,
        labels: ['Jan 1', 'Jan 8'],
        view: 'total',
        mode: 'incremental'
      };

      const result = service.getWaterChartData(params);

      expect(calculationServiceMock.calculateDailyAverage).toHaveBeenCalled();
      expect((result.datasets[0] as any).normalizedData).toBeDefined();
    });

    it('should pass through to waterChartService in total mode', () => {
      waterChartServiceMock.getWaterChartData.mockReturnValue({
        labels: ['Jan 1'],
        datasets: [{ label: 'Test', data: [1] }]
      });
      calculationServiceMock.calculateDailyAverage.mockClear();

      const params: ChartDataParams = {
        records: [{ date: new Date('2023-01-01'), kitchenWarm: 10, kitchenCold: 20, bathroomWarm: 30, bathroomCold: 40 }],
        labels: ['Jan 1'],
        view: 'total',
        mode: 'total'
      };

      service.getWaterChartData(params);

      expect(calculationServiceMock.calculateDailyAverage).not.toHaveBeenCalled();
      expect(waterChartServiceMock.getWaterChartData).toHaveBeenCalledWith(params);
    });
  });

  describe('getElectricityChartData normalization', () => {
    it('should call calculateDailyAverageForElectricity in incremental mode', () => {
      const records: any[] = [
        { date: new Date('2023-01-01'), value: 100 },
        { date: new Date('2023-01-08'), value: 110 }
      ];

      const params: ChartDataParams<any> = {
        records,
        labels: ['Jan 1', 'Jan 8'],
        view: 'total',
        mode: 'incremental'
      };

      const result = service.getElectricityChartData(params);

      expect(calculationServiceMock.calculateDailyAverage).toHaveBeenCalled();
      expect((result.datasets[0] as any).normalizedData).toBeDefined();
    });

    it('should not call normalization in total mode', () => {
      calculationServiceMock.calculateDailyAverage.mockClear();

      const records: any[] = [
        { date: new Date('2023-01-01'), value: 100 }
      ];

      const params: ChartDataParams<any> = {
        records,
        labels: ['Jan 1'],
        view: 'total',
        mode: 'total'
      };

      const result = service.getElectricityChartData(params);

      expect(calculationServiceMock.calculateDailyAverage).not.toHaveBeenCalled();
      expect((result.datasets[0] as any).normalizedData).toBeUndefined();
    });

    it('should handle empty records in incremental mode', () => {
      const params: ChartDataParams<any> = {
        records: [],
        labels: [],
        view: 'total',
        mode: 'incremental'
      };

      const result = service.getElectricityChartData(params);

      // Empty datasets are filtered out by filterEmptyDatasets
      expect(result.datasets.length).toBe(0);
      expect(result.labels).toEqual([]);
    });
  });
});
