import { describe, it, expect } from 'vitest';
import {
  ALL_SCENERY,
  FEATURE_KEYS,
  FLOATING_BADGES,
  HERO_ROAD_PATH,
  HIGHLIGHT_KEYS,
  HOW_STEPS,
  LEFT_SCENERY,
  PAGE_ROAD_PATH,
  RIGHT_SCENERY,
  STAT_KEYS,
} from './landing.constants';

describe('landing.constants', () => {
  it('should define 4 hero highlight cards with 3 tags each', () => {
    expect(HIGHLIGHT_KEYS).toHaveLength(4);
    for (const item of HIGHLIGHT_KEYS) {
      expect(item.tags).toHaveLength(3);
      expect(item.titleKey).toContain('LANDING.HIGHLIGHTS.');
    }
  });

  it('should define 9 feature cards', () => {
    expect(FEATURE_KEYS).toHaveLength(9);
    expect(FEATURE_KEYS[0].titleKey).toBe('LANDING.FEATURES.WATER_TITLE');
  });

  it('should define 4 stat cards', () => {
    expect(STAT_KEYS).toHaveLength(4);
  });

  it('should combine left and right scenery into ALL_SCENERY', () => {
    expect(LEFT_SCENERY).toHaveLength(10);
    expect(RIGHT_SCENERY).toHaveLength(10);
    expect(ALL_SCENERY).toHaveLength(20);
  });

  it('should define 5 floating badges, 3 how-it-works steps, and road SVG paths', () => {
    expect(FLOATING_BADGES).toHaveLength(5);
    expect(HOW_STEPS).toHaveLength(3);
    expect(HOW_STEPS.map((s) => s.badge)).toEqual(['01', '02', '03']);
    expect(HERO_ROAD_PATH).toContain('M100,0');
    expect(PAGE_ROAD_PATH).toContain('M100,0');
  });
});
