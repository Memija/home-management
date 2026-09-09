import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LocalStorageService } from './local-storage.service';
import { FirebaseStorageService } from './firebase-storage.service';
import {
  STORAGE_MODE_KEY,
  LAST_SYNC_KEY,
  LAST_LOCAL_UPDATE_KEY,
  VALID_RECORD_KEYS,
  isSettingsKey,
  mergeRecordLists,
  getLatestRecordTimestampFromData,
  getLatestLocalRecordTimestamp,
} from '../utils/storage-sync.utils';

@Injectable({
  providedIn: 'root',
})
export class CloudSyncService {
  private localStorage = inject(LocalStorageService);
  private firebaseStorage = inject(FirebaseStorageService);
  private platformId = inject(PLATFORM_ID);

  readonly lastSyncTime = signal<Date | null>(null);
  readonly isUploading = signal<boolean>(false);
  readonly isDownloading = signal<boolean>(false);
  readonly isDeletingCloud = signal<boolean>(false);
  readonly isSyncing = computed(
    () => this.isUploading() || this.isDownloading() || this.isDeletingCloud(),
  );

  private lastResumeSyncTime = 0;
  private tabHiddenAt = 0;
  private readonly REVISIT_SYNC_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private onDataRefreshedCallback?: () => void;

  constructor() {
    if (this.isBrowser) {
      this.loadStoredLastSyncTime();
    }
  }

  setOnDataRefreshed(callback: () => void): void {
    this.onDataRefreshedCallback = callback;
  }

  loadStoredLastSyncTime(): void {
    const lastSync = this.localStorage.getPreference(LAST_SYNC_KEY);
    if (lastSync) {
      const date = new Date(lastSync);
      if (!isNaN(date.getTime())) {
        this.lastSyncTime.set(date);
      } else {
        console.warn('Invalid last sync timestamp found in storage:', lastSync);
        this.localStorage.removePreference(LAST_SYNC_KEY);
      }
    }
  }

  updateLastSyncTime(): void {
    const now = new Date();
    this.lastSyncTime.set(now);
    this.lastResumeSyncTime = Date.now();
    if (this.isBrowser) {
      this.localStorage.setPreference(LAST_SYNC_KEY, now.toISOString());
    }
  }

  clearLastSyncTime(): void {
    this.lastSyncTime.set(null);
    if (this.isBrowser) {
      this.localStorage.removePreference(LAST_SYNC_KEY);
    }
  }

