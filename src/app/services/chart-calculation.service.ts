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

@Injectable({
  providedIn: 'root',
})
export class ChartCalculationService {
  private readonly waterAveragesService = inject(WaterAveragesService);
  private readonly electricityAveragesService = inject(ElectricityAveragesService);

  /**
   * Calculate incremental (delta) data between consecutive readings
   */
  calculateIncrementalData(
    recs: AnyConsumptionRecord[],
    ignoredSpikes?: { date: string; roomId: string }[],
  ): CombinedData[] {
    // Defensive filter against invalid dates
    const validRecs = recs.filter((r) => r?.date && !Number.isNaN(new Date(r.date).getTime()));
    if (validRecs.length <= 1) return [];

    const incrementalData: CombinedData[] = [];
    for (let i = 1; i < validRecs.length; i++) {
      incrementalData.push(
        this.buildIncrementalEntry(validRecs[i], validRecs[i - 1], ignoredSpikes),
      );
    }

    return incrementalData;
  }

  private buildIncrementalEntry(
    current: AnyConsumptionRecord,
    previous: AnyConsumptionRecord,
    ignoredSpikes?: { date: string; roomId: string }[],
  ): CombinedData {
    const incremental: CombinedData = { date: current.date };
    const currentDateStr = new Date(current.date).toISOString().split('T')[0];

    if ('rooms' in current) {
      incremental['rooms'] = this.calculateHeatingRoomDeltas(
        (current as DynamicHeatingRecord).rooms,
        (previous as DynamicHeatingRecord)?.rooms || {},
        currentDateStr,
        ignoredSpikes,
      );
    } else if ('value' in current) {
      const prevVal =
        'value' in (previous as object) ? (previous as unknown as ElectricityRecord).value : 0;
      incremental['value'] = this.calculateElectricityDelta(
        (current as unknown as ElectricityRecord).value,
        prevVal,
      );
    } else {
      this.populateWaterDeltas(
        incremental,
        current as unknown as Record<string, unknown>,
        (previous as unknown as Record<string, unknown>) || {},
      );
    }

    return incremental;
  }

  private calculateHeatingRoomDeltas(
    currRooms: Record<string, number>,
    prevRooms: Record<string, number>,
    currentDateStr: string,
    ignoredSpikes?: { date: string; roomId: string }[],
  ): Record<string, number> {
    const incRooms: Record<string, number> = {};

    Object.keys(currRooms).forEach((roomId) => {
      const isSpike = ignoredSpikes?.some((s) => s.date === currentDateStr && s.roomId === roomId);

      if (isSpike) {
        incRooms[roomId] = 0;
        return;
      }

      const currVal = currRooms[roomId] || 0;
      const prevVal = prevRooms[roomId] || 0;

      incRooms[roomId] = currVal < prevVal ? currVal : currVal - prevVal;
    });

    return incRooms;
  }

  private calculateElectricityDelta(currVal: number, prevVal: number): number {
    return currVal < prevVal ? currVal : currVal - prevVal;
  }

  private populateWaterDeltas(
    incremental: CombinedData,
    currentObj: Record<string, unknown>,
    previousObj: Record<string, unknown>,
  ): void {
    Object.keys(currentObj).forEach((key) => {
      const currVal = currentObj[key];
      const prevVal = previousObj[key] ?? 0;

      if (key !== 'date' && typeof currVal === 'number') {
        incremental[key] = Math.max(0, currVal - (prevVal as number));
      }
    });
  }

  /**
   * Calculate linear regression (least squares method) for trendline
   */
  calculateLinearRegression(dataPoints: number[]): { slope: number; intercept: number } {
    const n = dataPoints.length;
    if (n < 2) return { slope: 0, intercept: dataPoints[0] || 0 };

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += dataPoints[i];
      sumXY += i * dataPoints[i];
      sumX2 += i * i;
    }

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return { slope: 0, intercept: sumY / n };

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  /**
   * Generate trendline data points from regression
   * Values are clamped to minimum of 0 (consumption cannot be negative)
   */
  generateTrendlineData(dataPoints: number[]): number[] {
    const { slope, intercept } = this.calculateLinearRegression(dataPoints);
    return dataPoints.map((_, index) => Math.max(0, Math.round(slope * index + intercept)));
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
      return '#dc3545'; // Red for increasing
    } else if (slope < -1) {
      return '#28a745'; // Green for decreasing
    }
    return '#000000'; // Black for flat
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

