import {
  Injectable,
  inject,
  signal,
  computed,
  PLATFORM_ID,
  effect,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StorageService } from './storage.service';
import { LocalStorageService } from './local-storage.service';
import { FirebaseStorageService } from './firebase-storage.service';
import { AuthService } from './auth.service';
import { DemoService } from './demo.service';

export type StorageMode = 'local' | 'cloud';

const STORAGE_MODE_KEY = 'storage_mode';
const LAST_SYNC_KEY = 'last_sync_timestamp';

// Keys that should be grouped into the single 'user_settings' document
const SETTINGS_KEYS = [
  'heating_room_configuration',
  'excel_settings',
  'storage_mode',
  'last_sync_timestamp',
  'household_members',
  'household_address',
  'dismissed_notifications',
  'theme',
  'preferred_language',
  // Chart Views & Display Modes
  'water_chart_view',
  'water_display_mode',
  'heating_chart_view',
  'heating_display_mode',
  'electricity_chart_view',
  'electricity_display_mode',
  // Specific Feature Preferences & Visibility
  'water_confirmed_meter_changes',
  'water_dismissed_meter_changes',
  'electricity_confirmed_meter_changes',
  'electricity_dismissed_meter_changes',
  'heating_confirmed_spikes',
  'heating_dismissed_spikes',
  'water_chart_trendline_visible',
  'heating_chart_trendline_visible',
  'electricity_chart_trendline_visible',
  'water_chart_average_visible',
  'heating_chart_average_visible',
  'electricity_chart_average_visible',
  'excel_preview_is_collapsed',
  'detailed_records_for_water_are_collapsed',
  'detailed_records_for_heating_are_collapsed',
  'detailed_records_for_electricity_are_collapsed',
  'detailed_records_for_home_are_collapsed',
];

/**
 * Hybrid storage service that uses localStorage as cache and optionally syncs to Firebase.
 *
 * Cache-first architecture:
 * - Always reads/writes to localStorage first (instant response)
 * - When cloud mode is enabled, syncs changes to Firestore in background
 * - Provides offline-first experience with optional cloud backup
 */
@Injectable({
  providedIn: 'root',
})
export class HybridStorageService extends StorageService {
  private localStorage = inject(LocalStorageService);
  private firebaseStorage = inject(FirebaseStorageService);
  private authService = inject(AuthService);
  private demoService = inject(DemoService);
  private platformId = inject(PLATFORM_ID);

  /** Current storage mode */
  readonly mode = signal<StorageMode>('local');

  /** Last sync timestamp (for display purposes) */
  readonly lastSyncTime = signal<Date | null>(null);

  /** Whether an upload (push) to cloud is currently in progress */
  readonly isUploading = signal<boolean>(false);

  /** Whether a download (pull) from cloud is currently in progress */
  readonly isDownloading = signal<boolean>(false);

  /** Whether a cloud data deletion is currently in progress */
  readonly isDeletingCloud = signal<boolean>(false);

  /** Whether any sync activity is currently in progress */
  readonly isSyncing = computed(
    () => this.isUploading() || this.isDownloading() || this.isDeletingCloud(),
  );

  /** Whether there is any local user data beyond system keys */
  readonly hasUserContent = signal<boolean>(false);

  /** Whether cloud sync is available (user is authenticated) */
  readonly canUseCloud = computed(() => this.authService.isAuthenticated());

  /** Whether cloud mode is currently active */
  readonly isCloudMode = computed(() => {
    // In demo mode, we always force local mode
    if (this.demoService.isDemoMode()) {
      return false;
    }
    return this.mode() === 'cloud' && this.canUseCloud();
  });

