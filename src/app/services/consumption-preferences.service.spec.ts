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
});
