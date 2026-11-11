import { Injectable, inject } from '@angular/core';
import { WaterAveragesService } from './water-averages.service';
import { ElectricityAveragesService } from './electricity-averages.service';
import {
  CombinedData,
  ComparisonData,
  AnyConsumptionRecord,
  ConsumptionRecord,
  DynamicHeatingRecord,
  ElectricityRecord,
} from '../models/records.model';
import {
  computeIncrementalData,
  calculateLinearRegression as computeLinearRegression,
  detectMeterDrops,
  applyMeterChangeOffsets,
  detectHeatingRoomSpikes,
  applyHeatingRoomOffsets,
  normalizeToDailyAverage,
} from '../utils/chart-calculation.utils';

@Injectable({
  providedIn: 'root',
})
export class ChartCalculationService {
  private readonly waterAveragesService = inject(WaterAveragesService);
  private readonly electricityAveragesService = inject(ElectricityAveragesService);
  private readonly incrementalCache = new WeakMap<
    AnyConsumptionRecord[],
    Map<string, CombinedData[]>
  >();
  private readonly meterChangesCache = new WeakMap<
    ConsumptionRecord[],
    Map<string, ConsumptionRecord[]>
  >();
  private readonly meterDropsCache = new WeakMap<ConsumptionRecord[], string[]>();
  private readonly heatingSpikesCache = new WeakMap<
    DynamicHeatingRecord[],
    { date: string; roomId: string; value: number; averageDelta: number }[]
  >();
  private readonly heatingOffsetsCache = new WeakMap<
    DynamicHeatingRecord[],
    Map<string, DynamicHeatingRecord[]>
  >();
  private readonly dailyAverageCache = new WeakMap<
    CombinedData[],
    WeakMap<AnyConsumptionRecord[], Map<string, CombinedData[]>>
  >();
  private readonly waterComparisonCache = new WeakMap<
    ConsumptionRecord[],
    Map<string, ComparisonData[]>
  >();
  private readonly electricityComparisonCache = new WeakMap<
    ElectricityRecord[],
    Map<string, ElectricityRecord[]>
  >();

  /**
   * Calculate incremental (delta) data between consecutive readings
   */
  calculateIncrementalData(
    recs: AnyConsumptionRecord[],
    ignoredSpikes?: { date: string; roomId: string }[],
  ): CombinedData[] {
    if (recs.length <= 1) return [];

    const spikesKey =
      ignoredSpikes && ignoredSpikes.length > 0
        ? ignoredSpikes.map((s) => `${s.date}:${s.roomId}`).join('|')
        : '';
    const cacheKey = `${recs.length}:${spikesKey}`;

    let cachedByRecs = this.incrementalCache.get(recs);
    if (cachedByRecs) {
      const cached = cachedByRecs.get(cacheKey);
      if (cached) return cached;
    }

    const incrementalData = computeIncrementalData(recs, ignoredSpikes);
    if (incrementalData.length === 0) return [];

    if (!cachedByRecs) {
      cachedByRecs = new Map<string, CombinedData[]>();
      this.incrementalCache.set(recs, cachedByRecs);
    }
    cachedByRecs.set(cacheKey, incrementalData);

    return incrementalData;
  }

  /**
   * Calculate linear regression (least squares method) for trendline
   */
  calculateLinearRegression(dataPoints: number[]): { slope: number; intercept: number } {
    return computeLinearRegression(dataPoints);
  }

  /**
   * Generate trendline data points from regression
   * Values are clamped to minimum of 0 (consumption cannot be negative)
   */
  generateTrendlineData(dataPoints: number[]): number[] {
    const { slope, intercept } = this.calculateLinearRegression(dataPoints);
    const result = new Array<number>(dataPoints.length);
    for (let index = 0; index < dataPoints.length; index++) {
      result[index] = Math.max(0, Math.round(slope * index + intercept));
    }
    return result;
  }

  /**
   * Determine trend color based on the slope of the trendline
   * Red = increasing (bad for consumption), Green = decreasing (good), Black = flat
   */
  getTrendColor(trendData: number[]): string {
    if (trendData.length < 2) return '#000000';

    const firstVal = trendData[0] as number;
    const lastVal = trendData.at(-1) as number;
    const slope = lastVal - firstVal;

    if (slope > 1) {
      return '#dc3545';
    } else if (slope < -1) {
      return '#28a745';
    }
    return '#000000';
  }

  /**
   * Generate comparison data based on country averages
   */
  generateComparisonData(
    processedData: ConsumptionRecord[],
    familySize: number,
    country: string,
  ): ComparisonData[] {
    if (processedData.length === 0 || familySize === 0) return [];

    const cacheKey = `${processedData.length}:${familySize}:${country}`;
    let byParams = this.waterComparisonCache.get(processedData);
    if (byParams) {
      const cached = byParams.get(cacheKey);
      if (cached) return cached;
    }

    const countryData = this.waterAveragesService.getCountryData(country);
    const dailyTotal = countryData.averageLitersPerPersonPerDay * familySize;
    const kitchenTotal = dailyTotal * 0.15;
    const bathroomTotal = dailyTotal * 0.85;
    const kitchenWarm = Math.round(kitchenTotal * 0.4);
    const kitchenCold = Math.round(kitchenTotal * 0.6);
    const bathroomWarm = Math.round(bathroomTotal * 0.4);
    const bathroomCold = Math.round(bathroomTotal * 0.6);

    const result = processedData.map((current) => ({
      date: current.date,
      kitchenWarm,
      kitchenCold,
      bathroomWarm,
      bathroomCold,
    }));

    if (!byParams) {
      byParams = new Map<string, ComparisonData[]>();
      this.waterComparisonCache.set(processedData, byParams);
    }
    byParams.set(cacheKey, result);
    return result;
  }

