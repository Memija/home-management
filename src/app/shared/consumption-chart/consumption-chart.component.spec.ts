import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConsumptionChartComponent, ChartView, DisplayMode } from './consumption-chart.component';
import { LanguageService } from '../../services/language.service';
import { ChartDataService } from '../../services/chart-data.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { HelpModalComponent } from '../help-modal/help-modal.component';
import { BaseChartDirective } from 'ng2-charts';
import {
  Pipe,
  PipeTransform,
  Component,
  Input,
  Output,
  EventEmitter,
  Directive,
  signal,
  WritableSignal,
} from '@angular/core';
import { vi, afterEach, describe, it, expect, beforeEach } from 'vitest';
import { ConsumptionRecord } from '../../models/records.model';
import { generateSmartLabels } from './chart-labels.utils';

@Pipe({ name: 'translate', standalone: true })
class MockTranslatePipe implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

@Component({ selector: 'app-help-modal', standalone: true, template: '' })
class MockHelpModalComponent {
  @Input() show = false;
  @Input() titleKey = '';
  @Input() steps: unknown[] = [];
  @Output() closeModal = new EventEmitter<void>();
}

@Directive({ selector: '[appBaseChart], [baseChart]', standalone: true })
class MockBaseChartDirective {
  @Input() data: unknown;
  @Input() options: unknown;
  @Input() type: unknown;
  chart = { resetZoom: vi.fn() };
  update = vi.fn();
}

const makeWaterData = (dates: string[]): ConsumptionRecord[] =>
  dates.map((dateStr) => ({
    date: new Date(dateStr),
    kitchenWarm: 10,
    kitchenCold: 20,
    bathroomWarm: 5,
    bathroomCold: 15,
  }));

