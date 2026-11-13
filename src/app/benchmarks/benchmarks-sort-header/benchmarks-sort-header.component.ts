import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Info,
  LucideAngularModule,
  type LucideIconData,
} from 'lucide-angular';
import { BenchmarkSortColumn, BenchmarkSortDirection } from '../benchmarks.types';

@Component({
  selector: 'app-benchmarks-sort-header',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './benchmarks-sort-header.component.html',
  styleUrl: './benchmarks-sort-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenchmarksSortHeaderComponent {
  readonly column = input.required<BenchmarkSortColumn>();
  readonly label = input.required<string>();
  readonly icon = input.required<LucideIconData>();
  readonly activeColumn = input.required<BenchmarkSortColumn>();
  readonly direction = input.required<BenchmarkSortDirection>();
  readonly tooltip = input<string>('');

  readonly sortSelected = output<BenchmarkSortColumn>();

  readonly InfoIcon = Info;

  readonly isActive = computed<boolean>(() => this.activeColumn() === this.column());

  readonly sortIcon = computed<LucideIconData>(() => {
    if (!this.isActive()) return ArrowUpDown;
    return this.direction() === 'asc' ? ArrowUp : ArrowDown;
  });
}