  /**
   * Detect potential meter changes (drops in cumulative readings) per field
   */
  detectMeterChanges(records: ConsumptionRecord[]): string[] {
    if (records.length < 2) return [];
    const cached = this.meterDropsCache.get(records);
    if (cached && records.length > 0) return cached;
    const drops = detectMeterDrops(records);
    this.meterDropsCache.set(records, drops);
    return drops;
  }

  /**
   * Adjust records for confirmed meter changes by applying PER-FIELD offsets
   */
  adjustForMeterChanges(
    records: ConsumptionRecord[],
    confirmedChangeDates: string[],
  ): ConsumptionRecord[] {
    if (confirmedChangeDates.length === 0) return records;
    const cacheKey = `${records.length}:${confirmedChangeDates.join(',')}`;
    let cachedByRecs = this.meterChangesCache.get(records);
    if (cachedByRecs) {
      const cached = cachedByRecs.get(cacheKey);
      if (cached) return cached;
    }
    const adjusted = applyMeterChangeOffsets(records, confirmedChangeDates);
    if (!cachedByRecs) {
      cachedByRecs = new Map<string, ConsumptionRecord[]>();
      this.meterChangesCache.set(records, cachedByRecs);
    }
    cachedByRecs.set(cacheKey, adjusted);
    return adjusted;
  }

  /**
   * Detect potential "new room" spikes (jump from 0 to high value)
   */
  detectNewRoomSpikes(
    records: DynamicHeatingRecord[],
  ): { date: string; roomId: string; value: number; averageDelta: number }[] {
    if (records.length < 2) return [];
    const cached = this.heatingSpikesCache.get(records);
    if (cached) return cached;
    const spikes = detectHeatingRoomSpikes(records);
    this.heatingSpikesCache.set(records, spikes);
    return spikes;
  }

  /**
   * Adjust records for new room spikes by applying offsets
   */
  adjustForNewRooms(
    records: DynamicHeatingRecord[],
    ignoredSpikes: { date: string; roomId: string }[],
  ): DynamicHeatingRecord[] {
    if (ignoredSpikes.length === 0 || records.length < 2) return records;
    const cacheKey = `${records.length}:${ignoredSpikes.map((s) => `${s.date}:${s.roomId}`).join('|')}`;
    let cachedByRecs = this.heatingOffsetsCache.get(records);
    if (cachedByRecs) {
      const cached = cachedByRecs.get(cacheKey);
      if (cached) return cached;
    }
    const adjusted = applyHeatingRoomOffsets(records, ignoredSpikes);
    if (!cachedByRecs) {
      cachedByRecs = new Map<string, DynamicHeatingRecord[]>();
      this.heatingOffsetsCache.set(records, cachedByRecs);
    }
    cachedByRecs.set(cacheKey, adjusted);
    return adjusted;
  }

  /**
   * Generate comparison data based on country electricity averages
   */
  generateElectricityComparisonData(
    processedData: ElectricityRecord[],
    familySize: number,
    country: string,
  ): ElectricityRecord[] {
    if (processedData.length === 0 || familySize === 0) return [];

    const cacheKey = `${processedData.length}:${familySize}:${country}`;
    let byParams = this.electricityComparisonCache.get(processedData);
    if (byParams) {
      const cached = byParams.get(cacheKey);
      if (cached) return cached;
    }

    const countryData = this.electricityAveragesService.getCountryData(country);
    const dailyTotal = (countryData.averageKwhPerPersonPerYear / 365.25) * familySize;
    const comparisonVal = Math.round(dailyTotal);

    const result = new Array<ElectricityRecord>(processedData.length + 1);
    result[0] = {
      date: processedData[0].date,
      value: comparisonVal,
    };
    for (let i = 0; i < processedData.length; i++) {
      result[i + 1] = {
        date: processedData[i].date,
        value: comparisonVal,
      };
    }

    if (!byParams) {
      byParams = new Map<string, ElectricityRecord[]>();
      this.electricityComparisonCache.set(processedData, byParams);
    }
    byParams.set(cacheKey, result);
    return result;
  }

  /**
   * Normalize incremental data to DAILY AVERAGE
   */
  calculateDailyAverage(
    incrementalData: CombinedData[],
    originalData: AnyConsumptionRecord[],
    type: 'electricity' | 'water' | 'heating',
  ): CombinedData[] {
    if (incrementalData.length === 0) return incrementalData;
    const cacheKey = `${type}:${incrementalData.length}:${originalData.length}`;
    let byOriginal = this.dailyAverageCache.get(incrementalData);
    if (byOriginal) {
      const byType = byOriginal.get(originalData);
      const cached = byType?.get(cacheKey);
      if (cached) return cached;
    }
    const normalized = normalizeToDailyAverage(incrementalData, originalData, type);
    if (!byOriginal) {
      byOriginal = new WeakMap<AnyConsumptionRecord[], Map<string, CombinedData[]>>();
      this.dailyAverageCache.set(incrementalData, byOriginal);
    }
    let byType = byOriginal.get(originalData);
    if (!byType) {
      byType = new Map<string, CombinedData[]>();
      byOriginal.set(originalData, byType);
    }
    byType.set(cacheKey, normalized);
    return normalized;
  }
}
