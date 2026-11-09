import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { Droplets, Flame, Lightbulb, LucideAngularModule, X, Zap } from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { CountryFactsService } from '../../services/country-facts.service';
import { ElectricityCountryFactsService } from '../../services/electricity-country-facts.service';
import { HeatingFactsService } from '../../services/heating-facts.service';
import { LanguageService } from '../../services/language.service';
import type { CountryBenchmarkRow } from '../benchmarks.component';

export type FactCategory = 'water' | 'electricity' | 'heating';

@Component({
  selector: 'app-country-facts-modal',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './country-facts-modal.component.html',
  styleUrl: './country-facts-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountryFactsModalComponent {
  private readonly countryFactsService = inject(CountryFactsService);
  private readonly electricityFactsService = inject(ElectricityCountryFactsService);
  private readonly heatingFactsService = inject(HeatingFactsService);
  private readonly languageService = inject(LanguageService);

  readonly country = input.required<CountryBenchmarkRow>();
  readonly initialCategory = input<FactCategory>('water');
  readonly closeModal = output<void>();

  readonly XIcon = X;
  readonly DropletsIcon = Droplets;
  readonly ZapIcon = Zap;
  readonly FlameIcon = Flame;
  readonly LightbulbIcon = Lightbulb;

  readonly activeCategory = linkedSignal<
    { readonly code: string; readonly category: FactCategory },
    FactCategory
  >({
    source: () => ({ code: this.country().code, category: this.initialCategory() }),
    computation: (source) => source.category,
  });

  readonly facts = computed<readonly string[]>(() => {
    this.languageService.currentLang?.();
    this.languageService.translationVersion?.();
    const code = this.country().code;
    const category = this.activeCategory();

    if (category === 'electricity') {
      return this.electricityFactsService.getFacts(code);
    }
    if (category === 'heating') {
      return this.heatingFactsService.getFacts(code);
    }
    return this.countryFactsService.getFacts(code);
  });

  selectCategory(category: FactCategory): void {
    this.activeCategory.set(category);
  }

  onClose(): void {
    this.closeModal.emit();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.onClose();
  }
}
