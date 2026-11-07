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

  constructor() {
    queueMicrotask(() => {
      void this.loadData();
    });
    this.storage.dataRefreshed$
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.loadData());
  }

  /**
   * Load all data needed for notifications
   */
  private async loadData(): Promise<void> {
    await this.loadDismissedNotifications();

    const waterRecords = await this.loadParsedRecords<ConsumptionRecord>(
      'water_consumption_records',
    );
    if (waterRecords) this.waterRecords.set(waterRecords);

    const heatingRecords = await this.loadParsedRecords<HeatingNotificationRecord>(
      'heating_consumption_records',
    );
    if (heatingRecords) this.heatingRecords.set(heatingRecords);

    const electricityRecords = await this.loadParsedRecords<ElectricityRecord>(
      'electricity_consumption_records',
    );
    if (electricityRecords) this.electricityRecords.set(electricityRecords);

    const confirmedChanges = await this.storage.load<string[]>('water_confirmed_meter_changes');
    if (Array.isArray(confirmedChanges)) {
      this.confirmedMeterChanges.set(confirmedChanges);
    }

    const address = await this.storage.load<Address>('household_address');
    if (address) this.address.set(address);

    const familyMembers = await this.storage.load<HouseholdMember[]>('household_members');
    if (familyMembers) this.familyMembers.set(familyMembers);

    this.isDataLoaded.set(true);
  }

  private async loadParsedRecords<T extends { date: Date | string }>(
    key: string,
  ): Promise<T[] | null> {
    const records = await this.storage.load<T[]>(key);
    return records ? records.map((r) => ({ ...r, date: parseSafeDate(r.date) })) : null;
  }

  setWaterRecords(records: ConsumptionRecord[]): void {
    this.waterRecords.set(records);
  }

  setHeatingRecords(records: HeatingNotificationRecord[]): void {
    this.heatingRecords.set(records);
  }

  setConfirmedMeterChanges(dates: string[]): void {
    this.confirmedMeterChanges.set(dates);
  }

  setElectricityRecords(records: ElectricityRecord[]): void {
    this.electricityRecords.set(records);
  }

  setAddress(address: Address | null): void {
    this.address.set(address);
  }

  setHouseholdMembers(members: HouseholdMember[]): void {
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
