import { Component, HostListener, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import {
  LucideAngularModule,
  X,
  Mail,
  AtSign,
  Laptop,
  TriangleAlert,
  CircleQuestionMark,
  ChevronDown,
} from 'lucide-angular';
import { HelpModalComponent, HelpStep } from '../help-modal/help-modal.component';

export type EmailClient = 'default' | 'outlook' | 'gmail';

@Component({
  selector: 'app-contact-modal',
  standalone: true,
  imports: [FormsModule, TranslatePipe, LucideAngularModule, HelpModalComponent],
  templateUrl: './contact-modal.component.html',
  styleUrl: './contact-modal.component.scss',
})
export class ContactModalComponent {
  protected readonly XIcon = X;
  protected readonly ChevronDownIcon = ChevronDown;
  protected readonly MailIcon = Mail;
  protected readonly AtSignIcon = AtSign;
  protected readonly LaptopIcon = Laptop;
  protected readonly TriangleAlertIcon = TriangleAlert;
  protected readonly HelpIcon = CircleQuestionMark;

  // Help modal
  protected readonly showHelpModal = signal(false);
  protected readonly helpSteps: HelpStep[] = [
    { titleKey: 'CONTACT.HELP_STEP_1_TITLE', descriptionKey: 'CONTACT.HELP_STEP_1_DESC' },
    { titleKey: 'CONTACT.HELP_STEP_2_TITLE', descriptionKey: 'CONTACT.HELP_STEP_2_DESC' },
    { titleKey: 'CONTACT.HELP_STEP_3_TITLE', descriptionKey: 'CONTACT.HELP_STEP_3_DESC' },
    { titleKey: 'CONTACT.HELP_STEP_4_TITLE', descriptionKey: 'CONTACT.HELP_STEP_4_DESC' },
    { titleKey: 'CONTACT.HELP_STEP_5_TITLE', descriptionKey: 'CONTACT.HELP_STEP_5_DESC' },
  ];

  // Form data
  readonly name = signal('');
  readonly email = signal('');
  readonly subject = signal('');
  readonly message = signal('');
  readonly emailClient = signal<EmailClient>('default');

  // Validation state
  readonly emailError = signal(false);
  readonly dropdownOpen = signal(false);

  // Output
  readonly closeModal = output<void>();
  readonly compose = output<{
    name: string;
    email: string;
    subject: string;
    message: string;
    client: EmailClient;
  }>();

  protected validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
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

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent) {
    if (this.dropdownOpen()) {
      const target = event.target as HTMLElement;
      if (!target.closest('.custom-select')) {
        this.dropdownOpen.set(false);
      }
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape() {
    if (this.dropdownOpen()) {
      this.dropdownOpen.set(false);
    }
  }

  protected selectEmailClient(client: EmailClient) {
    this.emailClient.set(client);
    this.dropdownOpen.set(false);
  }

  protected getClientIcon(client: EmailClient) {
    switch (client) {
      case 'default':
        return this.LaptopIcon;
      case 'outlook':
        return this.MailIcon;
      case 'gmail':
        return this.AtSignIcon;
    }
  }

  protected getClientLabel(client: EmailClient): string {
    switch (client) {
      case 'outlook':
        return 'Outlook';
      case 'gmail':
        return 'Gmail';
      default:
        return '';
    }
  }

  protected onClose() {
    this.closeModal.emit();
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
      client: this.emailClient(),
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
    this.closeModal.emit();
  }
}
