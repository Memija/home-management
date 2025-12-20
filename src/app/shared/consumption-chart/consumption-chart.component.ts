import { Component, Input, computed, inject, input } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { WaterAveragesService } from '../../services/water-averages.service';
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
  familySize = input<number>(0);
  country = input<string>('');

  private languageService = inject(LanguageService);
  private waterAveragesService = inject(WaterAveragesService);

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
    // Reactive to language and country changes
    this.currentLang();
    const currentCountry = this.country();
    const currentFamilySize = this.familySize();

    // Process data based on display mode
    const processedData = mode === 'incremental' ? this.calculateIncrementalData(recs) : recs;

    if (this.chartType === 'water') {
      return this.getWaterChartData(processedData, labels, view, mode, currentCountry, currentFamilySize);
    } else if (this.chartType === 'home') {
      return this.getHomeChartData(processedData, labels, view, mode);
    } else {
      return this.getHeatingChartData(processedData, labels, view, mode);
    }
  });

  private generateComparisonData(processedData: any[], familySize: number, country: string): any[] {
    // Generate realistic comparison using country-specific average
    if (processedData.length === 0 || familySize === 0) return [];

    const countryData = this.waterAveragesService.getCountryData(country);
    const averageLitersPerPersonPerDay = countryData.averageLitersPerPersonPerDay;

    return processedData.map((current, index) => {
      const comparison: any = { date: current.date };

      // Calculate days between measurements
      let daysBetween;
      if (index === 0) {
        // For first point, use days to next measurement
        if (processedData.length > 1) {
          const next = processedData[1];
          daysBetween = Math.round(
            (new Date(next.date).getTime() - new Date(current.date).getTime()) / (1000 * 60 * 60 * 24)
          );
        } else {
          daysBetween = 7; // Default to 7 days if only one data point
        }
      } else {
        const previous = processedData[index - 1];
        daysBetween = Math.round(
          (new Date(current.date).getTime() - new Date(previous.date).getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      // Calculate expected total consumption (constant average - no variance)
      const totalConsumption = averageLitersPerPersonPerDay * familySize * daysBetween;

      // Distribute proportionally across rooms based on official statistics
      // Normalized for kitchen+bathroom only: Kitchen 15%, Bathroom 85%
      // Within each: Warm 40%, Cold 60% (estimated)
      const kitchenTotal = totalConsumption * 0.15;
      const bathroomTotal = totalConsumption * 0.85;

      comparison['kitchenWarm'] = Math.round(kitchenTotal * 0.4);
      comparison['kitchenCold'] = Math.round(kitchenTotal * 0.6);
      comparison['bathroomWarm'] = Math.round(bathroomTotal * 0.4);
      comparison['bathroomCold'] = Math.round(bathroomTotal * 0.6);

      return comparison;
    });
  }

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

  private getWaterChartData(recs: any[], labels: string[], view: ChartView, mode: DisplayMode, country: string, familySize: number): ChartConfiguration['data'] {
    // Adjust labels for incremental mode (skip first measurement)
    const chartLabels = mode === 'incremental' ? labels.slice(1) : labels;
    const showComparison = familySize > 0 && mode === 'incremental';
    const comparisonData = showComparison ? this.generateComparisonData(recs, familySize, country) : [];

    switch (view) {
      case 'total':
        const datasets: any[] = [{
          label: showComparison ? this.languageService.translate('CHART.YOUR_FAMILY') :
            mode === 'incremental' ? this.languageService.translate('CHART.INCREMENTAL_CONSUMPTION') :
              this.languageService.translate('CHART.TOTAL_WEEKLY_CONSUMPTION'),
          data: recs.map(r => (r['kitchenWarm'] as number) + (r['kitchenCold'] as number) + (r['bathroomWarm'] as number) + (r['bathroomCold'] as number)),
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
          fill: true,
          tension: 0.4
        }];

        if (showComparison) {
          datasets.push({
            label: this.languageService.translate('CHART.AVERAGE_FAMILY'),
            data: comparisonData.map(r => (r['kitchenWarm'] as number) + (r['kitchenCold'] as number) + (r['bathroomWarm'] as number) + (r['bathroomCold'] as number)),
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.05)',
            fill: false,
            tension: 0,
            borderDash: [5, 5],
            pointRadius: 0
          });
        }

        return {
          labels: chartLabels,
          datasets
        };
      case 'by-room':
        const byRoomDatasets: any[] = [
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
        ];

        if (showComparison) {
          // Kitchen average in liters (using comparison data)
          byRoomDatasets.push({
            label: this.languageService.translate('CHART.KITCHEN_AVG'),
            data: comparisonData.map(r => (r['kitchenWarm'] as number) + (r['kitchenCold'] as number)),
            borderColor: '#28a745',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0,
            borderDash: [5, 5],
            pointRadius: 0
          });
          // Bathroom average in liters (using comparison data)
          byRoomDatasets.push({
            label: this.languageService.translate('CHART.BATHROOM_AVG'),
            data: comparisonData.map(r => (r['bathroomWarm'] as number) + (r['bathroomCold'] as number)),
            borderColor: '#17a2b8',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0,
            borderDash: [5, 5],
            pointRadius: 0
          });
        }

        return {
          labels: chartLabels,
          datasets: byRoomDatasets
        };
      case 'by-type':
        const byTypeDatasets: any[] = [
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
        ];

        if (showComparison) {
          // Warm water average in liters (using comparison data)
          byTypeDatasets.push({
            label: this.languageService.translate('CHART.WARM_AVG'),
            data: comparisonData.map(r => (r['kitchenWarm'] as number) + (r['bathroomWarm'] as number)),
            borderColor: '#dc3545',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0,
            borderDash: [5, 5],
            pointRadius: 0
          });
          // Cold water average in liters (using comparison data)
          byTypeDatasets.push({
            label: this.languageService.translate('CHART.COLD_AVG'),
            data: comparisonData.map(r => (r['kitchenCold'] as number) + (r['bathroomCold'] as number)),
            borderColor: '#6c757d',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0,
            borderDash: [5, 5],
            pointRadius: 0
          });
        }

        return {
          labels: chartLabels,
          datasets: byTypeDatasets
        };
      case 'detailed':
        const detailedDatasets: any[] = [
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
        ];

        if (showComparison) {
          // Kitchen Warm average in liters (using comparison data)
          detailedDatasets.push({
            label: this.languageService.translate('CHART.KITCHEN_WARM_AVG'),
            data: comparisonData.map(r => r['kitchenWarm'] as number),
            borderColor: '#ff6384',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0,
            borderDash: [5, 5],
            pointRadius: 0
          });
          // Kitchen Cold average in liters (using comparison data)
          detailedDatasets.push({
            label: this.languageService.translate('CHART.KITCHEN_COLD_AVG'),
            data: comparisonData.map(r => r['kitchenCold'] as number),
            borderColor: '#36a2eb',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0,
            borderDash: [5, 5],
            pointRadius: 0
          });
          // Bathroom Warm average in liters (using comparison data)
          detailedDatasets.push({
            label: this.languageService.translate('CHART.BATHROOM_WARM_AVG'),
            data: comparisonData.map(r => r['bathroomWarm'] as number),
            borderColor: '#ffcd56',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0,
            borderDash: [5, 5],
            pointRadius: 0
          });
          // Bathroom Cold average in liters (using comparison data)
          detailedDatasets.push({
            label: this.languageService.translate('CHART.BATHROOM_COLD_AVG'),
            data: comparisonData.map(r => r['bathroomCold'] as number),
            borderColor: '#4bc0c0',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0,
            borderDash: [5, 5],
            pointRadius: 0
          });
        }

        return {
          labels: chartLabels,
          datasets: detailedDatasets
        };
    }
  }

  private getHomeChartData(recs: any[], labels: string[], view: ChartView, mode: DisplayMode): ChartConfiguration['data'] {
    // Home component uses same structure as water but without comparison (pass empty values)
    return this.getWaterChartData(recs, labels, view, mode, '', 0);
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
