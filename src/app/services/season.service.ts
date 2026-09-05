import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LocalStorageService } from './local-storage.service';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** Storage key for user's preferred season override (hm = homemanagement) */
const SEASON_STORAGE_KEY = 'season';
/** Storage key for last synced day to detect new days */
const SEASON_SYNC_KEY = 'season_sync';

/** Ordered list of seasons for cycling */
const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

@Injectable({
  providedIn: 'root',
})
export class SeasonService {
  private platformId = inject(PLATFORM_ID);
  private localStorageService = inject(LocalStorageService);

  /** Current active season */
  readonly currentSeason = signal<Season>(this.getInitialSeason());

  /** When true, tree + switcher are disabled due to poor browser performance */
  readonly disabled = signal(false);

  /**
   * Determine the natural season based on astronomical seasons (Northern Hemisphere).
   * - Spring: March 20 – June 20
   * - Summer: June 21 – September 22
   * - Autumn: September 23 – December 20
   * - Winter: December 21 – March 19
   */
  private getNaturalSeason(date: Date = new Date()): Season {
    const md = (date.getMonth() + 1) * 100 + date.getDate();
    if (md >= 320 && md <= 620) return 'spring';
    if (md >= 621 && md <= 922) return 'summer';
    if (md >= 923 && md <= 1220) return 'autumn';
    return 'winter';
  }

  /**
   * Get the stored season override, or fall back to the natural season.
   */
  private getInitialSeason(): Season {
    if (!isPlatformBrowser(this.platformId)) return 'summer';

    const today = new Date().toISOString().split('T')[0];
    const lastSync = this.localStorageService.getPreference(SEASON_SYNC_KEY);

    // If it's a new day, we reset the preference to revert to natural season
    if (lastSync !== today) {
      this.localStorageService.removePreference(SEASON_STORAGE_KEY);
      this.localStorageService.setPreference(SEASON_SYNC_KEY, today);
      return this.getNaturalSeason();
    }

    const stored = this.localStorageService.getPreference(SEASON_STORAGE_KEY);
    if (stored && SEASON_ORDER.includes(stored as Season)) {
      return stored as Season;
    }
    return this.getNaturalSeason();
  }

  /**
   * Set the season and persist the preference.
   */
  setSeason(season: Season): void {
    this.currentSeason.set(season);
    if (isPlatformBrowser(this.platformId)) {
      this.localStorageService.setPreference(SEASON_STORAGE_KEY, season);
      // Ensure sync date is updated when user makes a manual choice
      const today = new Date().toISOString().split('T')[0];
      this.localStorageService.setPreference(SEASON_SYNC_KEY, today);
    }
  }

  /**
   * Cycle to the next season.
   */
  nextSeason(): void {
    const current = this.currentSeason();
    const currentIndex = SEASON_ORDER.indexOf(current);
    const nextIndex = (currentIndex + 1) % SEASON_ORDER.length;
    this.setSeason(SEASON_ORDER[nextIndex]);
  }

  /**
   * Cycle to the previous season.
   */
  previousSeason(): void {
    const current = this.currentSeason();
    const currentIndex = SEASON_ORDER.indexOf(current);
    const prevIndex = (currentIndex - 1 + SEASON_ORDER.length) % SEASON_ORDER.length;
    this.setSeason(SEASON_ORDER[prevIndex]);
  }

  /**
   * Reset to the natural season based on the current date.
   */
  resetToNaturalSeason(): void {
    const natural = this.getNaturalSeason();
    this.currentSeason.set(natural);
    if (isPlatformBrowser(this.platformId)) {
      this.localStorageService.removePreference(SEASON_STORAGE_KEY);
    }
  }
}
