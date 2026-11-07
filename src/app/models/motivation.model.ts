/**
 * Shared types and constants for Consumption Motivation Messages.
 */

export type MotivationTrackerType = 'water' | 'heating' | 'electricity';

export type MotivationTrendState = 'saving' | 'stable' | 'spike';

export interface MotivationInsight {
  /** Which consumption tracker this insight belongs to */
  readonly tracker: MotivationTrackerType;
  /** Classified consumption trend state */
  readonly state: MotivationTrendState;
  /** Rounded percentage difference (always non-negative) */
  readonly changePercent: number;
  /** Daily consumption rate for the most recent reading interval */
  readonly latestDailyRate: number;
  /** Historical baseline daily consumption rate */
  readonly baselineDailyRate: number;
  /** Unit of measurement ('L' or 'kWh') */
  readonly unit: string;
  /** Translation key for the short title / notification heading */
  readonly titleKey: string;
  /** Translation key for the active motivational message */
  readonly messageKey: string;
  /** Interpolation parameters for messageKey ({{percent}}) */
  readonly messageParams: Record<string, string | number>;
  /** Whether the change is large enough to surface in the Notification Bell */
  readonly isNotable: boolean;
  /** YYYY-MM-DD key of the most recent reading */
  readonly latestDateIso: string;
  /** Current 0-based index in the message pool */
  readonly tipIndex: number;
}

/** Minimum number of meter readings required to evaluate a consumption trend (2 intervals) */
export const MIN_RECORDS_FOR_MOTIVATION = 3;

/** Minimum percentage change to surface a saving or spike in the Notification Bell */
export const NOTABLE_MOTIVATION_THRESHOLD_PERCENT = 10;

/** Number of distinct motivational tips available per tracker and trend state */
export const MOTIVATION_MESSAGE_POOL_SIZE = 10;

/** Weight of the latest reading interval vs historical baseline in hybrid trend calculation */
export const LATEST_INTERVAL_BLEND_WEIGHT = 0.6;

/** Weight of the multi-interval overall trend in hybrid trend calculation */
export const OVERALL_TREND_BLEND_WEIGHT = 0.4;
