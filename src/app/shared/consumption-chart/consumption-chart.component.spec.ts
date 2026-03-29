import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConsumptionChartComponent } from './consumption-chart.component';
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
} from '@angular/core';
import { vi, afterEach } from 'vitest';
import { ConsumptionRecord } from '../../models/records.model';

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
  @Input() steps: any[] = [];
  @Output() close = new EventEmitter<void>();
}

@Directive({ selector: '[baseChart]', standalone: true })
class MockBaseChartDirective {
  @Input() data: any;
  @Input() options: any;
  @Input() type: any;
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
  let languageServiceMock: any;
  let chartDataServiceMock: any;
  let localStorageServiceMock: any;

  beforeEach(async () => {
    languageServiceMock = {
      currentLang: signal('en'),
      translate: vi.fn().mockImplementation((key: string) => key),
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
    currentView?: string;
    chartType?: string;
    displayMode?: string;
  }) => {
    fixture.componentRef.setInput(
      'data',
      overrides?.data ?? makeWaterData(['2024-01-15', '2024-02-15']),
    );
    fixture.componentRef.setInput('currentView', overrides?.currentView ?? 'total');
    component.chartType = (overrides?.chartType ?? 'water') as any;
    component.onViewChange = vi.fn();
    component.onDisplayModeChange = vi.fn();
    if (overrides?.displayMode) {
      fixture.componentRef.setInput('displayMode', overrides.displayMode);
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
      expect(component.displayMode()).toBe('total');
    });

    it('should default helpTitleKey', () => {
      initWithDefaults();
      expect(component.helpTitleKey()).toBe('HOME.CHART_HELP_TITLE');
    });

    it('should have help modal hidden by default', () => {
      initWithDefaults();
      expect((component as any).showHelpModal()).toBe(false);
    });

    it('should default empty help steps', () => {
      initWithDefaults();
      expect(component.helpSteps()).toEqual([]);
    });
  });

  describe('setView', () => {
    it('should call onViewChange callback', () => {
      initWithDefaults();
      const spy = component.onViewChange as ReturnType<typeof vi.fn>;

      (component as any).setView('by-room');
      expect(spy).toHaveBeenCalledWith('by-room');
    });

    it('should handle all view types', () => {
      initWithDefaults();
      const spy = component.onViewChange as ReturnType<typeof vi.fn>;

      const views = ['total', 'by-room', 'by-type', 'detailed'];
      views.forEach((view) => {
        (component as any).setView(view);
        expect(spy).toHaveBeenCalledWith(view);
      });
    });
  });

  describe('setDisplayMode', () => {
    it('should call onDisplayModeChange callback', () => {
      initWithDefaults();
      const spy = component.onDisplayModeChange as ReturnType<typeof vi.fn>;

      (component as any).setDisplayMode('incremental');
      expect(spy).toHaveBeenCalledWith('incremental');
    });

    it('should handle both modes', () => {
      initWithDefaults();
      const spy = component.onDisplayModeChange as ReturnType<typeof vi.fn>;

      (component as any).setDisplayMode('total');
      expect(spy).toHaveBeenCalledWith('total');

      (component as any).setDisplayMode('incremental');
      expect(spy).toHaveBeenCalledWith('incremental');
    });
  });

  describe('Trendline Toggle', () => {
    it('should toggle trendline from true to false', () => {
      initWithDefaults();
      (component as any).showTrendline.set(true);

      (component as any).toggleTrendline();
      expect((component as any).showTrendline()).toBe(false);
    });

    it('should toggle trendline from false to true', () => {
      initWithDefaults();
      (component as any).showTrendline.set(false);

      (component as any).toggleTrendline();
      expect((component as any).showTrendline()).toBe(true);
    });

    it('should persist trendline visibility to localStorage', () => {
      initWithDefaults();
      (component as any).showTrendline.set(true);

      (component as any).toggleTrendline();
      expect(localStorageServiceMock.setPreference).toHaveBeenCalledWith(
        'water_chart_trendline_visible',
        'false',
      );
    });

    it('should use chartType in localStorage key', () => {
      initWithDefaults({ chartType: 'heating' });
      (component as any).showTrendline.set(true);

      (component as any).toggleTrendline();
      expect(localStorageServiceMock.setPreference).toHaveBeenCalledWith(
        'heating_chart_trendline_visible',
        'false',
      );
    });

    it('should load trendline state from localStorage on init', () => {
      localStorageServiceMock.getPreference.mockReturnValue('false');
      initWithDefaults();

      expect((component as any).showTrendline()).toBe(false);
    });

    it('should default trendline to true when no localStorage value', () => {
      localStorageServiceMock.getPreference.mockReturnValue(null);
      initWithDefaults();

      expect((component as any).showTrendline()).toBe(true);
    });
  });

  describe('Average Comparison Toggle', () => {
    it('should toggle average comparison', () => {
      initWithDefaults();
      (component as any).showAverageComparison.set(true);

      (component as any).toggleAverageComparison();
      expect((component as any).showAverageComparison()).toBe(false);
    });

    it('should persist average comparison visibility to localStorage', () => {
      initWithDefaults();
      (component as any).showAverageComparison.set(true);

      (component as any).toggleAverageComparison();
      expect(localStorageServiceMock.setPreference).toHaveBeenCalledWith(
        'water_chart_average_visible',
        'false',
      );
    });

    it('should default to true for water chart when no stored value', () => {
      localStorageServiceMock.getPreference.mockReturnValue(null);
      initWithDefaults({ chartType: 'water' });

      expect((component as any).showAverageComparison()).toBe(true);
    });

    it('should default to false for heating chart when no stored value', () => {
      localStorageServiceMock.getPreference.mockReturnValue(null);
      initWithDefaults({ chartType: 'heating' });

      expect((component as any).showAverageComparison()).toBe(false);
    });

    it('should default to false for electricity chart when no stored value', () => {
      localStorageServiceMock.getPreference.mockReturnValue(null);
      initWithDefaults({ chartType: 'electricity' });

      expect((component as any).showAverageComparison()).toBe(false);
    });

    it('should load stored value from localStorage', () => {
      localStorageServiceMock.getPreference.mockReturnValue('true');
      initWithDefaults({ chartType: 'heating' });

      expect((component as any).showAverageComparison()).toBe(true);
    });
  });

  describe('hasSufficientDataForTrendline', () => {
    it('should return true when enough data for total mode (>= 2)', () => {
      initWithDefaults({ data: makeWaterData(['2024-01-15', '2024-02-15']) });
      expect((component as any).hasSufficientDataForTrendline()).toBe(true);
    });

    it('should return false when insufficient data for total mode (< 2)', () => {
      initWithDefaults({ data: makeWaterData(['2024-01-15']) });
      expect((component as any).hasSufficientDataForTrendline()).toBe(false);
    });

    it('should require 3+ data points for incremental mode', () => {
      initWithDefaults({
        data: makeWaterData(['2024-01-15', '2024-02-15']),
        displayMode: 'incremental',
      });
      expect((component as any).hasSufficientDataForTrendline()).toBe(false);
    });

    it('should return true with 3 data points in incremental mode', () => {
      initWithDefaults({
        data: makeWaterData(['2024-01-15', '2024-02-15', '2024-03-15']),
        displayMode: 'incremental',
      });
      expect((component as any).hasSufficientDataForTrendline()).toBe(true);
    });

    it('should return false with empty data', () => {
      initWithDefaults({ data: [] });
      expect((component as any).hasSufficientDataForTrendline()).toBe(false);
    });
  });

  describe('hasSufficientDataForComparison', () => {
    it('should return true with 3+ data points', () => {
      initWithDefaults({
        data: makeWaterData(['2024-01-15', '2024-02-15', '2024-03-15']),
      });
      expect((component as any).hasSufficientDataForComparison()).toBe(true);
    });

    it('should return false with 2 data points', () => {
      initWithDefaults({
        data: makeWaterData(['2024-01-15', '2024-02-15']),
      });
      expect((component as any).hasSufficientDataForComparison()).toBe(false);
    });

    it('should return false with empty data', () => {
      initWithDefaults({ data: [] });
      expect((component as any).hasSufficientDataForComparison()).toBe(false);
    });
  });

  describe('Help Modal', () => {
    it('should open help modal', () => {
      initWithDefaults();
      (component as any).showHelp();
      expect((component as any).showHelpModal()).toBe(true);
    });

    it('should close help modal', () => {
      initWithDefaults();
      (component as any).showHelp();
      (component as any).closeHelp();
      expect((component as any).showHelpModal()).toBe(false);
    });
  });

  describe('resetZoom', () => {
    it('should call chart resetZoom when chart is available', () => {
      initWithDefaults();
      const mockChart = { chart: { resetZoom: vi.fn() } };
      (component as any).chart = mockChart;

      (component as any).resetZoom();
      expect(mockChart.chart.resetZoom).toHaveBeenCalled();
    });

    it('should not throw when chart is undefined', () => {
      initWithDefaults();
      (component as any).chart = undefined;

      expect(() => (component as any).resetZoom()).not.toThrow();
    });

    it('should not throw when chart.chart is undefined', () => {
      initWithDefaults();
      (component as any).chart = {};

      expect(() => (component as any).resetZoom()).not.toThrow();
    });
  });

  describe('chartData computed', () => {
    it('should call getWaterChartData for water chartType', () => {
      initWithDefaults({ chartType: 'water' });
      (component as any).chartData();

      expect(chartDataServiceMock.getWaterChartData).toHaveBeenCalled();
    });

    it('should call getHeatingChartData for heating chartType', () => {
      initWithDefaults({ chartType: 'heating' });
      (component as any).chartData();

      expect(chartDataServiceMock.getHeatingChartData).toHaveBeenCalled();
    });

    it('should call getElectricityChartData for electricity chartType', () => {
      initWithDefaults({ chartType: 'electricity' });
      (component as any).chartData();

      expect(chartDataServiceMock.getElectricityChartData).toHaveBeenCalled();
    });

    it('should call getWaterChartData for home chartType (with trendline disabled)', () => {
      initWithDefaults({ chartType: 'home' });
      (component as any).chartData();

      expect(chartDataServiceMock.getWaterChartData).toHaveBeenCalled();
      const callArgs = chartDataServiceMock.getWaterChartData.mock.calls[0][0];
      expect(callArgs.showTrendline).toBe(false);
      expect(callArgs.showAverageComparison).toBe(false);
    });

    it('should use incremental data when display mode is incremental', () => {
      chartDataServiceMock.calculateIncrementalData.mockReturnValue([]);
      initWithDefaults({ displayMode: 'incremental' });
      (component as any).chartData();

      expect(chartDataServiceMock.calculateIncrementalData).toHaveBeenCalled();
    });

    it('should not calculate incremental data in total mode', () => {
      initWithDefaults({ displayMode: 'total' });
      chartDataServiceMock.calculateIncrementalData.mockClear();
      (component as any).chartData();

      expect(chartDataServiceMock.calculateIncrementalData).not.toHaveBeenCalled();
    });
  });

  describe('chartOptions computed', () => {
    it('should have responsive set to true', () => {
      initWithDefaults();
      const options = (component as any).chartOptions();

      expect(options.responsive).toBe(true);
      expect(options.maintainAspectRatio).toBe(false);
    });

    it('should set y-axis label to liters for water', () => {
      initWithDefaults({ chartType: 'water' });
      (component as any).chartOptions();

      expect(languageServiceMock.translate).toHaveBeenCalledWith('CHART.AXIS_LITERS');
    });

    it('should set y-axis label to kWh for heating', () => {
      initWithDefaults({ chartType: 'heating' });
      (component as any).chartOptions();

      expect(languageServiceMock.translate).toHaveBeenCalledWith('CHART.AXIS_KWH');
    });

    it('should set y-axis label to kWh for electricity', () => {
      initWithDefaults({ chartType: 'electricity' });
      (component as any).chartOptions();

      expect(languageServiceMock.translate).toHaveBeenCalledWith('CHART.AXIS_KWH');
    });

    it('should have Y axis beginAtZero', () => {
      initWithDefaults();
      const options = (component as any).chartOptions();

      expect(options.scales.y.beginAtZero).toBe(true);
    });

    it('should enable zoom and pan plugins', () => {
      initWithDefaults();
      const options = (component as any).chartOptions();

      expect(options.plugins.zoom.pan.enabled).toBe(true);
      expect(options.plugins.zoom.zoom.wheel.enabled).toBe(true);
      expect(options.plugins.zoom.zoom.pinch.enabled).toBe(true);
    });

    it('should enable summerSun plugin only for heating', () => {
      initWithDefaults({ chartType: 'heating' });
      const options = (component as any).chartOptions();
      expect(options.plugins.summerSun.enabled).toBe(true);

      initWithDefaults({ chartType: 'water' });
      const waterOptions = (component as any).chartOptions();
      expect(waterOptions.plugins.summerSun.enabled).toBe(false);
    });

    it('should enable newYearMarker plugin for all types', () => {
      initWithDefaults({ chartType: 'water' });
      const options = (component as any).chartOptions();
      expect(options.plugins.newYearMarker.enabled).toBe(true);
    });
  });

  describe('Smart Labels', () => {
    it('should return empty array for empty data', () => {
      initWithDefaults({ data: [] });
      const labels = (component as any).generateSmartLabels([]);
      expect(labels).toEqual([]);
    });

    it('should generate labels for small datasets with day info', () => {
      const data = makeWaterData(['2024-01-15', '2024-02-15']);
      initWithDefaults({ data });
      const labels = (component as any).generateSmartLabels(data);

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
      const labels = (component as any).generateSmartLabels(data);

      expect(labels.length).toBe(25);
    });

    it('should include year suffix when data spans multiple years', () => {
      const data = makeWaterData(['2023-12-15', '2024-01-15']);
      initWithDefaults({ data });
      const labels = (component as any).generateSmartLabels(data);

      // Both labels should contain year info (e.g. "'23" or "'24")
      labels.forEach((label: string) => {
        expect(label).toMatch(/'[0-9]{2}/);
      });
    });

    it('should not include year suffix when data is within same year', () => {
      const data = makeWaterData(['2024-01-15', '2024-06-15']);
      initWithDefaults({ data });
      const labels = (component as any).generateSmartLabels(data);

      labels.forEach((label: string) => {
        expect(label).not.toMatch(/'[0-9]{2}/);
      });
    });

    it('should use German locale when language is de', () => {
      languageServiceMock.currentLang.set('de');
      const data = makeWaterData(['2024-06-15']);
      initWithDefaults({ data });
      const labels = (component as any).generateSmartLabels(data);

      expect(labels.length).toBe(1);
      // German month abbreviation for June is "Jun" or "Juni"
      expect(labels[0]).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data array gracefully', () => {
      initWithDefaults({ data: [] });
      expect((component as any).hasSufficientDataForTrendline()).toBe(false);
      expect((component as any).hasSufficientDataForComparison()).toBe(false);
    });

    it('should handle rapid toggle of trendline', () => {
      initWithDefaults();

      (component as any).toggleTrendline();
      (component as any).toggleTrendline();
      (component as any).toggleTrendline();
      (component as any).toggleTrendline();

      // Started true, toggled 4 times = still true
      expect((component as any).showTrendline()).toBe(true);
    });

    it('should handle rapid toggle of average comparison', () => {
      initWithDefaults();

      (component as any).toggleAverageComparison();
      (component as any).toggleAverageComparison();
      (component as any).toggleAverageComparison();

      // Started true (water default), toggled 3 times = false
      expect((component as any).showAverageComparison()).toBe(false);
    });

    it('should handle single data point', () => {
      initWithDefaults({ data: makeWaterData(['2024-01-15']) });

      expect((component as any).hasSufficientDataForTrendline()).toBe(false);
      expect((component as any).hasSufficientDataForComparison()).toBe(false);
    });

    it('should handle familySize and country defaults', () => {
      initWithDefaults();
      expect(component.familySize()).toBe(0);
      expect(component.country()).toBe('');
    });

    it('should handle room-related inputs defaults for non-heating charts', () => {
      initWithDefaults({ chartType: 'water' });
      expect(component.roomNames()).toEqual([]);
      expect(component.roomIds()).toEqual([]);
      expect(component.roomColors()).toEqual([]);
    });

    it('should handle ignoredSpikes default', () => {
      initWithDefaults();
      expect(component.ignoredSpikes()).toEqual([]);
    });
  });
});
