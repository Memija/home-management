import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  OnInit,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import {
  Chart,
  ChartConfiguration,
  registerables,
} from 'chart.js';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { ChartDataService, ChartView, DisplayMode } from '../../services/chart-data.service';
import { LocalStorageService } from '../../services/local-storage.service';
import {
  LucideAngularModule,
  BarChart3,
  DoorOpen,
  Droplet,
  Grid3x3,
  TrendingUp,
  Activity,
  Info,
  HelpCircle,
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
import {
  ConsumptionRecord,
  DynamicHeatingRecord,
  ElectricityRecord,
} from '../../models/records.model';
import { registerChartPlugins } from './chart-plugins';
import { ChartDataPoint, ChartConfig } from '../../models/consumption-chart.model';
import { MultiPredictionResult } from '../../models/prediction.models';
import { generateSmartLabels } from './chart-labels.utils';
import { buildChartOptions } from './chart-options.builder';
import { ChartToggleState } from './chart-toggle.state';
import { appendPredictionDatasets, PredictionPeriod } from './chart-prediction.builder';

// Re-export types for consumers
export type { ChartView, DisplayMode } from '../../services/chart-data.service';
export type { ChartDataPoint, ChartConfig } from '../../models/consumption-chart.model';

Chart.register(...registerables, zoomPlugin);
registerChartPlugins();

@Component({
  selector: 'app-consumption-chart',
  standalone: true,
  imports: [BaseChartDirective, TranslatePipe, LucideAngularModule, HelpModalComponent],
  templateUrl: './consumption-chart.component.html',
  styleUrl: './consumption-chart.component.scss',
})
export class ConsumptionChartComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  @ViewChild('chartWrapper') chartWrapperRef?: ElementRef<HTMLDivElement>;

  data = input.required<ChartDataPoint[]>();
  currentView = input.required<ChartView>();
  @Input({ required: true }) onViewChange!: (view: ChartView) => void;
  @Input({ required: true }) chartType!: 'water' | 'home' | 'heating' | 'electricity';
  displayMode = input<DisplayMode>('total');
  @Input({ required: true }) onDisplayModeChange!: (mode: DisplayMode) => void;
  familySize = input<any>(0);
  country = input<any>('');
  helpTitleKey = input<string>('HOME.CHART_HELP_TITLE');
  helpSteps = input<HelpStep[]>([]);
  roomNames = input<string[]>([]); // For heating chart: actual room names
  roomIds = input<string[]>([]); // For heating chart: actual room IDs
  roomColors = input<Array<{ border: string; bg: string }>>([]); // For heating chart: room-specific colors
  ignoredSpikes = input<{ date: string; roomId: string }[]>([]); // For heating chart: confirmed spikes to ignore in incremental mode
  prediction = input<MultiPredictionResult | null>(null);
  /** Number of days for the prediction projection */
  predictionPeriod = input<PredictionPeriod>(30);

  private languageService = inject(LanguageService);
  private chartDataService = inject(ChartDataService);
  private localStorageService = inject(LocalStorageService);

  protected readonly BarChart3Icon = BarChart3;
  protected readonly DoorOpenIcon = DoorOpen;
  protected readonly DropletIcon = Droplet;
  protected readonly Grid3x3Icon = Grid3x3;
  protected readonly TrendingUpIcon = TrendingUp;
  protected readonly ActivityIcon = Activity;
  protected readonly InfoIcon = Info;
  protected readonly HelpIcon = HelpCircle;
  protected readonly ZoomInIcon = ZoomIn;
  protected readonly Maximize2Icon = Maximize2;
  protected readonly Minimize2Icon = Minimize2;
  protected readonly SlidersHorizontalIcon = SlidersHorizontal;
  protected readonly SmartIcon = Brain;
  protected readonly TargetIcon = Target;

  // Fullscreen state — synced from the native fullscreenchange event
  protected isFullscreen = signal<boolean>(false);

  // Hide controls state (used to maximize chart canvas inside fullscreen)
  protected isControlsHidden = signal<boolean>(false);

  /**
   * Returns true when the native Fullscreen API is supported on the current element.
   * iOS Safari does not support it at all; most Android browsers do.
   */
  private get isNativeFullscreenSupported(): boolean {
    const el = this.chartWrapperRef?.nativeElement;
    return !!(
      el &&
      (el.requestFullscreen ||
        (el as any).webkitRequestFullscreen ||
        (el as any).mozRequestFullScreen ||
        (el as any).msRequestFullscreen)
    );
  }

  private readonly onFullscreenChange = () => {
    // Support both standard and webkit-prefixed fullscreenElement (Android Chrome)
    const isFS = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
    this.isFullscreen.set(isFS);
    if (!isFS) {
      this.isControlsHidden.set(false); // Reset controls visibility when exiting fullscreen
    }
    // Give the browser a frame to resize, then update Chart.js
    setTimeout(() => this.chart?.update(), 100);
  };

  // Trendline visibility toggle - initialized in ngOnInit after chartType is set
  protected showTrendline = signal<boolean>(true);

  // Average comparison visibility toggle - initialized in ngOnInit after chartType is set
  protected showAverageComparison = signal<boolean>(true);

  // Predictions visibility toggle - initialized in ngOnInit after chartType is set
  protected showPredictions = signal<boolean>(true);

  // Past forecast visibility toggle
  protected showPastForecast = signal<boolean>(false);

  // Help modal state
  protected showHelpModal = signal(false);

  /** Toggle/preference helper (initialized in ngOnInit once chartType is available) */
  private toggleState!: ChartToggleState;

  // Computed property to check if there's enough data for features
  protected hasSufficientDataForTrendline = computed(() => {
    const dataLength = this.data().length;
    const mode = this.displayMode();
    return mode === 'incremental' ? dataLength >= 3 : dataLength >= 2;
  });

  protected hasSufficientDataForComparison = computed(() => {
    const dataLength = this.data().length;
    return dataLength >= 3;
  });

  protected currentLang = computed(() => this.languageService.currentLang());

  protected chartData = computed<ChartConfiguration['data']>(() => {
    const recs = this.data();
    const labels = generateSmartLabels(recs, this.languageService);
    const view = this.currentView();
    const mode = this.displayMode();
    // Reactive to language, country, and toggle changes
    this.currentLang();
    this.showTrendline();
    this.showAverageComparison();
    this.showPredictions();
    this.showPastForecast();
    this.predictionPeriod();

    // Process data based on display mode
    const processedData =
      mode === 'incremental'
        ? this.chartDataService.calculateIncrementalData(recs, this.ignoredSpikes())
        : recs;

    let resultData: ChartConfiguration['data'];

    if (this.chartType === 'water') {
      resultData = this.chartDataService.getWaterChartData({
        records: processedData as ConsumptionRecord[],
        originalRecords: recs as ConsumptionRecord[],
        labels,
        view,
        mode,
        showTrendline: this.showTrendline(),
        showAverageComparison: this.showAverageComparison(),
        country: this.country() ?? '',
        familySize: this.familySize() ?? 0,
      });
    } else if (this.chartType === 'electricity') {
      resultData = this.chartDataService.getElectricityChartData({
        records: processedData as unknown as ElectricityRecord[],
        originalRecords: recs as unknown as ElectricityRecord[],
        labels,
        view,
        mode,
        showTrendline: this.showTrendline(),
        showAverageComparison: this.showAverageComparison(),
        country: this.country() ?? 'DE',
        familySize: this.familySize() ?? 0,
      });
    } else if (this.chartType === 'home') {
      resultData = this.chartDataService.getWaterChartData({
        records: processedData as ConsumptionRecord[],
        originalRecords: recs as ConsumptionRecord[],
        labels,
        view,
        mode,
        showTrendline: false,
        showAverageComparison: false,
        country: '',
        familySize: 0,
      });
    } else {
      resultData = this.chartDataService.getHeatingChartData({
        records: processedData as unknown as DynamicHeatingRecord[],
        originalRecords: recs as unknown as DynamicHeatingRecord[],
        labels,
        view,
        mode,
        roomNames: this.roomNames(),
        roomIds: this.roomIds(),
        roomColors: this.roomColors(),
        showTrendline: this.showTrendline(),
        showAverageComparison: this.showAverageComparison(),
        country: this.country() ?? 'DE',
      });
    }

    if (mode !== 'incremental') {
      return resultData;
    }

    return appendPredictionDatasets(resultData, {
      languageService: this.languageService,
      chartType: this.chartType,
      currentView: () => this.currentView(),
      getData: () => this.data(),
      prediction: this.prediction(),
      predictionPeriod: this.predictionPeriod(),
      showPredictions: this.showPredictions(),
      showPastForecast: this.showPastForecast(),
    });
  });

  constructor() {
    effect(() => {
      this.chartData();
      this.chart?.update();
    });

    effect(() => {
      const view = this.currentView();
      if (this.toggleState) {
        this.showPredictions.set(this.toggleState.getPredictionsVisibility(view));
        this.showPastForecast.set(this.toggleState.getPastForecastVisibility(view));
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.toggleState = new ChartToggleState(this.localStorageService, this.chartType);
    this.showTrendline.set(this.toggleState.getTrendlineVisibility());
    this.showAverageComparison.set(this.toggleState.getAverageComparisonVisibility());
    // Initialize prediction visibility for current view now that toggleState exists
    this.showPredictions.set(this.toggleState.getPredictionsVisibility(this.currentView()));
    this.showPastForecast.set(this.toggleState.getPastForecastVisibility(this.currentView()));
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    // webkit prefix required for Android Chrome and some other mobile browsers
    document.addEventListener('webkitfullscreenchange', this.onFullscreenChange);
  }

  protected chartOptions = computed<ChartConfiguration['options']>(() => {
    this.currentLang();
    return buildChartOptions({
      languageService: this.languageService,
      chartType: this.chartType,
      getData: () => this.data(),
    });
  });

  // ─── View / display mode ──────────────────────────────────────────────────

  protected setView(view: ChartView): void {
    this.onViewChange(view);
  }

  protected setDisplayMode(mode: DisplayMode): void {
    this.onDisplayModeChange(mode);
  }

  // ─── Toggle handlers ──────────────────────────────────────────────────────

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
    setTimeout(() => this.chart?.update(), 50);
  }

  protected togglePastForecast(): void {
    const newVal = !this.showPastForecast();
    this.showPastForecast.set(newVal);
    this.toggleState.savePastForecastVisibility(this.currentView(), newVal);
    if (newVal && this.displayMode() !== 'incremental') {
      this.setDisplayMode('incremental');
    }
    setTimeout(() => this.chart?.update(), 50);
  }

  // ─── Help modal ───────────────────────────────────────────────────────────

  protected showHelp(): void {
    this.showHelpModal.set(true);
  }

  protected closeHelp(): void {
    this.showHelpModal.set(false);
  }

  // ─── Zoom / fullscreen / controls ─────────────────────────────────────────

  protected resetZoom(): void {
    this.chart?.chart?.resetZoom();
  }

  protected toggleFullscreen(): void {
    const isCurrentlyFake = this.isFullscreen() && !document.fullscreenElement && !(document as any).webkitFullscreenElement;
    const isCurrentlyNative = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);

    if (isCurrentlyNative) {
      // Exit native fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
      return;
    }

    if (isCurrentlyFake) {
      // Exit CSS fake fullscreen
      this.chartWrapperRef?.nativeElement.classList.remove('chart-fake-fullscreen');
      this.isFullscreen.set(false);
      this.isControlsHidden.set(false);
      document.body.style.overflow = '';
      setTimeout(() => this.chart?.update(), 100);
      return;
    }

    // Enter fullscreen — try native first, fall back to CSS fake fullscreen
    if (this.isNativeFullscreenSupported) {
      const el = this.chartWrapperRef?.nativeElement;
      const request: (() => Promise<void>) | undefined =
        el?.requestFullscreen?.bind(el) ??
        (el as any)?.webkitRequestFullscreen?.bind(el) ??
        (el as any)?.mozRequestFullScreen?.bind(el) ??
        (el as any)?.msRequestFullscreen?.bind(el);

      if (request) {
        request().catch((err) => {
          console.error('Failed to enter fullscreen, falling back to CSS mode:', err);
          this.enterFakeFullscreen();
        });
        return;
      }
    }

    // Native API unavailable (e.g. iOS Safari) — use CSS fake fullscreen
    this.enterFakeFullscreen();
  }

  private enterFakeFullscreen(): void {
    this.chartWrapperRef?.nativeElement.classList.add('chart-fake-fullscreen');
    this.isFullscreen.set(true);
    document.body.style.overflow = 'hidden';
    setTimeout(() => this.chart?.update(), 100);
  }

  protected toggleControls(): void {
    this.isControlsHidden.update(v => !v);
    setTimeout(() => this.chart?.update(), 50);
  }

  // Escape key is handled natively by the browser when in fullscreen.
  // This handler also catches fake-fullscreen (CSS overlay mode) on mobile.
  @HostListener('document:keydown.escape')
  protected onEscapeKey(): void {
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      // Native fullscreen — browser handles Escape, but we call exit to sync state
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    } else if (this.isFullscreen()) {
      // CSS fake fullscreen — handle Escape manually
      this.toggleFullscreen();
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.onFullscreenChange);

    // Clean up native fullscreen
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }

    // Clean up CSS fake fullscreen
    if (this.chartWrapperRef?.nativeElement.classList.contains('chart-fake-fullscreen')) {
      this.chartWrapperRef.nativeElement.classList.remove('chart-fake-fullscreen');
      document.body.style.overflow = '';
    }
  }
}
