import { Injectable, inject, computed, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { STORAGE_SERVICE } from './storage.service';
import { ConsumptionRecord, ElectricityRecord, parseSafeDate } from '../models/records.model';
import { DemoService } from './demo.service';
import { Address, HouseholdMember } from './household.service';

export interface Notification {
  id: string;
  type: 'reminder' | 'initial' | 'info';
  titleKey: string;
  messageKey: string;
  messageParams?: Record<string, string | number>;
  priority: 'high' | 'medium' | 'low';
  dismissible: boolean;
  route?: string;
  fragment?: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly storage = inject(STORAGE_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly demoService = inject(DemoService);

  // Data signals (will be set by consuming components or loaded)
  private readonly waterRecords = signal<ConsumptionRecord[]>([]);
  private readonly heatingRecords = signal<{ date: Date }[]>([]);
  private readonly electricityRecords = signal<ElectricityRecord[]>([]);
  private readonly address = signal<Address | null>(null);
  private readonly familyMembers = signal<HouseholdMember[]>([]);
  private readonly dismissedNotifications = signal<string[]>([]);
  private readonly isDataLoaded = signal(false);

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
    // Use correct storage keys matching the data services
    const waterRecords = await this.storage.load<ConsumptionRecord[]>('water_consumption_records');
    if (waterRecords) {
      this.waterRecords.set(waterRecords.map((r) => ({ ...r, date: parseSafeDate(r.date) })));
    }

    const heatingRecords = await this.storage.load<{ date: Date }[]>('heating_consumption_records');
    if (heatingRecords) {
      this.heatingRecords.set(heatingRecords.map((r) => ({ ...r, date: parseSafeDate(r.date) })));
    }

    const electricityRecords = await this.storage.load<ElectricityRecord[]>(
      'electricity_consumption_records',
    );
    if (electricityRecords) {
      this.electricityRecords.set(
        electricityRecords.map((r) => ({ ...r, date: parseSafeDate(r.date) })),
      );
    }

    // Load address and family data
    const address = await this.storage.load<Address>('household_address');
    if (address) {
      this.address.set(address);
    }

    const familyMembers = await this.storage.load<HouseholdMember[]>('household_members');
    if (familyMembers) {
      this.familyMembers.set(familyMembers);
    }

    this.isDataLoaded.set(true);
  }

  /**
   * Update records from external source (for reactivity when data changes)
   */
  setWaterRecords(records: ConsumptionRecord[]): void {
    this.waterRecords.set(records);
  }

  setHeatingRecords(records: { date: Date }[]): void {
    this.heatingRecords.set(records);
  }

  setElectricityRecords(records: ElectricityRecord[]): void {
    this.electricityRecords.set(records);
  }

  /**
   * Update address from external source
   */
  setAddress(address: Address | null): void {
    this.address.set(address);
  }

  /**
   * Update family members from external source
   */
  setHouseholdMembers(members: HouseholdMember[]): void {
    this.familyMembers.set(members);
  }

  /**
   * Get all active notifications
   */
  readonly notifications = computed<Notification[]>(() => {
    // Don't show notifications until data is loaded
    if (!this.isDataLoaded() || this.demoService.isDemoMode()) {
      return [];
    }

    const notifications: Notification[] = [];
    const dismissed = this.dismissedNotifications();

    this.collectInitialNotifications(notifications, dismissed);
    this.collectReminderNotifications(notifications, dismissed);
    this.collectSettingsNotifications(notifications, dismissed);

    return notifications;
  });

  private addNotification(
    notifications: Notification[],
    dismissed: string[],
    notif: Notification,
  ): void {
    if (!dismissed.includes(notif.id)) {
      notifications.push(notif);
    }
  }

  private collectInitialNotifications(notifications: Notification[], dismissed: string[]): void {
    const configs: {
      id: string;
      length: number;
      titleKey: string;
      messageKey: string;
      route: string;
    }[] = [
      {
        id: 'water-initial',
        length: this.waterRecords().length,
        titleKey: 'NOTIFICATIONS.WATER_INITIAL_TITLE',
        messageKey: 'NOTIFICATIONS.WATER_INITIAL_MESSAGE',
        route: '/dashboard/water',
      },
      {
        id: 'heating-initial',
        length: this.heatingRecords().length,
        titleKey: 'NOTIFICATIONS.HEATING_INITIAL_TITLE',
        messageKey: 'NOTIFICATIONS.HEATING_INITIAL_MESSAGE',
        route: '/dashboard/heating',
      },
      {
        id: 'electricity-initial',
        length: this.electricityRecords().length,
        titleKey: 'NOTIFICATIONS.ELECTRICITY_INITIAL_TITLE',
        messageKey: 'NOTIFICATIONS.ELECTRICITY_INITIAL_MESSAGE',
        route: '/dashboard/electricity',
      },
    ];

    for (const c of configs) {
      if (c.length === 0) {
        this.addNotification(notifications, dismissed, {
          id: c.id,
          type: 'initial',
          titleKey: c.titleKey,
          messageKey: c.messageKey,
          priority: 'high',
          dismissible: true,
          route: c.route,
          fragment: 'input-section',
        });
      }
    }
  }

  private collectReminderNotifications(notifications: Notification[], dismissed: string[]): void {
    const services = [
      {
        category: 'water',
        route: '/dashboard/water',
        status: this.checkWaterReadingStatus(),
      },
      {
        category: 'heating',
        route: '/dashboard/heating',
        status: this.checkHeatingReadingStatus(),
      },
      {
        category: 'electricity',
        route: '/dashboard/electricity',
        status: this.checkElectricityReadingStatus(),
      },
    ];

    for (const { category, route, status } of services) {
      const upper = category.toUpperCase();
      if (status.isDue && !status.isOverdue) {
        this.addNotification(notifications, dismissed, {
          id: `${category}-due`,
          type: 'reminder',
          titleKey: `NOTIFICATIONS.${upper}_DUE_TITLE`,
          messageKey: `NOTIFICATIONS.${upper}_DUE_MESSAGE`,
          priority: 'low',
          dismissible: true,
          route,
          fragment: 'input-section',
        });
      }

      if (status.isOverdue) {
        this.addNotification(notifications, dismissed, {
          id: `${category}-overdue`,
          type: 'reminder',
          titleKey: `NOTIFICATIONS.${upper}_OVERDUE_TITLE`,
          messageKey: `NOTIFICATIONS.${upper}_OVERDUE_MESSAGE`,
          messageParams: { days: status.daysSinceLast },
          priority: 'medium',
          dismissible: true,
          route,
          fragment: 'input-section',
        });
      }
    }
  }

  private collectSettingsNotifications(notifications: Notification[], dismissed: string[]): void {
    if (!this.address()) {
      this.addNotification(notifications, dismissed, {
        id: 'address-missing',
        type: 'initial',
        titleKey: 'NOTIFICATIONS.ADDRESS_MISSING_TITLE',
        messageKey: 'NOTIFICATIONS.ADDRESS_MISSING_MESSAGE',
        priority: 'medium',
        dismissible: true,
        route: '/dashboard/settings',
        fragment: 'address-section',
      });
    }

    if (this.familyMembers().length === 0) {
      this.addNotification(notifications, dismissed, {
        id: 'family-missing',
        type: 'initial',
        titleKey: 'NOTIFICATIONS.FAMILY_MISSING_TITLE',
        messageKey: 'NOTIFICATIONS.FAMILY_MISSING_MESSAGE',
        priority: 'medium',
        dismissible: true,
        route: '/dashboard/settings',
        fragment: 'family-section',
      });
    }
  }

  /**
   * Calculate if reading is due or overdue based on average entry frequency
   */
  private checkWaterReadingStatus(): { isDue: boolean; isOverdue: boolean; daysSinceLast: number } {
    return this.calculateReadingStatus(this.waterRecords());
  }

  /**
   * Calculate if heating reading is due or overdue based on average entry frequency
   */
  private checkHeatingReadingStatus(): {
    isDue: boolean;
    isOverdue: boolean;
    daysSinceLast: number;
  } {
    return this.calculateReadingStatus(this.heatingRecords());
  }

  /**
   * Calculate if electricity reading is due or overdue based on average entry frequency
   */
  private checkElectricityReadingStatus(): {
    isDue: boolean;
    isOverdue: boolean;
    daysSinceLast: number;
  } {
    return this.calculateReadingStatus(this.electricityRecords());
  }

  /**
   * Generic method to calculate if a reading is due or overdue based on history
   */
  private calculateReadingStatus(records: { date: Date | string }[]): {
    isDue: boolean;
    isOverdue: boolean;
    daysSinceLast: number;
  } {
    // Need at least 2 records to calculate average frequency
    if (records.length < 2) {
      return { isDue: false, isOverdue: false, daysSinceLast: 0 };
    }

    // Sort by date
    const sorted = [...records].sort(
      (a, b) => parseSafeDate(a.date).getTime() - parseSafeDate(b.date).getTime(),
    );

    // Calculate average days between entries
    let totalDays = 0;
    for (let i = 1; i < sorted.length; i++) {
      const diff =
        parseSafeDate(sorted[i].date).getTime() - parseSafeDate(sorted[i - 1].date).getTime();
      totalDays += diff / (1000 * 60 * 60 * 24);
    }
    const averageDays = totalDays / (sorted.length - 1);

    // Calculate days since last entry
    const lastEntry = sorted.at(-1)!;
    const daysSinceLast = Math.floor(
      (Date.now() - parseSafeDate(lastEntry.date).getTime()) / (1000 * 60 * 60 * 24),
    );

    // Due when at or past average interval
    // Use Math.floor to avoid floating-point precision issues
    const dueThreshold = Math.floor(averageDays);

    // Special handling for monthly schedules to account for varying month lengths
    // (e.g., February has 28 days, taking a reading on 1st of every month)
    let isMonthlyDue = false;
    if (averageDays >= 27 && averageDays <= 32) {
      const lastDate = parseSafeDate(lastEntry.date);
      const today = new Date();
      const monthDiff =
        today.getFullYear() * 12 +
        today.getMonth() -
        (lastDate.getFullYear() * 12 + lastDate.getMonth());

      if (monthDiff > 0) {
        const isSameOrLaterDay = today.getDate() >= lastDate.getDate();
        const lastDayOfCurrentMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0,
        ).getDate();
        const isEndOfShorterMonth =
          today.getDate() === lastDayOfCurrentMonth && lastDate.getDate() > lastDayOfCurrentMonth;

        if (isSameOrLaterDay || isEndOfShorterMonth) {
          isMonthlyDue = true;
        }
      }
    }

    const isDue = daysSinceLast >= dueThreshold || isMonthlyDue;

    // Overdue when 1.5x past the average (significantly late)
    const overdueThreshold = Math.floor(Math.max(averageDays * 1.5, 10));
    const isOverdue = daysSinceLast > overdueThreshold;

    return { isDue, isOverdue, daysSinceLast };
  }

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

  private async loadDismissedNotifications(): Promise<void> {
    const dismissed = await this.storage.load<string[]>('dismissed_notifications');
    if (dismissed) {
      this.dismissedNotifications.set(dismissed);
    }
  }

  private saveDismissedNotifications(dismissed: string[]): void {
    void this.storage.save('dismissed_notifications', dismissed);
  }
}
