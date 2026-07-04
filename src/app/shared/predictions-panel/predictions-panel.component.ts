import { Component, input, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import {
  LucideAngularModule,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Calendar,
  Activity,
  ShieldCheck,
  Target,
  RefreshCcw,
  Info,
} from 'lucide-angular';
import { MultiPredictionResult, PredictionResult } from '../../services/prediction.service';

@Component({
  selector: 'app-predictions-panel',
  standalone: true,
  imports: [TranslatePipe, LucideAngularModule, CommonModule],
  templateUrl: './predictions-panel.component.html',
  styleUrl: './predictions-panel.component.scss',
})
export class PredictionsPanelComponent {
  /** The prediction result, or null if not enough data */
  prediction = input<MultiPredictionResult | null>(null);

  protected totalPrediction = computed(() => this.prediction()?.total || null);
  /** Optional mapping of category keys to translation keys or display names */
  categoryNames = input<Record<string, string>>({});

  protected categoryPredictions = computed(() => {
    const cats = this.prediction()?.categories;
    if (!cats) return [];

    const names = this.categoryNames();
    return Object.entries(cats).map(([key, value]) => ({
      key: names[key] || key,
      value
    }));
  });

  /** Currently selected prediction period (30, 90, 180, 365, 3650 days) */
  selectedPeriod = input<30 | 90 | 180 | 365 | 3650>(30);

  /** Emits when the user selects a different period */
  periodChange = output<30 | 90 | 180 | 365 | 3650>();

  /** Select a prediction period */
  protected selectPeriod(period: 30 | 90 | 180 | 365 | 3650): void {
    this.periodChange.emit(period);
  }

  /** The consumption type — determines accent color and unit labels */
  type = input<'water' | 'electricity' | 'heating'>('water');

  /** Minimum records needed (used for empty state message) */
  minRecords = input<number>(4);

  // Icons
  protected readonly TrendingUpIcon = TrendingUp;
  protected readonly TrendingDownIcon = TrendingDown;
  protected readonly MinusIcon = Minus;
  protected readonly BrainIcon = Brain;
  protected readonly CalendarIcon = Calendar;
  protected readonly ActivityIcon = Activity;
  protected readonly ShieldCheckIcon = ShieldCheck;
  protected readonly TargetIcon = Target;
  protected readonly RefreshCcwIcon = RefreshCcw;
  protected readonly InfoIcon = Info;

  /** Get the trend icon based on prediction trend */
  protected trendIcon = computed(() => {
    const pred = this.totalPrediction();
    if (!pred) return this.MinusIcon;
    switch (pred.trend) {
      case 'rising':
        return this.TrendingUpIcon;
      case 'falling':
        return this.TrendingDownIcon;
      default:
        return this.MinusIcon;
    }
  });

  /** CSS class for the trend indicator */
  protected trendClass = computed(() => {
    const pred = this.totalPrediction();
    if (!pred) return 'stable';
    return pred.trend;
  });

  /** CSS class for the confidence badge */
  protected confidenceClass = computed(() => {
    const pred = this.totalPrediction();
    if (!pred) return 'low';
    return pred.confidence;
  });

  /** Get CSS class based on accuracy level */
  protected accuracyClass = computed(() => {
    const acc = this.totalPrediction()?.accuracyPercentage;
    if (!acc) return '';
    if (acc >= 85) return 'accuracy-high';
    if (acc >= 70) return 'accuracy-medium';
    return 'accuracy-low';
  });

  /** Accent color CSS class based on tracker type */
  protected typeClass = computed(() => this.type());
}
