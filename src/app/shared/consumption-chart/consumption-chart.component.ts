import { Component, Input, computed, inject, input } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { LucideAngularModule, BarChart3, DoorOpen, Droplet, Grid3x3, TrendingUp } from 'lucide-angular';

Chart.register(...registerables);

export type ChartView = 'total' | 'by-room' | 'by-type' | 'detailed';
export type DisplayMode = 'total' | 'incremental';

export type ChartDataPoint = Record<string, number | Date> & { date: Date };

export interface ChartConfig {
  view: ChartView;
  onViewChange: (view: ChartView) => void;
}

@Component({
  selector: 'app-consumption-chart',
  standalone: true,
  imports: [BaseChartDirective, TranslatePipe, LucideAngularModule],
  templateUrl: './consumption-chart.component.html',
  styleUrl: './consumption-chart.component.scss'
})
export class ConsumptionChartComponent {
  @Input({ required: true }) data!: any[];
  currentView = input.required<ChartView>();
  @Input({ required: true }) onViewChange!: (view: ChartView) => void;
  @Input({ required: true }) chartType!: 'water' | 'home' | 'heating';
  displayMode = input<DisplayMode>('total');
  @Input({ required: true }) onDisplayModeChange!: (mode: DisplayMode) => void;

  private languageService = inject(LanguageService);

  protected readonly BarChart3Icon = BarChart3;
  protected readonly DoorOpenIcon = DoorOpen;
  protected readonly DropletIcon = Droplet;
  protected readonly Grid3x3Icon = Grid3x3;
  protected readonly TrendingUpIcon = TrendingUp;

  protected currentLang = computed(() => this.languageService.currentLang());

