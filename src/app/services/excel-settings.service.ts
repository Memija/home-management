import { Injectable, signal, effect, inject, untracked } from '@angular/core';
import { STORAGE_SERVICE, StorageService } from './storage.service';
import { LanguageService } from './language.service';

export interface WaterColumnMapping {
  date: string;
  kitchenWarm: string;
  kitchenCold: string;
  bathroomWarm: string;
  bathroomCold: string;
}

export interface HeatingColumnMapping {
  date: string;
  livingRoom: string;
  bedroom: string;
  kitchen: string;
  bathroom: string;
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
  private languageService = inject(LanguageService);
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
      date: this.languageService.translate('EXCEL.DEFAULT_DATE'),
      kitchenWarm: this.languageService.translate('EXCEL.DEFAULT_KITCHEN_WARM'),
      kitchenCold: this.languageService.translate('EXCEL.DEFAULT_KITCHEN_COLD'),
      bathroomWarm: this.languageService.translate('EXCEL.DEFAULT_BATHROOM_WARM'),
      bathroomCold: this.languageService.translate('EXCEL.DEFAULT_BATHROOM_COLD')
    };
  }

  private getDefaultHeatingMapping(): HeatingColumnMapping {
    return {
      date: this.languageService.translate('EXCEL.DEFAULT_DATE'),
      livingRoom: this.languageService.translate('EXCEL.DEFAULT_LIVING_ROOM'),
      bedroom: this.languageService.translate('EXCEL.DEFAULT_BEDROOM'),
      kitchen: this.languageService.translate('EXCEL.DEFAULT_KITCHEN'),
      bathroom: this.languageService.translate('EXCEL.DEFAULT_BATHROOM')
    };
  }

  private async loadSettings() {
    const settings = await this.storage.load<ExcelSettings>('excel_settings');
    if (settings) {
      // Use stored settings
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
    return this.settings().heatingMapping;
  }

  isEnabled(): boolean {
    return this.settings().enabled;
  }
}
