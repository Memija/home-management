import { Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LucideAngularModule, X, Mail, AtSign, Laptop, TriangleAlert, HelpCircle } from 'lucide-angular';
import { HelpModalComponent, HelpStep } from '../help-modal/help-modal.component';

export type EmailClient = 'default' | 'outlook' | 'gmail';

@Component({
  selector: 'app-contact-modal',
  standalone: true,
  imports: [FormsModule, TranslatePipe, LucideAngularModule, HelpModalComponent],
  templateUrl: './contact-modal.component.html',
  styleUrl: './contact-modal.component.scss'
})
export class ContactModalComponent {
  protected readonly XIcon = X;
  protected readonly MailIcon = Mail;
  protected readonly AtSignIcon = AtSign;
  protected readonly LaptopIcon = Laptop;
  protected readonly TriangleAlertIcon = TriangleAlert;
  protected readonly HelpIcon = HelpCircle;

  // Help modal
  protected showHelpModal = signal(false);
  protected readonly helpSteps: HelpStep[] = [
    { titleKey: 'CONTACT.HELP_STEP_1_TITLE', descriptionKey: 'CONTACT.HELP_STEP_1_DESC' },
    { titleKey: 'CONTACT.HELP_STEP_2_TITLE', descriptionKey: 'CONTACT.HELP_STEP_2_DESC' },
    { titleKey: 'CONTACT.HELP_STEP_3_TITLE', descriptionKey: 'CONTACT.HELP_STEP_3_DESC' },
    { titleKey: 'CONTACT.HELP_STEP_4_TITLE', descriptionKey: 'CONTACT.HELP_STEP_4_DESC' },
    { titleKey: 'CONTACT.HELP_STEP_5_TITLE', descriptionKey: 'CONTACT.HELP_STEP_5_DESC' }
  ];

  // Form data
  name = signal('');
  email = signal('');
  subject = signal('');
  message = signal('');
  emailClient = signal<EmailClient>('default');

  // Validation state
  emailError = signal(false);
  dropdownOpen = signal(false);

  // Output
  close = output<void>();
  compose = output<{ name: string; email: string; subject: string; message: string; client: EmailClient }>();

  protected validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  protected onEmailChange(value: string) {
    this.email.set(value);
    if (value && !this.validateEmail(value)) {
      this.emailError.set(true);
    } else {
      this.emailError.set(false);
    }
  }

  protected toggleDropdown() {
    this.dropdownOpen.set(!this.dropdownOpen());
  }

  protected selectEmailClient(client: EmailClient) {
    this.emailClient.set(client);
    this.dropdownOpen.set(false);
  }

  protected getClientIcon(client: EmailClient) {
    switch (client) {
      case 'default': return this.LaptopIcon;
      case 'outlook': return this.MailIcon;
      case 'gmail': return this.AtSignIcon;
    }
  }

  protected getClientLabel(client: EmailClient): string {
    switch (client) {
      case 'outlook': return 'Outlook';
      case 'gmail': return 'Gmail';
      default: return '';
    }
  }

  protected onClose() {
    this.close.emit();
  }

  protected onCompose() {
    // Validate form
    if (!this.name() || !this.email() || !this.subject() || !this.message()) {
      return;
    }

    // Validate email format
    if (!this.validateEmail(this.email())) {
      this.emailError.set(true);
      return;
    }

    // Emit the email data with selected client
    this.compose.emit({
      name: this.name(),
      email: this.email(),
      subject: this.subject(),
      message: this.message(),
      client: this.emailClient()
    });

    // Reset form
    this.name.set('');
    this.email.set('');
    this.subject.set('');
    this.message.set('');
    this.emailClient.set('default');
    this.emailError.set(false);
    this.dropdownOpen.set(false);

    // Close modal
    this.close.emit();
  }
}
