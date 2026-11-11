import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildConsumptionChartData, BuildChartDataParams } from './chart-data.builder';
import type { ChartDataService } from '../../../services/chart-data.service';
import type { LanguageService } from '../../../services/language.service';
import type { ChartDataPoint } from '../../../models/consumption-chart.model';

describe('chart-data.builder', () => {
  let chartDataServiceMock: {
    calculateIncrementalData: ReturnType<typeof vi.fn>;
    getWaterChartData: ReturnType<typeof vi.fn>;
    getElectricityChartData: ReturnType<typeof vi.fn>;
    getHeatingChartData: ReturnType<typeof vi.fn>;
  };
  let languageServiceMock: {
    formatDate: ReturnType<typeof vi.fn>;
    translate: ReturnType<typeof vi.fn>;
  };
  let baseParams: BuildChartDataParams;

  const sampleRecords: ChartDataPoint[] = [
    {
      date: new Date('2024-01-15'),
      kitchenWarm: 10,
      kitchenCold: 20,
      bathroomWarm: 5,
      bathroomCold: 15,
    },
    {
      date: new Date('2024-02-15'),
      kitchenWarm: 15,
      kitchenCold: 25,
      bathroomWarm: 8,
      bathroomCold: 18,
    },
  ];

  beforeEach(() => {
    chartDataServiceMock = {
      calculateIncrementalData: vi.fn().mockReturnValue(sampleRecords),
      getWaterChartData: vi.fn().mockReturnValue({ labels: ['Jan', 'Feb'], datasets: [] }),
      getElectricityChartData: vi.fn().mockReturnValue({ labels: ['Jan', 'Feb'], datasets: [] }),
      getHeatingChartData: vi.fn().mockReturnValue({ labels: ['Jan', 'Feb'], datasets: [] }),
    };

    languageServiceMock = {
      formatDate: vi.fn().mockReturnValue('Jan 15'),
      translate: vi.fn((key: string) => key),
    };

    baseParams = {
      chartDataService: chartDataServiceMock as unknown as ChartDataService,
      languageService: languageServiceMock as unknown as LanguageService,
      chartType: 'water',
      records: sampleRecords,
      view: 'total',
      mode: 'total',
      ignoredSpikes: [],
      showTrendline: true,
      showAverageComparison: true,
      country: 'DE',
      familySize: 3,
      roomNames: ['Living Room'],
      roomIds: ['living'],
      roomColors: [{ border: '#f00', bg: 'rgba(255,0,0,0.2)' }],
      prediction: null,
      predictionPeriod: 30,
      showPredictions: false,
      showPastForecast: false,
    };
  });

  it('should build water chart data in total mode without calling calculateIncrementalData', () => {
    const result = buildConsumptionChartData(baseParams);

    expect(chartDataServiceMock.calculateIncrementalData).not.toHaveBeenCalled();
    expect(chartDataServiceMock.getWaterChartData).toHaveBeenCalledWith(
      expect.objectContaining({
        view: 'total',
        mode: 'total',
        showTrendline: true,
        showAverageComparison: true,
        country: 'DE',
        familySize: 3,
      }),
    );
    expect(result.labels).toEqual(['Jan', 'Feb']);
  });

  it('should build electricity chart data in total mode', () => {
    buildConsumptionChartData({ ...baseParams, chartType: 'electricity' });

    expect(chartDataServiceMock.getElectricityChartData).toHaveBeenCalledWith(
      expect.objectContaining({
        view: 'total',
        mode: 'total',
        country: 'DE',
        familySize: 3,
      }),
    );
  });

  it('should build home chart data using getWaterChartData with trendline and average disabled', () => {
    buildConsumptionChartData({ ...baseParams, chartType: 'home' });

    expect(chartDataServiceMock.getWaterChartData).toHaveBeenCalledWith(
      expect.objectContaining({
        showTrendline: false,
        showAverageComparison: false,
        country: '',
        familySize: 0,
      }),
    );
  });

  it('should build heating chart data with room metadata', () => {
    buildConsumptionChartData({ ...baseParams, chartType: 'heating' });

    expect(chartDataServiceMock.getHeatingChartData).toHaveBeenCalledWith(
      expect.objectContaining({
        roomNames: ['Living Room'],
        roomIds: ['living'],
        roomColors: [{ border: '#f00', bg: 'rgba(255,0,0,0.2)' }],
        country: 'DE',
      }),
    );
  });

  it('should call calculateIncrementalData when mode is incremental', () => {
    const spikes = [{ date: '2024-02-15', roomId: 'living' }];
    buildConsumptionChartData({
      ...baseParams,
      mode: 'incremental',
      ignoredSpikes: spikes,
    });

    expect(chartDataServiceMock.calculateIncrementalData).toHaveBeenCalledWith(
      sampleRecords,
      spikes,
    );
  });
});