  constructor() {
    super();
    if (this.isBrowser) {
      this.loadStoredMode();
      this.refreshLocalContentStatus();

      // Enable cloud mode automatically if user signs in and there's no local data
      effect(() => {
        const authenticated = this.authService.isAuthenticated();
        const noLocalContent = !this.hasUserContent();

        if (authenticated && noLocalContent) {
          // Check other conditions untracked to avoid unnecessary dependencies
          const currentMode = untracked(() => this.mode());
          const isDemo = untracked(() => this.demoService.isDemoMode());

          if (currentMode === 'local' && !isDemo) {
            console.info(
              '[HybridStorage] Auto-enabling cloud mode (User signed in + No local data)',
            );
            untracked(() => {
              this.setMode('cloud');
              // If we just enabled cloud mode because there was no data,
              // we should pull whatever is in the cloud to this device
              this.pullFromCloud().catch((err) =>
                console.error('[HybridStorage] Auto-pull failed:', err),
              );
            });
          }
        }
      });
    }
  }

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private loadStoredMode(): void {
    const storedMode = this.localStorage.getPreference(STORAGE_MODE_KEY);
    if (storedMode === 'cloud' || storedMode === 'local') {
      this.mode.set(storedMode);
    }

    const lastSync = this.localStorage.getPreference(LAST_SYNC_KEY);
    if (lastSync) {
      const date = new Date(lastSync);
      // Check if date is valid
      if (!isNaN(date.getTime())) {
        this.lastSyncTime.set(date);
      } else {
        console.warn('Invalid last sync timestamp found in storage:', lastSync);
        // Optionally clear the invalid value
        this.localStorage.removePreference(LAST_SYNC_KEY);
      }
    }
  }

  /**
   * Set the storage mode
   */
  setMode(mode: StorageMode): void {
    this.mode.set(mode);
    if (this.isBrowser) {
      this.localStorage.setPreference(STORAGE_MODE_KEY, mode);
      this.refreshLocalContentStatus();
    }
  }

  /**
   * Toggle between local and cloud mode
   */
  toggleMode(): void {
    const newMode = this.mode() === 'local' ? 'cloud' : 'local';
    this.setMode(newMode);
  }

  /**
   * Save data - always writes to localStorage, optionally syncs to cloud
   */
  async save<T>(key: string, data: T): Promise<void> {
    // Always save to localStorage first (cache-first)
    await this.localStorage.save(key, data);

    // If cloud mode is active, sync in background
    if (this.isCloudMode()) {
      if (SETTINGS_KEYS.includes(key)) {
        this.firebaseStorage.updateSettings({ [key]: data }).catch((error) => {
          console.error(`Background settings sync failed for key ${key}:`, error);
        });
      } else {
        this.syncToCloud(key, data).catch((error) => {
          console.error(`Background sync failed for key ${key}:`, error);
        });
      }
    }

    this.refreshLocalContentStatus();
  }

  /**
   * Load data - always reads from localStorage (cache-first)
   */
  async load<T>(key: string): Promise<T | null> {
    return this.localStorage.load<T>(key);
  }

  /**
   * Delete data - deletes from localStorage, optionally from cloud
   */
  async delete(key: string): Promise<void> {
    await this.localStorage.delete(key);

    if (this.isCloudMode()) {
      if (SETTINGS_KEYS.includes(key)) {
        this.firebaseStorage.deleteSetting(key).catch((error) => {
          console.error(`Background cloud setting delete failed for key ${key}:`, error);
        });
      } else {
        this.firebaseStorage.delete(key).catch((error) => {
          console.error(`Background cloud delete failed for key ${key}:`, error);
        });
      }
    }

    this.refreshLocalContentStatus();
  }

  /**
   * Check if key exists in localStorage
   */
  async exists(key: string): Promise<boolean> {
    return this.localStorage.exists(key);
  }

  /**
   * Export all data from localStorage
   */
  async exportAll(): Promise<Record<string, unknown>> {
    return this.localStorage.exportAll();
  }

  /**
   * Import all data to localStorage, optionally sync to cloud
   */
  async importAll(data: Record<string, unknown>): Promise<void> {
    await this.localStorage.importAll(data);

    if (this.isCloudMode()) {
      this.firebaseStorage.importAll(data).catch((error) => {
        console.error('Background cloud import failed:', error);
      });
    }

    this.refreshLocalContentStatus();
  }

