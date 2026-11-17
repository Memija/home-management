import { describe, expect, it } from 'vitest';
import {
  HEATING_OFF_SEASON_THRESHOLD,
  MIN_RECORDS_FOR_PREDICTION,
  STABLE_THRESHOLD,
} from './prediction.models';

describe('prediction.models', () => {
  it('should define valid prediction configuration thresholds', () => {
    expect(MIN_RECORDS_FOR_PREDICTION).toBeGreaterThanOrEqual(3);
    expect(STABLE_THRESHOLD).toBeGreaterThan(0);
    expect(HEATING_OFF_SEASON_THRESHOLD).toBeGreaterThan(0);
    expect(HEATING_OFF_SEASON_THRESHOLD).toBeLessThan(1);
  });
});
