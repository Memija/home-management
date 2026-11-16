import { Injectable, inject, computed, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { STORAGE_SERVICE } from './storage.service';
import { ConsumptionRecord, ElectricityRecord, parseSafeDate } from '../models/records.model';
import { MotivationInsight, MotivationTrackerType } from '../models/motivation.model';
import { HeatingNotificationRecord, Notification } from '../models/notification.model';
import {
  collectInitialNotifications,
  collectMotivationNotifications,
  collectReminderNotifications,
  collectSettingsNotifications,
  filterMotivationDismissals,
} from '../utils/notification.utils';
import { ConsumptionMotivationService } from './consumption-motivation.service';
import { DemoService } from './demo.service';
import { Address, HouseholdMember } from './household.service';

// Re-export models and helpers so existing consumers keep their import paths unchanged.
export { getMotivationNotificationId } from '../models/notification.model';
export type {
  HeatingNotificationRecord,
  Notification,
  NotificationAccent,
  NotificationCategory,
  ReadingStatus,
} from '../models/notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly storage = inject(STORAGE_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly demoService = inject(DemoService);
  private readonly motivationService = inject(ConsumptionMotivationService);

  // Data signals (set by consuming services or loaded from storage)
  private readonly waterRecords = signal<ConsumptionRecord[]>([]);
  private readonly heatingRecords = signal<HeatingNotificationRecord[]>([]);
  private readonly electricityRecords = signal<ElectricityRecord[]>([]);
  private readonly address = signal<Address | null>(null);
  private readonly familyMembers = signal<HouseholdMember[]>([]);
  private readonly dismissedNotifications = signal<string[]>([]);
  private readonly isDataLoaded = signal(false);
  private readonly confirmedMeterChanges = signal<string[]>([]);

  /** Reactive motivational insights for each tracker (available in both normal and demo mode) */
  readonly waterMotivation = computed<MotivationInsight | null>(() =>
    this.motivationService.evaluateWater(this.waterRecords(), this.confirmedMeterChanges()),
  );

  readonly heatingMotivation = computed<MotivationInsight | null>(() =>
    this.motivationService.evaluateHeating(this.heatingRecords()),
  );

  readonly electricityMotivation = computed<MotivationInsight | null>(() =>
    this.motivationService.evaluateElectricity(this.electricityRecords()),
  );

  private waterRecordsPushed = false;
  private heatingRecordsPushed = false;
  private electricityRecordsPushed = false;
  private addressPushed = false;
  private familyMembersPushed = false;

  constructor() {
    if (this.hydrateSync()) {
      this.isDataLoaded.set(true);
    } else {
      queueMicrotask(() => {
        void this.loadData();
      });
    }
    this.storage.dataRefreshed$
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.loadData(true));
  }

  private hydrateSync(): boolean {
    if (typeof this.storage?.loadSync !== 'function') {
      return false;
    }
    const dismissed = this.storage.loadSync<string[]>('dismissed_notifications');
    this.dismissedNotifications.set(Array.isArray(dismissed) ? dismissed : []);

    this.applyLoadedState({
      waterRecords: this.waterRecordsPushed
        ? null
        : this.loadParsedRecordsSync<ConsumptionRecord>('water_consumption_records'),
      heatingRecords: this.heatingRecordsPushed
        ? null
        : this.loadParsedRecordsSync<HeatingNotificationRecord>('heating_consumption_records'),
      electricityRecords: this.electricityRecordsPushed
        ? null
        : this.loadParsedRecordsSync<ElectricityRecord>('electricity_consumption_records'),
      confirmedChanges: this.storage.loadSync<string[]>('water_confirmed_meter_changes'),
      address: this.addressPushed ? null : this.storage.loadSync<Address>('household_address'),
      familyMembers: this.familyMembersPushed
        ? null
        : this.storage.loadSync<HouseholdMember[]>('household_members'),
    });
    return true;
  }

  private loadParsedRecordsSync<T extends { date: Date | string }>(key: string): T[] | null {
    const records = this.storage.loadSync?.<T[]>(key) ?? null;
    return records ? records.map((r) => ({ ...r, date: parseSafeDate(r.date) })) : null;
  }

  /**
   * Load all data needed for notifications
   */
  private async loadData(forceReload = false): Promise<void> {
    const [
      ,
      waterRecords,
      heatingRecords,
      electricityRecords,
      confirmedChanges,
      address,
      familyMembers,
    ] = await Promise.all([
      this.loadDismissedNotifications(),
      this.loadIfUnpushed(forceReload, this.waterRecordsPushed, () =>
        this.loadParsedRecords<ConsumptionRecord>('water_consumption_records'),
      ),
      this.loadIfUnpushed(forceReload, this.heatingRecordsPushed, () =>
        this.loadParsedRecords<HeatingNotificationRecord>('heating_consumption_records'),
      ),
      this.loadIfUnpushed(forceReload, this.electricityRecordsPushed, () =>
        this.loadParsedRecords<ElectricityRecord>('electricity_consumption_records'),
      ),
      this.storage.load<string[]>('water_confirmed_meter_changes'),
      this.loadIfUnpushed(forceReload, this.addressPushed, () =>
        this.storage.load<Address>('household_address'),
      ),
      this.loadIfUnpushed(forceReload, this.familyMembersPushed, () =>
        this.storage.load<HouseholdMember[]>('household_members'),
      ),
    ]);

    this.applyLoadedState({
      waterRecords,
      heatingRecords,
      electricityRecords,
      confirmedChanges,
      address,
      familyMembers,
    });
    this.isDataLoaded.set(true);
  }

  private loadIfUnpushed<T>(
    forceReload: boolean,
    isPushed: boolean,
    loader: () => Promise<T | null>,
  ): Promise<T | null> {
    return !forceReload && isPushed ? Promise.resolve(null) : loader();
  }

  private applyLoadedState(state: {
    waterRecords: ConsumptionRecord[] | null;
    heatingRecords: HeatingNotificationRecord[] | null;
    electricityRecords: ElectricityRecord[] | null;
    confirmedChanges: string[] | null;
    address: Address | null;
    familyMembers: HouseholdMember[] | null;
  }): void {
    if (state.waterRecords) this.waterRecords.set(state.waterRecords);
    if (state.heatingRecords) this.heatingRecords.set(state.heatingRecords);
    if (state.electricityRecords) this.electricityRecords.set(state.electricityRecords);
    if (Array.isArray(state.confirmedChanges)) {
      this.confirmedMeterChanges.set(state.confirmedChanges);
    }
    if (state.address) this.address.set(state.address);
    if (state.familyMembers) this.familyMembers.set(state.familyMembers);
  }

  private async loadParsedRecords<T extends { date: Date | string }>(
    key: string,
  ): Promise<T[] | null> {
    const records = await this.storage.load<T[]>(key);
    return records ? records.map((r) => ({ ...r, date: parseSafeDate(r.date) })) : null;
  }

  setWaterRecords(records: ConsumptionRecord[]): void {
    this.waterRecordsPushed = true;
    this.waterRecords.set(records);
  }

  setHeatingRecords(records: HeatingNotificationRecord[]): void {
    this.heatingRecordsPushed = true;
    this.heatingRecords.set(records);
  }

  setConfirmedMeterChanges(dates: string[]): void {
    this.confirmedMeterChanges.set(dates);
  }

  setElectricityRecords(records: ElectricityRecord[]): void {
    this.electricityRecordsPushed = true;
    this.electricityRecords.set(records);
  }

  setAddress(address: Address | null): void {
    this.addressPushed = true;
    this.address.set(address);
  }

  setHouseholdMembers(members: HouseholdMember[]): void {
    this.familyMembersPushed = true;
    this.familyMembers.set(members);
  }

  /**
   * Get all active notifications
   */
  readonly notifications = computed<Notification[]>(() => {
    if (!this.isDataLoaded()) {
      return [];
    }

    const notifications: Notification[] = [];
    const dismissed = this.dismissedNotifications();
    const isDemo = this.demoService.isDemoMode();

    if (!isDemo) {
      notifications.push(
        ...collectInitialNotifications(
          {
            water: this.waterRecords().length,
            heating: this.heatingRecords().length,
            electricity: this.electricityRecords().length,
          },
          dismissed,
        ),
        ...collectReminderNotifications(
          {
            water: this.waterRecords(),
            heating: this.heatingRecords(),
            electricity: this.electricityRecords(),
          },
          dismissed,
        ),
      );
    }

    notifications.push(
      ...collectMotivationNotifications(
        [this.waterMotivation(), this.heatingMotivation(), this.electricityMotivation()],
        dismissed,
      ),
    );

    if (!isDemo) {
      notifications.push(
        ...collectSettingsNotifications(
          Boolean(this.address()),
          this.familyMembers().length > 0,
          dismissed,
        ),
      );
    }

    return notifications;
  });

  /**
   * Dismiss a notification
   */
  dismissNotification(id: string): void {
    const current = this.dismissedNotifications();
    if (!current.includes(id)) {
      const updated = [...current, id];
      this.dismissedNotifications.set(updated);
      this.saveDismissedNotifications(updated);
    }
  }

  /**
   * Clear dismissed notification (when user takes action)
   */
  clearDismissed(id: string): void {
    const current = this.dismissedNotifications();
    const updated = current.filter((n) => n !== id);
    this.dismissedNotifications.set(updated);
    this.saveDismissedNotifications(updated);
  }

  /**
   * Reset water notifications (call when user adds a new water record)
   */
  resetWaterOverdue(): void {
    this.clearDismissed('water-due');
    this.clearDismissed('water-overdue');
  }

  /**
   * Reset electricity notifications (call when user adds a new electricity record)
   */
  resetElectricityOverdue(): void {
    this.clearDismissed('electricity-due');
    this.clearDismissed('electricity-overdue');
  }

  /**
   * Re-enables a tracker's header motivation notification after new record input.
   */
  resetMotivationDismissal(tracker: MotivationTrackerType): void {
    const current = this.dismissedNotifications();
    const updated = filterMotivationDismissals(current, tracker);
    if (updated.length !== current.length) {
      this.dismissedNotifications.set(updated);
      this.saveDismissedNotifications(updated);
    }
  }

  private async loadDismissedNotifications(): Promise<void> {
    const dismissed = await this.storage.load<string[]>('dismissed_notifications');
    this.dismissedNotifications.set(Array.isArray(dismissed) ? dismissed : []);
  }

  private saveDismissedNotifications(dismissed: string[]): void {
    void this.storage.save('dismissed_notifications', dismissed);
  }
}
