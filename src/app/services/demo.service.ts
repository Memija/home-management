import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LocalStorageService } from './local-storage.service';

interface DemoData {
  waterRecords: unknown[];
  heatingRecords: unknown[];
  heatingSettings: unknown[];
  electricityRecords: unknown[];
  family: unknown[];
  address: unknown;
  excelSettings: unknown;
}

/**
 * Service to manage demo mode functionality.
 * Allows users to experience the app with sample data.
 */
@Injectable({
  providedIn: 'root'
})
export class DemoService {
  private platformId = inject(PLATFORM_ID);
  private storage = inject(LocalStorageService);

  // Demo mode state
  readonly isDemoMode = signal(false);
  readonly isLoading = signal(false);

  // Backup of user's real data (stored in memory during demo)
  private userDataBackup: Record<string, unknown> | null = null;

  // Storage keys used by the app (data stored via storage.save)
  private readonly storageKeys = [
    'water_records',
    'heating_consumption_records',
    'heating_room_config',
    'electricity_consumption_records',
    'household_members',
    'household_address',
    'excel_settings'
  ];

  // Preference keys used by the app (stored via setPreference with hm_ prefix)
  private readonly preferenceKeys = [
    'water_confirmed_meter_changes',
    'water_dismissed_meter_changes',
    'storage_mode',
    'last_sync_timestamp'
  ];

  constructor() {
    // Check if demo mode was active on page load
    if (this.isBrowser) {
      const demoFlag = localStorage.getItem('hm_demo_mode_is_active');
      if (demoFlag === 'true') {
        this.isDemoMode.set(true);
      }
    }
  }

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /**
   * Activate demo mode by loading sample data
   */
  async activateDemo(): Promise<void> {
    if (!this.isBrowser || this.isDemoMode()) return;

    this.isLoading.set(true);

    try {
      // Backup current user data
      this.userDataBackup = await this.storage.exportAll();

      // Load demo data from public/demo folder
      const demoData = await this.loadDemoData();

      // Save demo data to storage
      if (demoData.waterRecords) {
        await this.storage.save('water_records', demoData.waterRecords);
      }
      if (demoData.heatingRecords) {
        await this.storage.save('heating_consumption_records', demoData.heatingRecords);
      }
      if (demoData.heatingSettings) {
        await this.storage.save('heating_room_config', demoData.heatingSettings);
      }
      if (demoData.family) {
        await this.storage.save('household_members', demoData.family);
      }
      if (demoData.address) {
        await this.storage.save('household_address', demoData.address);
      }
      if (demoData.electricityRecords) {
        await this.storage.save('electricity_consumption_records', demoData.electricityRecords);
      }
      if (demoData.excelSettings) {
        await this.storage.save('excel_settings', demoData.excelSettings);
      }

      // Clear preference keys (like meter change confirmations) so user can experience them in demo
      for (const key of this.preferenceKeys) {
        this.storage.removePreference(key);
      }

      // Set demo mode flag
      localStorage.setItem('hm_demo_mode_is_active', 'true');
      this.isDemoMode.set(true);

      // Force page reload to reinitialize services with demo data
      window.location.reload();
    } catch (error) {
      console.error('Failed to activate demo mode:', error);
      // Restore backup if activation failed
      if (this.userDataBackup) {
        await this.storage.importAll(this.userDataBackup);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Deactivate demo mode and restore user's real data
   */
  async deactivateDemo(): Promise<void> {
    if (!this.isBrowser || !this.isDemoMode()) return;

    this.isLoading.set(true);

    try {
      // Clear demo data from all known storage keys
      for (const key of this.storageKeys) {
        await this.storage.delete(key);
      }

      // Clear demo preferences
      for (const key of this.preferenceKeys) {
        this.storage.removePreference(key);
      }

      // Restore user's backed up data if available
      const backupJson = localStorage.getItem('hm_user_backup');
      if (backupJson) {
        try {
          const backup = JSON.parse(backupJson) as {
            storage?: Record<string, unknown>;
            preferences?: Record<string, string>;
          };

          // Restore storage data
          if (backup.storage) {
            await this.storage.importAll(backup.storage);
          }

          // Restore preferences (like meter change confirmations)
          if (backup.preferences) {
            for (const [key, value] of Object.entries(backup.preferences)) {
              this.storage.setPreference(key, value);
            }
          }
        } catch {
          // Backup corrupted, user starts fresh
        }
        localStorage.removeItem('hm_user_backup');
      }

      // Clear demo mode flag
      localStorage.removeItem('hm_demo_mode_is_active');
      this.isDemoMode.set(false);

      // Force page reload to reinitialize services with user data
      window.location.reload();
    } catch (error) {
      console.error('Failed to deactivate demo mode:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Load demo data from JSON files in public/demo folder
   */
  private async loadDemoData(): Promise<DemoData> {
    const baseUrl = '/demo';

    // Backup user data before loading demo
    const currentData = await this.storage.exportAll();

    // Also backup preferences (like meter change confirmations)
    const preferencesBackup: Record<string, string> = {};
    for (const key of this.preferenceKeys) {
      const value = this.storage.getPreference(key);
      if (value !== null) {
        preferencesBackup[key] = value;
      }
    }

    // Store combined backup
    const fullBackup = {
      storage: currentData,
      preferences: preferencesBackup
    };
    if (Object.keys(currentData).length > 0 || Object.keys(preferencesBackup).length > 0) {
      localStorage.setItem('hm_user_backup', JSON.stringify(fullBackup));
    }

    const [waterRecords, heatingRecords, heatingSettings, electricityRecords, family, address, excelSettings] = await Promise.all([
      this.fetchJson(`${baseUrl}/water-consumption.json`),
      this.fetchJson(`${baseUrl}/heating-consumption.json`),
      this.fetchJson(`${baseUrl}/heating-settings.json`),
      this.fetchJson(`${baseUrl}/electricity-consumption.json`),
      this.fetchJson(`${baseUrl}/family.json`),
      this.fetchJson(`${baseUrl}/address.json`),
      this.fetchJson(`${baseUrl}/excel-settings.json`)
    ]);

    return {
      waterRecords: (waterRecords as unknown[] | null) ?? [],
      heatingRecords: (heatingRecords as unknown[] | null) ?? [],
      heatingSettings: (heatingSettings as unknown[] | null) ?? [],
      electricityRecords: (electricityRecords as unknown[] | null) ?? [],
      family: (family as unknown[] | null) ?? [],
      address: address ?? null,
      excelSettings: excelSettings ?? null
    };
  }

  /**
   * Fetch JSON from a URL
   */
  private async fetchJson(url: string): Promise<unknown> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch ${url}: ${response.status}`);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.warn(`Error fetching ${url}:`, error);
      return null;
    }
  }
}
