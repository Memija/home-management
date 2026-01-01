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
 * Heating consumption record with readings by room
 */
export interface HeatingRecord {
    date: Date;
    livingRoom: number;
    bedroom: number;
    kitchen: number;
    bathroom: number;
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
 * Merge new records into existing records, ensuring uniqueness by date.
 * New records overwrite existing ones with the same date.
 * Result is sorted by date ascending.
 *
 * @param existing Existing records array
 * @param incoming New records to merge
 * @returns New array of merged and sorted records
 */
export function mergeRecords(existing: ConsumptionRecord[], incoming: ConsumptionRecord[]): ConsumptionRecord[] {
    const merged = [...existing, ...incoming];
    const uniqueMap = new Map<number, ConsumptionRecord>();
    merged.forEach(r => uniqueMap.set(new Date(r.date).getTime(), r));
    return Array.from(uniqueMap.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
