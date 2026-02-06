import { TestBed } from '@angular/core/testing';
import { ConsumptionPreferencesService } from './consumption-preferences.service';
import { LocalStorageService } from './local-storage.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('ConsumptionPreferencesService', () => {
  let service: ConsumptionPreferencesService;
  let mockLocalStorageService: any;

  beforeEach(() => {
    mockLocalStorageService = {
      getPreference: vi.fn(),
      setPreference: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ConsumptionPreferencesService,
        { provide: LocalStorageService, useValue: mockLocalStorageService },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const injectService = () => TestBed.inject(ConsumptionPreferencesService);

  it('should be created and load defaults if storage empty', () => {
    mockLocalStorageService.getPreference.mockReturnValue(null);
    service = injectService();

    expect(service).toBeTruthy();
    expect(service.chartView()).toBe('total');
    expect(service.displayMode()).toBe('incremental');
  });

  it('should load preferences from storage', () => {
    mockLocalStorageService.getPreference.mockImplementation((key: string) => {
      if (key === 'water_chart_view') return 'by-room';
      if (key === 'water_display_mode') return 'total';
      return null;
    });
    service = injectService();

    expect(service.chartView()).toBe('by-room');
    expect(service.displayMode()).toBe('total');
  });

  it('should fallback to default if storage has invalid value', () => {
    mockLocalStorageService.getPreference.mockImplementation((key: string) => {
      if (key === 'water_chart_view') return 'invalid';
      if (key === 'water_display_mode') return 'invalid';
      return null;
    });
    service = injectService();

    expect(service.chartView()).toBe('total');
    expect(service.displayMode()).toBe('incremental');
  });

  it('should set chart view and save to storage', () => {
    service = injectService();
    service.setChartView('detailed');

    expect(service.chartView()).toBe('detailed');
    expect(mockLocalStorageService.setPreference).toHaveBeenCalledWith('water_chart_view', 'detailed');
  });

  it('should set display mode and save to storage', () => {
    service = injectService();
    service.setDisplayMode('total');

    expect(service.displayMode()).toBe('total');
    expect(mockLocalStorageService.setPreference).toHaveBeenCalledWith('water_display_mode', 'total');
  });

  // ============ Heating Tests ============

  describe('heating preferences', () => {
    it('should load heating defaults if storage empty', () => {
      mockLocalStorageService.getPreference.mockReturnValue(null);
      service = injectService();

      expect(service.heatingChartView()).toBe('total');
      expect(service.heatingDisplayMode()).toBe('total'); // Default for heating is 'total'
    });

    it('should load heating preferences from storage', () => {
      mockLocalStorageService.getPreference.mockImplementation((key: string) => {
        if (key === 'heating_chart_view') return 'by-room';
        if (key === 'heating_display_mode') return 'incremental';
        return null;
      });
      service = injectService();

      expect(service.heatingChartView()).toBe('by-room');
      expect(service.heatingDisplayMode()).toBe('incremental');
    });

    it('should fallback to default if heating storage has invalid value', () => {
      mockLocalStorageService.getPreference.mockImplementation((key: string) => {
        if (key === 'heating_chart_view') return 'invalid';
        if (key === 'heating_display_mode') return 'invalid';
        return null;
      });
      service = injectService();

      expect(service.heatingChartView()).toBe('total');
      expect(service.heatingDisplayMode()).toBe('total');
    });

    it('should set heating chart view and save to storage', () => {
      mockLocalStorageService.getPreference.mockReturnValue(null);
      service = injectService();
      service.setChartView('detailed', 'heating');

      expect(service.heatingChartView()).toBe('detailed');
      expect(mockLocalStorageService.setPreference).toHaveBeenCalledWith('heating_chart_view', 'detailed');
    });

    it('should set heating display mode and save to storage', () => {
      mockLocalStorageService.getPreference.mockReturnValue(null);
      service = injectService();
      service.setDisplayMode('incremental', 'heating');

      expect(service.heatingDisplayMode()).toBe('incremental');
      expect(mockLocalStorageService.setPreference).toHaveBeenCalledWith('heating_display_mode', 'incremental');
    });
  });

  // ============ Electricity Tests ============

  describe('electricity preferences', () => {
    it('should load electricity defaults if storage empty', () => {
      mockLocalStorageService.getPreference.mockReturnValue(null);
      service = injectService();

      expect(service.electricityChartView()).toBe('total');
      expect(service.electricityDisplayMode()).toBe('total'); // Default for electricity is 'total'
    });

    it('should load electricity preferences from storage', () => {
      mockLocalStorageService.getPreference.mockImplementation((key: string) => {
        if (key === 'electricity_chart_view') return 'by-type';
        if (key === 'electricity_display_mode') return 'incremental';
        return null;
      });
      service = injectService();

      expect(service.electricityChartView()).toBe('by-type');
      expect(service.electricityDisplayMode()).toBe('incremental');
    });

    it('should fallback to default if electricity storage has invalid value', () => {
      mockLocalStorageService.getPreference.mockImplementation((key: string) => {
        if (key === 'electricity_chart_view') return 'invalid';
        if (key === 'electricity_display_mode') return 'invalid';
        return null;
      });
      service = injectService();

      expect(service.electricityChartView()).toBe('total');
      expect(service.electricityDisplayMode()).toBe('total');
    });

    it('should set electricity chart view and save to storage', () => {
      mockLocalStorageService.getPreference.mockReturnValue(null);
      service = injectService();
      service.setChartView('by-type', 'electricity');

      expect(service.electricityChartView()).toBe('by-type');
      expect(mockLocalStorageService.setPreference).toHaveBeenCalledWith('electricity_chart_view', 'by-type');
    });

    it('should set electricity display mode and save to storage', () => {
      mockLocalStorageService.getPreference.mockReturnValue(null);
      service = injectService();
      service.setDisplayMode('incremental', 'electricity');

      expect(service.electricityDisplayMode()).toBe('incremental');
      expect(mockLocalStorageService.setPreference).toHaveBeenCalledWith('electricity_display_mode', 'incremental');
    });
  });

  // ============ Cross-type isolation tests ============

  describe('chart type isolation', () => {
    it('should not affect other chart types when setting water preferences', () => {
      mockLocalStorageService.getPreference.mockReturnValue(null);
      service = injectService();

      service.setChartView('detailed', 'water');
      service.setDisplayMode('total', 'water');

      expect(service.chartView()).toBe('detailed');
      expect(service.displayMode()).toBe('total');
      expect(service.heatingChartView()).toBe('total');
      expect(service.heatingDisplayMode()).toBe('total');
      expect(service.electricityChartView()).toBe('total');
      expect(service.electricityDisplayMode()).toBe('total');
    });

    it('should not affect other chart types when setting heating preferences', () => {
      mockLocalStorageService.getPreference.mockReturnValue(null);
      service = injectService();

      service.setChartView('by-room', 'heating');
      service.setDisplayMode('incremental', 'heating');

      expect(service.chartView()).toBe('total');
      expect(service.displayMode()).toBe('incremental');
      expect(service.heatingChartView()).toBe('by-room');
      expect(service.heatingDisplayMode()).toBe('incremental');
      expect(service.electricityChartView()).toBe('total');
      expect(service.electricityDisplayMode()).toBe('total');
    });

    it('should not affect other chart types when setting electricity preferences', () => {
      mockLocalStorageService.getPreference.mockReturnValue(null);
      service = injectService();

      service.setChartView('by-type', 'electricity');
      service.setDisplayMode('incremental', 'electricity');

      expect(service.chartView()).toBe('total');
      expect(service.displayMode()).toBe('incremental');
      expect(service.heatingChartView()).toBe('total');
      expect(service.heatingDisplayMode()).toBe('total');
      expect(service.electricityChartView()).toBe('by-type');
      expect(service.electricityDisplayMode()).toBe('incremental');
    });
  });
});
