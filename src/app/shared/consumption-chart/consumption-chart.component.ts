import {
  Component,
  ChangeDetectionStrategy,
  input,
  ViewChild,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import {
  CategoryScale,
  Chart,
  ChartConfiguration,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { ChartDataService, ChartView, DisplayMode } from '../../services/chart-data.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { ThemeService } from '../../services/theme.service';
import {
  LucideAngularModule,
  ChartBar,
  DoorOpen,
  Droplet,
  Grid3x3,
  TrendingUp,
  Activity,
  Info,
  CircleQuestionMark,
  ZoomIn,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  Brain,
  Target,
} from 'lucide-angular';
import { HelpModalComponent, HelpStep } from '../help-modal/help-modal.component';
import 'hammerjs';
import zoomPlugin from 'chartjs-plugin-zoom';
import { registerChartPlugins } from './plugins/chart-plugins';
import { ChartDataPoint } from '../../models/consumption-chart.model';
import { MultiPredictionResult } from '../../models/prediction.models';
import { buildChartOptions } from './options/chart-options.builder';
import { buildConsumptionChartData } from './options/chart-data.builder';
import { ChartToggleState } from './utils/chart-toggle.state';
import { PredictionPeriod } from './predictions/chart-prediction.builder';
import {
  cleanupChartFullscreen,
  exitDocumentFullscreen,
  isDocumentFullscreen,
  toggleChartFullscreen,
} from './utils/chart-fullscreen.utils';

// Re-export types for consumers
export type { ChartView, DisplayMode } from '../../services/chart-data.service';
export type { ChartDataPoint } from '../../models/consumption-chart.model';
export type { FullscreenElement, FullscreenDocument } from './utils/chart-fullscreen.utils';

let chartPluginsRegistered = false;

function ensureChartPluginsRegistered(): void {
  if (chartPluginsRegistered) return;
  chartPluginsRegistered = true;
  Chart.register(
    LineController,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    Filler,
    zoomPlugin,
  );
  registerChartPlugins();
}

@Component({
  selector: 'app-consumption-chart',
  standalone: true,
  imports: [BaseChartDirective, TranslatePipe, LucideAngularModule, HelpModalComponent],
  templateUrl: './consumption-chart.component.html',
  styleUrl: './consumption-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsumptionChartComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  @ViewChild('chartWrapper') chartWrapperRef?: ElementRef<HTMLDivElement>;

  readonly data = input<ChartDataPoint[], ChartDataPoint[] | null | undefined>([], {
    transform: (val) => val || [],
  });
  readonly currentView = input<ChartView, ChartView | null | undefined>('total', {
    transform: (val) => val || 'total',
  });
  readonly onViewChange = input.required<(view: ChartView) => void>();
  readonly chartType = input.required<'water' | 'home' | 'heating' | 'electricity'>();
  readonly displayMode = input<DisplayMode, DisplayMode | null | undefined>('total', {
    transform: (val) => val || 'total',
  });
  readonly onDisplayModeChange = input.required<(mode: DisplayMode) => void>();
  readonly familySize = input<number, number | null | undefined>(0, {
    transform: (val) => val || 0,
  });
  readonly country = input<string, string | null | undefined>('', {
    transform: (val) => val || '',
  });
  readonly helpTitleKey = input<string>('HOME.CHART_HELP_TITLE');
  readonly helpSteps = input<HelpStep[]>([]);
  readonly roomNames = input<string[], string[] | null | undefined>([], {
    transform: (val) => val || [],
  });
  readonly roomIds = input<string[], string[] | null | undefined>([], {
    transform: (val) => val || [],
  });
  readonly roomColors = input<
    { border: string; bg: string }[],
    { border: string; bg: string }[] | null | undefined
  >([], {
    transform: (val) => val || [],
  });
  readonly ignoredSpikes = input<
    { date: string; roomId: string }[],
    { date: string; roomId: string }[] | null | undefined
  >([], {
    transform: (val) => val || [],
  });
  readonly prediction = input<MultiPredictionResult | null>(null);
  readonly predictionPeriod = input<PredictionPeriod, PredictionPeriod | null | undefined>(30, {
    transform: (val) => val || 30,
  });

  private readonly languageService = inject(LanguageService);
  private readonly chartDataService = inject(ChartDataService);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly themeService = inject(ThemeService, { optional: true });
  private readonly document = inject(DOCUMENT, { optional: true });

  protected readonly BarChart3Icon = ChartBar;
  protected readonly DoorOpenIcon = DoorOpen;
  protected readonly DropletIcon = Droplet;
  protected readonly Grid3x3Icon = Grid3x3;
  protected readonly TrendingUpIcon = TrendingUp;
  protected readonly ActivityIcon = Activity;
  protected readonly InfoIcon = Info;
  protected readonly HelpIcon = CircleQuestionMark;
  protected readonly ZoomInIcon = ZoomIn;
  protected readonly Maximize2Icon = Maximize2;
  protected readonly Minimize2Icon = Minimize2;
  protected readonly SlidersHorizontalIcon = SlidersHorizontal;
  protected readonly SmartIcon = Brain;
  protected readonly TargetIcon = Target;

  protected readonly isFullscreen = signal<boolean>(false);
  protected readonly isControlsHidden = signal<boolean>(false);

  private readonly onFullscreenChange = () => {
    const isFS = isDocumentFullscreen();
    this.isFullscreen.set(isFS);
    if (!isFS) {
      this.isControlsHidden.set(false);
    }
    setTimeout(() => this.chart?.update(), 100);
  };

  protected readonly showTrendline = signal<boolean>(true);
  protected readonly showAverageComparison = signal<boolean>(true);
  protected readonly showPredictions = signal<boolean>(true);
  protected readonly showPastForecast = signal<boolean>(false);
  protected readonly showHelpModal = signal(false);

  private toggleState!: ChartToggleState;

  protected hasSufficientDataForTrendline = computed(() => {
    const dataLength = this.data().length;
    const mode = this.displayMode();
    return mode === 'incremental' ? dataLength >= 3 : dataLength >= 2;
  });

  protected hasSufficientDataForComparison = computed(() => this.data().length >= 3);

  protected currentLang = computed(() => {
    this.languageService.translationVersion?.();
    return this.languageService.currentLang();
  });

  protected chartData = computed<ChartConfiguration['data']>(() => {
    this.currentLang();
    return buildConsumptionChartData({
      chartDataService: this.chartDataService,
      languageService: this.languageService,
      chartType: this.chartType(),
      records: this.data(),
      view: this.currentView(),
      mode: this.displayMode(),
      ignoredSpikes: this.ignoredSpikes(),
      showTrendline: this.showTrendline(),
      showAverageComparison: this.showAverageComparison(),
      country: this.country(),
      familySize: this.familySize(),
      roomNames: this.roomNames(),
      roomIds: this.roomIds(),
      roomColors: this.roomColors(),
      prediction: this.prediction(),
      predictionPeriod: this.predictionPeriod(),
      showPredictions: this.showPredictions(),
      showPastForecast: this.showPastForecast(),
    });
  });

  constructor() {
    ensureChartPluginsRegistered();

    effect(() => {
      this.themeService?.resolvedTheme();
      untracked(() => {
        if (this.data().length > 0) {
          this.chart?.update();
        }
      });
    });

    effect(() => {
      const view = this.currentView();
      if (this.toggleState) {
        this.showPredictions.set(this.toggleState.getPredictionsVisibility(view));
        this.showPastForecast.set(this.toggleState.getPastForecastVisibility(view));
      }
    });

    effect((onCleanup) => {
      if (!this.isFullscreen() || !this.document) return;
      const handler = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          this.onEscapeKey();
        }
      };
      this.document.addEventListener('keydown', handler);
      onCleanup(() => this.document?.removeEventListener('keydown', handler));
    });
  }

  ngOnInit(): void {
    this.toggleState = new ChartToggleState(this.localStorageService, this.chartType());
    this.showTrendline.set(this.toggleState.getTrendlineVisibility());
    this.showAverageComparison.set(this.toggleState.getAverageComparisonVisibility());
    this.showPredictions.set(this.toggleState.getPredictionsVisibility(this.currentView()));
    this.showPastForecast.set(this.toggleState.getPastForecastVisibility(this.currentView()));
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.onFullscreenChange);
  }

  protected chartOptions = computed<ChartConfiguration['options']>(() => {
    this.currentLang();
    return buildChartOptions({
      languageService: this.languageService,
      chartType: this.chartType(),
      getData: () => this.data(),
    });
  });

  protected setView(view: ChartView): void {
    this.onViewChange()(view);
  }

  protected setDisplayMode(mode: DisplayMode): void {
    this.onDisplayModeChange()(mode);
  }

  protected toggleTrendline(): void {
    this.showTrendline.update((value) => !value);
    this.toggleState.saveTrendlineVisibility(this.showTrendline());
  }

  protected toggleAverageComparison(): void {
    this.showAverageComparison.update((value) => !value);
    this.toggleState.saveAverageComparisonVisibility(this.showAverageComparison());
  }

  protected togglePredictions(): void {
    const newVal = !this.showPredictions();
    this.showPredictions.set(newVal);
    this.toggleState.savePredictionsVisibility(this.currentView(), newVal);
    if (newVal && this.displayMode() !== 'incremental') {
      this.setDisplayMode('incremental');
    }
  }

  protected togglePastForecast(): void {
    const newVal = !this.showPastForecast();
    this.showPastForecast.set(newVal);
    this.toggleState.savePastForecastVisibility(this.currentView(), newVal);
    if (newVal && this.displayMode() !== 'incremental') {
      this.setDisplayMode('incremental');
    }
  }

  protected showHelp(): void {
    this.showHelpModal.set(true);
  }

  protected closeHelp(): void {
    this.showHelpModal.set(false);
  }

  protected resetZoom(): void {
    this.chart?.chart?.resetZoom();
  }

  protected toggleFullscreen(): void {
    toggleChartFullscreen(
      this.chartWrapperRef?.nativeElement,
      this.isFullscreen,
      this.isControlsHidden,
      () => setTimeout(() => this.chart?.update(), 100),
    );
  }

  protected toggleControls(): void {
    this.isControlsHidden.update((v) => !v);
    setTimeout(() => this.chart?.update(), 50);
  }

  protected onEscapeKey(): void {
    if (!this.isFullscreen() && !isDocumentFullscreen()) return;
    if (isDocumentFullscreen()) {
      exitDocumentFullscreen();
    } else if (this.isFullscreen()) {
      this.toggleFullscreen();
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.onFullscreenChange);
    cleanupChartFullscreen(this.chartWrapperRef?.nativeElement);
  }
}
