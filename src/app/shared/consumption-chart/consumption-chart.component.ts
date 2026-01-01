import { Component, Input, ViewChild, computed, effect, inject, input, signal } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { ChartDataService, ChartView, DisplayMode } from '../../services/chart-data.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { LucideAngularModule, BarChart3, DoorOpen, Droplet, Grid3x3, TrendingUp, Activity, Info, HelpCircle } from 'lucide-angular';
import { HelpModalComponent, HelpStep } from '../help-modal/help-modal.component';

Chart.register(...registerables);

// Re-export types for consumers
export type { ChartView, DisplayMode } from '../../services/chart-data.service';

export type ChartDataPoint = Record<string, number | Date> & { date: Date };

export interface ChartConfig {
  view: ChartView;
  onViewChange: (view: ChartView) => void;
}

@Component({
  selector: 'app-consumption-chart',
  standalone: true,
  imports: [BaseChartDirective, TranslatePipe, LucideAngularModule, HelpModalComponent],
  templateUrl: './consumption-chart.component.html',
  styleUrl: './consumption-chart.component.scss'
})
export class ConsumptionChartComponent {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  data = input.required<any[]>();
  currentView = input.required<ChartView>();
  @Input({ required: true }) onViewChange!: (view: ChartView) => void;
  @Input({ required: true }) chartType!: 'water' | 'home' | 'heating';
  displayMode = input<DisplayMode>('total');
  @Input({ required: true }) onDisplayModeChange!: (mode: DisplayMode) => void;
  familySize = input<number>(0);
  country = input<string>('');
  helpTitleKey = input<string>('HOME.CHART_HELP_TITLE');
  helpSteps = input<HelpStep[]>([]);

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

  // Trendline visibility toggle (only for water charts)
  protected showTrendline = signal<boolean>(this.getStoredTrendlineVisibility());

  // Average comparison visibility toggle (only for water charts)
  protected showAverageComparison = signal<boolean>(this.getStoredAverageComparisonVisibility());

  // Help modal state
  protected showHelpModal = signal(false);

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

  // Helper to generate smart labels - includes year when data spans multiple years
  private generateSmartLabels(recs: any[]): string[] {
    if (recs.length === 0) return [];

    const dates = recs.map(r => new Date(r.date));
    const years = new Set(dates.map(d => d.getFullYear()));
    const spansMultipleYears = years.size > 1;

    return dates.map(date => {
      if (spansMultipleYears) {
        // Include abbreviated year for multi-year data: "Feb 3 '17"
        const year = date.getFullYear().toString().slice(-2);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` '${year}`;
      } else {
        // Just month and day for single-year data
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    });
  }

  protected chartData = computed<ChartConfiguration['data']>(() => {
    const recs = this.data();
    const labels = this.generateSmartLabels(recs);
    const view = this.currentView();
    const mode = this.displayMode();
    // Reactive to language, country, and toggle changes
    this.currentLang();
    this.showTrendline();
    this.showAverageComparison();

    // Process data based on display mode
    const processedData = mode === 'incremental' ? this.chartDataService.calculateIncrementalData(recs) : recs;

    if (this.chartType === 'water') {
      return this.chartDataService.getWaterChartData({
        records: processedData,
        labels,
        view,
        mode,
        showTrendline: this.showTrendline(),
        showAverageComparison: this.showAverageComparison(),
        country: this.country(),
        familySize: this.familySize()
      });
    } else if (this.chartType === 'home') {
      return this.chartDataService.getWaterChartData({
        records: processedData,
        labels,
        view,
        mode,
        showTrendline: false,
        showAverageComparison: false,
        country: '',
        familySize: 0
      });
    } else {
      return this.chartDataService.getHeatingChartData({
        records: processedData,
        labels,
        view,
        mode
      });
    }
  });

  constructor() {
    effect(() => {
      this.chartData();
      this.chart?.update();
    });
  }

  protected chartOptions = computed<ChartConfiguration['options']>(() => {
    this.currentLang();

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top' },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${context.parsed.y} L`
          }
        }
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: this.languageService.translate('CHART.AXIS_LITERS') } },
        x: {
          title: { display: true, text: this.languageService.translate('CHART.AXIS_DATE') },
          ticks: {
            maxRotation: 45,
            minRotation: 0
          }
        }
      }
    };
  });

  protected setView(view: ChartView): void {
    this.onViewChange(view);
  }

  protected setDisplayMode(mode: DisplayMode): void {
    this.onDisplayModeChange(mode);
  }

  protected toggleTrendline(): void {
    this.showTrendline.update(value => !value);
    this.saveTrendlineVisibility(this.showTrendline());
  }

  private getStoredTrendlineVisibility(): boolean {
    const stored = this.localStorageService.getPreference('water_chart_trendline_visible');
    return stored === null ? true : stored === 'true';
  }

  private saveTrendlineVisibility(visible: boolean): void {
    this.localStorageService.setPreference('water_chart_trendline_visible', visible.toString());
  }

  protected toggleAverageComparison(): void {
    this.showAverageComparison.update(value => !value);
    this.saveAverageComparisonVisibility(this.showAverageComparison());
  }

  private getStoredAverageComparisonVisibility(): boolean {
    const stored = this.localStorageService.getPreference('water_chart_average_visible');
    return stored === null ? true : stored === 'true';
  }

  private saveAverageComparisonVisibility(visible: boolean): void {
    this.localStorageService.setPreference('water_chart_average_visible', visible.toString());
  }

  protected showHelp() {
    this.showHelpModal.set(true);
  }

  protected closeHelp() {
    this.showHelpModal.set(false);
  }
}
