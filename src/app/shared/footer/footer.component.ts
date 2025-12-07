import { Component, signal } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ContactModalComponent } from '../contact-modal/contact-modal.component';

@Component({
    selector: 'app-footer',
    standalone: true,
    imports: [TranslatePipe, ContactModalComponent],
    templateUrl: './footer.component.html',
    styleUrl: './footer.component.scss'
})
export class FooterComponent {
    currentYear = new Date().getFullYear();
    protected showContactModal = signal(false);

    contactUs() {
        this.showContactModal.set(true);
    }

    protected onCloseModal() {
        this.showContactModal.set(false);
    }

    protected onSendEmail(data: { name: string; email: string; subject: string; message: string; client: string }) {
        const recipientEmail = 'anelmemija@gmail.com';
        const subject = encodeURIComponent(data.subject);
        const body = encodeURIComponent(`Name: ${data.name}\nEmail: ${data.email}\n\nMessage:\n${data.message}`);

        let emailUrl = '';

        switch (data.client) {
            case 'gmail':
                // Gmail web interface URL
                emailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipientEmail}&su=${subject}&body=${body}`;
                window.open(emailUrl, '_blank');
                break;
            case 'outlook':
                // Outlook web interface URL
                emailUrl = `https://outlook.office.com/mail/deeplink/compose?to=${recipientEmail}&subject=${subject}&body=${body}`;
                window.open(emailUrl, '_blank');
                break;
            case 'default':
            default:
                // Default mailto link
                emailUrl = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
                window.location.href = emailUrl;
                break;
        }
    }
}
