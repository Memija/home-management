import {
  AnyConsumptionRecord,
  CombinedData,
  ConsumptionRecord,
  DynamicHeatingRecord,
  ElectricityRecord,
  getIsoDateKey,
  parseSafeDate,
} from '../models/records.model';

const WATER_FIELDS = ['kitchenWarm', 'kitchenCold', 'bathroomWarm', 'bathroomCold'] as const;

/**
 * Calculate incremental (delta) data between consecutive readings.
 */
export function computeIncrementalData(
  recs: AnyConsumptionRecord[],
  ignoredSpikes?: { date: string; roomId: string }[],
): CombinedData[] {
  const validRecs = filterValidDateRecords(recs);
  if (validRecs.length <= 1) return [];

  const spikeSet =
    ignoredSpikes && ignoredSpikes.length > 0
      ? new Set(ignoredSpikes.map((s) => `${s.date}:${s.roomId}`))
      : undefined;

  const incrementalData: CombinedData[] = new Array(validRecs.length - 1);
  for (let i = 1; i < validRecs.length; i++) {
    incrementalData[i - 1] = buildIncrementalEntry(validRecs[i], validRecs[i - 1], spikeSet);
  }
  return incrementalData;
}

function buildIncrementalEntry(
  current: AnyConsumptionRecord,
  previous: AnyConsumptionRecord,
  spikeSet?: Set<string>,
): CombinedData {
  const incremental: CombinedData = { date: current.date };

  if ('rooms' in current) {
    const currentDateStr = spikeSet ? getIsoDateKey(current.date) : '';
    incremental['rooms'] = calculateHeatingRoomDeltas(
      (current as DynamicHeatingRecord).rooms,
      (previous as DynamicHeatingRecord)?.rooms || {},
      currentDateStr,
      spikeSet,
    );
  } else if ('value' in current) {
    const prevVal =
      'value' in (previous as object) ? (previous as unknown as ElectricityRecord).value : 0;
    const currVal = (current as unknown as ElectricityRecord).value;
    incremental['value'] = currVal < prevVal ? currVal : currVal - prevVal;
  } else {
    populateWaterDeltas(
      incremental,
      current as unknown as Record<string, unknown>,
      (previous as unknown as Record<string, unknown>) || {},
    );
  }

  return incremental;
}

function calculateHeatingRoomDeltas(
  currRooms: Record<string, number>,
  prevRooms: Record<string, number>,
  currentDateStr: string,
  spikeSet?: Set<string>,
): Record<string, number> {
  const incRooms: Record<string, number> = {};

  for (const roomId in currRooms) {
    if (!Object.hasOwn(currRooms, roomId)) continue;
    if (spikeSet?.has(`${currentDateStr}:${roomId}`)) {
      incRooms[roomId] = 0;
      continue;
    }

    const currVal = currRooms[roomId] || 0;
    const prevVal = prevRooms[roomId] || 0;
    incRooms[roomId] = currVal < prevVal ? currVal : currVal - prevVal;
  }

  return incRooms;
}

function populateWaterDeltas(
  incremental: CombinedData,
  currentObj: Record<string, unknown>,
  previousObj: Record<string, unknown>,
): void {
  for (const key in currentObj) {
    if (!Object.hasOwn(currentObj, key) || key === 'date') continue;
    const currVal = currentObj[key];
    const prevVal = previousObj[key] ?? 0;

    if (typeof currVal === 'number') {
      incremental[key] = Math.max(0, currVal - (prevVal as number));
    }
  }
}

/**
 * Calculate linear regression (least squares method) for trendlines and predictions.
 */
