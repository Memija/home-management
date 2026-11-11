import { Injectable, inject, signal } from '@angular/core';
import { PredictionCalculationService } from './prediction-calculation.service';
import { PredictionStatsService } from './prediction-stats.service';
import { applyMeterChangeOffsets, computeIncrementalData } from '../utils/chart-calculation.utils';
import {
  AnyConsumptionRecord,
  ConsumptionRecord,
  DynamicHeatingRecord,
  ElectricityRecord,
  getDateKey,
  parseSafeDate,
} from '../models/records.model';
import { MIN_RECORDS_FOR_PREDICTION, STABLE_THRESHOLD } from '../models/prediction.models';
import {
  LATEST_INTERVAL_BLEND_WEIGHT,
  MIN_RECORDS_FOR_MOTIVATION,
  MOTIVATION_MESSAGE_POOL_SIZE,
  MotivationInsight,
  MotivationTrackerType,
  MotivationTrendState,
  NOTABLE_MOTIVATION_THRESHOLD_PERCENT,
  OVERALL_TREND_BLEND_WEIGHT,
} from '../models/motivation.model';

interface DailyRateEntry {
  readonly rate: number;
  readonly month: number;
}

interface TrendMetrics {
  readonly state: MotivationTrendState;
  readonly changePercent: number;
  readonly latestDailyRate: number;
  readonly baselineDailyRate: number;
}

const MS_PER_DAY = 86_400_000;

const TRACKER_ROTATION_OFFSETS: Record<MotivationTrackerType, number> = {
  water: 0,
  heating: 3,
  electricity: 7,
};

/**
 * Evaluates consumption trends across water, heating, and electricity trackers
 * using a hybrid calculation (latest interval vs historical baseline blended
 * with overall multi-interval trend) and resolves motivational message keys.
 */
@Injectable({
  providedIn: 'root',
})
export class ConsumptionMotivationService {
  private readonly predictionCalculation = inject(PredictionCalculationService);
  private readonly statsService = inject(PredictionStatsService);

  private readonly tipIndices = signal<Record<MotivationTrackerType, number>>({
    water: 0,
    heating: 0,
    electricity: 0,
  });

  private readonly metricsCache = new WeakMap<
    AnyConsumptionRecord[],
    Map<string, TrendMetrics | null>
  >();

  /**
   * Cycles to the next motivational message for the specified tracker.
   * @param tracker - Tracker category whose tip index should advance
   */
  nextTip(tracker: MotivationTrackerType): void {
    this.tipIndices.update((current) => ({
      ...current,
      [tracker]: (current[tracker] + 1) % MOTIVATION_MESSAGE_POOL_SIZE,
    }));
  }

  /**
   * Returns the current 0-based tip index for a tracker.
   * @param tracker - Tracker category
   */
  getTipIndex(tracker: MotivationTrackerType): number {
    return this.tipIndices()[tracker];
  }

  /**
   * Evaluates motivational insight for water consumption records.
   * @param records - Historical water consumption records
   * @param confirmedMeterChanges - Confirmed meter replacement ISO date strings
   * @returns MotivationInsight or null when fewer than 3 valid readings exist
   */
  evaluateWater(
    records: ConsumptionRecord[],
    confirmedMeterChanges: string[] = [],
  ): MotivationInsight | null {
    const sorted = this.normalizeAndSortRecords(records);
    if (sorted.length < MIN_RECORDS_FOR_MOTIVATION) return null;

    const adjusted =
      confirmedMeterChanges.length > 0
        ? applyMeterChangeOffsets(sorted, confirmedMeterChanges)
        : sorted;

    return this.buildInsight('water', adjusted, 'L');
  }

