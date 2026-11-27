import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
  untracked,
  ViewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import {
  CircleQuestionMark,
  LucideAngularModule,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
} from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { ChartDataService, ChartView, DisplayMode } from '../../services/chart-data.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { ThemeService } from '../../services/theme.service';
import { HelpModalComponent, HelpStep } from '../help-modal/help-modal.component';
import { ChartControlsComponent } from './controls/chart-controls.component';
import { ChartMobileReadoutComponent } from './mobile-readout/chart-mobile-readout.component';
import { ChartDataPoint } from '../../models/consumption-chart.model';
import { MultiPredictionResult } from '../../models/prediction.models';
import { buildChartOptions, buildCompactLabelFormatter } from './options/chart-options.builder';
import { buildDefaultMobileReadout, MobileTooltipReadout } from './options/chart-tooltip.builder';
import { buildConsumptionChartData } from './options/chart-data.builder';
import { ChartToggleState } from './utils/chart-toggle.state';
import { PredictionPeriod } from './predictions/chart-prediction.builder';
import {
  ChartGranularity,
  ChartTimeRange,
  prepareWindowedRecords,
  resolveDefaultTimeRange,
} from './utils/chart-series-window.utils';
import {
  cleanupChartFullscreen,
  exitDocumentFullscreen,
  isDocumentFullscreen,
  toggleChartFullscreen,
} from './utils/chart-fullscreen.utils';
import {
  clearChartActiveElements,
  ensureChartPluginsRegistered,
  ensureZoomPluginLoaded,
} from './utils/chart-registration.utils';
import {
  computeActiveChartOverlays,
  hasSufficientTrendlinePoints,
} from './utils/chart-overlays.utils';

export type { ChartView, DisplayMode } from '../../services/chart-data.service';
export type { ChartDataPoint } from '../../models/consumption-chart.model';
export type { FullscreenElement, FullscreenDocument } from './utils/chart-fullscreen.utils';
export type { ChartTimeRange, ChartGranularity } from './utils/chart-series-window.utils';

const orEmptyArray = <T>(val: T[] | null | undefined): T[] => val || [];

