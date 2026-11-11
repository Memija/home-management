import { MotivationInsight, MotivationTrackerType } from '../models/motivation.model';
import {
  getMotivationNotificationId,
  Notification,
  ReadingStatus,
} from '../models/notification.model';
import { parseSafeDate } from '../models/records.model';

const MS_PER_DAY = 86_400_000;
const MONTHLY_MIN_AVG_DAYS = 27;
const MONTHLY_MAX_AVG_DAYS = 32;
const OVERDUE_MULTIPLIER = 1.5;
const MIN_OVERDUE_DAYS = 10;

const TRACKER_CATEGORIES: readonly MotivationTrackerType[] = ['water', 'heating', 'electricity'];

function pushIfActive(
  notifications: Notification[],
  dismissed: readonly string[],
  notification: Notification,
): void {
  if (!dismissed.includes(notification.id)) {
    notifications.push(notification);
  }
}

/**
 * Checks whether a monthly reading schedule (~27-32 day average) is due in the current month,
 * accounting for varying month lengths (e.g., February 28 vs 31st of previous month).
 */
export function isMonthlyScheduleDue(
  lastDate: Date,
  averageDays: number,
  today: Date = new Date(),
): boolean {
  if (averageDays < MONTHLY_MIN_AVG_DAYS || averageDays > MONTHLY_MAX_AVG_DAYS) {
    return false;
  }

  const monthDiff =
    today.getFullYear() * 12 +
    today.getMonth() -
    (lastDate.getFullYear() * 12 + lastDate.getMonth());

  if (monthDiff <= 0) {
    return false;
  }

  const isSameOrLaterDay = today.getDate() >= lastDate.getDate();
  const lastDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const isEndOfShorterMonth =
    today.getDate() === lastDayOfCurrentMonth && lastDate.getDate() > lastDayOfCurrentMonth;

  return isSameOrLaterDay || isEndOfShorterMonth;
}

const readingStatusCache = new WeakMap<
  readonly { date: Date | string }[],
  { dayBucket: number; length: number; status: ReadingStatus }
>();

/**
 * Calculates whether a tracker reading is due or overdue based on historical entry frequency.
 * @param records - Historical records containing a date field
 * @returns ReadingStatus indicating due/overdue flags and days elapsed since last entry
 */
export function calculateReadingStatus(records: readonly { date: Date | string }[]): ReadingStatus {
  const n = records.length;
  if (n < 2) {
    return { isDue: false, isOverdue: false, daysSinceLast: 0 };
  }

  const nowMs = Date.now();
  const dayBucket = Math.floor(nowMs / MS_PER_DAY);
  const cached = readingStatusCache.get(records);
  if (cached && cached.dayBucket === dayBucket && cached.length === n) {
    return cached.status;
  }

  const timestamps = new Array<number>(n);
  let isSorted = true;
  for (let i = 0; i < n; i++) {
    const t = parseSafeDate(records[i].date).getTime();
    timestamps[i] = t;
    if (i > 0 && t < timestamps[i - 1]) {
      isSorted = false;
    }
  }

  if (!isSorted) {
    timestamps.sort((a, b) => a - b);
  }

  let totalDays = 0;
  for (let i = 1; i < n; i++) {
    totalDays += (timestamps[i] - timestamps[i - 1]) / MS_PER_DAY;
  }
  const averageDays = totalDays / (n - 1);

  const lastTime = timestamps[n - 1];
  const lastDate = new Date(lastTime);
  const today = new Date(nowMs);
  const daysSinceLast = Math.floor((nowMs - lastTime) / MS_PER_DAY);

  const dueThreshold = Math.floor(averageDays);
  const isDue = daysSinceLast >= dueThreshold || isMonthlyScheduleDue(lastDate, averageDays, today);

  const overdueThreshold = Math.floor(Math.max(averageDays * OVERDUE_MULTIPLIER, MIN_OVERDUE_DAYS));
  const isOverdue = daysSinceLast > overdueThreshold;

  const status: ReadingStatus = { isDue, isOverdue, daysSinceLast };
  readingStatusCache.set(records, { dayBucket, length: n, status });
  return status;
}

/**
 * Collects initial setup notifications for trackers that have no recorded entries yet.
 */
