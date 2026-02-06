import { Injectable, inject, signal, computed } from '@angular/core';
import { LocalStorageService } from './local-storage.service';
import { ElectricityRecord } from '../models/records.model';

@Injectable({
  providedIn: 'root'
})
export class ElectricityMeterService {
  private localStorageService = inject(LocalStorageService);

  // Signals for stored state
  readonly confirmedMeterChanges = signal<string[]>(this.getStoredMeterChanges());
  readonly dismissedMeterChanges = signal<string[]>(this.getStoredDismissedMeterChanges());

  /**
   * Detects meter changes (drops in value) in the provided records.
   * Returns an array of dates (ISO strings) where a drop occurred.
   */
  detectMeterChanges(records: ElectricityRecord[]): string[] {
    const changes: string[] = [];
    for (let i = 1; i < records.length; i++) {
      const curr = records[i];
      const prev = records[i - 1];
      if (curr.value < prev.value) {
        changes.push(new Date(curr.date).toISOString());
      }
    }
    return changes;
  }

  /**
   * filters detected changes against confirmed and dismissed changes.
   */
  filterUnconfirmed(detectedChanges: string[]): string[] {
    const confirmed = this.confirmedMeterChanges();
    const dismissed = this.dismissedMeterChanges();
    return detectedChanges.filter(d => !confirmed.includes(d) && !dismissed.includes(d));
  }

  confirmMeterChange(date: string): void {
    this.confirmedMeterChanges.update(changes => [...changes, date]);
    this.saveMeterChanges();
  }

  dismissMeterChange(date: string): void {
    this.dismissedMeterChanges.update(changes => [...changes, date]);
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
      JSON.stringify(this.confirmedMeterChanges())
    );
    this.localStorageService.setPreference(
      'electricity_dismissed_meter_changes',
      JSON.stringify(this.dismissedMeterChanges())
    );
  }
}