@Component({
  selector: 'app-consumption-chart',
  standalone: true,
  imports: [
    BaseChartDirective,
    TranslatePipe,
    LucideAngularModule,
    HelpModalComponent,
    ChartControlsComponent,
    ChartMobileReadoutComponent,
  ],
  templateUrl: './consumption-chart.component.html',
  styleUrl: './consumption-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsumptionChartComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  @ViewChild('chartWrapper') chartWrapperRef?: ElementRef<HTMLDivElement>;

  readonly data = input<ChartDataPoint[], ChartDataPoint[] | null | undefined>([], {
    transform: orEmptyArray,
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
    transform: orEmptyArray,
  });
  readonly roomIds = input<string[], string[] | null | undefined>([], { transform: orEmptyArray });
  readonly roomColors = input<
    { border: string; bg: string }[],
    { border: string; bg: string }[] | null | undefined
  >([], { transform: orEmptyArray });
  readonly ignoredSpikes = input<
    { date: string; roomId: string }[],
    { date: string; roomId: string }[] | null | undefined
  >([], { transform: orEmptyArray });
  readonly prediction = input<MultiPredictionResult | null>(null);
  readonly predictionPeriod = input<PredictionPeriod, PredictionPeriod | null | undefined>(30, {
    transform: (val) => val || 30,
  });

  private readonly languageService = inject(LanguageService);
  private readonly chartDataService = inject(ChartDataService);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly themeService = inject(ThemeService, { optional: true });
  private readonly document = inject(DOCUMENT, { optional: true });

  protected readonly HelpIcon = CircleQuestionMark;
  protected readonly Maximize2Icon = Maximize2;
  protected readonly Minimize2Icon = Minimize2;
  protected readonly SlidersHorizontalIcon = SlidersHorizontal;

  protected readonly isFullscreen = signal<boolean>(false);
  protected readonly isControlsHidden = signal<boolean>(false);
  protected readonly isMobileOverlaysOpen = signal<boolean>(false);
  protected readonly activeMobileReadout = signal<MobileTooltipReadout | null>(null);
  private readonly userTimeRange = signal<ChartTimeRange | null>(null);
  protected readonly granularity = signal<ChartGranularity>('raw');
  protected readonly showTrendline = signal<boolean>(true);
  protected readonly showAverageComparison = signal<boolean>(true);
  protected readonly showPredictions = signal<boolean>(true);
  protected readonly showPastForecast = signal<boolean>(false);
  protected readonly showHelpModal = signal(false);

  private toggleState!: ChartToggleState;

  private readonly onFullscreenChange = () => {
    const isFS = isDocumentFullscreen();
    this.isFullscreen.set(isFS);
    if (!isFS) this.isControlsHidden.set(false);
    setTimeout(() => this.chart?.update(), 100);
  };

  protected readonly hasSufficientDataForTrendline = computed(() =>
    hasSufficientTrendlinePoints(this.data().length, this.displayMode()),
  );
  protected readonly hasSufficientDataForComparison = computed(() => this.data().length >= 3);
  protected readonly showGranularityToggle = computed(() => this.data().length > 6);

  protected readonly timeRange = computed<ChartTimeRange>(() => {
    const explicit = this.userTimeRange();
    if (explicit !== null) return explicit;
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    return resolveDefaultTimeRange(this.data().length, isMobile);
  });

  protected readonly windowedData = computed<ChartDataPoint[]>(() =>
    prepareWindowedRecords(
      this.data(),
      this.timeRange(),
      this.granularity(),
      this.displayMode() === 'incremental',
    ),
  );

  protected readonly activeOverlayCount = computed(() =>
    computeActiveChartOverlays({
      chartType: this.chartType(),
      mode: this.displayMode(),
      dataLength: this.data().length,
      familySize: this.familySize(),
      showTrendline: this.showTrendline(),
      showAverageComparison: this.showAverageComparison(),
      hasPrediction: Boolean(this.prediction()),
      showPredictions: this.showPredictions(),
      showPastForecast: this.showPastForecast(),
    }),
  );

  protected readonly currentLang = computed(() => {
    this.languageService.translationVersion?.();
    return this.languageService.currentLang();
  });

  protected readonly chartData = computed<ChartConfiguration['data']>(() => {
    this.currentLang();
    return buildConsumptionChartData({
      chartDataService: this.chartDataService,
      languageService: this.languageService,
      chartType: this.chartType(),
      records: this.windowedData(),
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

  protected readonly defaultMobileReadout = computed<MobileTooltipReadout | null>(() => {
    this.currentLang();
    return buildDefaultMobileReadout(
      this.windowedData(),
      this.chartData(),
      this.languageService,
      this.chartType(),
      buildCompactLabelFormatter(this.languageService),
    );
  });

  protected readonly displayedMobileReadout = computed<MobileTooltipReadout | null>(
    () => this.activeMobileReadout() ?? this.defaultMobileReadout(),
  );

  protected readonly chartOptions = computed<ChartConfiguration['options']>(() => {
    this.currentLang();
    return buildChartOptions({
      languageService: this.languageService,
      chartType: this.chartType(),
      getData: () => this.windowedData(),
      onMobileTooltip: (readout) => this.activeMobileReadout.set(readout),
    });
  });

  constructor() {
    ensureChartPluginsRegistered();

    effect(() => {
      this.themeService?.resolvedTheme();
      untracked(() => {
        if (this.data().length > 0) this.chart?.update();
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
        if (event.key === 'Escape') this.onEscapeKey();
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
    this.userTimeRange.set(this.toggleState.getStoredTimeRange());
    this.granularity.set(this.toggleState.getGranularity());
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.onFullscreenChange);
    ensureZoomPluginLoaded(() => this.chart?.update('none'));
  }

  protected clearMobileScrub(): void {
    this.activeMobileReadout.set(null);
    clearChartActiveElements(this.chart);
  }

  protected setTimeRange(range: ChartTimeRange): void {
    this.activeMobileReadout.set(null);
    this.userTimeRange.set(range);
    this.toggleState?.saveTimeRange(range);
    this.resetZoom();
  }

  protected setGranularity(granularity: ChartGranularity): void {
    this.activeMobileReadout.set(null);
    this.granularity.set(granularity);
    this.toggleState?.saveGranularity(granularity);
    this.resetZoom();
  }

  protected toggleMobileOverlays(): void {
    this.isMobileOverlaysOpen.update((open) => !open);
  }

  protected setView(view: ChartView): void {
    this.activeMobileReadout.set(null);
    this.onViewChange()(view);
  }

  protected setDisplayMode(mode: DisplayMode): void {
    this.activeMobileReadout.set(null);
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
    if (newVal && this.displayMode() !== 'incremental') this.setDisplayMode('incremental');
  }

  protected togglePastForecast(): void {
    const newVal = !this.showPastForecast();
    this.showPastForecast.set(newVal);
    this.toggleState.savePastForecastVisibility(this.currentView(), newVal);
    if (newVal && this.displayMode() !== 'incremental') this.setDisplayMode('incremental');
  }

  protected showHelp(): void {
    this.showHelpModal.set(true);
  }

  protected closeHelp(): void {
    this.showHelpModal.set(false);
  }

  protected resetZoom(): void {
    if (typeof this.chart?.chart?.resetZoom === 'function') {
      this.chart.chart.resetZoom();
    }
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
