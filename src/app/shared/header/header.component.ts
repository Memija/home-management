import { Component, inject, signal, HostListener, ElementRef, computed } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageSwitcherComponent } from '../../components/language-switcher/language-switcher.component';
import { LucideAngularModule, Play, X, Bell, ArrowRight } from 'lucide-angular';
import { DemoService } from '../../services/demo.service';
import { NotificationService, Notification } from '../../services/notification.service';

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

  protected readonly PlayIcon = Play;
  protected readonly XIcon = X;
  protected readonly BellIcon = Bell;
  protected readonly ArrowRightIcon = ArrowRight;

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
}
