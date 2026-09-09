import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { CloudSyncService } from './cloud-sync.service';
import { LocalStorageService } from './local-storage.service';
import { FirebaseStorageService } from './firebase-storage.service';

describe('CloudSyncService', () => {
  let service: CloudSyncService;
  let localStorageSpy: {
    getPreference: Mock;
    setPreference: Mock;
    removePreference: Mock;
    save: Mock;
    load: Mock;
    exportAll: Mock;
    importAll: Mock;
  };
  let firebaseStorageSpy: {
    load: Mock;
    updateSettings: Mock;
    save: Mock;
    deleteAllUserData: Mock;
    exportAll: Mock;
    getCloudUpdateTimestamp: Mock;
    updateCloudTimestamp: Mock;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    localStorageSpy = {
      getPreference: vi.fn(),
      setPreference: vi.fn(),
      removePreference: vi.fn(),
      save: vi.fn(),
      load: vi.fn().mockResolvedValue([]),
      exportAll: vi.fn().mockResolvedValue({}),
      importAll: vi.fn().mockResolvedValue(undefined),
    };

    firebaseStorageSpy = {
      load: vi.fn().mockResolvedValue(null),
      updateSettings: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue(undefined),
      deleteAllUserData: vi.fn().mockResolvedValue(undefined),
      exportAll: vi.fn().mockResolvedValue({}),
      getCloudUpdateTimestamp: vi.fn().mockResolvedValue(0),
      updateCloudTimestamp: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        CloudSyncService,
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: FirebaseStorageService, useValue: firebaseStorageSpy },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    service = TestBed.inject(CloudSyncService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.lastSyncTime()).toBeNull();
    expect(service.isSyncing()).toBe(false);
  });

  describe('Timestamp and Sync State Management', () => {
    it('should load stored last sync time', () => {
      const dateStr = '2026-09-01T12:00:00.000Z';
      localStorageSpy.getPreference.mockReturnValue(dateStr);

      service.loadStoredLastSyncTime();

      expect(service.lastSyncTime()).toEqual(new Date(dateStr));
    });

    it('should handle invalid date string in storage', () => {
      localStorageSpy.getPreference.mockReturnValue('invalid-date');

      service.loadStoredLastSyncTime();

      expect(service.lastSyncTime()).toBeNull();
      expect(localStorageSpy.removePreference).toHaveBeenCalledWith('last_sync_timestamp');
    });

    it('should update last sync time and set preference', () => {
      service.updateLastSyncTime();

      expect(service.lastSyncTime()).not.toBeNull();
      expect(localStorageSpy.setPreference).toHaveBeenCalledWith(
        'last_sync_timestamp',
        expect.any(String),
      );
    });

    it('should clear last sync time and remove preference', () => {
      service.clearLastSyncTime();

      expect(service.lastSyncTime()).toBeNull();
      expect(localStorageSpy.removePreference).toHaveBeenCalledWith('last_sync_timestamp');
    });

    it('should compute isSyncing as true when uploading, downloading, or deleting', () => {
      expect(service.isSyncing()).toBe(false);

      service.isUploading.set(true);
      expect(service.isSyncing()).toBe(true);
      service.isUploading.set(false);

      service.isDownloading.set(true);
      expect(service.isSyncing()).toBe(true);
      service.isDownloading.set(false);

      service.isDeletingCloud.set(true);
      expect(service.isSyncing()).toBe(true);
      service.isDeletingCloud.set(false);

      expect(service.isSyncing()).toBe(false);
    });
  });

  describe('Resume and Revisit Logic', () => {
    it('should allow resume sync on first call and throttle subsequent calls within 5 minutes', () => {
      expect(service.canResumeSync()).toBe(true);
      // Immediately called again -> throttled
      expect(service.canResumeSync()).toBe(false);
    });
  });

  describe('smartSync', () => {
    it('should not sync if canUseCloud is false', async () => {
      await service.smartSync(false, false);
      expect(firebaseStorageSpy.getCloudUpdateTimestamp).not.toHaveBeenCalled();
    });

    it('should call custom pullFn or pullFromCloud if cloud timestamp is newer', async () => {
      firebaseStorageSpy.getCloudUpdateTimestamp.mockResolvedValue(200);
      localStorageSpy.getPreference.mockReturnValue('100');

      const pullFn = vi.fn().mockResolvedValue(undefined);
      const migrateFn = vi.fn().mockResolvedValue(undefined);

      await service.smartSync(true, true, pullFn, migrateFn);

      expect(pullFn).toHaveBeenCalledTimes(1);
      expect(migrateFn).not.toHaveBeenCalled();
    });

    it('should call custom migrateFn or migrateLocalToCloud if local timestamp is newer', async () => {
      firebaseStorageSpy.getCloudUpdateTimestamp.mockResolvedValue(100);
      localStorageSpy.getPreference.mockReturnValue('200');

      const pullFn = vi.fn().mockResolvedValue(undefined);
      const migrateFn = vi.fn().mockResolvedValue(undefined);

      await service.smartSync(true, true, pullFn, migrateFn);

      expect(migrateFn).toHaveBeenCalledTimes(1);
      expect(pullFn).not.toHaveBeenCalled();
    });
  });

  describe('pullFromCloud and onDataRefreshedCallback', () => {
    it('should throw if canUseCloud is false', async () => {
      await expect(service.pullFromCloud(false)).rejects.toThrow(
        'Cannot pull: user not authenticated',
      );
    });

    it('should pull cloud data and trigger onDataRefreshed callback', async () => {
      const refreshedSpy = vi.fn();
      service.setOnDataRefreshed(refreshedSpy);

      firebaseStorageSpy.exportAll.mockResolvedValue({
        storage_mode: 'cloud',
        theme: 'dark',
        water_consumption_records: [{ date: '2026-09-01', kitchenWarm: 10 }],
      });

      await service.pullFromCloud(true);

      expect(localStorageSpy.importAll).toHaveBeenCalled();
      expect(refreshedSpy).toHaveBeenCalled();
    });
  });

  describe('migrateLocalToCloud', () => {
    it('should throw if canUseCloud is false', async () => {
      await expect(service.migrateLocalToCloud(false)).rejects.toThrow(
        'Cannot migrate: user not authenticated',
      );
    });

    it('should export local data and save valid records and settings to firebase', async () => {
      localStorageSpy.exportAll.mockResolvedValue({
        water_consumption_records: [{ date: '2026-09-01', kitchenWarm: 10 }],
        theme: 'dark',
      });

      await service.migrateLocalToCloud(true);

      expect(firebaseStorageSpy.updateSettings).toHaveBeenCalledWith({ theme: 'dark' });
      expect(firebaseStorageSpy.save).toHaveBeenCalledWith(
        'water_consumption_records',
        expect.any(Array),
      );
    });
  });

  describe('clearCloudData', () => {
    it('should throw if canUseCloud is false', async () => {
      await expect(service.clearCloudData(false)).rejects.toThrow(
        'Cannot clear cloud data: user not authenticated',
      );
    });

    it('should call deleteAllUserData and clear last sync time', async () => {
      await service.clearCloudData(true);

      expect(firebaseStorageSpy.deleteAllUserData).toHaveBeenCalled();
      expect(service.lastSyncTime()).toBeNull();
    });
  });

  describe('fullSync', () => {
    it('should call migrate then pull', async () => {
      const migrateSpy = vi.spyOn(service, 'migrateLocalToCloud').mockResolvedValue(undefined);
      const pullSpy = vi.spyOn(service, 'pullFromCloud').mockResolvedValue(undefined);

      await service.fullSync(true);

      expect(migrateSpy).toHaveBeenCalled();
      expect(pullSpy).toHaveBeenCalled();
    });
  });
});
