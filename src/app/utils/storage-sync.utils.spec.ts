import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isSettingsKey,
  isRecordAllZero,
  mergeRecordLists,
  getLatestRecordTimestampFromData,
  getLatestLocalRecordTimestamp,
  checkHasUserContent,
} from './storage-sync.utils';

describe('storage-sync.utils', () => {
  describe('isSettingsKey', () => {
    it('should identify core settings keys', () => {
      expect(isSettingsKey('household_members')).toBe(true);
      expect(isSettingsKey('excel_settings')).toBe(true);
      expect(isSettingsKey('theme')).toBe(true);
      expect(isSettingsKey('water_consumption_records')).toBe(false);
    });

    it('should identify dynamic chart preference keys', () => {
      expect(isSettingsKey('water_chart_view')).toBe(true);
      expect(isSettingsKey('electricity_display_mode')).toBe(true);
      expect(isSettingsKey('heating_chart_trendline_visible')).toBe(true);
      expect(isSettingsKey('heating_chart_average_visible')).toBe(true);
      expect(isSettingsKey('water_show_predictions')).toBe(true);
      expect(isSettingsKey('water_is_collapsed')).toBe(true);
      expect(isSettingsKey('unknown_random_key')).toBe(false);
    });
  });

  describe('isRecordAllZero', () => {
    it('should return true for empty water records', () => {
      expect(
        isRecordAllZero({
          kitchenWarm: 0,
          kitchenCold: 0,
          bathroomWarm: 0,
          bathroomCold: 0,
        }),
      ).toBe(true);
    });

    it('should return false for water records with values', () => {
      expect(
        isRecordAllZero({
          kitchenWarm: 10,
          kitchenCold: 0,
          bathroomWarm: 0,
          bathroomCold: 0,
        }),
      ).toBe(false);
    });

    it('should return true for zero electricity record', () => {
      expect(isRecordAllZero({ value: 0 })).toBe(true);
      expect(isRecordAllZero({ value: 123 })).toBe(false);
    });

    it('should return true for zero heating record', () => {
      expect(isRecordAllZero({ rooms: { room1: 0, room2: 0 } })).toBe(true);
      expect(isRecordAllZero({ rooms: { room1: 15, room2: 0 } })).toBe(false);
    });

    it('should return true for invalid or non-object records', () => {
      expect(isRecordAllZero(null)).toBe(true);
      expect(isRecordAllZero(undefined)).toBe(true);
      expect(isRecordAllZero('string')).toBe(true);
    });
  });

  describe('mergeRecordLists', () => {
    it('should merge unique records by date in ascending order', () => {
      const base = [{ date: '2026-01-01', kitchenWarm: 10 }];
      const override = [{ date: '2026-01-02', kitchenWarm: 20 }];

      const merged = mergeRecordLists(base, override);
      expect(merged.length).toBe(2);
      expect(merged[0]).toEqual(expect.objectContaining({ date: '2026-01-01' }));
      expect(merged[1]).toEqual(expect.objectContaining({ date: '2026-01-02' }));
    });

    it('should overwrite on same-date conflict with override record', () => {
      const base = [{ date: '2026-01-01', kitchenWarm: 10 }];
      const override = [{ date: '2026-01-01', kitchenWarm: 25 }];

      const merged = mergeRecordLists(base, override);
      expect(merged.length).toBe(1);
      expect(merged[0]).toEqual(expect.objectContaining({ kitchenWarm: 25 }));
    });

    it('should not overwrite real data with all-zero placeholder', () => {
      const base = [
        {
          date: '2026-01-01',
          kitchenWarm: 50,
          kitchenCold: 30,
          bathroomWarm: 20,
          bathroomCold: 10,
        },
      ];
      const override = [
        { date: '2026-01-01', kitchenWarm: 0, kitchenCold: 0, bathroomWarm: 0, bathroomCold: 0 },
      ];

      const merged = mergeRecordLists(base, override);
      expect(merged.length).toBe(1);
      expect(merged[0]).toEqual(expect.objectContaining({ kitchenWarm: 50 }));
    });
  });

  describe('getLatestRecordTimestampFromData', () => {
    it('should return 0 for empty data', () => {
      expect(getLatestRecordTimestampFromData({})).toBe(0);
    });

    it('should find the latest date across all record collections', () => {
      const data = {
        water_consumption_records: [{ date: '2026-01-01' }, { date: '2026-03-01' }],
        electricity_consumption_records: [{ date: '2026-06-01' }],
        heating_consumption_records: [{ date: '2026-02-01' }],
      };

      const expected = new Date('2026-06-01').getTime();
      expect(getLatestRecordTimestampFromData(data)).toBe(expected);
    });
  });

  describe('getLatestLocalRecordTimestamp & checkHasUserContent', () => {
    beforeEach(() => {
      const store: Record<string, string> = {};
      const mockStorage = {
        getItem: (k: string) => store[k] || null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        clear: () => {
          for (const k of Object.keys(store)) delete store[k];
        },
        key: (i: number) => Object.keys(store)[i] || null,
        get length() {
          return Object.keys(store).length;
        },
      };
      vi.stubGlobal('localStorage', mockStorage);
      localStorage.clear();
    });

    it('should extract latest local record timestamp from localStorage', () => {
      localStorage.setItem(
        'hm_water_consumption_records',
        JSON.stringify([{ date: '2026-08-15' }, { date: '2026-09-01' }]),
      );
      const expected = new Date('2026-09-01').getTime();
      expect(getLatestLocalRecordTimestamp()).toBe(expected);
    });

    it('should return false for checkHasUserContent when localStorage only has ignored/default keys', () => {
      localStorage.setItem('hm_theme', 'dark');
      localStorage.setItem('hm_storage_mode', 'local');
      localStorage.setItem('hm_household_members', '[]');
      expect(checkHasUserContent()).toBe(false);
    });

    it('should return true for checkHasUserContent when user records exist', () => {
      localStorage.setItem(
        'hm_water_consumption_records',
        JSON.stringify([{ date: '2026-09-01' }]),
      );
      expect(checkHasUserContent()).toBe(true);
    });
  });
});
