import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { LucideAngularModule, ChevronLeft, ChevronRight } from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { SeasonService, Season } from '../../services/season.service';

@Component({
  selector: 'app-season-switcher',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './season-switcher.component.html',
  styleUrl: './season-switcher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeasonSwitcherComponent {
  protected readonly seasonService = inject(SeasonService);

  protected readonly ChevronLeftIcon = ChevronLeft;
  protected readonly ChevronRightIcon = ChevronRight;

  /** Season emoji for visual flair */
  protected readonly seasonEmojis: Record<Season, string> = {
    spring: '🌸',
    summer: '☀️',
    autumn: '🍂',
    winter: '❄️',
  };

  protected readonly seasonEmoji = computed(
    () => this.seasonEmojis[this.seasonService.currentSeason()],
  );
  protected readonly seasonNameKey = computed(
    () => `SEASONS.${this.seasonService.currentSeason().toUpperCase()}.NAME`,
  );
  protected readonly seasonTaglineKey = computed(
    () => `SEASONS.${this.seasonService.currentSeason().toUpperCase()}.TAGLINE`,
  );

  protected previousSeason(): void {
    this.seasonService.previousSeason();
  }

  protected nextSeason(): void {
    this.seasonService.nextSeason();
  }

  protected getSeasonEmoji(): string {
    return this.seasonEmoji();
  }
}
