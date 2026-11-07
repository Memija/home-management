import {
  Droplets,
  Flame,
  Zap,
  TrendingDown,
  TrendingUp,
  Sparkles,
  LucideIconData,
} from 'lucide-angular';
import { MotivationTrackerType, MotivationTrendState } from '../models/motivation.model';

/**
 * Returns the Lucide icon corresponding to a consumption tracker category.
 */
export function getMotivationTrackerIcon(tracker: MotivationTrackerType): LucideIconData {
  switch (tracker) {
    case 'water':
      return Droplets;
    case 'heating':
      return Flame;
    case 'electricity':
      return Zap;
  }
}

/**
 * Returns the Lucide icon corresponding to a motivational trend state.
 */
export function getMotivationTrendIcon(state: MotivationTrendState): LucideIconData {
  switch (state) {
    case 'saving':
      return TrendingDown;
    case 'spike':
      return TrendingUp;
    case 'stable':
      return Sparkles;
  }
}

/**
 * Returns the translation key for a motivational trend badge.
 */
export function getMotivationBadgeKey(state: MotivationTrendState): string {
  switch (state) {
    case 'saving':
      return 'MOTIVATION.BADGE_SAVING';
    case 'spike':
      return 'MOTIVATION.BADGE_SPIKE';
    case 'stable':
      return 'MOTIVATION.BADGE_STABLE';
  }
}

/**
 * Returns the dashboard route path for a consumption tracker.
 */
export function getMotivationTrackerRoute(tracker: MotivationTrackerType): string {
  return `/dashboard/${tracker}`;
}
