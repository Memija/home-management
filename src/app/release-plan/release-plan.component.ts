import { Component, signal, computed } from '@angular/core';
import { TranslatePipe } from '../pipes/translate.pipe';
import {
  LucideAngularModule,
  Rocket,
  Maximize2,
  TrendingUp,
  Calendar,
  Sparkles,
  ArrowUpCircle,
  Brain,
  Zap,
  ShieldCheck,
  LucideIconData,
  CloudSun,
  Mic,
  Languages,
  StickyNote,
} from 'lucide-angular';

type FeatureTag = 'new' | 'enhancement' | 'smart';

interface Feature {
  id: number;
  titleKey: string;
  descKey: string;
  icon: LucideIconData;
  tag: FeatureTag;
  colorClass: string;
}

@Component({
  selector: 'app-release-plan',
  standalone: true,
  imports: [TranslatePipe, LucideAngularModule],
  templateUrl: './release-plan.component.html',
  styleUrl: './release-plan.component.scss',
})
export class ReleasePlanComponent {
  // Icons
  readonly RocketIcon = Rocket;
  readonly CalendarIcon = Calendar;
  readonly SparklesIcon = Sparkles;
  readonly EnhancementIcon = ArrowUpCircle;
  readonly SmartIcon = Brain;

  // Upcoming features
  readonly features: Feature[] = [
    // Smart
    {
      id: 3,
      titleKey: 'RELEASE_PLAN.FEATURE_3_TITLE',
      descKey: 'RELEASE_PLAN.FEATURE_3_DESC',
      icon: TrendingUp,
      tag: 'smart',
      colorClass: 'prediction-feature',
    },
    // Quality/Performance
    {
      id: 5,
      titleKey: 'RELEASE_PLAN.FEATURE_5_TITLE',
      descKey: 'RELEASE_PLAN.FEATURE_5_DESC',
      icon: Zap,
      tag: 'enhancement',
      colorClass: 'enhancement-feature',
    },
    // Code Quality
    {
      id: 6,
      titleKey: 'RELEASE_PLAN.FEATURE_6_TITLE',
      descKey: 'RELEASE_PLAN.FEATURE_6_DESC',
      icon: ShieldCheck,
      tag: 'enhancement',
      colorClass: 'enhancement-feature',
    },
    {
      id: 7,
      titleKey: 'RELEASE_PLAN.FEATURE_7_TITLE',
      descKey: 'RELEASE_PLAN.FEATURE_7_DESC',
      icon: TrendingUp,
      tag: 'smart',
      colorClass: 'prediction-feature',
    },
    {
      id: 8,
      titleKey: 'RELEASE_PLAN.FEATURE_8_TITLE',
      descKey: 'RELEASE_PLAN.FEATURE_8_DESC',
      icon: CloudSun,
      tag: 'smart',
      colorClass: 'prediction-feature',
    },
    {
      id: 9,
      titleKey: 'RELEASE_PLAN.FEATURE_9_TITLE',
      descKey: 'RELEASE_PLAN.FEATURE_9_DESC',
      icon: Mic,
      tag: 'new',
      colorClass: 'new-feature',
    },
    {
      id: 10,
      titleKey: 'RELEASE_PLAN.FEATURE_10_TITLE',
      descKey: 'RELEASE_PLAN.FEATURE_10_DESC',
      icon: Languages,
      tag: 'new',
      colorClass: 'new-feature',
    },
    {
      id: 11,
      titleKey: 'RELEASE_PLAN.FEATURE_11_TITLE',
      descKey: 'RELEASE_PLAN.FEATURE_11_DESC',
      icon: StickyNote,
      tag: 'enhancement',
      colorClass: 'enhancement-feature',
    },
  ];

  // Filter state
  readonly activeFilter = signal<FeatureTag | 'all'>('all');

  // Computed filtered features
  readonly filteredFeatures = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'all') {
      return this.features;
    }
    return this.features.filter((f) => f.tag === filter);
  });

  // Tag translation keys
  readonly tagTranslationKeys: Record<FeatureTag, string> = {
    new: 'RELEASE_PLAN.NEW_FEATURE',
    enhancement: 'RELEASE_PLAN.ENHANCEMENT',
    smart: 'RELEASE_PLAN.SMART',
  };

  // Tag icons mapping
  readonly tagIcons: Record<FeatureTag, LucideIconData> = {
    new: this.SparklesIcon,
    enhancement: this.EnhancementIcon,
    smart: this.SmartIcon,
  };

  // Available filters with counts
  readonly filterOptions = computed(() => {
    const counts: Record<FeatureTag | 'all', number> = {
      all: this.features.length,
      new: this.features.filter((f) => f.tag === 'new').length,
      enhancement: this.features.filter((f) => f.tag === 'enhancement').length,
      smart: this.features.filter((f) => f.tag === 'smart').length,
    };
    return counts;
  });

  setFilter(filter: FeatureTag | 'all'): void {
    this.activeFilter.set(filter);
  }

  getTagTranslationKey(tag: FeatureTag): string {
    return this.tagTranslationKeys[tag];
  }

  getTagIcon(tag: FeatureTag): LucideIconData {
    return this.tagIcons[tag];
  }
}
