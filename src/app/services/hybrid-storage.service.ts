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
import { CloudSyncService } from './cloud-sync.service';
import { STORAGE_MODE_KEY, checkHasUserContent, isSettingsKey } from '../utils/storage-sync.utils';

export type StorageMode = 'local' | 'cloud';

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
  private cloudSync = inject(CloudSyncService);
  private platformId = inject(PLATFORM_ID);

  /** Current storage mode */
  readonly mode = signal<StorageMode>('local');

  /** Last sync timestamp (for display purposes) */
  readonly lastSyncTime = this.cloudSync.lastSyncTime;

  /** Whether an upload (push) to cloud is currently in progress */
  readonly isUploading = this.cloudSync.isUploading;

  /** Whether a download (pull) from cloud is currently in progress */
  readonly isDownloading = this.cloudSync.isDownloading;

  /** Whether a cloud data deletion is currently in progress */
  readonly isDeletingCloud = this.cloudSync.isDeletingCloud;

  /** Whether any sync activity is currently in progress */
  readonly isSyncing = this.cloudSync.isSyncing;

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

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  constructor() {
    super();
    if (this.isBrowser) {
      this.loadStoredMode();
      this.refreshLocalContentStatus();
      this.cloudSync.setupResumeListeners(() => this.onAppResume());
      this.cloudSync.setOnDataRefreshed(() => {
        this.loadStoredMode();
        this.refreshLocalContentStatus();
        this.notifyDataRefreshed();
      });

      // Handle cloud sync automatically on startup if user signs in
      effect(() => {
        const authenticated = this.authService.isAuthenticated();
        const isDemo = untracked(() => this.demoService.isDemoMode());

        if (authenticated && !isDemo) {
          untracked(() => {
            this.handleAuthenticatedStartup().catch((err) =>
              console.error('[HybridStorage] Authenticated startup sync failed:', err),
            );
          });
        }
      });
    }
  }

  /**
   * Called when app is revisited after being in the background.
   * Throttled to prevent unnecessary Firestore queries.
   */
  async onAppResume(): Promise<void> {
    if (!this.isCloudMode() || this.isSyncing()) return;
    if (!this.cloudSync.canResumeSync()) return;

    try {
      await this.smartSync();
    } catch (err) {
      console.warn('[HybridStorage] Revisit sync failed:', err);
    }
  }

  /**
   * Handles cloud synchronization when user is authenticated on startup.
   */
  async handleAuthenticatedStartup(): Promise<void> {
    const currentMode = this.mode();
    if (currentMode === 'local') {
      try {
        const cloudSettings = await this.firebaseStorage.getSettings();
        const isCloudConfigured = cloudSettings['storage_mode'] === 'cloud';
        const noLocalContent = !this.hasUserContent();

        if (noLocalContent) {
          this.setMode('cloud');
          await this.pullFromCloud();
          return;
        }

        if (isCloudConfigured) {
          this.setMode('cloud');
          // Local has user content: run smartSync to protect fresher local data and merge
          await this.smartSync();
          return;
        }
      } catch (err) {
        console.warn('[HybridStorage] Failed to check cloud settings on startup:', err);
      }
    }

    if (this.isCloudMode()) {
      await this.smartSync();
    }
  }

  private loadStoredMode(): void {
    const storedMode = this.localStorage.getPreference(STORAGE_MODE_KEY);
    if (storedMode === 'cloud' || storedMode === 'local') {
      this.mode.set(storedMode);
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
    const ts = Date.now();
    this.cloudSync.updateLocalTimestamp(ts);
    // Always save to localStorage first (cache-first)
    await this.localStorage.save(key, data);

    // If cloud mode is active, sync in background
    if (this.isCloudMode()) {
      if (isSettingsKey(key)) {
        this.firebaseStorage
          .updateSettings({ [key]: data })
          .then(() => this.firebaseStorage.updateCloudTimestamp(ts))
          .catch((error) => {
            console.error(`Background settings sync failed for key ${key}:`, error);
          });
      } else {
        this.syncToCloud(key, data)
          .then(() => this.firebaseStorage.updateCloudTimestamp(ts))
          .catch((error) => {
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
    const ts = Date.now();
    this.cloudSync.updateLocalTimestamp(ts);
    await this.localStorage.delete(key);

    if (this.isCloudMode()) {
      if (isSettingsKey(key)) {
        this.firebaseStorage
          .deleteSetting(key)
          .then(() => this.firebaseStorage.updateCloudTimestamp(ts))
          .catch((error) => {
            console.error(`Background cloud setting delete failed for key ${key}:`, error);
          });
      } else {
        this.firebaseStorage
          .delete(key)
          .then(() => this.firebaseStorage.updateCloudTimestamp(ts))
          .catch((error) => {
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
    const ts = Date.now();
    this.cloudSync.updateLocalTimestamp(ts);
    await this.localStorage.importAll(data);

    if (this.isCloudMode()) {
      this.firebaseStorage
        .importAll(data)
        .then(() => this.firebaseStorage.updateCloudTimestamp(ts))
        .catch((error) => {
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
    const ts = Date.now();
    this.cloudSync.updateLocalTimestamp(ts);
    await this.localStorage.importRecords(recordKey, records);

    if (this.isCloudMode()) {
      this.firebaseStorage
        .importRecords(recordKey, records)
        .then(() => this.firebaseStorage.updateCloudTimestamp(ts))
        .catch((error) => {
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
      this.cloudSync.updateLastSyncTime();
    } catch (error) {
      console.error(`Failed to sync ${key} to cloud:`, error);
      throw error;
    }
  }

  /**
   * Performs smart timestamp-aware sync between local and cloud storage.
   */
  async smartSync(): Promise<void> {
    await this.cloudSync.smartSync(
      this.canUseCloud(),
      this.hasUserContent(),
      () => this.pullFromCloud(),
      () => this.migrateLocalToCloud(),
    );
  }

  /**
   * Migrate all local data to cloud (one-time operation when enabling cloud)
   */
  async migrateLocalToCloud(): Promise<void> {
    await this.cloudSync.migrateLocalToCloud(this.canUseCloud());
  }

  /**
   * Pull all data from cloud to local (restore operation)
   */
  async pullFromCloud(): Promise<void> {
    await this.cloudSync.pullFromCloud(this.canUseCloud());
    this.loadStoredMode();
    this.refreshLocalContentStatus();
    this.notifyDataRefreshed();
  }

  /**
   * Full sync: push local to cloud, then pull cloud to local
   */
  async fullSync(): Promise<void> {
    await this.cloudSync.fullSync(this.canUseCloud());
    this.loadStoredMode();
    this.refreshLocalContentStatus();
    this.notifyDataRefreshed();
  }

  /**
   * Delete all data from cloud storage
   */
  async clearCloudData(): Promise<void> {
    await this.cloudSync.clearCloudData(this.canUseCloud());
  }

  /**
   * Delete all local data
   */
  async clearLocalData(): Promise<void> {
    await this.localStorage.clearAll();
    this.cloudSync.updateLocalTimestamp(0);
    this.refreshLocalContentStatus();
    this.notifyDataRefreshed();
  }

  /**
   * Refreshes the hasUserContent signal by checking if there is any local data beyond system keys.
   */
  refreshLocalContentStatus(): void {
    this.hasUserContent.set(this.isBrowser ? checkHasUserContent() : false);
  }
}