  /**
   * Export records from localStorage
   */
  async exportRecords(recordKey: string): Promise<unknown[]> {
    return this.localStorage.exportRecords(recordKey);
  }

  /**
   * Import records to localStorage, optionally sync to cloud
   */
  async importRecords(recordKey: string, records: unknown[]): Promise<void> {
    await this.localStorage.importRecords(recordKey, records);

    if (this.isCloudMode()) {
      this.firebaseStorage.importRecords(recordKey, records).catch((error) => {
        console.error(`Background cloud record import failed for ${recordKey}:`, error);
      });
    }

    this.refreshLocalContentStatus();
  }

  /**
   * Sync a specific key to cloud (background operation)
   */
  private async syncToCloud<T>(key: string, data: T): Promise<void> {
    // Never sync to cloud if in demo mode
    if (this.demoService.isDemoMode()) {
      return;
    }

    try {
      await this.firebaseStorage.save(key, data);
      this.updateLastSyncTime();
    } catch (error) {
      console.error(`Failed to sync ${key} to cloud:`, error);
      throw error;
    }
  }

  private updateLastSyncTime(): void {
    const now = new Date();
    this.lastSyncTime.set(now);
    if (this.isBrowser) {
      this.localStorage.setPreference(LAST_SYNC_KEY, now.toISOString());
    }
  }

  /**
   * Migrate all local data to cloud (one-time operation when enabling cloud)
   */
  async migrateLocalToCloud(): Promise<void> {
    if (!this.canUseCloud()) {
      throw new Error('Cannot migrate: user not authenticated');
    }

    this.isUploading.set(true);

    try {
      const allData = await this.localStorage.exportAll();
      const keys = Object.keys(allData);

      if (keys.length === 0) {
        console.warn('[CloudSync] No local data found to migrate');
      }

      const settingsGroup: Record<string, unknown> = {};
      const recordKeys: string[] = [];
      const VALID_RECORD_KEYS = [
        'water_consumption_records',
        'electricity_consumption_records',
        'heating_consumption_records',
      ];

      // Group keys into settings or records, skip unknown keys
      for (const key of keys) {
        if (VALID_RECORD_KEYS.includes(key)) {
          recordKeys.push(key);
        } else if (SETTINGS_KEYS.includes(key)) {
          settingsGroup[key] = allData[key];
        } else {
          console.warn(
            `[CloudSync] Skipping unknown key "${key}" — not in settings or records whitelist`,
          );
        }
      }

      // Save settings in one go
      if (Object.keys(settingsGroup).length > 0) {
        await this.firebaseStorage.updateSettings(settingsGroup);
      }

      // Save consumption records individually
      for (const key of recordKeys) {
        await this.firebaseStorage.save(key, allData[key]);
      }

      this.updateLastSyncTime();
    } catch (error) {
      console.error('Migration to cloud failed:', error);
      throw error;
    } finally {
      this.isUploading.set(false);
    }
  }

