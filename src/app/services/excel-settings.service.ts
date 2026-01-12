import { Injectable, signal, effect, inject, untracked } from '@angular/core';
import { STORAGE_SERVICE, StorageService } from './storage.service';
import { HeatingRoomsService } from './heating-rooms.service';

export interface WaterColumnMapping {
  date: string;
  kitchenWarm: string;
  kitchenCold: string;
  bathroomWarm: string;
  bathroomCold: string;
}

/**
 * Dynamic heating column mapping - supports dynamic rooms for export/import
 */
export interface HeatingColumnMapping {
  date: string;
  /** Map of room ID to column name for dynamic export/import */
  rooms: Record<string, string>;
}

export interface ExcelSettings {
  enabled: boolean;
  waterMapping: WaterColumnMapping;
  heatingMapping: HeatingColumnMapping;
}

@Injectable({
  providedIn: 'root'
})
export class ExcelSettingsService {
  private storage = inject(STORAGE_SERVICE);
  private heatingRoomsService = inject(HeatingRoomsService);
  private isInitialized = false;

  readonly settings = signal<ExcelSettings>(this.getDefaultSettings());

  constructor() {
    this.loadSettings();

    effect(() => {
      const currentSettings = this.settings();
      if (this.isInitialized) {
        untracked(() => this.storage.save('excel_settings', currentSettings));
      }
    });
  }

  private getDefaultSettings(): ExcelSettings {
    return {
      enabled: false,
      waterMapping: this.getDefaultWaterMapping(),
      heatingMapping: this.getDefaultHeatingMapping()
    };
  }

  private getDefaultWaterMapping(): WaterColumnMapping {
    return {
      date: 'Date',
      kitchenWarm: 'Kitchen Warm Water',
      kitchenCold: 'Kitchen Cold Water',
      bathroomWarm: 'Bathroom Warm Water',
      bathroomCold: 'Bathroom Cold Water'
    };
  }

  private getDefaultHeatingMapping(): HeatingColumnMapping {
    const configuredRooms = this.heatingRoomsService.rooms();
    const rooms: Record<string, string> = {};

    // Use configured room names as default column names
    configuredRooms.forEach(room => {
      rooms[room.id] = room.name;
    });

    return {
      date: 'Date',
      rooms
    };
  }

  private async loadSettings() {
    const settings = await this.storage.load<ExcelSettings>('excel_settings');
    if (settings) {
      this.settings.set({
        enabled: settings.enabled ?? false,
        waterMapping: { ...this.getDefaultWaterMapping(), ...settings.waterMapping },
        heatingMapping: { ...this.getDefaultHeatingMapping(), ...settings.heatingMapping }
      });
    }
    // Delay initialization flag to ensure initial signal updates don't trigger effects
    setTimeout(() => {
      this.isInitialized = true;
    }, 0);
  }

  updateSettings(settings: ExcelSettings) {
    this.settings.set(settings);
  }

  resetToDefaults() {
    this.settings.set(this.getDefaultSettings());
  }

  getWaterMapping(): WaterColumnMapping {
    return this.settings().waterMapping;
  }

  getHeatingMapping(): HeatingColumnMapping {
    const stored = this.settings().heatingMapping;
    const currentRooms = this.heatingRoomsService.rooms();
    const rooms: Record<string, string> = {};

    // Build mapping using stored names or falling back to room display names
    currentRooms.forEach(room => {
      rooms[room.id] = stored.rooms?.[room.id] || room.name;
    });

    return {
      date: stored.date || 'Date',
      rooms
    };
  }

  isEnabled(): boolean {
    return this.settings().enabled;
  }
}
