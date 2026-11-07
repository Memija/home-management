import { DynamicHeatingRecord } from './records.model';
import { MotivationTrackerType } from './motivation.model';

/**
 * Generates the deterministic notification ID for a tracker's motivation insight.
 */
export function getMotivationNotificationId(tracker: MotivationTrackerType): string {
  return `${tracker}-motivation`;
}

export type HeatingNotificationRecord =
  DynamicHeatingRecord | { date: Date; rooms?: Record<string, number> };

export type NotificationCategory =
  'water' | 'heating' | 'electricity' | 'address' | 'family' | 'general';

export type NotificationAccent =
  | 'saving'
  | 'stable'
  | 'spike'
  | 'water'
  | 'heating'
  | 'electricity'
  | 'address'
  | 'family'
  | 'warning'
  | 'danger'
  | 'settings'
  | 'info';

export interface Notification {
  id: string;
  type: 'reminder' | 'initial' | 'info' | 'motivation';
  category?: NotificationCategory;
  accent?: NotificationAccent;
  titleKey: string;
  messageKey: string;
  messageParams?: Record<string, string | number>;
  priority: 'high' | 'medium' | 'low';
  dismissible: boolean;
  route?: string;
  fragment?: string;
}

export interface ReadingStatus {
  isDue: boolean;
  isOverdue: boolean;
  daysSinceLast: number;
}
