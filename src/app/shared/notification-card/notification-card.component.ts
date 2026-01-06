import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LucideAngularModule, Bell, X, ArrowRight } from 'lucide-angular';
import { Notification } from '../../services/notification.service';

@Component({
  selector: 'app-notification-card',
  standalone: true,
  imports: [TranslatePipe, RouterLink, LucideAngularModule],
  templateUrl: './notification-card.component.html',
  styleUrl: './notification-card.component.scss'
})
export class NotificationCardComponent {
  notification = input.required<Notification>();
  dismissed = output<string>();

  protected readonly BellIcon = Bell;
  protected readonly XIcon = X;
  protected readonly ArrowRightIcon = ArrowRight;

  protected dismiss(): void {
    this.dismissed.emit(this.notification().id);
  }

  protected getMessageWithParams(messageKey: string, params?: Record<string, string | number>): string {
    // The translate pipe handles interpolation, so we just return the key
    // The actual interpolation happens in the template
    return messageKey;
  }
}