export function calculateLinearRegression(dataPoints: number[]): {
  slope: number;
  intercept: number;
} {
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
 * Filter consumption records with valid dates
 */
export function filterValidDateRecords<T extends { date: Date }>(records: T[]): T[] {
  const isValid = (r: T): boolean =>
    Boolean(r?.date) && !Number.isNaN(parseSafeDate(r.date).getTime());
  return records.every(isValid) ? records : records.filter(isValid);
}

/**
 * Detect potential meter changes (drops in cumulative readings) per field.
 * Returns array of date strings where ANY field had a drop.
 */
export function detectMeterDrops(records: ConsumptionRecord[]): string[] {
  const validRecords = filterValidDateRecords(records);
  if (validRecords.length < 2) return [];

  const changesSet = new Set<string>();

  for (let i = 1; i < validRecords.length; i++) {
    const prevRecord = validRecords[i - 1];
    const currRecord = validRecords[i];

    for (const field of WATER_FIELDS) {
      if (currRecord[field] < prevRecord[field]) {
        changesSet.add(getIsoDateKey(currRecord.date));
        break;
      }
    }
  }
  return Array.from(changesSet);
}

/**
 * Adjust records for confirmed meter changes by applying PER-FIELD offsets.
 */
export function applyMeterChangeOffsets(
  records: ConsumptionRecord[],
  confirmedChangeDates: string[],
): ConsumptionRecord[] {
  const validRecords = filterValidDateRecords(records);
  if (validRecords.length < 2 || confirmedChangeDates.length === 0) return records;

  const confirmedDatesSet = new Set(confirmedChangeDates);
  const adjustedRecords: ConsumptionRecord[] = [];
  const offsets: Record<string, number> = {
    kitchenWarm: 0,
    kitchenCold: 0,
    bathroomWarm: 0,
    bathroomCold: 0,
  };

  for (let i = 0; i < validRecords.length; i++) {
    const record = validRecords[i];

    if (i > 0 && confirmedDatesSet.has(getIsoDateKey(record.date))) {
      const prevRecord = validRecords[i - 1];
      const prevAdjusted = adjustedRecords.at(-1)!;

      for (const field of WATER_FIELDS) {
        if (record[field] < prevRecord[field]) {
          offsets[field] = prevAdjusted[field];
        }
      }
    }

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
 * Detect potential "new room" spikes (jump from 0 to high value).
 */
export function detectHeatingRoomSpikes(
  records: DynamicHeatingRecord[],
): { date: string; roomId: string; value: number; averageDelta: number }[] {
  const validRecords = filterValidDateRecords(records);
  if (validRecords.length < 2) return [];

  const spikes: { date: string; roomId: string; value: number; averageDelta: number }[] = [];

  for (let i = 1; i < validRecords.length; i++) {
    const prevRecord = validRecords[i - 1];
    const currRecord = validRecords[i];
    const roomIds = Object.keys(currRecord.rooms);

    let otherDeltasSum = 0;
    let otherDeltasCount = 0;

    for (const rId of roomIds) {
      const pVal = prevRecord.rooms[rId] || 0;
      const cVal = currRecord.rooms[rId] || 0;
      if (pVal > 0) {
        otherDeltasSum += Math.max(0, cVal - pVal);
        otherDeltasCount++;
      }
    }

    const avgOtherDelta = otherDeltasCount > 0 ? otherDeltasSum / otherDeltasCount : 0;
    let currRecordDateStr: string | null = null;

    for (const rId of roomIds) {
      const pVal = prevRecord.rooms[rId] || 0;
      const cVal = currRecord.rooms[rId] || 0;
      const delta = cVal - pVal;

      if (pVal === 0 && cVal > 0) {
        const isWayOffAverage = otherDeltasCount > 0 ? delta > avgOtherDelta * 5 : delta > 100;

        if (isWayOffAverage && delta > 50) {
          currRecordDateStr ??= getIsoDateKey(currRecord.date);
          spikes.push({
            date: currRecordDateStr,
            roomId: rId,
            value: cVal,
            averageDelta: avgOtherDelta,
          });
        }
      }
    }
  }
  return spikes;
}

/**
 * Adjust records for new room spikes by applying offsets.
 */
export function applyHeatingRoomOffsets(
  records: DynamicHeatingRecord[],
  ignoredSpikes: { date: string; roomId: string }[],
): DynamicHeatingRecord[] {
  const validRecords = filterValidDateRecords(records);
  if (validRecords.length < 2 || ignoredSpikes.length === 0) return records;

  const spikeSet = new Set(ignoredSpikes.map((s) => `${s.date}:${s.roomId}`));
  const adjustedRecords: DynamicHeatingRecord[] = [];
  const roomOffsets: Record<string, number> = {};

  for (let i = 0; i < validRecords.length; i++) {
    const record = validRecords[i];
    const recordDate = i > 0 ? getIsoDateKey(record.date) : '';
    const newRooms: Record<string, number> = {};

    for (const roomId in record.rooms) {
      if (!Object.hasOwn(record.rooms, roomId)) continue;
      const rawVal = record.rooms[roomId] || 0;

      if (i > 0) {
        const isSpike = spikeSet.has(`${recordDate}:${roomId}`);
        if (isSpike) {
          const currentOffset = roomOffsets[roomId] || 0;
          roomOffsets[roomId] = currentOffset + rawVal;
        }
      }

      let offset = roomOffsets[roomId] || 0;
      if (rawVal < offset) {
        offset = 0;
        roomOffsets[roomId] = 0;
      }

      newRooms[roomId] = Math.max(0, rawVal - offset);
    }

    adjustedRecords.push({
      ...record,
      rooms: newRooms,
    });
  }

  return adjustedRecords;
}

/**
 * Normalize incremental data to DAILY AVERAGE across electricity, water, and heating records.
 */
export function normalizeToDailyAverage(
  incrementalData: CombinedData[],
  originalData: AnyConsumptionRecord[],
  type: 'electricity' | 'water' | 'heating',
): CombinedData[] {
  if (incrementalData.length === 0) return incrementalData;

  const hasOriginalPadding = originalData.length > 0;
  const offset = hasOriginalPadding ? 1 : 0;
  const normalized = new Array<CombinedData>(incrementalData.length + offset);

  for (let i = 0; i < incrementalData.length; i++) {
    const item = incrementalData[i];
    const record: CombinedData = {
      ...item,
      ...(item['rooms'] ? { rooms: { ...(item['rooms'] as Record<string, number>) } } : {}),
    };
    normalized[i + offset] = record;

    const endRecord = originalData[i + 1];
    const startRecord = originalData[i];

    if (!endRecord?.date || !startRecord?.date) continue;

    const endTime = parseSafeDate(endRecord.date).getTime();
    const startTime = parseSafeDate(startRecord.date).getTime();

    if (Number.isNaN(endTime) || Number.isNaN(startTime)) continue;

    let daysDiff = (endTime - startTime) / (1000 * 3600 * 24);
    if (daysDiff <= 0.5) daysDiff = 1;

    record.normalized = { days: daysDiff };

    switch (type) {
      case 'electricity':
        normalizeElectricityRecord(record, daysDiff);
        break;
      case 'water':
        normalizeWaterRecord(record, daysDiff);
        break;
      case 'heating':
        normalizeHeatingRecord(record, daysDiff);
        break;
    }
  }

  if (hasOriginalPadding) {
    const first = normalized[1];
    normalized[0] = {
      ...first,
      date: originalData[0].date,
      ...(first['rooms'] ? { rooms: { ...(first['rooms'] as Record<string, number>) } } : {}),
      ...(first.normalized ? { normalized: { ...first.normalized } } : {}),
    };
  }

  return normalized;
}

function normalizeElectricityRecord(
  record: { value?: unknown; normalized?: Record<string, unknown>; [key: string]: unknown },
  daysDiff: number,
): void {
  const val = record['value'];
  if (typeof val === 'number') {
    record['value'] = Math.round(val / daysDiff);
    record['normalized'] ??= {};
    record['normalized']['raw'] = val;
  }
}

function normalizeWaterRecord(
  record: { normalized?: Record<string, unknown>; [key: string]: unknown },
  daysDiff: number,
): void {
  for (const field of WATER_FIELDS) {
    if (typeof record[field] === 'number') {
      const rawVal = record[field];
      record[field] = Math.round(rawVal / daysDiff);
      record['normalized'] ??= {};
      record['normalized'][field] = rawVal;
    }
  }
}

function normalizeHeatingRecord(
  record: {
    rooms?: Record<string, unknown>;
    normalized?: Record<string, unknown>;
    [key: string]: unknown;
  },
  daysDiff: number,
): void {
  const rooms = record.rooms;
  if (rooms) {
    for (const roomId in rooms) {
      if (!Object.hasOwn(rooms, roomId)) continue;
      const rawVal = rooms[roomId];
      if (typeof rawVal === 'number') {
        rooms[roomId] = Math.round(rawVal / daysDiff);
        record['normalized'] ??= {};
        record['normalized'][roomId] = rawVal;
      }
    }
  }
}
