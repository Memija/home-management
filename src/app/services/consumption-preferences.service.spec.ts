import { TestBed } from '@angular/core/testing';
import { ConsumptionPreferencesService } from './consumption-preferences.service';
import { STORAGE_SERVICE } from './storage.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('ConsumptionPreferencesService', () => {
  let service: ConsumptionPreferencesService;
  let mockStorageService: any;

  // Helper to wait for the async loadPreferences to complete
  const waitForInit = async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  };

  // Helper to configure and inject service with current mock setup
  const setupService = () => {
    TestBed.configureTestingModule({
      providers: [
        ConsumptionPreferencesService,
        { provide: STORAGE_SERVICE, useValue: mockStorageService },
      ],
    });
    return TestBed.inject(ConsumptionPreferencesService);
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockStorageService = {
      load: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created and load defaults if storage empty', async () => {
    service = setupService();
    await waitForInit();

    expect(service).toBeTruthy();
    expect(service.chartView()).toBe('total');
    expect(service.displayMode()).toBe('incremental');
  });

  it('should load preferences from storage', async () => {
    mockStorageService.load.mockImplementation(async (key: string) => {
      if (key === 'water_chart_view') return 'by-room';
      if (key === 'water_display_mode') return 'total';
      return null;
    });
    service = setupService();
    await waitForInit();

    expect(service.chartView()).toBe('by-room');
    expect(service.displayMode()).toBe('total');
  });

  it('should set chart view and save to storage', async () => {
    service = setupService();
    await waitForInit();
    service.setChartView('detailed');

    expect(service.chartView()).toBe('detailed');
    expect(mockStorageService.save).toHaveBeenCalledWith('water_chart_view', 'detailed');
  });

  it('should set display mode and save to storage', async () => {
    service = setupService();
    await waitForInit();
    service.setDisplayMode('total');

    expect(service.displayMode()).toBe('total');
    expect(mockStorageService.save).toHaveBeenCalledWith('water_display_mode', 'total');
  });

  // ============ Heating Tests ============

  describe('heating preferences', () => {
    it('should load heating defaults if storage empty', async () => {
      mockStorageService.load.mockResolvedValue(null);
      service = setupService();
      await waitForInit();

      expect(service.heatingChartView()).toBe('total');
      expect(service.heatingDisplayMode()).toBe('total');
    });

    it('should load heating preferences from storage', async () => {
      mockStorageService.load.mockImplementation(async (key: string) => {
        if (key === 'heating_chart_view') return 'by-room';
        if (key === 'heating_display_mode') return 'incremental';
        return null;
      });
      service = setupService();
      await waitForInit();

      expect(service.heatingChartView()).toBe('by-room');
      expect(service.heatingDisplayMode()).toBe('incremental');
    });

    it('should set heating chart view and save to storage', async () => {
      mockStorageService.load.mockResolvedValue(null);
      service = setupService();
      await waitForInit();
      service.setChartView('detailed', 'heating');

      expect(service.heatingChartView()).toBe('detailed');
      expect(mockStorageService.save).toHaveBeenCalledWith('heating_chart_view', 'detailed');
    });

    it('should set heating display mode and save to storage', async () => {
      mockStorageService.load.mockResolvedValue(null);
      service = setupService();
      await waitForInit();
      service.setDisplayMode('incremental', 'heating');

      expect(service.heatingDisplayMode()).toBe('incremental');
      expect(mockStorageService.save).toHaveBeenCalledWith('heating_display_mode', 'incremental');
    });
  });

  // ============ Electricity Tests ============

  describe('electricity preferences', () => {
    it('should load electricity defaults if storage empty', async () => {
      mockStorageService.load.mockResolvedValue(null);
      service = setupService();
      await waitForInit();

      expect(service.electricityChartView()).toBe('total');
      expect(service.electricityDisplayMode()).toBe('total');
    });

    it('should load electricity preferences from storage', async () => {
      mockStorageService.load.mockImplementation(async (key: string) => {
        if (key === 'electricity_chart_view') return 'by-type';
        if (key === 'electricity_display_mode') return 'incremental';
        return null;
      });
      service = setupService();
      await waitForInit();

      expect(service.electricityChartView()).toBe('by-type');
      expect(service.electricityDisplayMode()).toBe('incremental');
    });

    it('should set electricity chart view and save to storage', async () => {
      mockStorageService.load.mockResolvedValue(null);
      service = setupService();
      await waitForInit();
      service.setChartView('by-type', 'electricity');

      expect(service.electricityChartView()).toBe('by-type');
      expect(mockStorageService.save).toHaveBeenCalledWith('electricity_chart_view', 'by-type');
    });

    it('should set electricity display mode and save to storage', async () => {
      mockStorageService.load.mockResolvedValue(null);
      service = setupService();
      await waitForInit();
      service.setDisplayMode('incremental', 'electricity');

      expect(service.electricityDisplayMode()).toBe('incremental');
      expect(mockStorageService.save).toHaveBeenCalledWith('electricity_display_mode', 'incremental');
    });
  });

  // ============ Cross-type isolation tests ============

  describe('chart type isolation', () => {
    it('should not affect other chart types when setting water preferences', async () => {
      mockStorageService.load.mockResolvedValue(null);
      service = setupService();
      await waitForInit();

      service.setChartView('detailed', 'water');
      service.setDisplayMode('total', 'water');

      expect(service.chartView()).toBe('detailed');
      expect(service.displayMode()).toBe('total');
      expect(service.heatingChartView()).toBe('total');
      expect(service.heatingDisplayMode()).toBe('total');
      expect(service.electricityChartView()).toBe('total');
      expect(service.electricityDisplayMode()).toBe('total');
    });

    it('should not affect other chart types when setting heating preferences', async () => {
      mockStorageService.load.mockResolvedValue(null);
      service = setupService();
      await waitForInit();

      service.setChartView('by-room', 'heating');
      service.setDisplayMode('incremental', 'heating');

      expect(service.chartView()).toBe('total');
      expect(service.displayMode()).toBe('incremental');
      expect(service.heatingChartView()).toBe('by-room');
      expect(service.heatingDisplayMode()).toBe('incremental');
      expect(service.electricityChartView()).toBe('total');
      expect(service.electricityDisplayMode()).toBe('total');
    });

    it('should not affect other chart types when setting electricity preferences', async () => {
      mockStorageService.load.mockResolvedValue(null);
      service = setupService();
      await waitForInit();

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

  // ============ Meter Change Loading ============

  describe('meter change loading', () => {
    it('should load confirmed meter changes from storage', async () => {
      mockStorageService.load.mockImplementation(async (key: string) => {
        if (key === 'water_confirmed_meter_changes') return ['2025-01-15', '2025-03-01'];
        return null;
      });
      service = setupService();
      await waitForInit();

      expect(service.confirmedMeterChanges()).toEqual(['2025-01-15', '2025-03-01']);
    });

    it('should load dismissed meter changes from storage', async () => {
      mockStorageService.load.mockImplementation(async (key: string) => {
        if (key === 'water_dismissed_meter_changes') return ['2025-02-10'];
        return null;
      });
      service = setupService();
      await waitForInit();

      expect(service.dismissedMeterChanges()).toEqual(['2025-02-10']);
    });

    it('should default to empty arrays when no meter changes in storage', async () => {
      service = setupService();
      await waitForInit();

      expect(service.confirmedMeterChanges()).toEqual([]);
      expect(service.dismissedMeterChanges()).toEqual([]);
    });

    it('should ignore non-array confirmed meter change data from storage', async () => {
      mockStorageService.load.mockImplementation(async (key: string) => {
        if (key === 'water_confirmed_meter_changes') return 'not-an-array';
        return null;
      });
      service = setupService();
      await waitForInit();

      expect(service.confirmedMeterChanges()).toEqual([]);
    });

    it('should ignore non-array dismissed meter change data from storage', async () => {
      mockStorageService.load.mockImplementation(async (key: string) => {
        if (key === 'water_dismissed_meter_changes') return 42;
        return null;
      });
      service = setupService();
      await waitForInit();

      expect(service.dismissedMeterChanges()).toEqual([]);
    });
  });

  // ============ Meter Change Setting ============

  describe('meter change setting', () => {
    it('should add confirmed meter change and save to storage', async () => {
      service = setupService();
      await waitForInit();

      service.setMeterChangeConfirmed('2025-01-15');

      expect(service.confirmedMeterChanges()).toEqual(['2025-01-15']);
      expect(mockStorageService.save).toHaveBeenCalledWith('water_confirmed_meter_changes', ['2025-01-15']);
    });

    it('should add dismissed meter change and save to storage', async () => {
      service = setupService();
      await waitForInit();

      service.setMeterChangeDismissed('2025-02-10');

      expect(service.dismissedMeterChanges()).toEqual(['2025-02-10']);
      expect(mockStorageService.save).toHaveBeenCalledWith('water_dismissed_meter_changes', ['2025-02-10']);
    });

    it('should accumulate multiple confirmed meter changes', async () => {
      service = setupService();
      await waitForInit();

      service.setMeterChangeConfirmed('2025-01-15');
      service.setMeterChangeConfirmed('2025-03-01');

      expect(service.confirmedMeterChanges()).toEqual(['2025-01-15', '2025-03-01']);
    });

    it('should deduplicate confirmed meter changes', async () => {
      service = setupService();
      await waitForInit();

      service.setMeterChangeConfirmed('2025-01-15');
      service.setMeterChangeConfirmed('2025-01-15');

      expect(service.confirmedMeterChanges()).toEqual(['2025-01-15']);
    });

    it('should deduplicate dismissed meter changes', async () => {
      service = setupService();
      await waitForInit();

      service.setMeterChangeDismissed('2025-02-10');
      service.setMeterChangeDismissed('2025-02-10');

      expect(service.dismissedMeterChanges()).toEqual(['2025-02-10']);
    });
  });

  // ============ Partial Load Edge Cases ============

  describe('partial load edge cases', () => {
    it('should load only chartView when displayMode is missing from storage', async () => {
      mockStorageService.load.mockImplementation(async (key: string) => {
        if (key === 'water_chart_view') return 'by-room';
        return null;
      });
      service = setupService();
      await waitForInit();

      expect(service.chartView()).toBe('by-room');
      expect(service.displayMode()).toBe('incremental');
    });

    it('should load only displayMode when chartView is missing from storage', async () => {
      mockStorageService.load.mockImplementation(async (key: string) => {
        if (key === 'water_display_mode') return 'total';
        return null;
      });
      service = setupService();
      await waitForInit();

      expect(service.chartView()).toBe('total');
      expect(service.displayMode()).toBe('total');
    });

    it('should handle all chart types loading from storage simultaneously', async () => {
      mockStorageService.load.mockImplementation(async (key: string) => {
        const data: Record<string, unknown> = {
          'water_chart_view': 'by-room',
          'water_display_mode': 'total',
          'heating_chart_view': 'detailed',
          'heating_display_mode': 'incremental',
          'electricity_chart_view': 'by-type',
          'electricity_display_mode': 'incremental',
        };
        return data[key] ?? null;
      });
      service = setupService();
      await waitForInit();

      expect(service.chartView()).toBe('by-room');
      expect(service.displayMode()).toBe('total');
      expect(service.heatingChartView()).toBe('detailed');
      expect(service.heatingDisplayMode()).toBe('incremental');
      expect(service.electricityChartView()).toBe('by-type');
      expect(service.electricityDisplayMode()).toBe('incremental');
    });
  });

  // ============ Storage Error Resilience ============

  describe('storage error resilience', () => {
    it('should keep defaults when storage.load rejects', async () => {
      mockStorageService.load.mockRejectedValue(new Error('Storage unavailable'));
      service = setupService();

      // Wait and suppress unhandled rejection
      await waitForInit();

      expect(service.chartView()).toBe('total');
      expect(service.displayMode()).toBe('incremental');
    });
  });

  // ============ Storage Key Verification ============

  describe('storage key verification', () => {
    it('should use correct storage keys when loading water preferences', async () => {
      service = setupService();
      await waitForInit();

      expect(mockStorageService.load).toHaveBeenCalledWith('water_chart_view');
      expect(mockStorageService.load).toHaveBeenCalledWith('water_display_mode');
    });

    it('should use correct storage keys when loading heating preferences', async () => {
      service = setupService();
      await waitForInit();

      expect(mockStorageService.load).toHaveBeenCalledWith('heating_chart_view');
      expect(mockStorageService.load).toHaveBeenCalledWith('heating_display_mode');
    });

    it('should use correct storage keys when loading electricity preferences', async () => {
      service = setupService();
      await waitForInit();

      expect(mockStorageService.load).toHaveBeenCalledWith('electricity_chart_view');
      expect(mockStorageService.load).toHaveBeenCalledWith('electricity_display_mode');
    });

    it('should use correct storage keys when loading meter changes', async () => {
      service = setupService();
      await waitForInit();

      expect(mockStorageService.load).toHaveBeenCalledWith('water_confirmed_meter_changes');
      expect(mockStorageService.load).toHaveBeenCalledWith('water_dismissed_meter_changes');
    });
  });

  // ============ Sequential Updates ============

  describe('sequential updates', () => {
    it('should reflect latest value after multiple setChartView calls', async () => {
      service = setupService();
      await waitForInit();

      service.setChartView('by-room');
      service.setChartView('detailed');
      service.setChartView('total');

      expect(service.chartView()).toBe('total');
      expect(mockStorageService.save).toHaveBeenCalledTimes(3);
    });

    it('should reflect latest value after multiple setDisplayMode calls', async () => {
      service = setupService();
      await waitForInit();

      service.setDisplayMode('total');
      service.setDisplayMode('incremental');

      expect(service.displayMode()).toBe('incremental');
      expect(mockStorageService.save).toHaveBeenCalledTimes(2);
    });
  });
});
