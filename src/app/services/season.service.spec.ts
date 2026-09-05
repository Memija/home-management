import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { SeasonService, Season } from './season.service';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('SeasonService', () => {
  describe('Browser Platform Environment', () => {
    beforeEach(() => {
      const store: Record<string, string> = {};
      const mockStorage: Storage = {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          for (const k in store) delete store[k];
        },
        key: (index: number) => Object.keys(store)[index] || null,
        get length() {
          return Object.keys(store).length;
        },
      };
      vi.stubGlobal('localStorage', mockStorage);
      localStorage.clear();
      vi.useFakeTimers();
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
      });
    });

    afterEach(() => {
      vi.useRealTimers();
      localStorage.clear();
    });

    it('should be created', () => {
      const service = TestBed.inject(SeasonService);
      expect(service).toBeTruthy();
    });

    describe('getNaturalSeason mapping (edge cases)', () => {
      const testCases: { date: Date; expected: Season }[] = [
        { date: new Date(2023, 2, 19), expected: 'winter' }, // Mar 19 (last day of winter)
        { date: new Date(2023, 2, 20), expected: 'spring' }, // Mar 20 (first day of spring)
        { date: new Date(2023, 5, 20), expected: 'spring' }, // Jun 20 (last day of spring)
        { date: new Date(2023, 5, 21), expected: 'summer' }, // Jun 21 (first day of summer)
        { date: new Date(2023, 8, 2), expected: 'summer' }, // Sep 2 (early September)
        { date: new Date(2023, 8, 22), expected: 'summer' }, // Sep 22 (last day of summer)
        { date: new Date(2023, 8, 23), expected: 'autumn' }, // Sep 23 (first day of autumn)
        { date: new Date(2023, 11, 20), expected: 'autumn' }, // Dec 20 (last day of autumn)
        { date: new Date(2023, 11, 21), expected: 'winter' }, // Dec 21 (first day of winter)
      ];

      testCases.forEach(({ date, expected }) => {
        it(`should return ${expected} for ${date.toDateString()}`, () => {
          vi.setSystemTime(date);
          const service = TestBed.inject(SeasonService);
          expect(service.currentSeason()).toBe(expected);
        });
      });
    });

    describe('localStorage initialization', () => {
      it('should load season from localStorage if valid and same day', () => {
        const todayStr = new Date().toISOString().split('T')[0];
        localStorage.setItem('hm_season', 'autumn');
        localStorage.setItem('hm_season_sync', todayStr);
        const service = TestBed.inject(SeasonService);
        expect(service.currentSeason()).toBe('autumn');
      });

      it('should fallback to natural season if localStorage has an invalid value', () => {
        vi.setSystemTime(new Date(2023, 6, 15)); // July -> summer
        localStorage.setItem('hm_season', 'invalid-season');
        const service = TestBed.inject(SeasonService);
        expect(service.currentSeason()).toBe('summer');
      });

      it('should fallback to natural season if localStorage is empty', () => {
        vi.setSystemTime(new Date(2023, 3, 15)); // April -> spring
        const service = TestBed.inject(SeasonService);
        expect(service.currentSeason()).toBe('spring');
      });
    });

    describe('Season cycling bounds', () => {
      it('nextSeason should cycle from winter to spring (wrap around forward)', () => {
        const todayStr = new Date().toISOString().split('T')[0];
        localStorage.setItem('hm_season', 'winter');
        localStorage.setItem('hm_season_sync', todayStr);
        const service = TestBed.inject(SeasonService);
        service.nextSeason();
        expect(service.currentSeason()).toBe('spring');
        expect(localStorage.getItem('hm_season')).toBe('spring');
      });

      it('previousSeason should cycle from spring to winter (wrap around backward)', () => {
        const todayStr = new Date().toISOString().split('T')[0];
        localStorage.setItem('hm_season', 'spring');
        localStorage.setItem('hm_season_sync', todayStr);
        const service = TestBed.inject(SeasonService);
        service.previousSeason();
        expect(service.currentSeason()).toBe('winter');
        expect(localStorage.getItem('hm_season')).toBe('winter');
      });

      it('nextSeason and previousSeason should handle regular cycles seamlessly', () => {
        const todayStr = new Date().toISOString().split('T')[0];
        localStorage.setItem('hm_season', 'spring');
        localStorage.setItem('hm_season_sync', todayStr);
        const service = TestBed.inject(SeasonService);

        service.nextSeason();
        expect(service.currentSeason()).toBe('summer');
        service.nextSeason();
        expect(service.currentSeason()).toBe('autumn');

        service.previousSeason();
        expect(service.currentSeason()).toBe('summer'); // Back down
      });
    });

    describe('State operations', () => {
      it('setSeason should update the signal and localStorage', () => {
        const service = TestBed.inject(SeasonService);
        service.setSeason('winter');
        expect(service.currentSeason()).toBe('winter');
        expect(localStorage.getItem('hm_season')).toBe('winter');
      });

      it('resetToNaturalSeason should set natural season and remove localStorage config', () => {
        vi.setSystemTime(new Date(2023, 9, 15)); // Oct -> autumn
        const todayStr = new Date(2023, 9, 15).toISOString().split('T')[0];
        localStorage.setItem('hm_season', 'summer');
        localStorage.setItem('hm_season_sync', todayStr);
        const service = TestBed.inject(SeasonService);

        expect(service.currentSeason()).toBe('summer'); // Read from setup localStorage

        service.resetToNaturalSeason();
        expect(service.currentSeason()).toBe('autumn'); // Reset using natural (mocked) Date
        expect(localStorage.getItem('hm_season')).toBeNull(); // localStorage value cleared
      });

      describe('Daily reset functionality', () => {
        it('should reset season to natural if the day has changed', () => {
          const today = new Date(2023, 3, 15); // April -> spring
          const yesterday = new Date(2023, 3, 14);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          vi.setSystemTime(today);
          localStorage.setItem('hm_season', 'winter');
          localStorage.setItem('hm_season_sync', yesterdayStr);

          const service = TestBed.inject(SeasonService);
          expect(service.currentSeason()).toBe('spring');
          expect(localStorage.getItem('hm_season')).toBeNull();
          expect(localStorage.getItem('hm_season_sync')).toBe(today.toISOString().split('T')[0]);
        });

        it('should keep season override if it is still the same day', () => {
          const today = new Date(2023, 2, 15);
          const todayStr = today.toISOString().split('T')[0];

          vi.setSystemTime(today);
          localStorage.setItem('hm_season', 'winter');
          localStorage.setItem('hm_season_sync', todayStr);

          const service = TestBed.inject(SeasonService);
          expect(service.currentSeason()).toBe('winter');
          expect(localStorage.getItem('hm_season')).toBe('winter');
        });
      });
    });
  });

  describe('Server Platform Environment', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('should initialize with summer without attempting to access localStorage', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
      const service = TestBed.inject(SeasonService);

      expect(service.currentSeason()).toBe('summer');
      expect(getItemSpy).not.toHaveBeenCalled();
    });

    it('setSeason should update the active signal but avoid engaging localStorage', () => {
      const service = TestBed.inject(SeasonService);
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      service.setSeason('winter');
      expect(service.currentSeason()).toBe('winter');
      expect(setItemSpy).not.toHaveBeenCalled();
    });

    it('resetToNaturalSeason should resolve to active Date mapping without engaging localStorage', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2023, 11, 25)); // Dec -> winter

      const service = TestBed.inject(SeasonService);
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

      service.resetToNaturalSeason();
      expect(service.currentSeason()).toBe('winter');
      expect(removeItemSpy).not.toHaveBeenCalled();
    });
  });
});
