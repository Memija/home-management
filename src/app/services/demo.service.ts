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
  providedIn: 'root',
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
    'water_consumption_records',
    'heating_consumption_records',
    'heating_room_configuration',
    'electricity_consumption_records',
    'household_members',
    'household_address',
    'excel_settings',
    'water_chart_view',
    'water_display_mode',
    'heating_chart_view',
    'heating_display_mode',
    'electricity_chart_view',
    'electricity_display_mode',
  ];

  // Preference keys used by the app (stored via setPreference with hm_ prefix)
  private readonly preferenceKeys = [
    'water_confirmed_meter_changes',
    'water_dismissed_meter_changes',
    'heating_confirmed_spikes',
    'heating_dismissed_spikes',
    'storage_mode',
    'last_sync_timestamp',
    'water_chart_average_visible',
    'heating_chart_average_visible',
    'electricity_chart_average_visible',
    'water_chart_trendline_visible',
    'heating_chart_trendline_visible',
    'electricity_chart_trendline_visible',
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
        await this.storage.save('water_consumption_records', demoData.waterRecords);
      }
      if (demoData.heatingRecords) {
        await this.storage.save('heating_consumption_records', demoData.heatingRecords);
      }
      if (demoData.heatingSettings) {
        await this.storage.save('heating_room_configuration', demoData.heatingSettings);
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

      // Set demo-optimal chart preferences: average (incremental) + detailed/by-room views
      await this.storage.save('water_chart_view', 'detailed');
      await this.storage.save('water_display_mode', 'incremental');
      await this.storage.save('heating_chart_view', 'by-room');
      await this.storage.save('heating_display_mode', 'incremental');
      await this.storage.save('electricity_chart_view', 'detailed');
      await this.storage.save('electricity_display_mode', 'incremental');

      // Enable "Show Average" comparison on all chart pages for demo
      this.storage.setPreference('electricity_chart_average_visible', 'true');
      this.storage.setPreference('heating_chart_average_visible', 'false');
      this.storage.setPreference('water_chart_average_visible', 'true');

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
      // 1. Read backups to memory BEFORE clearing
      const rawBackupJson = localStorage.getItem('hm_user_backup_raw');
      const oldBackupJson = localStorage.getItem('hm_user_backup');

      // 2. Wipe everything starting with hm_ (purges ALL demo data safely)
      await this.storage.clearAll();

      // 3. Restore the user's exactly previous data
      if (rawBackupJson) {
        // New exact restore method
        try {
          const rawBackup = JSON.parse(rawBackupJson) as Record<string, string>;
          for (const [key, value] of Object.entries(rawBackup)) {
            localStorage.setItem(key, value);
          }
        } catch (e) {
          console.error('Failed to parse raw user backup', e);
        }
      } else if (oldBackupJson) {
        // Fallback for users who entered demo mode before this update
        try {
          const backup = JSON.parse(oldBackupJson) as {
            storage?: Record<string, unknown>;
            preferences?: Record<string, string>;
          };

          // Restore storage data
          if (backup.storage) {
            // Protect preference strings from being double-JSONified
            const stringPrefKeys = ['theme', 'preferred_language', 'storage_mode', 'last_sync_timestamp'];
            
            for (const [key, value] of Object.entries(backup.storage)) {
              if (stringPrefKeys.includes(key) && typeof value === 'string') {
                this.storage.setPreference(key, value);
              } else {
                await this.storage.save(key, value);
              }
            }
          }

          // Restore preferences (like meter change confirmations)
          if (backup.preferences) {
            for (const [key, value] of Object.entries(backup.preferences)) {
              this.storage.setPreference(key, value);
            }
          }
        } catch (e) {
          console.error('Failed to restore legacy user backup', e);
        }
      }

      // Ensure flags and backups are definitely removed
      localStorage.removeItem('hm_user_backup');
      localStorage.removeItem('hm_user_backup_raw');
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

    // EXACT BACKUP: Backup all hm_ keys verbatim as strings
    // This perfectly captures the user environment without JSON parsing bugs
    const rawBackup: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key?.startsWith('hm_') &&
        key !== 'hm_demo_mode_is_active' &&
        key !== 'hm_user_backup' &&
        key !== 'hm_user_backup_raw'
      ) {
        rawBackup[key] = localStorage.getItem(key)!;
      }
    }

    if (Object.keys(rawBackup).length > 0) {
      localStorage.setItem('hm_user_backup_raw', JSON.stringify(rawBackup));
    }

    const [
      waterRecords,
      heatingRecords,
      heatingSettings,
      electricityRecords,
      family,
      address,
      excelSettings,
    ] = await Promise.all([
      this.fetchJson(`${baseUrl}/water-consumption.json`),
      this.fetchJson(`${baseUrl}/heating-consumption.json`),
      this.fetchJson(`${baseUrl}/heating-settings.json`),
      this.fetchJson(`${baseUrl}/electricity-consumption.json`),
      this.fetchJson(`${baseUrl}/family.json`),
      this.fetchJson(`${baseUrl}/address.json`),
      this.fetchJson(`${baseUrl}/excel-settings.json`),
    ]);

    return {
      waterRecords: (waterRecords as unknown[] | null) ?? [],
      heatingRecords: (heatingRecords as unknown[] | null) ?? [],
      heatingSettings: (heatingSettings as unknown[] | null) ?? [],
      electricityRecords: (electricityRecords as unknown[] | null) ?? [],
      family: (family as unknown[] | null) ?? [],
      address: address ?? null,
      excelSettings: excelSettings ?? null,
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
