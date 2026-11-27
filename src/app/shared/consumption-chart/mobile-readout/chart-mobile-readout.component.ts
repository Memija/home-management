import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideAngularModule, X } from 'lucide-angular';
import { MobileTooltipReadout } from '../options/chart-tooltip.builder';

@Component({
  selector: 'app-chart-mobile-readout',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './chart-mobile-readout.component.html',
  styleUrl: './chart-mobile-readout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartMobileReadoutComponent {
  readonly readout = input<MobileTooltipReadout | null>(null);
  readonly isScrubbing = input<boolean>(false);
  readonly latestLabel = input<string>('');
  readonly clearLabel = input<string>('');
  readonly clearScrub = output<void>();

  protected readonly ClearIcon = X;

  protected onClear(): void {
    this.clearScrub.emit();
  }
}