  /**
   * Evaluates motivational insight for heating consumption records.
   * Accounts for summer/off-season zero-heating months automatically.
   * @param records - Historical heating records
   * @param ignoredSpikes - Optional ignored room spike entries
   * @returns MotivationInsight or null when fewer than 3 valid readings exist
   */
  evaluateHeating(
    records: (DynamicHeatingRecord | { date: Date; rooms?: Record<string, number> })[],
    ignoredSpikes?: { date: string; roomId: string }[],
  ): MotivationInsight | null {
    if (!Array.isArray(records)) return null;
    const validHeating = records.filter(
      (r): r is DynamicHeatingRecord =>
        Boolean(r) && 'rooms' in r && Boolean(r.rooms) && typeof r.rooms === 'object',
    );
    const sorted = this.normalizeAndSortRecords(validHeating);
    if (sorted.length < MIN_RECORDS_FOR_MOTIVATION) return null;

    return this.buildInsight('heating', sorted, 'kWh', ignoredSpikes);
  }

  /**
   * Evaluates motivational insight for electricity consumption records.
   * @param records - Historical electricity records
   * @returns MotivationInsight or null when fewer than 3 valid readings exist
   */
  evaluateElectricity(records: ElectricityRecord[]): MotivationInsight | null {
    if (!Array.isArray(records)) return null;
    const validElectricity = records.filter((r) => Boolean(r) && typeof r.value === 'number');
    const sorted = this.normalizeAndSortRecords(validElectricity);
    if (sorted.length < MIN_RECORDS_FOR_MOTIVATION) return null;

    return this.buildInsight('electricity', sorted, 'kWh');
  }

