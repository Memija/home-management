/**
 * Shared record interfaces for consumption tracking
 *
 * Per coding-principles.md: "For shared type definitions, use src/app/models/"
 */

/**
 * Water consumption record with readings by room and temperature
 */
export interface ConsumptionRecord {
  date: Date;
  kitchenWarm: number;
  kitchenCold: number;
  bathroomWarm: number;
  bathroomCold: number;
}

/**
 * Alias for ConsumptionRecord (used by ExcelService)
 */
export type WaterRecord = ConsumptionRecord;

/**
 * Heating consumption record with readings by room (legacy fixed fields)
 * @deprecated Use DynamicHeatingRecord for new implementations
 */
export interface HeatingRecord {
  date: Date;
  livingRoom: number;
  bedroom: number;
  kitchen: number;
  bathroom: number;
}

/**
 * Heating consumption record with dynamic rooms
 */
export interface DynamicHeatingRecord {
  date: Date;
  rooms: Record<string, number>;  // key: room ID, value: kWh
}

/**
 * Merged chart data interface for calculations that handle both Water and Heating
 */
export type CombinedRecord = ConsumptionRecord | HeatingRecord;

export interface CombinedData extends Partial<ConsumptionRecord>, Partial<HeatingRecord> {
  date: Date;
  [key: string]: number | Date | undefined; // Allow indexing
}

/**
 * Interface for comparison averages
 */
export interface ComparisonData {
  date: Date;
  kitchenWarm?: number;
  kitchenCold?: number;
  bathroomWarm?: number;
  bathroomCold?: number;
  livingRoom?: number;
  bedroom?: number;
  kitchen?: number;
  bathroom?: number;
  [key: string]: number | Date | undefined;
}

/**
 * Utility functions for record calculations
 */
export function calculateWaterTotal(record: ConsumptionRecord): number {
  return record.kitchenWarm + record.kitchenCold + record.bathroomWarm + record.bathroomCold;
}

export function calculateKitchenTotal(record: ConsumptionRecord): number {
  return record.kitchenWarm + record.kitchenCold;
}

export function calculateBathroomTotal(record: ConsumptionRecord): number {
  return record.bathroomWarm + record.bathroomCold;
}

export function calculateHeatingTotal(record: HeatingRecord): number {
  return record.livingRoom + record.bedroom + record.kitchen + record.bathroom;
}

/**
 * Calculate total heating consumption for dynamic room records
 */
export function calculateDynamicHeatingTotal(record: DynamicHeatingRecord): number {
  return Object.values(record.rooms).reduce((sum, val) => sum + (val || 0), 0);
}

/**
 * Get normalized date key (YYYY-MM-DD) for deduplication.
 * Strips time component to ensure same dates with different times are treated as duplicates.
 */
export function getDateKey(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Check if a water record has all consumption values set to zero
 */
export function isWaterRecordAllZero(record: ConsumptionRecord): boolean {
  return record.kitchenWarm === 0 && record.kitchenCold === 0 &&
    record.bathroomWarm === 0 && record.bathroomCold === 0;
}

/**
 * Check if a heating record has all consumption values set to zero
 */
export function isHeatingRecordAllZero(record: HeatingRecord): boolean {
  return record.livingRoom === 0 && record.bedroom === 0 &&
    record.kitchen === 0 && record.bathroom === 0;
}

/**
 * Check if a dynamic heating record has all consumption values set to zero
 */
export function isDynamicHeatingRecordAllZero(record: DynamicHeatingRecord): boolean {
  return Object.values(record.rooms).every(val => val === 0 || val === undefined);
}

/**
 * Convert legacy HeatingRecord to DynamicHeatingRecord
 * Also handles records that are already in dynamic format
 */
export function toDynamicHeatingRecord(record: HeatingRecord | DynamicHeatingRecord): DynamicHeatingRecord {
  // If already has rooms property, it's already dynamic
  if ('rooms' in record && record.rooms && typeof record.rooms === 'object') {
    return record as DynamicHeatingRecord;
  }

  // Convert legacy format
  const legacy = record as HeatingRecord;
  return {
    date: legacy.date,
    rooms: {
      room_1: legacy.livingRoom || 0,
      room_2: legacy.bedroom || 0,
      room_3: legacy.kitchen || 0,
      room_4: legacy.bathroom || 0
    }
  };
}

/**
 * Convert DynamicHeatingRecord to legacy HeatingRecord
 * Also handles records that are already in legacy format
 * Maps first 4 room IDs to fixed fields
 */
export function toHeatingRecord(record: DynamicHeatingRecord | HeatingRecord): HeatingRecord {
  // If already has direct room properties (legacy format), return as-is
  if ('livingRoom' in record) {
    return record as HeatingRecord;
  }

  // Convert dynamic format to legacy
  const dynamic = record as DynamicHeatingRecord;
  if (!dynamic.rooms || typeof dynamic.rooms !== 'object') {
    // Fallback for invalid records
    return {
      date: dynamic.date,
      livingRoom: 0,
      bedroom: 0,
      kitchen: 0,
      bathroom: 0
    };
  }

  const roomIds = Object.keys(dynamic.rooms);
  return {
    date: dynamic.date,
    livingRoom: dynamic.rooms[roomIds[0]] || 0,
    bedroom: dynamic.rooms[roomIds[1]] || 0,
    kitchen: dynamic.rooms[roomIds[2]] || 0,
    bathroom: dynamic.rooms[roomIds[3]] || 0
  };
}

/**
 * Filter out records that have all-zero or empty values.
 * This prevents importing placeholder entries that have just a date but no actual data.
 * Originally only filtered records on the freshest date, now filters ALL empty records.
 *
 * @param records The records to filter
 * @param isAllZero Function to check if a record has all-zero values
 * @returns Object with filtered records and count of skipped placeholders
 */
export function filterZeroPlaceholders<T extends { date: Date }>(
  records: T[],
  isAllZero: (record: T) => boolean
): { filtered: T[], skippedCount: number } {
  if (records.length === 0) {
    return { filtered: [], skippedCount: 0 };
  }

  let skippedCount = 0;
  const filtered = records.filter(r => {
    if (isAllZero(r)) {
      skippedCount++;
      return false;
    }
    return true;
  });

  return { filtered, skippedCount };
}

/**
 * Merge new records into existing records, ensuring uniqueness by date.
 * New records overwrite existing ones with the same date (ignoring time component).
 * Result is sorted by date ascending.
 *
 * @param existing Existing records array
 * @param incoming New records to merge
 * @returns New array of merged and sorted records
 */
export function mergeRecords<T extends { date: Date }>(existing: T[], incoming: T[]): T[] {
  const merged = [...existing, ...incoming];
  const uniqueMap = new Map<string, T>();
  // Use date string as key to ignore time component differences
  merged.forEach(r => uniqueMap.set(getDateKey(r.date), r));
  return Array.from(uniqueMap.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
