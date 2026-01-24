import { Component, Input, ViewChild, computed, effect, inject, input, signal, OnInit } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, registerables, ChartEvent, LegendItem, LegendElement } from 'chart.js';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { ChartDataService, ChartView, DisplayMode } from '../../services/chart-data.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { LucideAngularModule, BarChart3, DoorOpen, Droplet, Grid3x3, TrendingUp, Activity, Info, HelpCircle, ZoomIn } from 'lucide-angular';
import { HelpModalComponent, HelpStep } from '../help-modal/help-modal.component';
import 'hammerjs';
import zoomPlugin from 'chartjs-plugin-zoom';
import { ConsumptionRecord, DynamicHeatingRecord } from '../../models/records.model';
import { registerChartPlugins } from './chart-plugins';
import { ChartDataPoint, ChartConfig } from './consumption-chart.models';

// Re-export types for consumers
export type { ChartView, DisplayMode } from '../../services/chart-data.service';
export type { ChartDataPoint, ChartConfig } from './consumption-chart.models';

Chart.register(...registerables, zoomPlugin);
registerChartPlugins();

@Component({
  selector: 'app-consumption-chart',
  standalone: true,
  imports: [BaseChartDirective, TranslatePipe, LucideAngularModule, HelpModalComponent],
  templateUrl: './consumption-chart.component.html',
  styleUrl: './consumption-chart.component.scss'
})
export class ConsumptionChartComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  data = input.required<ChartDataPoint[]>();
  currentView = input.required<ChartView>();
  @Input({ required: true }) onViewChange!: (view: ChartView) => void;
  @Input({ required: true }) chartType!: 'water' | 'home' | 'heating';
  displayMode = input<DisplayMode>('total');
  @Input({ required: true }) onDisplayModeChange!: (mode: DisplayMode) => void;
  familySize = input<any>(0);
  country = input<any>('');
  helpTitleKey = input<string>('HOME.CHART_HELP_TITLE');
  helpSteps = input<HelpStep[]>([]);
  roomNames = input<string[]>([]);  // For heating chart: actual room names
  roomIds = input<string[]>([]);    // For heating chart: actual room IDs
  roomColors = input<Array<{ border: string; bg: string }>>([]);  // For heating chart: room-specific colors
  ignoredSpikes = input<{ date: string, roomId: string }[]>([]); // For heating chart: confirmed spikes to ignore in incremental mode

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

  // Trendline visibility toggle - initialized in ngOnInit after chartType is set
  protected showTrendline = signal<boolean>(true);

  // Average comparison visibility toggle - initialized in ngOnInit after chartType is set
  protected showAverageComparison = signal<boolean>(true);

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

  // Helper to generate smart labels - adapts format based on data density and language
  private generateSmartLabels(recs: ChartDataPoint[]): string[] {
    if (recs.length === 0) return [];

    const dates = recs.map(r => new Date(r.date));
    const years = new Set(dates.map(d => d.getFullYear()));
    const spansMultipleYears = years.size > 1;
    const dataPointCount = recs.length;

    // Use language-aware locale
    const lang = this.languageService.currentLang();
    const locale = lang === 'de' ? 'de-DE' : 'en-US';

    // Determine label format based on data density
    // Many data points (>20): show just month (Chart.js will auto-skip duplicates)
    // Medium/Few data points (<=20): show month and day
    return dates.map(date => {
      const year = date.getFullYear().toString().slice(-2);

      if (dataPointCount > 20) {
        // High density: show just month name
        if (spansMultipleYears) {
          return date.toLocaleDateString(locale, { month: 'short' }) + ` '${year}`;
        }
        return date.toLocaleDateString(locale, { month: 'short' });
      } else {
        // Low/medium density: show month and day
        if (spansMultipleYears) {
          return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) + ` '${year}`;
        }
        return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
      }
    });
  }

  protected chartData = computed<ChartConfiguration['data']>(() => {
    // Cast to internal record types for service compatibility
    // This is safe because ChartDataPoint is compatible with ConsumptionRecord/HeatingRecord base structure for date
    const recs = this.data();
    const labels = this.generateSmartLabels(this.data());
    const view = this.currentView();
    const mode = this.displayMode();
    // Reactive to language, country, and toggle changes
    this.currentLang();
    this.showTrendline();
    this.showAverageComparison();

    // Process data based on display mode
    const processedData = mode === 'incremental' ? this.chartDataService.calculateIncrementalData(recs, this.ignoredSpikes()) : recs;

    if (this.chartType === 'water') {
      return this.chartDataService.getWaterChartData({
        records: processedData as ConsumptionRecord[],
        labels,
        view,
        mode,
        showTrendline: this.showTrendline(),
        showAverageComparison: this.showAverageComparison(),
        country: this.country() ?? '',
        familySize: this.familySize() ?? 0
      });
    } else if (this.chartType === 'home') {
      return this.chartDataService.getWaterChartData({
        records: processedData as ConsumptionRecord[],
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
        records: processedData as unknown as DynamicHeatingRecord[],
        labels,
        view,
        mode,
        roomNames: this.roomNames(),
        roomIds: this.roomIds(),
        roomColors: this.roomColors(),
        showTrendline: this.showTrendline(),
        showAverageComparison: this.showAverageComparison(),
        country: this.country() ?? 'DE'
      });
    }
  });

  constructor() {
    effect(() => {
      this.chartData();
      this.chart?.update();
    });
  }

  ngOnInit(): void {
    // Initialize toggle states after chartType input is available
    this.showTrendline.set(this.getStoredTrendlineVisibility());
    this.showAverageComparison.set(this.getStoredAverageComparisonVisibility());
  }

  protected chartOptions = computed<ChartConfiguration['options']>(() => {
    this.currentLang();

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          onClick: (e: ChartEvent, legendItem: LegendItem, legend: LegendElement<any>) => {
            const chart = legend.chart;
            const clickedIndex = legendItem.datasetIndex;

            if (clickedIndex === undefined) return;

            const clickedDataset = chart.data.datasets[clickedIndex];
            const clickedLabel = clickedDataset.label || '';

            // Default toggle behavior for the clicked item
            const isHidden = !chart.isDatasetVisible(clickedIndex);
            chart.setDatasetVisibility(clickedIndex, isHidden);

            // Keywords that identify trendlines and averages
            const trendlineKeywords = ['Trendline', 'Trendlinie'];
            const averageKeywords = ['Average', 'Durchschnitt', 'Landesdurchschnitt', 'Country Average'];
            const suffixKeywords = [...trendlineKeywords, ...averageKeywords];

            // Check if clicked label is a main data line (not a trendline or average)
            const isTrendlineOrAverage = suffixKeywords.some(kw => clickedLabel.includes(kw));

            if (!isTrendlineOrAverage) {
              // Special case for Total view: "Total Weekly Consumption" / "Gesamtverbrauch pro Woche"
              // These have standalone "Trendline" and "Country Average" labels (no shared prefix)
              const totalViewLabels = ['Total Weekly Consumption', 'Gesamtverbrauch pro Woche', 'Gesamtverbrauch'];
              const isTotalView = totalViewLabels.some(lbl => clickedLabel.includes(lbl) || clickedLabel.startsWith(lbl.split(' ')[0]));

              if (isTotalView) {
                // In Total view, hide/show all standalone trendline and average datasets
                chart.data.datasets.forEach((dataset: ChartConfiguration['data']['datasets'][0], index: number) => {
                  if (index === clickedIndex) return;
                  const label = dataset.label || '';
                  // Match standalone "Trendline" or "Country Average" (not prefixed with category)
                  if (trendlineKeywords.includes(label) ||
                    averageKeywords.some(kw => label === kw || label.includes('Country') || label.includes('Landes'))) {
                    chart.setDatasetVisibility(index, isHidden);
                  }
                });
              } else {
                // For other views, extract category from label
                const suffixesToRemove = [' Total', ' Gesamt', ' Warm', ' Kalt', ' Cold'];
                let category = clickedLabel;
                for (const suffix of suffixesToRemove) {
                  if (category.endsWith(suffix)) {
                    category = category.slice(0, -suffix.length);
                    break;
                  }
                }

                // For detailed view labels like "Kitchen Warm", keep the full label as category
                if (clickedLabel.includes(' Warm') || clickedLabel.includes(' Cold') ||
                  clickedLabel.includes(' Kalt')) {
                  category = clickedLabel;
                }

                // Find related trendlines and averages
                chart.data.datasets.forEach((dataset: ChartConfiguration['data']['datasets'][0], index: number) => {
                  if (index === clickedIndex) return;

                  const label = dataset.label || '';
                  const isRelatedTrendlineOrAverage = suffixKeywords.some(kw => label.includes(kw));

                  if (isRelatedTrendlineOrAverage) {
                    // Check if this dataset belongs to the same category
                    if (label.startsWith(category)) {
                      chart.setDatasetVisibility(index, isHidden);
                    }
                  }
                });
              }
            }

            chart.update();
          }
        },
        tooltip: {
          callbacks: {
            // Show full date in tooltip title
            title: (tooltipItems) => {
              if (tooltipItems.length > 0) {
                const item = tooltipItems[0];
                const rawDateStr = this.data()[item.dataIndex].date;
                const date = new Date(rawDateStr);
                const lang = this.languageService.currentLang();
                const locale = lang === 'de' ? 'de-DE' : 'en-US';
                return date.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
              }
              return '';
            },
            label: (context) => {
              const unit = this.chartType === 'heating' ? 'kWh' : 'L';
              return `${context.dataset.label}: ${context.parsed.y} ${unit}`;
            }
          }
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'x',
          },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x',
          }
        },
        summerSun: {
          enabled: this.chartType === 'heating',
          records: this.chartType === 'heating' ? this.data() : []
        },
        newYearMarker: {
          enabled: this.chartType === 'heating',
          records: this.chartType === 'heating' ? this.data() : []
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: this.chartType === 'heating'
              ? this.languageService.translate('CHART.AXIS_KWH')
              : this.languageService.translate('CHART.AXIS_LITERS')
          }
        },
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
    const key = `${this.chartType}_chart_trendline_visible`;
    const stored = this.localStorageService.getPreference(key);
    return stored === null ? true : stored === 'true';
  }

  private saveTrendlineVisibility(visible: boolean): void {
    const key = `${this.chartType}_chart_trendline_visible`;
    this.localStorageService.setPreference(key, visible.toString());
  }

  protected toggleAverageComparison(): void {
    this.showAverageComparison.update(value => !value);
    this.saveAverageComparisonVisibility(this.showAverageComparison());
  }

  private getStoredAverageComparisonVisibility(): boolean {
    const key = this.chartType === 'heating' ? 'heating_chart_average_visible' : 'water_chart_average_visible';
    const stored = this.localStorageService.getPreference(key);
    // Default: true for water, false for heating
    if (stored === null) {
      return this.chartType !== 'heating';
    }
    return stored === 'true';
  }

  private saveAverageComparisonVisibility(visible: boolean): void {
    const key = this.chartType === 'heating' ? 'heating_chart_average_visible' : 'water_chart_average_visible';
    this.localStorageService.setPreference(key, visible.toString());
  }

  protected showHelp() {
    this.showHelpModal.set(true);
  }

  protected closeHelp() {
    this.showHelpModal.set(false);
  }

  protected resetZoom(): void {
    this.chart?.chart?.resetZoom();
  }
}
