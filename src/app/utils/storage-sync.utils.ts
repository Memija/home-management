import { getDateKey, parseSafeDate } from '../models/records.model';

export const STORAGE_MODE_KEY = 'storage_mode';
export const LAST_SYNC_KEY = 'last_sync_timestamp';
export const LAST_LOCAL_UPDATE_KEY = 'last_local_update_timestamp';

export const VALID_RECORD_KEYS = [
  'water_consumption_records',
  'electricity_consumption_records',
  'heating_consumption_records',
] as const;

export const CORE_SETTINGS_KEYS = [
  'heating_room_configuration',
  'excel_settings',
  'storage_mode',
  'last_sync_timestamp',
  'household_members',
  'household_address',
  'dismissed_notifications',
  'theme',
  'preferred_language',
  'water_confirmed_meter_changes',
  'water_dismissed_meter_changes',
  'water_cold_only_mode',
  'electricity_confirmed_meter_changes',
  'electricity_dismissed_meter_changes',
  'heating_confirmed_spikes',
  'heating_dismissed_spikes',
] as const;

export const IGNORED_STORAGE_KEYS = [
  'hm_season_sync',
  'hm_excel_preview_is_collapsed',
  'hm_storage_mode',
  'hm_last_sync_timestamp',
  'hm_theme',
  'hm_preferred_language',
] as const;

/**
 * Checks if a key belongs in the user_settings document.
 * This includes core settings and dynamic chart preferences.
 */
export function isSettingsKey(key: string): boolean {
  if ((CORE_SETTINGS_KEYS as readonly string[]).includes(key)) return true;

  // Dynamic Chart Views & Display Modes
  if (key.endsWith('_chart_view') || key.endsWith('_display_mode')) return true;

  // Dynamic Chart Toggle States
  if (key.endsWith('_chart_trendline_visible') || key.endsWith('_chart_average_visible'))
    return true;
  if (key.endsWith('_show_predictions') || key.endsWith('_show_past_forecast')) return true;

  // Dynamic Collapsed States
  if (key.endsWith('_are_collapsed') || key.endsWith('_is_collapsed')) return true;

  return false;
}

/**
 * Checks if a consumption record contains all-zero or empty values.
 */
export function isRecordAllZero(record: unknown): boolean {
  if (!record || typeof record !== 'object') return true;
  const r = record as Record<string, unknown>;

  // Check for water record
  if ('kitchenWarm' in r || 'kitchenCold' in r) {
    return (
      (r['kitchenWarm'] === 0 || r['kitchenWarm'] === undefined) &&
      (r['kitchenCold'] === 0 || r['kitchenCold'] === undefined) &&
      (r['bathroomWarm'] === 0 || r['bathroomWarm'] === undefined) &&
      (r['bathroomCold'] === 0 || r['bathroomCold'] === undefined)
    );
  }
  // Check for electricity record
  if ('value' in r) {
    return r['value'] === 0 || r['value'] === undefined;
  }
  // Check for heating record
  if ('rooms' in r && typeof r['rooms'] === 'object' && r['rooms'] !== null) {
    return Object.values(r['rooms'] as Record<string, unknown>).every(
      (v) => v === 0 || v === undefined,
    );
  }
  return false;
}

/**
 * Merges two record lists by date.
 * - baseRecords are added first.
 * - overrideRecords override baseRecords with the same date (unless override is all-zero and base is not).
 * - Records unique to either list are preserved.
 * - Sorted ascending by date.
 */
export function mergeRecordLists(baseRecords: unknown[], overrideRecords: unknown[]): unknown[] {
  const map = new Map<string, unknown>();
  for (const r of baseRecords) {
    if (r && typeof r === 'object' && 'date' in r) {
      const key = getDateKey(parseSafeDate((r as { date: unknown }).date));
      if (key) map.set(key, r);
    }
  }
  for (const r of overrideRecords) {
    if (r && typeof r === 'object' && 'date' in r) {
      const key = getDateKey(parseSafeDate((r as { date: unknown }).date));
      if (key) {
        const existing = map.get(key);
        if (existing && isRecordAllZero(r) && !isRecordAllZero(existing)) {
          continue;
        }
        map.set(key, r);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const dateA = parseSafeDate((a as { date: unknown }).date).getTime();
    const dateB = parseSafeDate((b as { date: unknown }).date).getTime();
    return dateA - dateB;
  });
}

/**
 * Finds the latest record timestamp across all record collections in an exported data object.
 */
export function getLatestRecordTimestampFromData(data: Record<string, unknown>): number {
  let latest = 0;
  for (const key of VALID_RECORD_KEYS) {
    const records = data[key];
    if (Array.isArray(records)) {
      for (const r of records) {
        if (r && typeof r === 'object' && 'date' in r) {
          const time = parseSafeDate((r as { date: unknown }).date).getTime();
          if (!isNaN(time) && time > latest) {
            latest = time;
          }
        }
      }
    }
  }
  return latest;
}

/**
 * Extracts the latest record timestamp stored in localStorage for fallback comparison.
 */
export function getLatestLocalRecordTimestamp(): number {
  if (typeof localStorage === 'undefined') return 0;
  let latest = 0;
  const recordKeys = [
    'hm_water_consumption_records',
    'hm_electricity_consumption_records',
    'hm_heating_consumption_records',
  ];
  for (const storageKey of recordKeys) {
    try {
      const item = localStorage.getItem(storageKey);
      if (!item) continue;
      const parsed = JSON.parse(item);
      if (Array.isArray(parsed)) {
        for (const r of parsed) {
          if (r && typeof r === 'object' && 'date' in r) {
            const time = parseSafeDate(r.date).getTime();
            if (!isNaN(time) && time > latest) {
              latest = time;
            }
          }
        }
      }
    } catch {
      // Ignore parse error
    }
  }
  return latest;
}

/**
 * Checks if localStorage contains real user data beyond default or system keys.
 */
export function checkHasUserContent(): boolean {
  if (typeof localStorage === 'undefined') return false;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('hm_') && !(IGNORED_STORAGE_KEYS as readonly string[]).includes(key)) {
      const value = localStorage.getItem(key);

      // Skip empty/default values for core settings
      if (
        key === 'hm_household_members' &&
        (value === '[]' || value === 'null' || value === null)
      ) {
        continue;
      }
      if (key === 'hm_household_address' && (value === 'null' || value === null)) {
        continue;
      }
      if (
        key === 'hm_dismissed_notifications' &&
        (value === '[]' || value === 'null' || value === null)
      ) {
        continue;
      }

      // Skip chart views, display modes, and UI state with defaults
      if (key.endsWith('_chart_view') || key.endsWith('_display_mode')) continue;
      if (key.endsWith('_trendline_visible') || key.endsWith('_average_visible')) continue;
      if (key.endsWith('_collapsed')) continue;

      return true;
    }
  }
  return false;
}
