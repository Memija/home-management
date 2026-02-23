import { Injectable, inject, signal } from '@angular/core';
import { STORAGE_SERVICE } from './storage.service';
import { ChartView, DisplayMode } from '../shared/consumption-chart/consumption-chart.component';

export type ChartType = 'water' | 'heating' | 'home' | 'electricity';

@Injectable({
  providedIn: 'root'
})
export class ConsumptionPreferencesService {
  private storage = inject(STORAGE_SERVICE);

  // Water-specific signals (for backwards compatibility)
  readonly chartView = signal<ChartView>('total');
  readonly displayMode = signal<DisplayMode>('incremental');

  // Heating-specific signals
  readonly heatingChartView = signal<ChartView>('total');
  readonly heatingDisplayMode = signal<DisplayMode>('total');

  // Electricity-specific signals
  readonly electricityChartView = signal<ChartView>('total');
  readonly electricityDisplayMode = signal<DisplayMode>('total');

  // Meter Change Preferences (Water)
  readonly confirmedMeterChanges = signal<string[]>([]);
  readonly dismissedMeterChanges = signal<string[]>([]);

  constructor() {
    this.loadPreferences();
  }

  private async loadPreferences() {
    try {
      await Promise.all([
        this.loadPreference('water', 'total', 'incremental'),
        this.loadPreference('heating', 'total', 'total'),
        this.loadPreference('electricity', 'total', 'total'),
        this.loadMeterChanges()
      ]);
    } catch (error) {
      console.warn('Failed to load preferences from storage:', error);
      // Verify defaults are set (they are initialized with defaults in signal declaration)
    }
  }

  private async loadMeterChanges() {
    const confirmed = await this.storage.load<string[]>('water_confirmed_meter_changes');
    const dismissed = await this.storage.load<string[]>('water_dismissed_meter_changes');

    if (confirmed && Array.isArray(confirmed)) {
      // Normalize dates if needed, though storage should have them correct
      this.confirmedMeterChanges.set(confirmed);
    }

    if (dismissed && Array.isArray(dismissed)) {
      this.dismissedMeterChanges.set(dismissed);
    }
  }

  private async loadPreference(type: ChartType, defaultView: ChartView, defaultMode: DisplayMode) {
    const viewKey = `${type}_chart_view`;
    const modeKey = `${type}_display_mode`;

    const storedView = await this.storage.load<ChartView>(viewKey);
    const storedMode = await this.storage.load<DisplayMode>(modeKey);

    // Update signals based on type
    if (type === 'water') {
      if (storedView) this.chartView.set(storedView);
      if (storedMode) this.displayMode.set(storedMode);
    } else if (type === 'heating') {
      if (storedView) this.heatingChartView.set(storedView);
      if (storedMode) this.heatingDisplayMode.set(storedMode);
    } else if (type === 'electricity') {
      if (storedView) this.electricityChartView.set(storedView);
      if (storedMode) this.electricityDisplayMode.set(storedMode);
    }
  }

  setMeterChangeConfirmed(date: string) {
    this.confirmedMeterChanges.update(current => {
      const updated = [...current, date];
      const unique = [...new Set(updated)];
      this.storage.save('water_confirmed_meter_changes', unique);
      return unique;
    });
  }

  setMeterChangeDismissed(date: string) {
    this.dismissedMeterChanges.update(current => {
      const updated = [...current, date];
      const unique = [...new Set(updated)];
      this.storage.save('water_dismissed_meter_changes', unique);
      return unique;
    });
  }

  setChartView(view: ChartView, chartType: ChartType = 'water') {
    const key = `${chartType}_chart_view`;
    this.storage.save(key, view);

    if (chartType === 'water') {
      this.chartView.set(view);
    } else if (chartType === 'heating') {
      this.heatingChartView.set(view);
    } else if (chartType === 'electricity') {
      this.electricityChartView.set(view);
    }
  }

  setDisplayMode(mode: DisplayMode, chartType: ChartType = 'water') {
    const key = `${chartType}_display_mode`;
    this.storage.save(key, mode);

    if (chartType === 'water') {
      this.displayMode.set(mode);
    } else if (chartType === 'heating') {
      this.heatingDisplayMode.set(mode);
    } else if (chartType === 'electricity') {
      this.electricityDisplayMode.set(mode);
    }
  }
}
