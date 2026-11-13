import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  BookOpen,
  Droplets,
  Flame,
  Globe,
  Lightbulb,
  LucideAngularModule,
  Zap,
} from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { BenchmarksSortHeaderComponent } from '../benchmarks-sort-header/benchmarks-sort-header.component';
import {
  BenchmarkSortColumn,
  BenchmarkSortDirection,
  CountryBenchmarkRow,
  getBenchmarkAriaSort,
} from '../benchmarks.types';

@Component({
  selector: 'app-benchmarks-table',
  standalone: true,
  imports: [BenchmarksSortHeaderComponent, LucideAngularModule, TranslatePipe],
  templateUrl: './benchmarks-table.component.html',
  styleUrl: './benchmarks-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenchmarksTableComponent {
  readonly rows = input.required<readonly CountryBenchmarkRow[]>();
  readonly sortColumn = input.required<BenchmarkSortColumn>();
  readonly sortDirection = input.required<BenchmarkSortDirection>();

  readonly sortChange = output<BenchmarkSortColumn>();
  readonly countrySelected = output<CountryBenchmarkRow>();

  readonly GlobeIcon = Globe;
  readonly DropletsIcon = Droplets;
  readonly ZapIcon = Zap;
  readonly FlameIcon = Flame;
  readonly BookOpenIcon = BookOpen;
  readonly LightbulbIcon = Lightbulb;

  getAriaSort(column: BenchmarkSortColumn): 'ascending' | 'descending' | 'none' {
    return getBenchmarkAriaSort(this.sortColumn(), this.sortDirection(), column);
  }
}
