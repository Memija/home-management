import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ContactModalComponent } from '../contact-modal/contact-modal.component';
import { EmailClient } from '../contact-modal/contact-modal.component';

@Component({
  selector: 'app-menu-bar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe, ContactModalComponent],
  templateUrl: './menu-bar.component.html',
  styleUrl: './menu-bar.component.scss'
})
export class MenuBarComponent {
  // Contact modal state
  protected showContactModal = signal(false);

  protected contactUs() {
    this.showContactModal.set(true);
  }

  protected onCloseModal() {
    this.showContactModal.set(false);
  }

  protected onComposeEmail(data: { name: string; email: string; subject: string; message: string; client: EmailClient }) {
    const recipient = 'support@homemanagement.app';
    const subject = encodeURIComponent(`[${data.name}] ${data.subject}`);
    const body = encodeURIComponent(`From: ${data.name} (${data.email})\n\n${data.message}`);

    let mailUrl: string;
    switch (data.client) {
      case 'outlook':
        mailUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${recipient}&subject=${subject}&body=${body}`;
        break;
      case 'gmail':
        mailUrl = `https://mail.google.com/mail/?view=cm&to=${recipient}&su=${subject}&body=${body}`;
        break;
      default:
        mailUrl = `mailto:${recipient}?subject=${subject}&body=${body}`;
    }

    window.open(mailUrl, '_blank');
    this.showContactModal.set(false);
  }
}
