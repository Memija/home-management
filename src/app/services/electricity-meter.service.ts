import { Injectable, inject, signal } from '@angular/core';
import { LocalStorageService } from './local-storage.service';
import { ElectricityRecord, parseSafeDate } from '../models/records.model';

@Injectable({
  providedIn: 'root',
})
export class ElectricityMeterService {
  private readonly localStorageService = inject(LocalStorageService);
  private readonly meterChangesCache = new WeakMap<
    ElectricityRecord[],
    { length: number; changes: string[] }
  >();

  // Signals for stored state
  readonly confirmedMeterChanges = signal<string[]>(this.getStoredMeterChanges());
  readonly dismissedMeterChanges = signal<string[]>(this.getStoredDismissedMeterChanges());

  /**
   * Detects meter changes (drops in value) in the provided records.
   * Returns an array of dates (ISO strings) where a drop occurred.
   */
  detectMeterChanges(records: ElectricityRecord[]): string[] {
    const cached = this.meterChangesCache.get(records);
    if (cached && cached.length === records.length) {
      return cached.changes;
    }

    const changes: string[] = [];
    for (let i = 1; i < records.length; i++) {
      const curr = records[i];
      const prev = records[i - 1];
      if (curr.value < prev.value) {
        changes.push(parseSafeDate(curr.date).toISOString());
      }
    }

    this.meterChangesCache.set(records, { length: records.length, changes });
    return changes;
  }

  /**
   * filters detected changes against confirmed and dismissed changes.
   */
  filterUnconfirmed(detectedChanges: string[]): string[] {
    if (detectedChanges.length === 0) return [];
    const ignored = new Set<string>([
      ...this.confirmedMeterChanges(),
      ...this.dismissedMeterChanges(),
    ]);
    return detectedChanges.filter((d) => !ignored.has(d));
  }

  confirmMeterChange(date: string): void {
    this.confirmedMeterChanges.update((changes) => [...changes, date]);
    this.saveMeterChanges();
  }

  dismissMeterChange(date: string): void {
    this.dismissedMeterChanges.update((changes) => [...changes, date]);
    this.saveMeterChanges();
  }

  // --- Private Storage Logic ---

  private getStoredMeterChanges(): string[] {
    const stored = this.localStorageService.getPreference('electricity_confirmed_meter_changes');
    try {
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private getStoredDismissedMeterChanges(): string[] {
    const stored = this.localStorageService.getPreference('electricity_dismissed_meter_changes');
    try {
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveMeterChanges(): void {
    this.localStorageService.setPreference(
      'electricity_confirmed_meter_changes',
      JSON.stringify(this.confirmedMeterChanges()),
    );
    this.localStorageService.setPreference(
      'electricity_dismissed_meter_changes',
      JSON.stringify(this.dismissedMeterChanges()),
    );
  }
}