    const countryData = this.waterAveragesService.getCountryData(country);
    const averageLitersPerPersonPerDay = countryData.averageLitersPerPersonPerDay;

    // We are now working with Daily Averages, so comparison is simple/direct
    // "processedData" passed here might be the incremental data.
    // If we want to show comparison line on the Daily Average chart,
    // the value should just be the daily average (Liters/Person/Day * FamilySize).

    const dailyTotal = averageLitersPerPersonPerDay * familySize;

    // We still maintain the object structure matching ComparisonData

    return processedData.map((current) => {
      // Direct daily average values
      const comparison: ComparisonData = { date: current.date };

      const kitchenTotal = dailyTotal * 0.15;
      const bathroomTotal = dailyTotal * 0.85;

      comparison.kitchenWarm = Math.round(kitchenTotal * 0.4);
      comparison.kitchenCold = Math.round(kitchenTotal * 0.6);
      comparison.bathroomWarm = Math.round(bathroomTotal * 0.4);
      comparison.bathroomCold = Math.round(bathroomTotal * 0.6);

      return comparison;
    });
  }

  /**
   * Detect potential meter changes (drops in cumulative readings) per field
   * Returns array of date strings where ANY field had a drop
   */
  detectMeterChanges(records: ConsumptionRecord[]): string[] {
    const validRecords = records.filter(
      (r) => Boolean(r?.date) && !Number.isNaN(new Date(r.date).getTime()),
    );
    if (validRecords.length < 2) return [];

    const changesSet = new Set<string>();
    const fields = ['kitchenWarm', 'kitchenCold', 'bathroomWarm', 'bathroomCold'] as const;

    for (let i = 1; i < validRecords.length; i++) {
      const prevRecord = validRecords[i - 1];
      const currRecord = validRecords[i];

      // Check each field for drops
      for (const field of fields) {
        const prevValue = prevRecord[field] as number;
        const currValue = currRecord[field] as number;
        if (currValue < prevValue) {
          changesSet.add(new Date(currRecord.date).toISOString().split('T')[0]);
        }
      }
    }
    return Array.from(changesSet);
  }

  /**
   * Adjust records for confirmed meter changes by applying PER-FIELD offsets
   * Each field (meter) can be changed independently at different times
   *
   * Example: If bathroom warm meter dropped from 116210 to 587 on Nov 9,
   * only the bathroomWarm field gets offset = 116210, other fields unchanged
   */
  adjustForMeterChanges(
    records: ConsumptionRecord[],
    confirmedChangeDates: string[],
  ): ConsumptionRecord[] {
    const validRecords = records.filter(
      (r) => Boolean(r?.date) && !Number.isNaN(new Date(r.date).getTime()),
    );
    if (validRecords.length < 2 || confirmedChangeDates.length === 0) return records;

    const adjustedRecords: ConsumptionRecord[] = [];
    const fields = ['kitchenWarm', 'kitchenCold', 'bathroomWarm', 'bathroomCold'] as const;

    // Track offset for each field independently
    const offsets: Record<string, number> = {
      kitchenWarm: 0,
      kitchenCold: 0,
      bathroomWarm: 0,
      bathroomCold: 0,
    };

    for (let i = 0; i < validRecords.length; i++) {
      const record = validRecords[i];
      const recordDate = new Date(record.date).toISOString().split('T')[0];

      // Check if this is a confirmed meter change point
      if (i > 0 && confirmedChangeDates.includes(recordDate)) {
        const prevRecord = records[i - 1];
        const prevAdjusted = adjustedRecords.at(-1)!;

        // Check each field for a drop and update its offset
        for (const field of fields) {
          const prevRaw = prevRecord[field] as number;
          const currRaw = record[field] as number;

          // If this field dropped, set its offset to the previous ADJUSTED value
          if (currRaw < prevRaw) {
            const prevAdjustedValue = prevAdjusted[field] as number;
            offsets[field] = prevAdjustedValue;
          }
        }
      }

      // Apply per-field offsets
      adjustedRecords.push({
        date: record.date,
        kitchenWarm: record.kitchenWarm + offsets['kitchenWarm'],
        kitchenCold: record.kitchenCold + offsets['kitchenCold'],
        bathroomWarm: record.bathroomWarm + offsets['bathroomWarm'],
        bathroomCold: record.bathroomCold + offsets['bathroomCold'],
      });
    }

    return adjustedRecords;
  }

  /**
   * Detect potential "new room" spikes (jump from 0 to high value)
   * This happens when a room is added mid-season
   * Returns array of { date, roomId, value, averageDelta }
   */
  detectNewRoomSpikes(
    records: DynamicHeatingRecord[],
  ): { date: string; roomId: string; value: number; averageDelta: number }[] {
    const validRecords = records.filter(
      (r) => Boolean(r?.date) && !Number.isNaN(new Date(r.date).getTime()),
    );
    if (validRecords.length < 2) return [];

    const spikes: { date: string; roomId: string; value: number; averageDelta: number }[] = [];

    for (let i = 1; i < validRecords.length; i++) {
      const prevRecord = validRecords[i - 1];
      const currRecord = validRecords[i];

      // Calculate average delta of existing rooms
      let otherDeltasSum = 0;
      let otherDeltasCount = 0;

      Object.keys(currRecord.rooms).forEach((rId) => {
        const pVal = prevRecord.rooms[rId] || 0;
        const cVal = currRecord.rooms[rId] || 0;
        // Consider "existing" if previous value was > 0
        if (pVal > 0) {
          otherDeltasSum += Math.max(0, cVal - pVal);
          otherDeltasCount++;
        }
      });

      const avgOtherDelta = otherDeltasCount > 0 ? otherDeltasSum / otherDeltasCount : 0;

      // Check for spikes
      Object.keys(currRecord.rooms).forEach((rId) => {
        const pVal = prevRecord.rooms[rId] || 0;
        const cVal = currRecord.rooms[rId] || 0;
        const delta = cVal - pVal;

        // Condition:
        // 1. Previous value was 0 (or non-existent)
        // 2. Current value > 0
        // 3. Delta is significantly higher than average of other rooms (e.g., > 10x heuristic) AND absolute value > 50
        //    OR if no other rooms to compare, just check absolute value (e.g. > 100)
        if (pVal === 0 && cVal > 0) {
          // User said "way off the average". Using 5x average as heuristic.
          const isWayOffAverage = otherDeltasCount > 0 ? delta > avgOtherDelta * 5 : delta > 100;

          if (isWayOffAverage && delta > 50) {
            spikes.push({
              date: new Date(currRecord.date).toISOString().split('T')[0],
              roomId: rId,
              value: cVal,
              averageDelta: avgOtherDelta,
            });
          }
        }
      });
    }
    return spikes;
  }

  /**
   * Adjust records for new room spikes by applying offsets
   * This smooths the chart by treating the spike value as the baseline (start)
   */
  adjustForNewRooms(
    records: DynamicHeatingRecord[],
    ignoredSpikes: { date: string; roomId: string }[],
  ): DynamicHeatingRecord[] {
    const validRecords = records.filter(
      (r) => Boolean(r?.date) && !Number.isNaN(new Date(r.date).getTime()),
    );
    if (validRecords.length < 2 || ignoredSpikes.length === 0) return records;

    const adjustedRecords: DynamicHeatingRecord[] = [];
    const roomOffsets: Record<string, number> = {};

    for (let i = 0; i < validRecords.length; i++) {
      const record = validRecords[i];
      const recordDate = new Date(record.date).toISOString().split('T')[0];
      const newRooms: Record<string, number> = {};

      Object.keys(record.rooms).forEach((roomId) => {
        const rawVal = record.rooms[roomId] || 0;

        // Update offset if this is a spike date for this room
        if (i > 0) {
          const isSpike = ignoredSpikes.some((s) => s.date === recordDate && s.roomId === roomId);
          if (isSpike) {
            const spikeVal = rawVal;
            // Add to existing offset (cumulative)
            const currentOffset = roomOffsets[roomId] || 0;
            roomOffsets[roomId] = currentOffset + spikeVal;
          }
        }

        // Apply offset
        let offset = roomOffsets[roomId] || 0;

        // If the raw value is LESS than the offset, it implies a reset occurred (e.g. New Year or meter replacement)
        // treating the previous cumulative offset as invalid.
        if (rawVal < offset) {
          offset = 0;
          roomOffsets[roomId] = 0;
        }

        newRooms[roomId] = Math.max(0, rawVal - offset);
      });

      adjustedRecords.push({
        ...record,
        rooms: newRooms,
      });
    }

    return adjustedRecords;
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

    const countryData = this.electricityAveragesService.getCountryData(country);
    const averageKwhPerPersonPerYear = countryData.averageKwhPerPersonPerYear;

    // Daily average comparison
    // (Avg / 365.25) * FamilySize
    const dailyTotal = (averageKwhPerPersonPerYear / 365.25) * familySize;

    const comparisonVal = Math.round(dailyTotal);

    const result = processedData.map((current) => {
      return {
        date: current.date,
        value: comparisonVal, // Constant daily average
      };
    });

    // Pad with one extra point at the start to match the normalized data length (heuristic for first data point)
    if (result.length > 0) {
      result.unshift({ ...result[0] });
    }

    return result;
  }

  /**
   * Normalize incremental data to DAILY AVERAGE
   * Unified function that handles electricity, water, and heating data types
   * @param incrementalData - The incremental consumption data
   * @param originalData - Original records for date calculations
   * @param type - The type of data: 'electricity' | 'water' | 'heating'
   */
  calculateDailyAverage(
    incrementalData: CombinedData[],
    originalData: AnyConsumptionRecord[],
    type: 'electricity' | 'water' | 'heating',
  ): CombinedData[] {
    if (incrementalData.length === 0) return incrementalData;

    // Deep copy to avoid mutating original - use structuredClone for performance
    const normalized = structuredClone(incrementalData);

    for (let i = 0; i < normalized.length; i++) {
      const endRecord = originalData[i + 1];
      const startRecord = originalData[i];

      if (!endRecord?.date || !startRecord?.date) continue;

      const endDateObj = new Date(endRecord.date);
      const startDateObj = new Date(startRecord.date);

      if (Number.isNaN(endDateObj.getTime()) || Number.isNaN(startDateObj.getTime())) continue;

      const endDate = endDateObj.getTime();
      const startDate = startDateObj.getTime();

      let daysDiff = (endDate - startDate) / (1000 * 3600 * 24);
      if (daysDiff <= 0.5) daysDiff = 1;

      const record = normalized[i] as CombinedData;
      record.normalized = { days: daysDiff };

      // Apply type-specific normalization
      switch (type) {
        case 'electricity':
          this.normalizeElectricityRecord(record, daysDiff);
          break;
        case 'water':
          this.normalizeWaterRecord(record, daysDiff);
          break;
        case 'heating':
          this.normalizeHeatingRecord(record, daysDiff);
          break;
      }
    }

    // Padding logic: prepend first record with updated date
    if (normalized.length > 0 && originalData.length > 0) {
      const paddedRecord = structuredClone(normalized[0]);
      paddedRecord.date = originalData[0].date;
      normalized.unshift(paddedRecord);
    }

    return normalized;
  }

  /**
   * Normalize a single electricity record to daily average
   */
  private normalizeElectricityRecord(
    record: { value?: unknown; normalized?: Record<string, unknown>; [key: string]: unknown },
    daysDiff: number,
  ): void {
    const val = record['value'];
    if (typeof val === 'number') {
      const dailyAvg = val / daysDiff;
      record['value'] = Math.round(dailyAvg);
      record['normalized'] ??= {};
      record['normalized']['raw'] = val;
    }
  }

  /**
   * Normalize a single water record to daily average
   */
  private normalizeWaterRecord(
    record: { normalized?: Record<string, unknown>; [key: string]: unknown },
    daysDiff: number,
  ): void {
    const fields = ['kitchenWarm', 'kitchenCold', 'bathroomWarm', 'bathroomCold'];
    fields.forEach((field) => {
      if (typeof record[field] === 'number') {
        const rawVal = record[field];
        record[field] = Math.round(rawVal / daysDiff);
        record['normalized'] ??= {};
        record['normalized'][field] = rawVal;
      }
    });
  }

  /**
   * Normalize a single heating record to daily average
   */
  private normalizeHeatingRecord(
    record: {
      rooms?: Record<string, unknown>;
      normalized?: Record<string, unknown>;
      [key: string]: unknown;
    },
    daysDiff: number,
  ): void {
    const rooms = record.rooms;
    if (rooms) {
      Object.keys(rooms).forEach((roomId) => {
        const rawVal = rooms[roomId];
        if (typeof rawVal === 'number') {
          rooms[roomId] = Math.round(rawVal / daysDiff);
          record['normalized'] ??= {};
          record['normalized'][roomId] = rawVal;
        }
      });
    }
  }

  private calculateTotal(record: ConsumptionRecord): number {
    return record.kitchenWarm + record.kitchenCold + record.bathroomWarm + record.bathroomCold;
  }
}
