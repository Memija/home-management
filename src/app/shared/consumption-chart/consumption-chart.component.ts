import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  OnInit,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { ChartDataService, ChartView, DisplayMode } from '../../services/chart-data.service';
import { LocalStorageService } from '../../services/local-storage.service';
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

  protected readonly dataSignal = signal<ChartDataPoint[]>([]);
  @Input() set data(val: ChartDataPoint[]) {
    this.dataSignal.set(val || []);
  }
  get data(): ChartDataPoint[] {
    return this.dataSignal();
  }

  protected readonly currentViewSignal = signal<ChartView>('total');
  @Input() set currentView(val: ChartView) {
    this.currentViewSignal.set(val || 'total');
  }
  get currentView(): ChartView {
    return this.currentViewSignal();
  }

  @Input({ required: true }) onViewChange!: (view: ChartView) => void;
  @Input({ required: true }) chartType: 'water' | 'home' | 'heating' | 'electricity' = 'water';

  protected readonly displayModeSignal = signal<DisplayMode>('total');
  @Input() set displayMode(val: DisplayMode) {
    this.displayModeSignal.set(val || 'total');
  }
  get displayMode(): DisplayMode {
    return this.displayModeSignal();
  }

  @Input({ required: true }) onDisplayModeChange!: (mode: DisplayMode) => void;

  protected readonly familySizeSignal = signal<number>(0);
  @Input() set familySize(val: number) {
    this.familySizeSignal.set(val || 0);
  }
  get familySize(): number {
    return this.familySizeSignal();
  }

  protected readonly countrySignal = signal<string>('');
  @Input() set country(val: string) {
    this.countrySignal.set(val || '');
  }
  get country(): string {
    return this.countrySignal();
  }

  @Input() helpTitleKey = 'HOME.CHART_HELP_TITLE';
  @Input() helpSteps: HelpStep[] = [];

  protected readonly roomNamesSignal = signal<string[]>([]);
  @Input() set roomNames(val: string[]) {
    this.roomNamesSignal.set(val || []);
  }
  get roomNames(): string[] {
    return this.roomNamesSignal();
  }

  protected readonly roomIdsSignal = signal<string[]>([]);
  @Input() set roomIds(val: string[]) {
    this.roomIdsSignal.set(val || []);
  }
  get roomIds(): string[] {
    return this.roomIdsSignal();
  }

  protected readonly roomColorsSignal = signal<{ border: string; bg: string }[]>([]);
  @Input() set roomColors(val: { border: string; bg: string }[]) {
    this.roomColorsSignal.set(val || []);
  }
  get roomColors(): { border: string; bg: string }[] {
    return this.roomColorsSignal();
  }

  protected readonly ignoredSpikesSignal = signal<{ date: string; roomId: string }[]>([]);
  @Input() set ignoredSpikes(val: { date: string; roomId: string }[]) {
    this.ignoredSpikesSignal.set(val || []);
  }
  get ignoredSpikes(): { date: string; roomId: string }[] {
    return this.ignoredSpikesSignal();
  }

  protected readonly predictionSignal = signal<MultiPredictionResult | null>(null);
  @Input() set prediction(val: MultiPredictionResult | null) {
    this.predictionSignal.set(val);
  }
  get prediction(): MultiPredictionResult | null {
    return this.predictionSignal();
  }

  protected readonly predictionPeriodSignal = signal<PredictionPeriod>(30);
  @Input() set predictionPeriod(val: PredictionPeriod) {
    this.predictionPeriodSignal.set(val || 30);
  }
  get predictionPeriod(): PredictionPeriod {
    return this.predictionPeriodSignal();
  }

  private readonly languageService = inject(LanguageService);
  private readonly chartDataService = inject(ChartDataService);
  private readonly localStorageService = inject(LocalStorageService);

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
    const dataLength = this.dataSignal().length;
    const mode = this.displayModeSignal();
    return mode === 'incremental' ? dataLength >= 3 : dataLength >= 2;
  });

  protected hasSufficientDataForComparison = computed(() => this.dataSignal().length >= 3);

  protected currentLang = computed(() => this.languageService.currentLang());

  protected chartData = computed<ChartConfiguration['data']>(() => {
    this.currentLang();
    return buildConsumptionChartData({
      chartDataService: this.chartDataService,
      languageService: this.languageService,
      chartType: this.chartType,
      records: this.dataSignal(),
      view: this.currentViewSignal(),
      mode: this.displayModeSignal(),
      ignoredSpikes: this.ignoredSpikesSignal(),
      showTrendline: this.showTrendline(),
      showAverageComparison: this.showAverageComparison(),
      country: this.countrySignal(),
      familySize: this.familySizeSignal(),
      roomNames: this.roomNamesSignal(),
      roomIds: this.roomIdsSignal(),
      roomColors: this.roomColorsSignal(),
      prediction: this.predictionSignal(),
      predictionPeriod: this.predictionPeriodSignal(),
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
      const view = this.currentViewSignal();
      if (this.toggleState) {
        this.showPredictions.set(this.toggleState.getPredictionsVisibility(view));
        this.showPastForecast.set(this.toggleState.getPastForecastVisibility(view));
      }
    });
  }

  ngOnInit(): void {
    this.toggleState = new ChartToggleState(this.localStorageService, this.chartType);
    this.showTrendline.set(this.toggleState.getTrendlineVisibility());
    this.showAverageComparison.set(this.toggleState.getAverageComparisonVisibility());
    this.showPredictions.set(this.toggleState.getPredictionsVisibility(this.currentViewSignal()));
    this.showPastForecast.set(this.toggleState.getPastForecastVisibility(this.currentViewSignal()));
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.onFullscreenChange);
  }

  protected chartOptions = computed<ChartConfiguration['options']>(() => {
    this.currentLang();
    return buildChartOptions({
      languageService: this.languageService,
      chartType: this.chartType,
      getData: () => this.dataSignal(),
    });
  });

  protected setView(view: ChartView): void {
    this.onViewChange(view);
  }

  protected setDisplayMode(mode: DisplayMode): void {
    this.onDisplayModeChange(mode);
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
    this.toggleState.savePredictionsVisibility(this.currentViewSignal(), newVal);
    if (newVal && this.displayModeSignal() !== 'incremental') {
      this.setDisplayMode('incremental');
    }
    setTimeout(() => this.chart?.update(), 50);
  }

  protected togglePastForecast(): void {
    const newVal = !this.showPastForecast();
    this.showPastForecast.set(newVal);
    this.toggleState.savePastForecastVisibility(this.currentViewSignal(), newVal);
    if (newVal && this.displayModeSignal() !== 'incremental') {
      this.setDisplayMode('incremental');
    }
    setTimeout(() => this.chart?.update(), 50);
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

  @HostListener('document:keydown.escape')
  protected onEscapeKey(): void {
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
