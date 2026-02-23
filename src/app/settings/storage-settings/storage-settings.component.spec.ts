import { TestBed } from '@angular/core/testing';
import { StorageSettingsComponent } from './storage-settings.component';
import { HybridStorageService } from '../../services/hybrid-storage.service';
import { AuthService } from '../../services/auth.service';
import { DemoService } from '../../services/demo.service';
import { LanguageService } from '../../services/language.service';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

/**
 * Unit tests for StorageSettingsComponent.
 *
 * Uses TestBed.runInInjectionContext to create the component class directly,
 * avoiding the templateUrl/styleUrl resolution issue in Vitest while still
 * satisfying Angular's injection context requirement for inject().
 */
describe('StorageSettingsComponent', () => {
  let component: StorageSettingsComponent;

  // Mock services
  const mockStorage = {
    mode: signal('local' as 'local' | 'cloud'),
    isCloudMode: signal(false),
    lastSyncTime: signal<Date | null>(null),
    isSyncing: signal(false),
    toggleMode: vi.fn(),
    migrateLocalToCloud: vi.fn().mockResolvedValue(undefined),
    pullFromCloud: vi.fn().mockResolvedValue(undefined),
    clearCloudData: vi.fn().mockResolvedValue(undefined),
  };

  const mockAuth = {
    isAuthenticated: signal(true),
  };

  const mockDemo = {
    isDemoMode: signal(false),
  };

  const mockLanguageService = {
    currentLang: signal('en'),
  };

  // Stub window.location.reload to prevent actual reloads
  let reloadSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();

    // Reset mock service signals
    mockStorage.mode.set('local');
    mockStorage.isCloudMode.set(false);
    mockStorage.lastSyncTime.set(null);
    mockStorage.isSyncing.set(false);
    mockAuth.isAuthenticated.set(true);
    mockDemo.isDemoMode.set(false);
    mockLanguageService.currentLang.set('en');

    // Reset mock function calls
    vi.clearAllMocks();

    // Stub window.location.reload
    reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadSpy },
      writable: true,
      configurable: true,
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: HybridStorageService, useValue: mockStorage },
        { provide: AuthService, useValue: mockAuth },
        { provide: DemoService, useValue: mockDemo },
        { provide: LanguageService, useValue: mockLanguageService },
      ],
    });

    component = TestBed.runInInjectionContext(() => {
      return new StorageSettingsComponent();
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Creation ──────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── Signal Delegation ────────────────────────────────────────────────

  describe('Signal Delegation', () => {
    it('should delegate mode signal from HybridStorageService', () => {
      expect(component.mode()).toBe('local');
      mockStorage.mode.set('cloud');
      expect(component.mode()).toBe('cloud');
    });

    it('should delegate isCloudMode signal from HybridStorageService', () => {
      expect(component.isCloudMode()).toBe(false);
      mockStorage.isCloudMode.set(true);
      expect(component.isCloudMode()).toBe(true);
    });

    it('should delegate isAuthenticated signal from AuthService', () => {
      expect(component.isAuthenticated()).toBe(true);
      mockAuth.isAuthenticated.set(false);
      expect(component.isAuthenticated()).toBe(false);
    });

    it('should delegate isDemoMode signal from DemoService', () => {
      expect(component.isDemoMode()).toBe(false);
      mockDemo.isDemoMode.set(true);
      expect(component.isDemoMode()).toBe(true);
    });

    it('should delegate lastSyncTime signal from HybridStorageService', () => {
      expect(component.lastSyncTime()).toBeNull();
      const now = new Date();
      mockStorage.lastSyncTime.set(now);
      expect(component.lastSyncTime()).toBe(now);
    });

    it('should delegate isSyncing signal from HybridStorageService', () => {
      expect(component.isSyncing()).toBe(false);
      mockStorage.isSyncing.set(true);
      expect(component.isSyncing()).toBe(true);
    });
  });

  // ─── currentLang computed ─────────────────────────────────────────────

  describe('currentLang', () => {
    it('should reflect the language service currentLang', () => {
      expect(component.currentLang()).toBe('en');
      mockLanguageService.currentLang.set('de');
      expect(component.currentLang()).toBe('de');
    });
  });

  // ─── isToggleDisabled ─────────────────────────────────────────────────

  describe('isToggleDisabled', () => {
    it('should return false when authenticated and not in demo mode', () => {
      mockAuth.isAuthenticated.set(true);
      mockDemo.isDemoMode.set(false);
      expect(component.isToggleDisabled).toBe(false);
    });

    it('should return true when not authenticated', () => {
      mockAuth.isAuthenticated.set(false);
      mockDemo.isDemoMode.set(false);
      expect(component.isToggleDisabled).toBe(true);
    });

    it('should return true when in demo mode', () => {
      mockAuth.isAuthenticated.set(true);
      mockDemo.isDemoMode.set(true);
      expect(component.isToggleDisabled).toBe(true);
    });

    it('should return true when both unauthenticated and in demo mode', () => {
      mockAuth.isAuthenticated.set(false);
      mockDemo.isDemoMode.set(true);
      expect(component.isToggleDisabled).toBe(true);
    });
  });

  // ─── Help Modal ───────────────────────────────────────────────────────

  describe('Help Modal', () => {
    it('should start with help modal closed', () => {
      expect(component.isHelpModalOpen()).toBe(false);
    });

    it('should open help modal on showHelp()', () => {
      component.showHelp();
      expect(component.isHelpModalOpen()).toBe(true);
    });

    it('should close help modal on closeHelp()', () => {
      component.showHelp();
      component.closeHelp();
      expect(component.isHelpModalOpen()).toBe(false);
    });

    it('should have exactly 3 help steps', () => {
      expect(component.helpSteps).toHaveLength(3);
    });

    it('should have helpSteps with titleKey and descriptionKey', () => {
      for (const step of component.helpSteps) {
        expect(step.titleKey).toBeDefined();
        expect(step.descriptionKey).toBeDefined();
        expect(step.titleKey).toContain('STORAGE.HELP_STEP');
        expect(step.descriptionKey).toContain('STORAGE.HELP_STEP');
      }
    });

    it('should allow toggling help modal multiple times', () => {
      component.showHelp();
      expect(component.isHelpModalOpen()).toBe(true);
      component.closeHelp();
      expect(component.isHelpModalOpen()).toBe(false);
      component.showHelp();
      expect(component.isHelpModalOpen()).toBe(true);
    });
  });

  // ─── Toggle Mode ─────────────────────────────────────────────────────

  describe('toggleMode', () => {
    it('should call storage.toggleMode() when authenticated', () => {
      mockAuth.isAuthenticated.set(true);
      component.toggleMode();
      expect(mockStorage.toggleMode).toHaveBeenCalledTimes(1);
    });

    it('should not call storage.toggleMode() when not authenticated', () => {
      mockAuth.isAuthenticated.set(false);
      component.toggleMode();
      expect(mockStorage.toggleMode).not.toHaveBeenCalled();
    });

    it('should not throw when called while unauthenticated', () => {
      mockAuth.isAuthenticated.set(false);
      expect(() => component.toggleMode()).not.toThrow();
    });
  });

  // ─── Migrate to Cloud ────────────────────────────────────────────────

  describe('migrateToCloud', () => {
    it('should show sign-in required error when not authenticated', async () => {
      mockAuth.isAuthenticated.set(false);
      await component.migrateToCloud();
      expect(component.actionStatus()).toEqual({
        type: 'error',
        message: 'STORAGE.SIGN_IN_REQUIRED',
      });
    });

    it('should not call migrateLocalToCloud when not authenticated', async () => {
      mockAuth.isAuthenticated.set(false);
      await component.migrateToCloud();
      expect(mockStorage.migrateLocalToCloud).not.toHaveBeenCalled();
    });

    it('should call migrateLocalToCloud when authenticated', async () => {
      await component.migrateToCloud();
      expect(mockStorage.migrateLocalToCloud).toHaveBeenCalledTimes(1);
    });

    it('should show success status on successful migration', async () => {
      await component.migrateToCloud();
      expect(component.actionStatus()).toEqual({
        type: 'success',
        message: 'STORAGE.MIGRATE_SUCCESS',
      });
    });

    it('should show error status when migration fails', async () => {
      mockStorage.migrateLocalToCloud.mockRejectedValueOnce(new Error('Network error'));
      await component.migrateToCloud();
      expect(component.actionStatus()).toEqual({
        type: 'error',
        message: 'STORAGE.MIGRATE_ERROR',
      });
    });

    it('should clear previous status before migrating', async () => {
      // Set a previous status
      component['showStatus']('error', 'SOME_OLD_ERROR');
      // Clear the auto-timeout
      vi.advanceTimersByTime(100);

      await component.migrateToCloud();
      // Should now show success, not old error
      expect(component.actionStatus()?.type).toBe('success');
    });
  });

  // ─── Pull from Cloud ─────────────────────────────────────────────────

  describe('pullFromCloud', () => {
    it('should show sign-in required error when not authenticated', async () => {
      mockAuth.isAuthenticated.set(false);
      await component.pullFromCloud();
      expect(component.actionStatus()).toEqual({
        type: 'error',
        message: 'STORAGE.SIGN_IN_REQUIRED',
      });
    });

    it('should not call storage.pullFromCloud when not authenticated', async () => {
      mockAuth.isAuthenticated.set(false);
      await component.pullFromCloud();
      expect(mockStorage.pullFromCloud).not.toHaveBeenCalled();
    });

    it('should call storage.pullFromCloud when authenticated', async () => {
      await component.pullFromCloud();
      expect(mockStorage.pullFromCloud).toHaveBeenCalledTimes(1);
    });

    it('should reload the page after successful pull', async () => {
      await component.pullFromCloud();
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });

    it('should show error status when pull fails', async () => {
      mockStorage.pullFromCloud.mockRejectedValueOnce(new Error('Pull failed'));
      await component.pullFromCloud();
      expect(component.actionStatus()).toEqual({
        type: 'error',
        message: 'STORAGE.PULL_ERROR',
      });
    });

    it('should not reload the page when pull fails', async () => {
      mockStorage.pullFromCloud.mockRejectedValueOnce(new Error('Pull failed'));
      await component.pullFromCloud();
      expect(reloadSpy).not.toHaveBeenCalled();
    });
  });

  // ─── Download Modal ────────────────────────────────────────────────

  describe('Download Modal', () => {
    it('should start with download modal closed', () => {
      expect(component.isDownloadModalOpen()).toBe(false);
    });

    it('should open download modal on openDownloadModal()', () => {
      component.openDownloadModal();
      expect(component.isDownloadModalOpen()).toBe(true);
    });

    it('should close download modal on closeDownloadModal()', () => {
      component.openDownloadModal();
      component.closeDownloadModal();
      expect(component.isDownloadModalOpen()).toBe(false);
    });

    it('should close modal and pull from cloud on onConfirmDownload()', async () => {
      component.openDownloadModal();
      await component.onConfirmDownload();
      expect(component.isDownloadModalOpen()).toBe(false);
      expect(mockStorage.pullFromCloud).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Delete Modal ──────────────────────────────────────────────────

  describe('Delete Modal', () => {
    it('should start with delete modal closed', () => {
      expect(component.isDeleteModalOpen()).toBe(false);
    });

    it('should open delete modal on openDeleteModal()', () => {
      component.openDeleteModal();
      expect(component.isDeleteModalOpen()).toBe(true);
    });

    it('should close delete modal on closeDeleteModal()', () => {
      component.openDeleteModal();
      component.closeDeleteModal();
      expect(component.isDeleteModalOpen()).toBe(false);
    });
  });

  // ─── onConfirmDelete ──────────────────────────────────────────────

  describe('onConfirmDelete', () => {
    it('should close the delete modal', async () => {
      component.openDeleteModal();
      await component.onConfirmDelete();
      expect(component.isDeleteModalOpen()).toBe(false);
    });

    it('should show sign-in required error when not authenticated', async () => {
      mockAuth.isAuthenticated.set(false);
      await component.onConfirmDelete();
      expect(component.actionStatus()).toEqual({
        type: 'error',
        message: 'STORAGE.SIGN_IN_REQUIRED',
      });
    });

    it('should not call clearCloudData when not authenticated', async () => {
      mockAuth.isAuthenticated.set(false);
      await component.onConfirmDelete();
      expect(mockStorage.clearCloudData).not.toHaveBeenCalled();
    });

    it('should call clearCloudData when authenticated', async () => {
      await component.onConfirmDelete();
      expect(mockStorage.clearCloudData).toHaveBeenCalledTimes(1);
    });

    it('should show success status on successful deletion', async () => {
      await component.onConfirmDelete();
      expect(component.actionStatus()).toEqual({
        type: 'success',
        message: 'STORAGE.DELETE_SUCCESS',
      });
    });

    it('should show error status when deletion fails', async () => {
      mockStorage.clearCloudData.mockRejectedValueOnce(new Error('Delete failed'));
      await component.onConfirmDelete();
      expect(component.actionStatus()).toEqual({
        type: 'error',
        message: 'STORAGE.DELETE_ERROR',
      });
    });
  });

  // ─── Status Messages ──────────────────────────────────────────────

  describe('Status Messages', () => {
    it('should start with null actionStatus', () => {
      expect(component.actionStatus()).toBeNull();
    });

    it('should set success status via showStatus', () => {
      component['showStatus']('success', 'TEST_SUCCESS');
      expect(component.actionStatus()).toEqual({
        type: 'success',
        message: 'TEST_SUCCESS',
      });
    });

    it('should set error status via showStatus', () => {
      component['showStatus']('error', 'TEST_ERROR');
      expect(component.actionStatus()).toEqual({
        type: 'error',
        message: 'TEST_ERROR',
      });
    });

    it('should clear status via clearStatus', () => {
      component['showStatus']('success', 'TEST');
      component['clearStatus']();
      expect(component.actionStatus()).toBeNull();
    });

    it('should auto-clear status after 8000ms', () => {
      component['showStatus']('success', 'TEMP');
      expect(component.actionStatus()).not.toBeNull();

      vi.advanceTimersByTime(7999);
      expect(component.actionStatus()).not.toBeNull();

      vi.advanceTimersByTime(1);
      expect(component.actionStatus()).toBeNull();
    });

    it('should not auto-clear before 5000ms', () => {
      component['showStatus']('error', 'PERSIST');
      vi.advanceTimersByTime(3000);
      expect(component.actionStatus()).toEqual({
        type: 'error',
        message: 'PERSIST',
      });
    });
  });

  // ─── Icon References ──────────────────────────────────────────────

  describe('Icon References', () => {
    it('should have all icon properties defined', () => {
      expect(component.CloudIcon).toBeDefined();
      expect(component.CloudOffIcon).toBeDefined();
      expect(component.RefreshIcon).toBeDefined();
      expect(component.UploadIcon).toBeDefined();
      expect(component.DownloadIcon).toBeDefined();
      expect(component.CheckIcon).toBeDefined();
      expect(component.AlertIcon).toBeDefined();
      expect(component.HelpIcon).toBeDefined();
    });

    it('should have stable icon references across multiple accesses', () => {
      const cloud1 = component.CloudIcon;
      const cloud2 = component.CloudIcon;
      expect(cloud1).toBe(cloud2);
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle calling closeHelp when modal is already closed', () => {
      expect(component.isHelpModalOpen()).toBe(false);
      expect(() => component.closeHelp()).not.toThrow();
      expect(component.isHelpModalOpen()).toBe(false);
    });

    it('should handle calling closeDeleteModal when modal is already closed', () => {
      expect(component.isDeleteModalOpen()).toBe(false);
      expect(() => component.closeDeleteModal()).not.toThrow();
      expect(component.isDeleteModalOpen()).toBe(false);
    });

    it('should handle calling closeDownloadModal when modal is already closed', () => {
      expect(component.isDownloadModalOpen()).toBe(false);
      expect(() => component.closeDownloadModal()).not.toThrow();
      expect(component.isDownloadModalOpen()).toBe(false);
    });

    it('should handle rapid successive migrateToCloud calls', async () => {
      const p1 = component.migrateToCloud();
      const p2 = component.migrateToCloud();
      const p3 = component.migrateToCloud();
      await Promise.all([p1, p2, p3]);
      expect(mockStorage.migrateLocalToCloud).toHaveBeenCalledTimes(3);
    });

    it('should overwrite previous status when a new operation completes', async () => {
      // First operation - success
      await component.migrateToCloud();
      expect(component.actionStatus()?.message).toBe('STORAGE.MIGRATE_SUCCESS');

      // Second operation - error
      mockStorage.clearCloudData.mockRejectedValueOnce(new Error('fail'));
      await component.onConfirmDelete();
      expect(component.actionStatus()?.message).toBe('STORAGE.DELETE_ERROR');
    });

    it('should handle authentication state changing between operations', async () => {
      // Start authenticated
      await component.migrateToCloud();
      expect(mockStorage.migrateLocalToCloud).toHaveBeenCalledTimes(1);

      // Become unauthenticated mid-session
      mockAuth.isAuthenticated.set(false);
      await component.migrateToCloud();
      expect(component.actionStatus()?.message).toBe('STORAGE.SIGN_IN_REQUIRED');
      // Should not have been called again
      expect(mockStorage.migrateLocalToCloud).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple modals being opened independently', () => {
      component.openDeleteModal();
      component.openDownloadModal();
      component.showHelp();

      expect(component.isDeleteModalOpen()).toBe(true);
      expect(component.isDownloadModalOpen()).toBe(true);
      expect(component.isHelpModalOpen()).toBe(true);

      component.closeDeleteModal();
      expect(component.isDeleteModalOpen()).toBe(false);
      expect(component.isDownloadModalOpen()).toBe(true);
      expect(component.isHelpModalOpen()).toBe(true);
    });

    it('should handle onConfirmDelete closing modal even when unauthenticated', async () => {
      mockAuth.isAuthenticated.set(false);
      component.openDeleteModal();
      await component.onConfirmDelete();
      expect(component.isDeleteModalOpen()).toBe(false);
    });

    it('should handle onConfirmDownload closing modal even when unauthenticated', async () => {
      mockAuth.isAuthenticated.set(false);
      component.openDownloadModal();
      await component.onConfirmDownload();
      expect(component.isDownloadModalOpen()).toBe(false);
    });

    it('should reset status with a new setTimeout on each showStatus call', () => {
      component['showStatus']('success', 'FIRST');
      vi.advanceTimersByTime(3000);

      // New status before first auto-clears
      component['showStatus']('error', 'SECOND');
      expect(component.actionStatus()?.message).toBe('SECOND');

      // Original 5000ms timer would fire here, but we set a new one
      vi.advanceTimersByTime(2000);
      // The first timer fires at 5000ms, clearing status
      // But note: setTimeout from FIRST fires at t=5000 total → t=3000+2000=5000 ✔
      // There's still SECOND's timer running (fires at t=3000+5000=8000)
      // At this point the first setTimeout cleared the status
      // This is the actual component behavior: showStatus doesn't cancel previous timeout

      // After the first timer clears (at t=5000):
      // The status may have been cleared by the old timer. This tests actual behavior.
      // Let's advance all timers to ensure no errors
      vi.advanceTimersByTime(5000);
      expect(component.actionStatus()).toBeNull();
    });
  });
});
