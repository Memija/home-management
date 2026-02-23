import { Component, signal, computed } from '@angular/core';
import { TranslatePipe } from '../pipes/translate.pipe';
import { LucideAngularModule, Rocket, Droplets, Maximize2, TrendingUp, Calendar, Sparkles, Camera, ArrowUpCircle, Lightbulb, LucideIconData } from 'lucide-angular';

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
  styleUrl: './release-plan.component.scss'
})
export class ReleasePlanComponent {
  // Icons
  readonly RocketIcon = Rocket;
  readonly CalendarIcon = Calendar;
  readonly SparklesIcon = Sparkles;
  readonly EnhancementIcon = ArrowUpCircle;
  readonly SmartIcon = Lightbulb;

  // All features - grouped by tag type
  readonly features: Feature[] = [
    // New features
    {
      id: 4,
      titleKey: 'RELEASE_PLAN.FEATURE_4_TITLE',
      descKey: 'RELEASE_PLAN.FEATURE_4_DESC',
      icon: Camera,
      tag: 'new',
      colorClass: 'new-feature'
    },
    // Enhancement
    {
      id: 1,
      titleKey: 'RELEASE_PLAN.FEATURE_1_TITLE',
      descKey: 'RELEASE_PLAN.FEATURE_1_DESC',
      icon: Droplets,
      tag: 'enhancement',
      colorClass: 'enhancement-feature'
    },
    {
      id: 2,
      titleKey: 'RELEASE_PLAN.FEATURE_2_TITLE',
      descKey: 'RELEASE_PLAN.FEATURE_2_DESC',
      icon: Maximize2,
      tag: 'enhancement',
      colorClass: 'enhancement-feature'
    },
    // Smart
    {
      id: 3,
      titleKey: 'RELEASE_PLAN.FEATURE_3_TITLE',
      descKey: 'RELEASE_PLAN.FEATURE_3_DESC',
      icon: TrendingUp,
      tag: 'smart',
      colorClass: 'prediction-feature'
    }
  ];

  // Filter state
  readonly activeFilter = signal<FeatureTag | 'all'>('all');

  // Computed filtered features
  readonly filteredFeatures = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'all') {
      return this.features;
    }
    return this.features.filter(f => f.tag === filter);
  });

  // Tag translation keys
  readonly tagTranslationKeys: Record<FeatureTag, string> = {
    'new': 'RELEASE_PLAN.NEW_FEATURE',
    'enhancement': 'RELEASE_PLAN.ENHANCEMENT',
    'smart': 'RELEASE_PLAN.SMART'
  };

  // Tag icons mapping
  readonly tagIcons: Record<FeatureTag, LucideIconData> = {
    'new': this.SparklesIcon,
    'enhancement': this.EnhancementIcon,
    'smart': this.SmartIcon
  };

  // Available filters with counts
  readonly filterOptions = computed(() => {
    const counts: Record<FeatureTag | 'all', number> = {
      'all': this.features.length,
      'new': this.features.filter(f => f.tag === 'new').length,
      'enhancement': this.features.filter(f => f.tag === 'enhancement').length,
      'smart': this.features.filter(f => f.tag === 'smart').length
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