  /**
   * Pull all data from cloud to local (restore operation)
   */
  async pullFromCloud(): Promise<void> {
    if (!this.canUseCloud()) {
      throw new Error('Cannot pull: user not authenticated');
    }

    this.isDownloading.set(true);

    try {
      const cloudData = await this.firebaseStorage.exportAll();

      // If user_settings exists and is a valid object, unpack only recognized settings keys for localStorage
      const rawSettings = cloudData['user_settings'];
      if (rawSettings && typeof rawSettings === 'object' && !Array.isArray(rawSettings)) {
        const settings = rawSettings as Record<string, unknown>;
        for (const key of SETTINGS_KEYS) {
          if (key in settings) {
            cloudData[key] = settings[key];
          }
        }
      }
      delete cloudData['user_settings'];

      // Extract preference keys before importAll (which JSON.stringifies values).
      // These must be written via setPreference (raw) to match how they are read
      // by ThemeService, LanguageService, and HybridStorageService.
      const modeValue = cloudData[STORAGE_MODE_KEY] as string | undefined;
      const syncValue = cloudData[LAST_SYNC_KEY] as string | undefined;
      const themeValue = cloudData['theme'] as string | undefined;
      const langValue = cloudData['preferred_language'] as string | undefined;
      delete cloudData[STORAGE_MODE_KEY];
      delete cloudData[LAST_SYNC_KEY];
      delete cloudData['theme'];
      delete cloudData['preferred_language'];

      await this.localStorage.importAll(cloudData);

      // Write preference keys as raw strings
      if (modeValue) {
        this.localStorage.setPreference(STORAGE_MODE_KEY, modeValue);
      }
      if (syncValue) {
        this.localStorage.setPreference(LAST_SYNC_KEY, syncValue);
      }
      if (themeValue) {
        this.localStorage.setPreference('theme', themeValue);
      }
      if (langValue) {
        this.localStorage.setPreference('preferred_language', langValue);
      }

      this.loadStoredMode(); // Refresh mode signal from imported data
      this.updateLastSyncTime();
    } catch (error) {
      console.error('Pull from cloud failed:', error);
      throw error;
    } finally {
      this.isDownloading.set(false);
    }
  }

  /**
   * Full sync: push local to cloud, then pull cloud to local
   * This ensures both sides have the same data (local wins on conflicts)
   */
  async fullSync(): Promise<void> {
    if (!this.canUseCloud()) {
      throw new Error('Cannot sync: user not authenticated');
    }

    try {
      // Local wins on conflict: Push local to cloud first
      await this.migrateLocalToCloud();
      // Then pull cloud data (including what we just pushed) back to local
      await this.pullFromCloud();
    } catch (error) {
      console.error('Full sync failed:', error);
      throw error;
    }
  }

  /**
   * Delete all data from cloud storage
   */
  async clearCloudData(): Promise<void> {
    if (!this.canUseCloud()) {
      throw new Error('Cannot clear cloud data: user not authenticated');
    }

    this.isDeletingCloud.set(true);

    try {
      await this.firebaseStorage.deleteAllUserData();
      // Clear last sync time as the remote data no longer exists
      this.lastSyncTime.set(null);
      if (this.isBrowser) {
        this.localStorage.removePreference(LAST_SYNC_KEY);
      }
    } catch (error) {
      console.error('Clear cloud data failed:', error);
      throw error;
    } finally {
      this.isDeletingCloud.set(false);
    }
  }
  /**
   * Delete all local data
   */
  async clearLocalData(): Promise<void> {
    await this.localStorage.clearAll();
    this.refreshLocalContentStatus();
  }

  /**
   * Refreshes the hasUserContent signal by checking if there is any local data beyond system keys.
   */
  refreshLocalContentStatus(): void {
    if (!this.isBrowser) {
      this.hasUserContent.set(false);
      return;
    }

    // System keys and preferences that are always present or set on navigation
    const IGNORED_KEYS = [
      'hm_season_sync',
      'hm_excel_preview_is_collapsed',
      'hm_storage_mode',
      'hm_last_sync_timestamp',
      'hm_theme',
      'hm_preferred_language',
    ];

    let hasData = false;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('hm_') && !IGNORED_KEYS.includes(key)) {
        // Only count as user data if it's not default/empty values
        const value = localStorage.getItem(key);

        // Skip empty/default values for core settings (JSON stringified)
        if (
          key === 'hm_household_members' &&
          (value === '[]' || value === 'null' || value === null)
        )
          continue;
        if (key === 'hm_household_address' && (value === 'null' || value === null)) continue;
        if (
          key === 'hm_dismissed_notifications' &&
          (value === '[]' || value === 'null' || value === null)
        )
          continue;

        // Skip chart views, display modes, and UI state which have defaults
        if (key.endsWith('_chart_view') || key.endsWith('_display_mode')) continue;
        if (key.endsWith('_trendline_visible') || key.endsWith('_average_visible')) continue;
        if (key.endsWith('_collapsed')) continue;

        hasData = true;
        break;
      }
    }
    this.hasUserContent.set(hasData);
  }
}
