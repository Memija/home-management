import { Component, inject, signal, HostListener, ElementRef, computed } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageSwitcherComponent } from '../../components/language-switcher/language-switcher.component';
import { LucideAngularModule, Play, X, Bell, ArrowRight, Sun, Moon, Monitor } from 'lucide-angular';
import { DemoService } from '../../services/demo.service';
import { NotificationService, Notification } from '../../services/notification.service';
import { ThemeService, Theme } from '../../services/theme.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [TranslatePipe, LanguageSwitcherComponent, LucideAngularModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private elementRef = inject(ElementRef);
  private router = inject(Router);
  protected readonly demoService = inject(DemoService);
  protected readonly notificationService = inject(NotificationService);
  protected readonly themeService = inject(ThemeService);
  private readonly languageService = inject(LanguageService);

  protected readonly PlayIcon = Play;
  protected readonly XIcon = X;
  protected readonly BellIcon = Bell;
  protected readonly ArrowRightIcon = ArrowRight;
  protected readonly SunIcon = Sun;
  protected readonly MoonIcon = Moon;
  protected readonly MonitorIcon = Monitor;

  protected isNotificationPanelOpen = signal(false);

  protected notificationCount = computed(() => this.notificationService.notifications().length);

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isNotificationPanelOpen.set(false);
    }
  }

  protected toggleNotificationPanel(): void {
    this.isNotificationPanelOpen.update(v => !v);
  }

  protected dismissNotification(id: string, event: Event): void {
    event.stopPropagation();
    this.notificationService.dismissNotification(id);
  }

  protected navigateToNotification(notification: Notification): void {
    this.closePanel();
    if (notification.route) {
      this.router.navigate([notification.route], {
        fragment: notification.fragment
      }).then(() => {
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

  protected exitDemo(): void {
    this.demoService.deactivateDemo();
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
      system: this.languageService.translate('SETTINGS.THEME_SYSTEM')
    };

    if (current === 'system') {
      const resolvedName = themeNames[resolved];
      return `${themeNames.system} (${resolvedName})`;
    }
    return themeNames[current];
  }
}