  setupResumeListeners(onRevisit: () => void): void {
    if (!this.isBrowser) return;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.tabHiddenAt = Date.now();
      } else if (document.visibilityState === 'visible') {
        const awayDuration = this.tabHiddenAt > 0 ? Date.now() - this.tabHiddenAt : 0;
        if (awayDuration >= this.REVISIT_SYNC_THROTTLE_MS || this.lastResumeSyncTime === 0) {
          onRevisit();
        }
      }
    });
  }

  canResumeSync(): boolean {
    const now = Date.now();
    if (
      this.lastResumeSyncTime > 0 &&
      now - this.lastResumeSyncTime < this.REVISIT_SYNC_THROTTLE_MS
    ) {
      return false;
    }
    this.lastResumeSyncTime = now;
    this.tabHiddenAt = 0;
    return true;
  }

  getLocalTimestamp(): number {
    if (!this.isBrowser) return 0;
    const val = this.localStorage.getPreference(LAST_LOCAL_UPDATE_KEY);
    if (val) {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return getLatestLocalRecordTimestamp();
  }

  updateLocalTimestamp(timestamp: number): void {
    if (this.isBrowser) {
      this.localStorage.setPreference(LAST_LOCAL_UPDATE_KEY, timestamp.toString());
    }
  }

  async smartSync(
    canUseCloud: boolean,
    hasUserContent: boolean,
    pullFn?: () => Promise<void>,
    migrateFn?: () => Promise<void>,
  ): Promise<void> {
    if (!canUseCloud) return;

    const doPull = pullFn ?? (() => this.pullFromCloud(canUseCloud));
    const doMigrate = migrateFn ?? (() => this.migrateLocalToCloud(canUseCloud));

    this.isDownloading.set(true);
    try {
      const cloudTs = await this.firebaseStorage.getCloudUpdateTimestamp();
      const localTs = this.getLocalTimestamp();

      const cTime = cloudTs || 0;
      const lTime = localTs || 0;

      if (cTime > lTime) {
        await doPull();
      } else if (lTime > cTime) {
        if (cTime > 0) {
          await doMigrate();
        } else {
          const cloudData = (await this.firebaseStorage.exportAll()) || {};
          if (Object.keys(cloudData).length > 0) {
            const cloudMaxDate = getLatestRecordTimestampFromData(cloudData);
            if (cloudMaxDate > lTime) {
              await doPull();
            } else {
              await doMigrate();
            }
          } else {
            await doMigrate();
          }
        }
      } else if (cTime === 0 && lTime === 0) {
        const cloudData = (await this.firebaseStorage.exportAll()) || {};
        const cloudHasData = Object.keys(cloudData).length > 0;
        const localHasData = hasUserContent;

        if (cloudHasData && localHasData) {
          const cloudMaxDate = getLatestRecordTimestampFromData(cloudData);
          const localMaxDate = getLatestLocalRecordTimestamp();
          if (localMaxDate > cloudMaxDate) {
            await doMigrate();
          } else {
            await doPull();
          }
        } else if (cloudHasData) {
          await doPull();
        } else if (localHasData) {
          await doMigrate();
        }
      }
    } catch (error) {
      console.error('[CloudSync] Smart sync failed:', error);
    } finally {
      this.isDownloading.set(false);
    }
  }

  async migrateLocalToCloud(canUseCloud: boolean): Promise<void> {
    if (!canUseCloud) {
      throw new Error('Cannot migrate: user not authenticated');
    }

    this.isUploading.set(true);
    try {
      const allData = (await this.localStorage.exportAll()) || {};
      const keys = Object.keys(allData);

      if (keys.length === 0) {
        console.warn('[CloudSync] No local data found to migrate');
      }

      const settingsGroup: Record<string, unknown> = {};
      const recordKeys: string[] = [];

      for (const key of keys) {
        if ((VALID_RECORD_KEYS as readonly string[]).includes(key)) {
          recordKeys.push(key);
        } else if (isSettingsKey(key)) {
          settingsGroup[key] = allData[key];
        } else {
          console.warn(
            `[CloudSync] Skipping unknown key "${key}" — not in settings or records whitelist`,
          );
        }
      }

      if (Object.keys(settingsGroup).length > 0) {
        await this.firebaseStorage.updateSettings(settingsGroup);
      }

      for (const key of recordKeys) {
        const records = (allData[key] as unknown[]) || [];
        let finalRecords = records;
        if (typeof this.firebaseStorage.load === 'function') {
          const cloudRecords = await this.firebaseStorage.load<unknown[]>(key);
          if (Array.isArray(cloudRecords) && cloudRecords.length > 0) {
            finalRecords = mergeRecordLists(cloudRecords, records);
          }
        }
        await this.firebaseStorage.save(key, finalRecords);
        await this.localStorage.save(key, finalRecords);
      }

      this.updateLastSyncTime();
      await this.firebaseStorage.updateCloudTimestamp(this.getLocalTimestamp());
    } catch (error) {
      console.error('Migration to cloud failed:', error);
      throw error;
    } finally {
      this.isUploading.set(false);
    }
  }

  async pullFromCloud(canUseCloud: boolean): Promise<void> {
    if (!canUseCloud) {
      throw new Error('Cannot pull: user not authenticated');
    }

    this.isDownloading.set(true);
    try {
      const cloudData = await this.firebaseStorage.exportAll();

      for (const recKey of VALID_RECORD_KEYS) {
        const cloudRecords = cloudData[recKey];
        if (Array.isArray(cloudRecords)) {
          const localRecords = await this.localStorage.load<unknown[]>(recKey);
          if (Array.isArray(localRecords) && localRecords.length > 0) {
            cloudData[recKey] = mergeRecordLists(localRecords, cloudRecords);
          }
        }
      }

      const rawSettings = cloudData['user_settings'];
      if (rawSettings && typeof rawSettings === 'object' && !Array.isArray(rawSettings)) {
        const settings = rawSettings as Record<string, unknown>;
        for (const [key, value] of Object.entries(settings)) {
          if (isSettingsKey(key)) {
            cloudData[key] = value;
          }
        }
      }
      delete cloudData['user_settings'];

      const modeValue = cloudData[STORAGE_MODE_KEY] as string | undefined;
      const syncValue = cloudData[LAST_SYNC_KEY] as string | undefined;
      const themeValue = cloudData['theme'] as string | undefined;
      const langValue = cloudData['preferred_language'] as string | undefined;
      delete cloudData[STORAGE_MODE_KEY];
      delete cloudData[LAST_SYNC_KEY];
      delete cloudData['theme'];
      delete cloudData['preferred_language'];

      await this.localStorage.importAll(cloudData);

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

      this.updateLastSyncTime();
      const cloudTs = await this.firebaseStorage.getCloudUpdateTimestamp();
      if (cloudTs) {
        this.updateLocalTimestamp(cloudTs);
      }
      this.onDataRefreshedCallback?.();
    } catch (error) {
      console.error('Pull from cloud failed:', error);
      throw error;
    } finally {
      this.isDownloading.set(false);
    }
  }

  async fullSync(canUseCloud: boolean): Promise<void> {
    if (!canUseCloud) {
      throw new Error('Cannot sync: user not authenticated');
    }
    try {
      await this.migrateLocalToCloud(canUseCloud);
      await this.pullFromCloud(canUseCloud);
    } catch (error) {
      console.error('Full sync failed:', error);
      throw error;
    }
  }

  async clearCloudData(canUseCloud: boolean): Promise<void> {
    if (!canUseCloud) {
      throw new Error('Cannot clear cloud data: user not authenticated');
    }

    this.isDeletingCloud.set(true);
    try {
      await this.firebaseStorage.deleteAllUserData();
      this.clearLastSyncTime();
      await this.firebaseStorage.updateCloudTimestamp(0);
    } catch (error) {
      console.error('Clear cloud data failed:', error);
      throw error;
    } finally {
      this.isDeletingCloud.set(false);
    }
  }
}
