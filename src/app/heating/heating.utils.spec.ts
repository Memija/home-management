import { describe, it, expect, vi } from 'vitest';
import {
  buildHeatingCategoryNames,
  findUnconfirmedSpike,
  getRoomIdsWithData,
  getStoredHeatingSpikes,
  saveHeatingSpikes,
} from './heating.utils';
import type { LocalStorageService } from '../services/local-storage.service';
import type { DynamicHeatingRecord } from '../models/records.model';
import type { HeatingRoomConfig } from '../services/heating-rooms.service';

describe('heating.utils', () => {
  describe('getStoredHeatingSpikes', () => {
    it('should return parsed spikes from LocalStorageService', () => {
      const spikes = [{ date: '2024-01-15', roomId: 'living' }];
      const storage = {
        getPreference: vi.fn().mockReturnValue(JSON.stringify(spikes)),
      } as unknown as LocalStorageService;

      expect(getStoredHeatingSpikes(storage, 'confirmed')).toEqual(spikes);
      expect(storage.getPreference).toHaveBeenCalledWith('heating_confirmed_spikes');
    });

    it('should return an empty array when storage value is null or invalid JSON', () => {
      const nullStorage = {
        getPreference: vi.fn().mockReturnValue(null),
      } as unknown as LocalStorageService;
      expect(getStoredHeatingSpikes(nullStorage, 'dismissed')).toEqual([]);

      const corruptStorage = {
        getPreference: vi.fn().mockReturnValue('{not-valid-json'),
      } as unknown as LocalStorageService;
      expect(getStoredHeatingSpikes(corruptStorage, 'dismissed')).toEqual([]);
    });
  });

  describe('saveHeatingSpikes', () => {
    it('should serialize spikes to LocalStorageService under the correct key', () => {
      const storage = {
        setPreference: vi.fn(),
      } as unknown as LocalStorageService;
      const spikes = [{ date: '2024-02-01', roomId: 'bedroom' }];

      saveHeatingSpikes(storage, 'dismissed', spikes);

      expect(storage.setPreference).toHaveBeenCalledWith(
        'heating_dismissed_spikes',
        JSON.stringify(spikes),
      );
    });
  });

  describe('findUnconfirmedSpike', () => {
    it('should return the first spike not in confirmed or dismissed lists', () => {
      const detected = [
        { date: '2024-01-01', roomId: 'r1' },
        { date: '2024-02-01', roomId: 'r2' },
        { date: '2024-03-01', roomId: 'r3' },
      ];
      const confirmed = [{ date: '2024-01-01', roomId: 'r1' }];
      const dismissed = [{ date: '2024-02-01', roomId: 'r2' }];

      expect(findUnconfirmedSpike(detected, confirmed, dismissed)).toEqual({
        date: '2024-03-01',
        roomId: 'r3',
      });
    });

    it('should return undefined when all detected spikes are confirmed or dismissed', () => {
      const detected = [{ date: '2024-01-01', roomId: 'r1' }];
      expect(findUnconfirmedSpike(detected, detected, [])).toBeUndefined();
    });
  });

  describe('getRoomIdsWithData', () => {
    it('should return unique room IDs with positive values across records', () => {
      const records: DynamicHeatingRecord[] = [
        { date: new Date('2024-01-01'), rooms: { living: 100, bedroom: 0 } },
        { date: new Date('2024-02-01'), rooms: { living: 150, kitchen: 45 } },
      ];

      expect(getRoomIdsWithData(records)).toEqual(['living', 'kitchen']);
    });

    it('should return an empty array for empty records', () => {
      expect(getRoomIdsWithData([])).toEqual([]);
    });
  });

  describe('buildHeatingCategoryNames', () => {
    it('should map room IDs to room.type when present or room.name otherwise', () => {
      const rooms: HeatingRoomConfig[] = [
        { id: 'r1', name: 'Wohnzimmer', type: 'HEATING.ROOM_TYPES.LIVING_ROOM' },
        { id: 'r2', name: 'Custom Hobby Room' },
      ];

      expect(buildHeatingCategoryNames(rooms)).toEqual({
        r1: 'HEATING.ROOM_TYPES.LIVING_ROOM',
        r2: 'Custom Hobby Room',
      });
    });
  });
});
