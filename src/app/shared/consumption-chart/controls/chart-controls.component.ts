import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  Activity,
  Brain,
  ChartBar,
  DoorOpen,
  Droplet,
  Grid3x3,
  Info,
  Layers,
  LucideAngularModule,
  Target,
  TrendingUp,
  ZoomIn,
} from 'lucide-angular';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { ChartView, DisplayMode } from '../../../services/chart-data.service';
import {
  CHART_TIME_RANGES,
  ChartGranularity,
  ChartTimeRange,
} from '../utils/chart-series-window.utils';
import { ChartTypeKey } from '../utils/chart-toggle.state';
import {
  hasAvailableChartOverlays,
  isChartAverageComparisonDisabled,
} from '../utils/chart-overlays.utils';

const RANGE_LABEL_KEYS: Record<ChartTimeRange, string> = {
  '3m': 'CHART.RANGE_3M',
  '6m': 'CHART.RANGE_6M',
  '1y': 'CHART.RANGE_1Y',
  all: 'CHART.RANGE_ALL',
};

@Component({
  selector: 'app-chart-controls',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './chart-controls.component.html',
  styleUrl: './chart-controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartControlsComponent {
  readonly chartType = input.required<ChartTypeKey>();
  readonly displayMode = input.required<DisplayMode>();
  readonly currentView = input.required<ChartView>();
  readonly timeRange = input.required<ChartTimeRange>();
  readonly granularity = input.required<ChartGranularity>();
  readonly showGranularityToggle = input<boolean>(false);
  readonly isMobileOverlaysOpen = input<boolean>(false);
  readonly activeOverlayCount = input<number>(0);
  readonly familySize = input<number>(0);
  readonly hasSufficientDataForTrendline = input<boolean>(false);
  readonly hasSufficientDataForComparison = input<boolean>(false);
  readonly hasPrediction = input<boolean>(false);
  readonly showTrendline = input<boolean>(true);
  readonly showAverageComparison = input<boolean>(true);
  readonly showPredictions = input<boolean>(true);
  readonly showPastForecast = input<boolean>(false);

  readonly displayModeChange = output<DisplayMode>();
  readonly viewChange = output<ChartView>();
  readonly timeRangeChange = output<ChartTimeRange>();
  readonly granularityChange = output<ChartGranularity>();
  readonly mobileOverlaysToggle = output<void>();
  readonly resetZoomClick = output<void>();
  readonly trendlineToggle = output<void>();
  readonly averageComparisonToggle = output<void>();
  readonly predictionsToggle = output<void>();
  readonly pastForecastToggle = output<void>();

  protected readonly BarChart3Icon = ChartBar;
  protected readonly DoorOpenIcon = DoorOpen;
  protected readonly DropletIcon = Droplet;
  protected readonly Grid3x3Icon = Grid3x3;
  protected readonly TrendingUpIcon = TrendingUp;
  protected readonly ActivityIcon = Activity;
  protected readonly InfoIcon = Info;
  protected readonly ZoomInIcon = ZoomIn;
  protected readonly SmartIcon = Brain;
  protected readonly TargetIcon = Target;
  protected readonly LayersIcon = Layers;
  protected readonly timeRanges = CHART_TIME_RANGES;

  protected readonly hasAvailableOverlays = computed(() =>
    hasAvailableChartOverlays(this.chartType(), this.displayMode()),
  );

  protected readonly isAverageComparisonDisabled = computed(() =>
    isChartAverageComparisonDisabled(
      this.chartType(),
      this.familySize(),
      this.hasSufficientDataForComparison() ? 3 : 0,
    ),
  );

  protected readonly availableViewFilters = computed(() => {
    const base = [
      { view: 'total' as ChartView, labelKey: 'HOME.FILTERS.TOTAL', icon: this.BarChart3Icon },
      { view: 'by-room' as ChartView, labelKey: 'HOME.FILTERS.BY_ROOM', icon: this.DoorOpenIcon },
    ];
    if (this.chartType() === 'water' || this.chartType() === 'home') {
      base.push(
        { view: 'by-type' as ChartView, labelKey: 'HOME.FILTERS.BY_TYPE', icon: this.DropletIcon },
        {
          view: 'detailed' as ChartView,
          labelKey: 'HOME.FILTERS.DETAILED',
          icon: this.Grid3x3Icon,
        },
      );
    }
    return base;
  });

  protected getRangeLabelKey(range: ChartTimeRange): string {
    return RANGE_LABEL_KEYS[range];
  }
}
