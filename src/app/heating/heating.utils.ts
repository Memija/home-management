import { LocalStorageService } from '../services/local-storage.service';
import { HeatingRoomConfig } from '../services/heating-rooms.service';
import { DynamicHeatingRecord } from '../models/records.model';

export interface HeatingSpikeEntry {
  date: string;
  roomId: string;
}

/**
 * Loads persisted confirmed or dismissed heating spike entries from LocalStorageService.
 */
export function getStoredHeatingSpikes(
  localStorageService: LocalStorageService,
  type: 'confirmed' | 'dismissed',
): HeatingSpikeEntry[] {
  const stored = localStorageService.getPreference(`heating_${type}_spikes`);
  try {
    return stored ? (JSON.parse(stored) as HeatingSpikeEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * Persists confirmed or dismissed heating spike entries to LocalStorageService.
 */
export function saveHeatingSpikes(
  localStorageService: LocalStorageService,
  type: 'confirmed' | 'dismissed',
  spikes: HeatingSpikeEntry[],
): void {
  localStorageService.setPreference(`heating_${type}_spikes`, JSON.stringify(spikes));
}

/**
 * Finds the first detected spike that has neither been confirmed nor dismissed.
 */
export function findUnconfirmedSpike<T extends HeatingSpikeEntry>(
  detected: T[],
  confirmed: HeatingSpikeEntry[],
  dismissed: HeatingSpikeEntry[],
): T | undefined {
  if (detected.length === 0) return undefined;

  if (confirmed.length + dismissed.length > 4) {
    const handledKeys = new Set<string>();
    for (const c of confirmed) {
      handledKeys.add(`${c.date}\0${c.roomId}`);
    }
    for (const d of dismissed) {
      handledKeys.add(`${d.date}\0${d.roomId}`);
    }
    return detected.find((s) => !handledKeys.has(`${s.date}\0${s.roomId}`));
  }

  return detected.find(
    (s) =>
      !confirmed.some((c) => c.date === s.date && c.roomId === s.roomId) &&
      !dismissed.some((d) => d.date === s.date && d.roomId === s.roomId),
  );
}

/**
 * Collects unique room IDs that have positive reading values across all heating records.
 */
export function getRoomIdsWithData(records: DynamicHeatingRecord[]): string[] {
  const roomIdsWithData = new Set<string>();
  for (const record of records) {
    const rooms = record.rooms;
    for (const roomId in rooms) {
      if (Object.hasOwn(rooms, roomId) && rooms[roomId] > 0) {
        roomIdsWithData.add(roomId);
      }
    }
  }
  return Array.from(roomIdsWithData);
}

/**
 * Maps room IDs to their translation key or custom name for the predictions panel.
 */
export function buildHeatingCategoryNames(rooms: HeatingRoomConfig[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const r of rooms) {
    map[r.id] = r.type ? r.type : r.name;
  }
  return map;
}