  protected chartData = computed<ChartConfiguration['data']>(() => {
    const recs = this.data;
    const labels = recs.map(r => new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const view = this.currentView();
    const mode = this.displayMode();
    // Reactive to language changes
    this.currentLang();

    // Process data based on display mode
    const processedData = mode === 'incremental' ? this.calculateIncrementalData(recs) : recs;

    if (this.chartType === 'water') {
      return this.getWaterChartData(processedData, labels, view, mode);
    } else if (this.chartType === 'home') {
      return this.getHomeChartData(processedData, labels, view, mode);
    } else {
      return this.getHeatingChartData(processedData, labels, view, mode);
    }
  });

  protected chartOptions = computed<ChartConfiguration['options']>(() => {
    // Reactive to language changes
    const lang = this.currentLang();
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
        x: { title: { display: true, text: this.languageService.translate('CHART.AXIS_DATE') } }
      }
    };
  });

  private calculateIncrementalData(recs: any[]): any[] {
    if (recs.length <= 1) return recs;

    const incrementalData: any[] = [];
    for (let i = 1; i < recs.length; i++) {
      const current = recs[i];
      const previous = recs[i - 1];
      const incremental: any = { date: current.date };

      // Calculate differences for all numeric fields
      Object.keys(current).forEach(key => {
        if (key !== 'date' && typeof current[key] === 'number') {
          incremental[key] = Math.max(0, (current[key] as number) - (previous[key] as number));
        }
      });

      incrementalData.push(incremental);
    }

    return incrementalData;
  }

  private getWaterChartData(recs: any[], labels: string[], view: ChartView, mode: DisplayMode): ChartConfiguration['data'] {
    // Adjust labels for incremental mode (skip first measurement)
    const chartLabels = mode === 'incremental' ? labels.slice(1) : labels;
    const chartTitle = mode === 'incremental'
      ? this.languageService.translate('CHART.INCREMENTAL_CONSUMPTION')
      : this.languageService.translate('CHART.TOTAL_WEEKLY_CONSUMPTION');
    switch (view) {
      case 'total':
        return {
          labels: chartLabels,
          datasets: [{
            label: chartTitle,
            data: recs.map(r => (r['kitchenWarm'] as number) + (r['kitchenCold'] as number) + (r['bathroomWarm'] as number) + (r['bathroomCold'] as number)),
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            fill: true,
            tension: 0.4
          }]
        };
      case 'by-room':
        return {
          labels: chartLabels,
          datasets: [
            {
              label: this.languageService.translate('CHART.KITCHEN_TOTAL'),
              data: recs.map(r => (r['kitchenWarm'] as number) + (r['kitchenCold'] as number)),
              borderColor: '#28a745',
              backgroundColor: 'rgba(40, 167, 69, 0.1)',
              fill: true,
              tension: 0.4
            },
            {
              label: this.languageService.translate('CHART.BATHROOM_TOTAL'),
              data: recs.map(r => (r['bathroomWarm'] as number) + (r['bathroomCold'] as number)),
              borderColor: '#17a2b8',
              backgroundColor: 'rgba(23, 162, 184, 0.1)',
              fill: true,
              tension: 0.4
            }
          ]
        };
      case 'by-type':
        return {
          labels: chartLabels,
          datasets: [
            {
              label: this.languageService.translate('CHART.WARM_WATER_TOTAL'),
              data: recs.map(r => (r['kitchenWarm'] as number) + (r['bathroomWarm'] as number)),
              borderColor: '#dc3545',
              backgroundColor: 'rgba(220, 53, 69, 0.1)',
              fill: true,
              tension: 0.4
            },
            {
              label: this.languageService.translate('CHART.COLD_WATER_TOTAL'),
              data: recs.map(r => (r['kitchenCold'] as number) + (r['bathroomCold'] as number)),
              borderColor: '#6c757d',
              backgroundColor: 'rgba(108, 117, 125, 0.1)',
              fill: true,
              tension: 0.4
            }
          ]
        };
      case 'detailed':
        return {
          labels: chartLabels,
          datasets: [
            {
              label: this.languageService.translate('CHART.KITCHEN_WARM'),
              data: recs.map(r => r['kitchenWarm'] as number),
              borderColor: '#ff6384',
              backgroundColor: 'rgba(255, 99, 132, 0.1)',
              fill: false,
              tension: 0.4
            },
            {
              label: this.languageService.translate('CHART.KITCHEN_COLD'),
              data: recs.map(r => r['kitchenCold'] as number),
              borderColor: '#36a2eb',
              backgroundColor: 'rgba(54, 162, 235, 0.1)',
              fill: false,
              tension: 0.4
            },
            {
              label: this.languageService.translate('CHART.BATHROOM_WARM'),
              data: recs.map(r => r['bathroomWarm'] as number),
              borderColor: '#ffcd56',
              backgroundColor: 'rgba(255, 205, 86, 0.1)',
              fill: false,
              tension: 0.4
            },
            {
              label: this.languageService.translate('CHART.BATHROOM_COLD'),
              data: recs.map(r => r['bathroomCold'] as number),
              borderColor: '#4bc0c0',
              backgroundColor: 'rgba(75, 192, 192, 0.1)',
              fill: false,
              tension: 0.4
            }
          ]
        };
    }
  }

  private getHomeChartData(recs: any[], labels: string[], view: ChartView, mode: DisplayMode): ChartConfiguration['data'] {
    // Home component uses same structure as water
    return this.getWaterChartData(recs, labels, view, mode);
  }

  private getHeatingChartData(recs: any[], labels: string[], view: ChartView, mode: DisplayMode): ChartConfiguration['data'] {
    // Adjust labels for incremental mode (skip first measurement)
    const chartLabels = mode === 'incremental' ? labels.slice(1) : labels;
    const chartTitle = mode === 'incremental'
      ? this.languageService.translate('CHART.INCREMENTAL_CONSUMPTION')
      : this.languageService.translate('CHART.TOTAL_WEEKLY_CONSUMPTION');
    switch (view) {
      case 'total':
        return {
          labels: chartLabels,
          datasets: [{
            label: chartTitle,
            data: recs.map(r => (r['livingRoom'] as number) + (r['bedroom'] as number) + (r['kitchen'] as number) + (r['bathroom'] as number)),
            borderColor: '#ff6f00',
            backgroundColor: 'rgba(255, 111, 0, 0.1)',
            fill: true,
            tension: 0.4
          }]
        };
      case 'by-room':
        return {
          labels: chartLabels,
          datasets: [
            {
              label: this.languageService.translate('CHART.LIVING_ROOM'),
              data: recs.map(r => r['livingRoom'] as number),
              borderColor: '#e91e63',
              backgroundColor: 'rgba(233, 30, 99, 0.1)',
              fill: true,
              tension: 0.4
            },
            {
              label: this.languageService.translate('CHART.BEDROOM'),
              data: recs.map(r => r['bedroom'] as number),
              borderColor: '#9c27b0',
              backgroundColor: 'rgba(156, 39, 176, 0.1)',
              fill: true,
              tension: 0.4
            },
            {
              label: this.languageService.translate('CHART.KITCHEN'),
              data: recs.map(r => r['kitchen'] as number),
              borderColor: '#28a745',
              backgroundColor: 'rgba(40, 167, 69, 0.1)',
              fill: true,
              tension: 0.4
            },
            {
              label: this.languageService.translate('CHART.BATHROOM'),
              data: recs.map(r => r['bathroom'] as number),
              borderColor: '#ffa726',
              backgroundColor: 'rgba(255, 167, 38, 0.1)',
              fill: true,
              tension: 0.4
            }
          ]
        };
      case 'by-type':
      case 'detailed':
        // For heating, by-type and detailed views are the same as by-room
        return this.getHeatingChartData(recs, labels, 'by-room', mode);
    }
  }

  protected setView(view: ChartView): void {
    this.onViewChange(view);
  }

  protected setDisplayMode(mode: DisplayMode): void {
    this.onDisplayModeChange(mode);
  }
}