describe('ConsumptionChartComponent', () => {
  let component: ConsumptionChartComponent;
  let fixture: ComponentFixture<ConsumptionChartComponent>;
  let languageServiceMock: {
    currentLang: WritableSignal<string>;
    currentLocale: WritableSignal<string>;
    translate: ReturnType<typeof vi.fn>;
    formatDate: ReturnType<typeof vi.fn>;
  };
  let chartDataServiceMock: {
    calculateIncrementalData: ReturnType<typeof vi.fn>;
    generateComparisonData: ReturnType<typeof vi.fn>;
    getWaterChartData: ReturnType<typeof vi.fn>;
    getHeatingChartData: ReturnType<typeof vi.fn>;
    getElectricityChartData: ReturnType<typeof vi.fn>;
  };
  let localStorageServiceMock: {
    getPreference: ReturnType<typeof vi.fn>;
    setPreference: ReturnType<typeof vi.fn>;
    removePreference: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    languageServiceMock = {
      currentLang: signal('en'),
      currentLocale: signal('en-US'),
      translate: vi.fn().mockImplementation((key: string) => key),
      formatDate: vi.fn().mockImplementation((date: Date, options?: Intl.DateTimeFormatOptions) => {
        if (options?.year === 'numeric') {
          return "Jan 1 '24";
        }
        return 'Jan 1';
      }),
    };

    chartDataServiceMock = {
      calculateIncrementalData: vi.fn().mockReturnValue([]),
      generateComparisonData: vi.fn().mockReturnValue([]),
      getWaterChartData: vi.fn().mockReturnValue({ labels: [], datasets: [] }),
      getHeatingChartData: vi.fn().mockReturnValue({ labels: [], datasets: [] }),
      getElectricityChartData: vi.fn().mockReturnValue({ labels: [], datasets: [] }),
    };

    localStorageServiceMock = {
      getPreference: vi.fn().mockReturnValue(null),
      setPreference: vi.fn(),
      removePreference: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ConsumptionChartComponent],
    })
      .overrideComponent(ConsumptionChartComponent, {
        remove: { imports: [TranslatePipe, HelpModalComponent, BaseChartDirective] },
        add: { imports: [MockTranslatePipe, MockHelpModalComponent, MockBaseChartDirective] },
      })
      .overrideProvider(LanguageService, { useValue: languageServiceMock })
      .overrideProvider(ChartDataService, { useValue: chartDataServiceMock })
      .overrideProvider(LocalStorageService, { useValue: localStorageServiceMock })
      .compileComponents();

    fixture = TestBed.createComponent(ConsumptionChartComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const initWithDefaults = (overrides?: {
    data?: ConsumptionRecord[];
    currentView?: ChartView;
    chartType?: 'water' | 'heating' | 'electricity' | 'home';
    displayMode?: DisplayMode;
  }) => {
    component.data = overrides?.data ?? makeWaterData(['2024-01-15', '2024-02-15']);
    component.currentView = overrides?.currentView ?? 'total';
    component.chartType = overrides?.chartType ?? 'water';
    component.onViewChange = vi.fn();
    component.onDisplayModeChange = vi.fn();
    if (overrides?.displayMode) {
      component.displayMode = overrides.displayMode;
    }
    fixture.detectChanges();
    component.ngOnInit();
  };

  describe('Creation and Defaults', () => {
    it('should create', () => {
      initWithDefaults();
      expect(component).toBeTruthy();
    });

    it('should default displayMode to total', () => {
      initWithDefaults();
      expect(component.displayMode).toBe('total');
    });

    it('should default helpTitleKey', () => {
      initWithDefaults();
      expect(component.helpTitleKey).toBe('HOME.CHART_HELP_TITLE');
    });

    it('should have help modal hidden by default', () => {
      initWithDefaults();
      expect(component['showHelpModal']()).toBe(false);
    });

    it('should default empty help steps', () => {
      initWithDefaults();
      expect(component.helpSteps).toEqual([]);
    });
  });

  describe('setView', () => {
    it('should call onViewChange callback', () => {
      initWithDefaults();
      const spy = component.onViewChange as ReturnType<typeof vi.fn>;

      component['setView']('by-room');
      expect(spy).toHaveBeenCalledWith('by-room');
    });

    it('should handle all view types', () => {
      initWithDefaults();
      const spy = component.onViewChange as ReturnType<typeof vi.fn>;

      const views: ChartView[] = ['total', 'by-room', 'by-type', 'detailed'];
      views.forEach((view) => {
        component['setView'](view);
        expect(spy).toHaveBeenCalledWith(view);
      });
    });
  });

  describe('setDisplayMode', () => {
    it('should call onDisplayModeChange callback', () => {
      initWithDefaults();
      const spy = component.onDisplayModeChange as ReturnType<typeof vi.fn>;

      component['setDisplayMode']('incremental');
      expect(spy).toHaveBeenCalledWith('incremental');
    });

    it('should handle both modes', () => {
      initWithDefaults();
      const spy = component.onDisplayModeChange as ReturnType<typeof vi.fn>;

      component['setDisplayMode']('total');
      expect(spy).toHaveBeenCalledWith('total');

      component['setDisplayMode']('incremental');
      expect(spy).toHaveBeenCalledWith('incremental');
    });
  });

  describe('Trendline Toggle', () => {
    it('should toggle trendline from true to false', () => {
      initWithDefaults();
      component['showTrendline'].set(true);

      component['toggleTrendline']();
      expect(component['showTrendline']()).toBe(false);
    });

    it('should toggle trendline from false to true', () => {
      initWithDefaults();
      component['showTrendline'].set(false);

      component['toggleTrendline']();
      expect(component['showTrendline']()).toBe(true);
    });

    it('should persist trendline visibility to localStorage', () => {
      initWithDefaults();
      component['showTrendline'].set(true);

      component['toggleTrendline']();
      expect(localStorageServiceMock.setPreference).toHaveBeenCalledWith(
        'water_chart_trendline_visible',
        'false',
      );
    });

    it('should use chartType in localStorage key', () => {
      initWithDefaults({ chartType: 'heating' });
      component['showTrendline'].set(true);

      component['toggleTrendline']();
      expect(localStorageServiceMock.setPreference).toHaveBeenCalledWith(
        'heating_chart_trendline_visible',
        'false',
      );
    });

    it('should load trendline state from localStorage on init', () => {
      localStorageServiceMock.getPreference.mockReturnValue('false');
      initWithDefaults();

      expect(component['showTrendline']()).toBe(false);
    });

    it('should default trendline to true when no localStorage value', () => {
      localStorageServiceMock.getPreference.mockReturnValue(null);
      initWithDefaults();

      expect(component['showTrendline']()).toBe(true);
    });
  });

  describe('Average Comparison Toggle', () => {
    it('should toggle average comparison', () => {
      initWithDefaults();
      component['showAverageComparison'].set(true);

      component['toggleAverageComparison']();
      expect(component['showAverageComparison']()).toBe(false);
    });

    it('should persist average comparison visibility to localStorage', () => {
      initWithDefaults();
      component['showAverageComparison'].set(true);

      component['toggleAverageComparison']();
      expect(localStorageServiceMock.setPreference).toHaveBeenCalledWith(
        'water_chart_average_visible',
        'false',
      );
    });

    it('should default to true for water chart when no stored value', () => {
      localStorageServiceMock.getPreference.mockReturnValue(null);
      initWithDefaults({ chartType: 'water' });

      expect(component['showAverageComparison']()).toBe(true);
    });

    it('should default to false for heating chart when no stored value', () => {
      localStorageServiceMock.getPreference.mockReturnValue(null);
      initWithDefaults({ chartType: 'heating' });

      expect(component['showAverageComparison']()).toBe(false);
    });

    it('should default to false for electricity chart when no stored value', () => {
      localStorageServiceMock.getPreference.mockReturnValue(null);
      initWithDefaults({ chartType: 'electricity' });

      expect(component['showAverageComparison']()).toBe(false);
    });

    it('should load stored value from localStorage', () => {
      localStorageServiceMock.getPreference.mockReturnValue('true');
      initWithDefaults({ chartType: 'heating' });

      expect(component['showAverageComparison']()).toBe(true);
    });
  });

  describe('hasSufficientDataForTrendline', () => {
    it('should return true when enough data for total mode (>= 2)', () => {
      initWithDefaults({ data: makeWaterData(['2024-01-15', '2024-02-15']) });
      expect(component['hasSufficientDataForTrendline']()).toBe(true);
    });

    it('should return false when insufficient data for total mode (< 2)', () => {
      initWithDefaults({ data: makeWaterData(['2024-01-15']) });
      expect(component['hasSufficientDataForTrendline']()).toBe(false);
    });

    it('should require 3+ data points for incremental mode', () => {
      initWithDefaults({
        data: makeWaterData(['2024-01-15', '2024-02-15']),
        displayMode: 'incremental',
      });
      expect(component['hasSufficientDataForTrendline']()).toBe(false);
    });

    it('should return true with 3 data points in incremental mode', () => {
      initWithDefaults({
        data: makeWaterData(['2024-01-15', '2024-02-15', '2024-03-15']),
        displayMode: 'incremental',
      });
      expect(component['hasSufficientDataForTrendline']()).toBe(true);
    });

    it('should return false with empty data', () => {
      initWithDefaults({ data: [] });
      expect(component['hasSufficientDataForTrendline']()).toBe(false);
    });
  });

  describe('hasSufficientDataForComparison', () => {
    it('should return true with 3+ data points', () => {
      initWithDefaults({
        data: makeWaterData(['2024-01-15', '2024-02-15', '2024-03-15']),
      });
      expect(component['hasSufficientDataForComparison']()).toBe(true);
    });

    it('should return false with 2 data points', () => {
      initWithDefaults({
        data: makeWaterData(['2024-01-15', '2024-02-15']),
      });
      expect(component['hasSufficientDataForComparison']()).toBe(false);
    });

    it('should return false with empty data', () => {
      initWithDefaults({ data: [] });
      expect(component['hasSufficientDataForComparison']()).toBe(false);
    });
  });

  describe('Help Modal', () => {
    it('should open help modal', () => {
      initWithDefaults();
      component['showHelp']();
      expect(component['showHelpModal']()).toBe(true);
    });

    it('should close help modal', () => {
      initWithDefaults();
      component['showHelp']();
      component['closeHelp']();
      expect(component['showHelpModal']()).toBe(false);
    });
  });

  describe('resetZoom', () => {
    it('should call chart resetZoom when chart is available', () => {
      initWithDefaults();
      const mockChart = { config: { type: 'bar' }, chart: { resetZoom: vi.fn() } };
      component['chart'] = mockChart as unknown as BaseChartDirective;

      component['resetZoom']();
      expect(mockChart.chart.resetZoom).toHaveBeenCalled();
    });

    it('should not throw when chart is undefined', () => {
      initWithDefaults();
      component['chart'] = undefined;

      expect(() => component['resetZoom']()).not.toThrow();
    });

    it('should not throw when chart.chart is undefined', () => {
      initWithDefaults();
      component['chart'] = {} as unknown as BaseChartDirective;

      expect(() => component['resetZoom']()).not.toThrow();
    });
  });

  describe('chartData computed', () => {
    it('should call getWaterChartData for water chartType', () => {
      initWithDefaults({ chartType: 'water' });
      component['chartData']();

      expect(chartDataServiceMock.getWaterChartData).toHaveBeenCalled();
    });

    it('should call getHeatingChartData for heating chartType', () => {
      initWithDefaults({ chartType: 'heating' });
      component['chartData']();

      expect(chartDataServiceMock.getHeatingChartData).toHaveBeenCalled();
    });

    it('should call getElectricityChartData for electricity chartType', () => {
      initWithDefaults({ chartType: 'electricity' });
      component['chartData']();

      expect(chartDataServiceMock.getElectricityChartData).toHaveBeenCalled();
    });

    it('should call getWaterChartData for home chartType (with trendline disabled)', () => {
      initWithDefaults({ chartType: 'home' });
      component['chartData']();

      expect(chartDataServiceMock.getWaterChartData).toHaveBeenCalled();
      const callArgs = chartDataServiceMock.getWaterChartData.mock.calls[0][0];
      expect(callArgs.showTrendline).toBe(false);
      expect(callArgs.showAverageComparison).toBe(false);
    });

    it('should use incremental data when display mode is incremental', () => {
      chartDataServiceMock.calculateIncrementalData.mockReturnValue([]);
      initWithDefaults({ displayMode: 'incremental' });
      component['chartData']();

      expect(chartDataServiceMock.calculateIncrementalData).toHaveBeenCalled();
    });

    it('should not calculate incremental data in total mode', () => {
      initWithDefaults({ displayMode: 'total' });
      chartDataServiceMock.calculateIncrementalData.mockClear();
      component['chartData']();

      expect(chartDataServiceMock.calculateIncrementalData).not.toHaveBeenCalled();
    });
  });

  describe('chartOptions computed', () => {
    it('should have responsive set to true', () => {
      initWithDefaults();
      const options = component['chartOptions']();

      expect(options?.responsive).toBe(true);
      expect(options?.maintainAspectRatio).toBe(false);
    });

    it('should set y-axis label to liters for water', () => {
      initWithDefaults({ chartType: 'water' });
      component['chartOptions']();

      expect(languageServiceMock.translate).toHaveBeenCalledWith('CHART.AXIS_LITERS');
    });

    it('should set y-axis label to kWh for heating', () => {
      initWithDefaults({ chartType: 'heating' });
      component['chartOptions']();

      expect(languageServiceMock.translate).toHaveBeenCalledWith('CHART.AXIS_KWH');
    });

    it('should set y-axis label to kWh for electricity', () => {
      initWithDefaults({ chartType: 'electricity' });
      component['chartOptions']();

      expect(languageServiceMock.translate).toHaveBeenCalledWith('CHART.AXIS_KWH');
    });

    it('should have Y axis beginAtZero', () => {
      initWithDefaults();
      const options = component['chartOptions']();

      expect(((options?.scales?.['y'] || {}) as Record<string, unknown>)['beginAtZero']).toBe(true);
    });

    it('should enable zoom and pan plugins', () => {
      initWithDefaults();
      const options = component['chartOptions']();

      expect(options!.plugins!.zoom!.pan!.enabled).toBe(true);
      expect(options!.plugins!.zoom!.zoom!.wheel!.enabled).toBe(true);
      expect(options!.plugins!.zoom!.zoom!.pinch!.enabled).toBe(true);
    });

    it('should enable summerSun plugin only for heating', () => {
      initWithDefaults({ chartType: 'heating' });
      const options = component['chartOptions']();
      expect(
        (options!.plugins as unknown as { summerSun: { enabled: boolean } }).summerSun.enabled,
      ).toBe(true);

      initWithDefaults({ chartType: 'water' });
      const waterOptions = component['chartOptions']();
      expect(
        (waterOptions!.plugins as unknown as { summerSun: { enabled: boolean } }).summerSun.enabled,
      ).toBe(false);
    });

    it('should enable newYearMarker plugin for all types', () => {
      initWithDefaults({ chartType: 'water' });
      const options = component['chartOptions']();
      expect(
        (options!.plugins as unknown as { newYearMarker: { enabled: boolean } }).newYearMarker
          .enabled,
      ).toBe(true);
    });
  });

  describe('Smart Labels', () => {
    it('should return empty array for empty data', () => {
      initWithDefaults({ data: [] });
      const labels = generateSmartLabels([], languageServiceMock as unknown as LanguageService);
      expect(labels).toEqual([]);
    });

    it('should generate labels for small datasets with day info', () => {
      const data = makeWaterData(['2024-01-15', '2024-02-15']);
      initWithDefaults({ data });
      const labels = generateSmartLabels(data, languageServiceMock as unknown as LanguageService);

      expect(labels.length).toBe(2);
      labels.forEach((label: string) => {
        expect(label).toBeTruthy();
        expect(typeof label).toBe('string');
      });
    });

    it('should use short format for large datasets (> 20 data points)', () => {
      const dates = Array.from({ length: 25 }, (_, i) => {
        const month = String((i % 12) + 1).padStart(2, '0');
        return `2024-${month}-15`;
      });
      const data = makeWaterData(dates);
      initWithDefaults({ data });
      const labels = generateSmartLabels(data, languageServiceMock as unknown as LanguageService);

      expect(labels.length).toBe(25);
    });

    it('should include year suffix when data spans multiple years', () => {
      const data = makeWaterData(['2023-12-15', '2024-01-15']);
      initWithDefaults({ data });
      const labels = generateSmartLabels(data, languageServiceMock as unknown as LanguageService);

      labels.forEach((label: string) => {
        expect(label).toMatch(/'[0-9]{2}/);
      });
    });

    it('should not include year suffix when data is within same year', () => {
      const data = makeWaterData(['2024-01-15', '2024-06-15']);
      initWithDefaults({ data });
      const labels = generateSmartLabels(data, languageServiceMock as unknown as LanguageService);

      labels.forEach((label: string) => {
        expect(label).not.toMatch(/'[0-9]{2}/);
      });
    });

    it('should use German locale when language is de', () => {
      languageServiceMock.currentLang.set('de');
      const data = makeWaterData(['2024-06-15']);
      initWithDefaults({ data });
      const labels = generateSmartLabels(data, languageServiceMock as unknown as LanguageService);

      expect(labels.length).toBe(1);
      expect(labels[0]).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data array gracefully', () => {
      initWithDefaults({ data: [] });
      expect(component['hasSufficientDataForTrendline']()).toBe(false);
      expect(component['hasSufficientDataForComparison']()).toBe(false);
    });

    it('should handle rapid toggle of trendline', () => {
      initWithDefaults();

      component['toggleTrendline']();
      component['toggleTrendline']();
      component['toggleTrendline']();
      component['toggleTrendline']();

      expect(component['showTrendline']()).toBe(true);
    });

    it('should handle rapid toggle of average comparison', () => {
      initWithDefaults();

      component['toggleAverageComparison']();
      component['toggleAverageComparison']();
      component['toggleAverageComparison']();

      expect(component['showAverageComparison']()).toBe(false);
    });

    it('should handle single data point', () => {
      initWithDefaults({ data: makeWaterData(['2024-01-15']) });

      expect(component['hasSufficientDataForTrendline']()).toBe(false);
      expect(component['hasSufficientDataForComparison']()).toBe(false);
    });

    it('should handle familySize and country defaults', () => {
      initWithDefaults();
      expect(component.familySize).toBe(0);
      expect(component.country).toBe('');
    });

    it('should handle room-related inputs defaults for non-heating charts', () => {
      initWithDefaults({ chartType: 'water' });
      expect(component.roomNames).toEqual([]);
      expect(component.roomIds).toEqual([]);
      expect(component.roomColors).toEqual([]);
    });

    it('should handle ignoredSpikes default', () => {
      initWithDefaults();
      expect(component.ignoredSpikes).toEqual([]);
    });
  });

  describe('Fullscreen and Controls', () => {
    it('should toggle controls visibility and update chart', () => {
      initWithDefaults();

      let capturedCallback: (() => void) | undefined;
      const setTimeoutSpy = vi.spyOn(window, 'setTimeout').mockImplementation(((
        fn: () => void,
      ): number => {
        if (typeof fn === 'function') {
          capturedCallback = fn;
        }
        return 0;
      }) as unknown as typeof window.setTimeout);

      const mockChart = { update: vi.fn() };
      component['chart'] = mockChart as unknown as BaseChartDirective;

      expect(component['isControlsHidden']()).toBe(false);

      component['toggleControls']();
      expect(component['isControlsHidden']()).toBe(true);

      expect(setTimeoutSpy).toHaveBeenCalled();
      expect(capturedCallback).toBeDefined();

      capturedCallback!();

      expect(mockChart.update).toHaveBeenCalled();

      setTimeoutSpy.mockRestore();
    });

    it('should attempt to enter fullscreen when not in fullscreen', () => {
      initWithDefaults();
      const requestFullscreenSpy = vi.fn().mockResolvedValue(undefined);

      component['chartWrapperRef'] = {
        nativeElement: {
          requestFullscreen: requestFullscreenSpy,
          classList: {
            contains: vi.fn().mockReturnValue(false),
            remove: vi.fn(),
            add: vi.fn(),
          } as unknown as DOMTokenList,
        } as unknown as HTMLDivElement,
      };

      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
      });

      component['toggleFullscreen']();
      expect(requestFullscreenSpy).toHaveBeenCalled();
    });

    it('should exit fullscreen when already in fullscreen', () => {
      initWithDefaults();
      const exitFullscreenSpy = vi.fn();

      document.exitFullscreen = exitFullscreenSpy;

      const mockElement = document.createElement('div');
      Object.defineProperty(document, 'fullscreenElement', {
        value: mockElement,
        configurable: true,
      });
      component['chartWrapperRef'] = {
        nativeElement: mockElement,
      };

      component['toggleFullscreen']();
      expect(exitFullscreenSpy).toHaveBeenCalled();

      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
      });
    });
  });
});