export function collectInitialNotifications(
  counts: Record<MotivationTrackerType, number>,
  dismissed: readonly string[],
): Notification[] {
  const notifications: Notification[] = [];

  for (const category of TRACKER_CATEGORIES) {
    if (counts[category] === 0) {
      const upper = category.toUpperCase();
      pushIfActive(notifications, dismissed, {
        id: `${category}-initial`,
        type: 'initial',
        category,
        accent: category,
        titleKey: `NOTIFICATIONS.${upper}_INITIAL_TITLE`,
        messageKey: `NOTIFICATIONS.${upper}_INITIAL_MESSAGE`,
        priority: 'high',
        dismissible: true,
        route: `/dashboard/${category}`,
        fragment: 'input-section',
      });
    }
  }

  return notifications;
}

/**
 * Collects due and overdue reading reminder notifications across all trackers.
 */
export function collectReminderNotifications(
  recordsByTracker: Record<MotivationTrackerType, readonly { date: Date | string }[]>,
  dismissed: readonly string[],
): Notification[] {
  const notifications: Notification[] = [];

  for (const category of TRACKER_CATEGORIES) {
    const status = calculateReadingStatus(recordsByTracker[category]);
    const upper = category.toUpperCase();
    const route = `/dashboard/${category}`;

    if (status.isDue && !status.isOverdue) {
      pushIfActive(notifications, dismissed, {
        id: `${category}-due`,
        type: 'reminder',
        category,
        accent: 'warning',
        titleKey: `NOTIFICATIONS.${upper}_DUE_TITLE`,
        messageKey: `NOTIFICATIONS.${upper}_DUE_MESSAGE`,
        priority: 'low',
        dismissible: true,
        route,
        fragment: 'input-section',
      });
    }

    if (status.isOverdue) {
      pushIfActive(notifications, dismissed, {
        id: `${category}-overdue`,
        type: 'reminder',
        category,
        accent: 'danger',
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

  return notifications;
}

/**
 * Collects motivational consumption trend notifications for each tracker with an active insight.
 */
export function collectMotivationNotifications(
  insights: readonly (MotivationInsight | null)[],
  dismissed: readonly string[],
): Notification[] {
  const notifications: Notification[] = [];

  for (const insight of insights) {
    if (!insight) continue;

    pushIfActive(notifications, dismissed, {
      id: getMotivationNotificationId(insight.tracker),
      type: 'motivation',
      category: insight.tracker,
      accent: insight.state,
      titleKey: insight.titleKey,
      messageKey: insight.messageKey,
      messageParams: insight.messageParams,
      priority: insight.state === 'spike' ? 'medium' : 'low',
      dismissible: true,
      route: `/dashboard/${insight.tracker}`,
    });
  }

  return notifications;
}

/**
 * Collects missing household settings notifications (address and family members).
 */
export function collectSettingsNotifications(
  hasAddress: boolean,
  hasFamilyMembers: boolean,
  dismissed: readonly string[],
): Notification[] {
  const notifications: Notification[] = [];

  if (!hasAddress) {
    pushIfActive(notifications, dismissed, {
      id: 'address-missing',
      type: 'initial',
      category: 'address',
      accent: 'address',
      titleKey: 'NOTIFICATIONS.ADDRESS_MISSING_TITLE',
      messageKey: 'NOTIFICATIONS.ADDRESS_MISSING_MESSAGE',
      priority: 'medium',
      dismissible: true,
      route: '/dashboard/settings',
      fragment: 'address-section',
    });
  }

  if (!hasFamilyMembers) {
    pushIfActive(notifications, dismissed, {
      id: 'family-missing',
      type: 'initial',
      category: 'family',
      accent: 'family',
      titleKey: 'NOTIFICATIONS.FAMILY_MISSING_TITLE',
      messageKey: 'NOTIFICATIONS.FAMILY_MISSING_MESSAGE',
      priority: 'medium',
      dismissible: true,
      route: '/dashboard/settings',
      fragment: 'family-section',
    });
  }

  return notifications;
}

/**
 * Removes current and legacy motivation dismissal IDs for a given tracker.
 */
export function filterMotivationDismissals(
  dismissed: readonly string[],
  tracker: MotivationTrackerType,
): string[] {
  const motivationId = getMotivationNotificationId(tracker);
  const legacyPrefix = `${tracker}-motivation-`;
  const legacyToastId = `motivation-toast-${tracker}`;

  return dismissed.filter(
    (id) => id !== motivationId && id !== legacyToastId && !id.startsWith(legacyPrefix),
  );
}
