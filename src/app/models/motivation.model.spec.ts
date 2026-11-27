import { describe, expect, it } from 'vitest';
import {
  LATEST_INTERVAL_BLEND_WEIGHT,
  MIN_RECORDS_FOR_MOTIVATION,
  MOTIVATION_MESSAGE_POOL_SIZE,
  NOTABLE_MOTIVATION_THRESHOLD_PERCENT,
  OVERALL_TREND_BLEND_WEIGHT,
} from './motivation.model';

describe('motivation.model', () => {
  it('should require at least 3 meter readings (2 intervals) to evaluate a trend', () => {
    expect(MIN_RECORDS_FOR_MOTIVATION).toBeGreaterThanOrEqual(3);
  });

  it('should define positive motivation threshold and message pool size', () => {
    expect(NOTABLE_MOTIVATION_THRESHOLD_PERCENT).toBeGreaterThan(0);
    expect(MOTIVATION_MESSAGE_POOL_SIZE).toBeGreaterThan(0);
  });

  it('should ensure hybrid trend blend weights sum to 1.0', () => {
    expect(LATEST_INTERVAL_BLEND_WEIGHT).toBeGreaterThan(0);
    expect(OVERALL_TREND_BLEND_WEIGHT).toBeGreaterThan(0);
    expect(LATEST_INTERVAL_BLEND_WEIGHT + OVERALL_TREND_BLEND_WEIGHT).toBeCloseTo(1.0);
  });
});
