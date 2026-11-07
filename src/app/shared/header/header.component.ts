import { Component, inject, signal, HostListener, ElementRef, computed } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageSwitcherComponent } from '../../components/language-switcher/language-switcher.component';
import { AuthButtonComponent } from '../../components/auth-button/auth-button.component';
import {
  LucideAngularModule,
  LucideIconData,
  Play,
  X,
  Bell,
  ArrowRight,
  Sun,
  Moon,
  Monitor,
  CirclePlay,
} from 'lucide-angular';
import { DemoService } from '../../services/demo.service';
import {
  NotificationService,
  Notification,
  NotificationAccent,
  NotificationCategory,
} from '../../services/notification.service';
import {
  getNotificationCategoryIcon,
  getNotificationStatusIcon,
  resolveNotificationAccent,
  resolveNotificationCategory,
} from '../../utils/notification-ui.utils';
import { ThemeService, Theme } from '../../services/theme.service';
import { LanguageService } from '../../services/language.service';
import { AuthService } from '../../services/auth.service';
import { HybridStorageService } from '../../services/hybrid-storage.service';

export interface DecoratedNotification {
  readonly notification: Notification;
  readonly category: NotificationCategory;
  readonly accent: NotificationAccent;
  readonly categoryIcon: LucideIconData;
  readonly statusIcon: LucideIconData | null;
  readonly actionTitleKey: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [TranslatePipe, LanguageSwitcherComponent, AuthButtonComponent, LucideAngularModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly router = inject(Router);
  protected readonly demoService = inject(DemoService);
  protected readonly notificationService = inject(NotificationService);
  protected readonly themeService = inject(ThemeService);
  protected readonly authService = inject(AuthService);
  protected readonly hybridStorageService = inject(HybridStorageService);
  private readonly languageService = inject(LanguageService);

  protected readonly XIcon = X;
  protected readonly PlayIcon = Play;
  protected readonly BellIcon = Bell;
  protected readonly ArrowRightIcon = ArrowRight;
  protected readonly SunIcon = Sun;
  protected readonly MoonIcon = Moon;
  protected readonly MonitorIcon = Monitor;
  protected readonly CirclePlayIcon = CirclePlay;

  protected isDashboard = computed(() => {
    const url = this.router.url;
    // Account for both leading slash and trailing slashes
    return url === '/' || url === '/dashboard' || url.startsWith('/dashboard/');
  });

  protected readonly isNotificationPanelOpen = signal(false);

  protected readonly decoratedNotifications = computed<DecoratedNotification[]>(() =>
    this.notificationService.notifications().map((notification) => ({
      notification,
      category: resolveNotificationCategory(notification),
      accent: resolveNotificationAccent(notification),
      categoryIcon: getNotificationCategoryIcon(notification),
      statusIcon: getNotificationStatusIcon(notification),
      actionTitleKey: notification.route?.endsWith('/settings')
        ? 'NOTIFICATIONS.GO_TO_SETTINGS'
        : 'NOTIFICATIONS.GO_TO_TRACKER',
    })),
  );

  protected notificationCount = computed(() => this.decoratedNotifications().length);

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isNotificationPanelOpen.set(false);
    }
  }

  protected toggleNotificationPanel(): void {
    this.isNotificationPanelOpen.update((v) => !v);
  }

  protected dismissNotification(id: string, event: Event): void {
    event.stopPropagation();
    this.notificationService.dismissNotification(id);
  }

  protected navigateToNotification(notification: Notification): void {
    this.closePanel();
    if (notification.route) {
      void this.router
        .navigate([notification.route], {
          fragment: notification.fragment,
        })
        .then(() => {
          // Scroll to fragment after navigation with a small delay
          if (notification.fragment) {
            setTimeout(() => {
              const element = document.getElementById(notification.fragment!);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
          }
        });
    }
  }

  protected async exitDemo(): Promise<void> {
    await this.demoService.deactivateDemo();
  }

  protected closePanel(): void {
    this.isNotificationPanelOpen.set(false);
  }

  /**
   * Cycle through themes: light → dark → system → light
   */
  protected cycleTheme(): void {
    const current = this.themeService.currentTheme();
    const themeOrder: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themeOrder.indexOf(current);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    this.themeService.setTheme(themeOrder[nextIndex]);
  }

  protected getThemeTitle(): string {
    const current = this.themeService.currentTheme();
    const resolved = this.themeService.resolvedTheme();

    const themeNames: Record<Theme, string> = {
      light: this.languageService.translate('SETTINGS.THEME_LIGHT'),
      dark: this.languageService.translate('SETTINGS.THEME_DARK'),
      system: this.languageService.translate('SETTINGS.THEME_SYSTEM'),
    };

    if (current === 'system') {
      const resolvedName = themeNames[resolved];
      return `${themeNames.system} (${resolvedName})`;
    }
    return themeNames[current];
  }
}
