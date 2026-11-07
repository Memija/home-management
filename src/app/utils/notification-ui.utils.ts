import { Info, LucideIconData, MapPin, Users } from 'lucide-angular';
import {
  Notification,
  NotificationAccent,
  NotificationCategory,
} from '../models/notification.model';
import { getMotivationTrackerIcon, getMotivationTrendIcon } from './motivation-ui.utils';

/**
 * Resolves the semantic category for a header notification, inferring from id/route/fragment when omitted.
 */
export function resolveNotificationCategory(notification: Notification): NotificationCategory {
  if (notification.category) {
    return notification.category;
  }

  const id = notification.id.toLowerCase();
  const route = notification.route ?? '';

  if (id.startsWith('water') || route.endsWith('/water')) return 'water';
  if (id.startsWith('heating') || route.endsWith('/heating')) return 'heating';
  if (id.startsWith('electricity') || route.endsWith('/electricity')) return 'electricity';
  if (id.startsWith('address') || notification.fragment === 'address-section') return 'address';
  if (id.startsWith('family') || notification.fragment === 'family-section') return 'family';

  return 'general';
}

/**
 * Resolves the color accent variant for a header notification.
 */
export function resolveNotificationAccent(notification: Notification): NotificationAccent {
  if (notification.accent) {
    return notification.accent;
  }

  if (notification.type === 'motivation') {
    return notification.priority === 'medium' ? 'spike' : 'saving';
  }

  if (notification.type === 'reminder') {
    return notification.priority === 'medium' || notification.id.endsWith('-overdue')
      ? 'danger'
      : 'warning';
  }

  if (notification.type === 'initial') {
    const category = resolveNotificationCategory(notification);
    if (category !== 'general') {
      return category;
    }
  }

  return 'info';
}

/**
 * Returns the primary domain Lucide icon displayed in the notification's colored icon badge.
 */
export function getNotificationCategoryIcon(notification: Notification): LucideIconData {
  const category = resolveNotificationCategory(notification);
  switch (category) {
    case 'water':
    case 'heating':
    case 'electricity':
      return getMotivationTrackerIcon(category);
    case 'address':
      return MapPin;
    case 'family':
      return Users;
    case 'general':
      return Info;
  }
}

/**
 * Returns an inline trend Lucide icon only for upward or downward consumption trends.
 */
export function getNotificationStatusIcon(notification: Notification): LucideIconData | null {
  const accent = resolveNotificationAccent(notification);
  if (accent === 'saving' || accent === 'spike') {
    return getMotivationTrendIcon(accent);
  }
  return null;
}
