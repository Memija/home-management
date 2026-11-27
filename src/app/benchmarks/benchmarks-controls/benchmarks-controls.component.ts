import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideAngularModule, Search, Users } from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { HouseholdSizeParams } from '../benchmarks.types';

@Component({
  selector: 'app-benchmarks-controls',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './benchmarks-controls.component.html',
  styleUrl: './benchmarks-controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenchmarksControlsComponent {
  readonly householdSizes = input.required<readonly number[]>();
  readonly householdSize = input.required<number>();
  readonly householdSizeParams = input.required<HouseholdSizeParams>();
  readonly isBrowser = input.required<boolean>();
  readonly searchQuery = input.required<string>();

  readonly sizeChange = output<number>();
  readonly searchChange = output<string>();

  readonly UsersIcon = Users;
  readonly SearchIcon = Search;

  onSearchInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement | null;
    this.searchChange.emit(inputEl?.value ?? '');
  }
}