  private normalizeAndSortRecords<T extends { date: Date | string }>(records: T[]): T[] {
    if (!Array.isArray(records) || records.length < MIN_RECORDS_FOR_MOTIVATION) {
      return [];
    }

    // Fast path: check if records already contain valid Date instances in ascending order
    let isAlreadyValidAndSorted = true;
    let prevTime = -Infinity;
    for (const record of records) {
      if (!(record?.date instanceof Date)) {
        isAlreadyValidAndSorted = false;
        break;
      }
      const time = record.date.getTime();
      if (Number.isNaN(time) || time < prevTime) {
        isAlreadyValidAndSorted = false;
        break;
      }
      prevTime = time;
    }

    if (isAlreadyValidAndSorted) {
      return records;
    }

    return records
      .map((record) => ({ ...record, date: parseSafeDate(record.date) }))
      .filter((record) => !Number.isNaN(record.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private buildInsight(
    tracker: MotivationTrackerType,
    sortedRecords: AnyConsumptionRecord[],
    unit: string,
    ignoredSpikes?: { date: string; roomId: string }[],
  ): MotivationInsight | null {
    const tipIndex = this.resolveTipIndex(tracker, sortedRecords.length);
    const cacheKey = `${tracker}:${sortedRecords.length}:${
      ignoredSpikes?.length ? ignoredSpikes.map((s) => `${s.date}:${s.roomId}`).join('|') : ''
    }`;

    let cachedByRecs = this.metricsCache.get(sortedRecords);
    let metrics: TrendMetrics | null | undefined = cachedByRecs?.get(cacheKey);

    if (metrics === undefined) {
      const incrementalData = computeIncrementalData(sortedRecords, ignoredSpikes);
      const ratesWithMonths = this.predictionCalculation.calculateDailyRatesWithMonths(
        sortedRecords,
        incrementalData,
        'total',
      );

      metrics =
        ratesWithMonths.length < 2
          ? null
          : this.computeTrendMetrics(tracker, ratesWithMonths, sortedRecords.length);

      if (!cachedByRecs) {
        cachedByRecs = new Map<string, TrendMetrics | null>();
        this.metricsCache.set(sortedRecords, cachedByRecs);
      }
      cachedByRecs.set(cacheKey, metrics);
    }

    if (!metrics) return null;

    const latestDateIso = getDateKey(sortedRecords.at(-1)!.date);
    const trackerKey = tracker.toUpperCase();
    const stateKey = metrics.state.toUpperCase();

    return {
      tracker,
      state: metrics.state,
      changePercent: metrics.changePercent,
      latestDailyRate: metrics.latestDailyRate,
      baselineDailyRate: metrics.baselineDailyRate,
      unit,
      titleKey: `MOTIVATION.${trackerKey}.${stateKey}_TITLE`,
      messageKey: `MOTIVATION.${trackerKey}.${stateKey}_${tipIndex + 1}`,
      messageParams: {
        percent: metrics.changePercent,
      },
      isNotable:
        metrics.state !== 'stable' && metrics.changePercent >= NOTABLE_MOTIVATION_THRESHOLD_PERCENT,
      latestDateIso,
      tipIndex,
    };
  }

  private computeTrendMetrics(
    tracker: MotivationTrackerType,
    ratesWithMonths: DailyRateEntry[],
    recordCount: number,
  ): TrendMetrics {
    const latest = ratesWithMonths.at(-1)!;
    const offSeasonMonths =
      tracker === 'heating'
        ? this.statsService.detectOffSeasonMonths(ratesWithMonths)
        : new Set<number>();

    if (offSeasonMonths.has(latest.month) && latest.rate === 0) {
      return {
        state: 'stable',
        changePercent: 0,
        latestDailyRate: 0,
        baselineDailyRate: 0,
      };
    }

    const baselineDailyRate = this.calculateBaselineRate(
      ratesWithMonths.slice(0, -1),
      offSeasonMonths,
    );
    const latestDiffPct = this.calculatePercentDiff(latest.rate, baselineDailyRate);
    const effectiveSignedPct = this.blendWithOverallTrend(
      latestDiffPct,
      ratesWithMonths,
      offSeasonMonths,
      recordCount,
    );

    const state = this.classifyState(effectiveSignedPct);
    const roundedAbs = Math.round(Math.abs(effectiveSignedPct));
    const changePercent = state === 'stable' ? roundedAbs : Math.max(1, roundedAbs);

    return {
      state,
      changePercent,
      latestDailyRate: latest.rate,
      baselineDailyRate,
    };
  }

  private calculateBaselineRate(
    previousEntries: DailyRateEntry[],
    offSeasonMonths: Set<number>,
  ): number {
    const activePrevious = previousEntries.filter((entry) => !offSeasonMonths.has(entry.month));
    const pool = activePrevious.length > 0 ? activePrevious : previousEntries;
    return pool.reduce((sum, entry) => sum + entry.rate, 0) / pool.length;
  }

  private calculatePercentDiff(latestRate: number, baselineRate: number): number {
    if (baselineRate === 0) {
      return latestRate > 0 ? 100 : 0;
    }
    return ((latestRate - baselineRate) / baselineRate) * 100;
  }

  private blendWithOverallTrend(
    latestDiffPct: number,
    ratesWithMonths: DailyRateEntry[],
    offSeasonMonths: Set<number>,
    recordCount: number,
  ): number {
    if (recordCount < MIN_RECORDS_FOR_PREDICTION) {
      return latestDiffPct;
    }

    const activeEntries = ratesWithMonths.filter((entry) => !offSeasonMonths.has(entry.month));
    const activeRates = (activeEntries.length >= 2 ? activeEntries : ratesWithMonths).map(
      (entry) => entry.rate,
    );

    const overall = this.statsService.calculateTrend(activeRates);
    let signedOverallPct = 0;
    if (overall.trend === 'falling') {
      signedOverallPct = -overall.trendPercentage;
    } else if (overall.trend === 'rising') {
      signedOverallPct = overall.trendPercentage;
    }

    return (
      latestDiffPct * LATEST_INTERVAL_BLEND_WEIGHT + signedOverallPct * OVERALL_TREND_BLEND_WEIGHT
    );
  }

  private classifyState(signedPercent: number): MotivationTrendState {
    if (signedPercent < -STABLE_THRESHOLD) return 'saving';
    if (signedPercent > STABLE_THRESHOLD) return 'spike';
    return 'stable';
  }

  private resolveTipIndex(tracker: MotivationTrackerType, recordCount: number): number {
    const daySeed = Math.floor(Date.now() / MS_PER_DAY);
    const baseOffset = daySeed + recordCount + TRACKER_ROTATION_OFFSETS[tracker];
    return (
      (((baseOffset + this.tipIndices()[tracker]) % MOTIVATION_MESSAGE_POOL_SIZE) +
        MOTIVATION_MESSAGE_POOL_SIZE) %
      MOTIVATION_MESSAGE_POOL_SIZE
    );
  }
}
