import { describe, expect, it } from 'vitest';
import { Droplets, Flame, Sparkles, TrendingDown, TrendingUp, Zap } from 'lucide-angular';
import {
  getMotivationBadgeKey,
  getMotivationTrackerIcon,
  getMotivationTrackerRoute,
  getMotivationTrendIcon,
} from './motivation-ui.utils';

describe('motivation-ui.utils', () => {
  describe('getMotivationTrackerIcon', () => {
    it('should return Droplets for water, Flame for heating, and Zap for electricity', () => {
      expect(getMotivationTrackerIcon('water')).toBe(Droplets);
      expect(getMotivationTrackerIcon('heating')).toBe(Flame);
      expect(getMotivationTrackerIcon('electricity')).toBe(Zap);
    });
  });

  describe('getMotivationTrendIcon', () => {
    it('should return matching Lucide icons for saving, spike, and stable states', () => {
      expect(getMotivationTrendIcon('saving')).toBe(TrendingDown);
      expect(getMotivationTrendIcon('spike')).toBe(TrendingUp);
      expect(getMotivationTrendIcon('stable')).toBe(Sparkles);
    });
  });

  describe('getMotivationBadgeKey', () => {
    it('should return translation keys for saving, spike, and stable badges', () => {
      expect(getMotivationBadgeKey('saving')).toBe('MOTIVATION.BADGE_SAVING');
      expect(getMotivationBadgeKey('spike')).toBe('MOTIVATION.BADGE_SPIKE');
      expect(getMotivationBadgeKey('stable')).toBe('MOTIVATION.BADGE_STABLE');
    });
  });

  describe('getMotivationTrackerRoute', () => {
    it('should return dashboard tracker routes for water, heating, and electricity', () => {
      expect(getMotivationTrackerRoute('water')).toBe('/dashboard/water');
      expect(getMotivationTrackerRoute('heating')).toBe('/dashboard/heating');
      expect(getMotivationTrackerRoute('electricity')).toBe('/dashboard/electricity');
    });
  });
});
