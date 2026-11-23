import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Bug,
  Check,
  ChevronDown,
  CircleQuestionMark,
  Copy,
  Lightbulb,
  LoaderCircle,
  LucideAngularModule,
  LucideIconData,
  Send,
  Star,
  TriangleAlert,
  X,
} from 'lucide-angular';
import {
  CONTACT_CATEGORIES,
  CONTACT_FIELD_LIMITS,
  ContactCategory,
  ContactErrorCode,
  SUPPORT_EMAIL,
  isValidContactEmail,
} from '../../models/contact.model';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ContactService } from '../../services/contact.service';
import { HelpModalComponent, HelpStep } from '../help-modal/help-modal.component';

const CATEGORY_LABEL_KEYS: Readonly<Record<ContactCategory, string>> = {
  question: 'CONTACT.CATEGORY_QUESTION',
  bug: 'CONTACT.CATEGORY_BUG',
  feature: 'CONTACT.CATEGORY_FEATURE',
  feedback: 'CONTACT.CATEGORY_FEEDBACK',
};

function mapErrorCodeToKey(errorCode?: ContactErrorCode): string {
  if (errorCode === 'rate_limited') return 'CONTACT.ERROR_RATE_LIMITED';
  if (errorCode === 'captcha_failed') return 'CONTACT.ERROR_CAPTCHA';
  return 'CONTACT.ERROR_GENERIC';
}

@Component({
  selector: 'app-contact-modal',
  standalone: true,
  imports: [FormsModule, TranslatePipe, LucideAngularModule, HelpModalComponent],
  templateUrl: './contact-modal.component.html',
  styleUrl: './contact-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactModalComponent implements AfterViewInit, OnDestroy {
  private readonly contactService = inject(ContactService);

  @ViewChild('turnstileHost') private turnstileHost?: ElementRef<HTMLElement>;

  protected readonly XIcon = X;
  protected readonly ChevronDownIcon = ChevronDown;
  protected readonly TriangleAlertIcon = TriangleAlert;
  protected readonly HelpIcon = CircleQuestionMark;
  protected readonly SendIcon = Send;
  protected readonly LoaderIcon = LoaderCircle;
  protected readonly CopyIcon = Copy;
  protected readonly CheckIcon = Check;

  private readonly categoryIcons: Readonly<Record<ContactCategory, LucideIconData>> = {
    question: CircleQuestionMark,
    bug: Bug,
    feature: Lightbulb,
    feedback: Star,
  };

  protected readonly categories = CONTACT_CATEGORIES;
  protected readonly fieldLimits = CONTACT_FIELD_LIMITS;
  protected readonly supportEmail = SUPPORT_EMAIL;

  protected readonly showHelpModal = signal(false);
  protected readonly helpSteps: HelpStep[] = [
    { titleKey: 'CONTACT.HELP_STEP_1_TITLE', descriptionKey: 'CONTACT.HELP_STEP_1_DESC' },
    { titleKey: 'CONTACT.HELP_STEP_2_TITLE', descriptionKey: 'CONTACT.HELP_STEP_2_DESC' },
    { titleKey: 'CONTACT.HELP_STEP_3_TITLE', descriptionKey: 'CONTACT.HELP_STEP_3_DESC' },
    { titleKey: 'CONTACT.HELP_STEP_4_TITLE', descriptionKey: 'CONTACT.HELP_STEP_4_DESC' },
    { titleKey: 'CONTACT.HELP_STEP_5_TITLE', descriptionKey: 'CONTACT.HELP_STEP_5_DESC' },
  ];

  // Form state
  readonly name = signal('');
  readonly email = signal('');
  readonly category = signal<ContactCategory>('question');
  readonly subject = signal('');
  readonly message = signal('');
  readonly website = signal('');
  readonly turnstileToken = signal('');

  // Validation & submission state
  readonly emailError = signal(false);
  readonly messageError = signal(false);
  readonly dropdownOpen = signal(false);
  readonly isSubmitting = signal(false);
  readonly submitErrorKey = signal<string | null>(null);
  readonly emailCopied = signal(false);

  readonly hasTurnstile = computed(() => Boolean(this.contactService.getTurnstileSiteKey()));

  readonly canSubmit = computed(
    () =>
      !this.isSubmitting() &&
      Boolean(this.name().trim()) &&
      Boolean(this.email().trim()) &&
      Boolean(this.subject().trim()) &&
      this.message().trim().length >= CONTACT_FIELD_LIMITS.messageMin &&
      !this.emailError() &&
      (!this.hasTurnstile() || Boolean(this.turnstileToken())),
  );

  // Outputs
  readonly closeModal = output<void>();
  readonly submitted = output<void>();

  private disposeTurnstile: (() => void) | null = null;
  private copyResetTimer: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit(): void {
    const host = this.turnstileHost?.nativeElement;
    if (this.hasTurnstile() && host) {
      void this.initTurnstile(host);
    }
  }

  ngOnDestroy(): void {
    this.disposeTurnstile?.();
    if (this.copyResetTimer) {
      clearTimeout(this.copyResetTimer);
    }
  }

  protected onEmailChange(value: string): void {
    this.email.set(value);
    this.submitErrorKey.set(null);
    this.emailError.set(Boolean(value.trim()) && !isValidContactEmail(value));
  }

  protected onMessageChange(value: string): void {
    this.message.set(value);
    this.submitErrorKey.set(null);
    const trimmedLen = value.trim().length;
    this.messageError.set(trimmedLen > 0 && trimmedLen < CONTACT_FIELD_LIMITS.messageMin);
  }

  protected toggleDropdown(): void {
    if (!this.isSubmitting()) {
      this.dropdownOpen.set(!this.dropdownOpen());
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.dropdownOpen()) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('.custom-select')) {
        this.dropdownOpen.set(false);
      }
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.dropdownOpen()) {
      this.dropdownOpen.set(false);
    }
  }

  protected selectCategory(cat: ContactCategory): void {
    this.category.set(cat);
    this.dropdownOpen.set(false);
  }

  protected getCategoryIcon(cat: ContactCategory): LucideIconData {
    return this.categoryIcons[cat];
  }

  protected getCategoryLabelKey(cat: ContactCategory): string {
    return CATEGORY_LABEL_KEYS[cat];
  }

  protected async copySupportEmail(): Promise<void> {
    try {
      await navigator.clipboard?.writeText(SUPPORT_EMAIL);
      this.emailCopied.set(true);
      if (this.copyResetTimer) {
        clearTimeout(this.copyResetTimer);
      }
      this.copyResetTimer = setTimeout(() => this.emailCopied.set(false), 2000);
    } catch {
      // Clipboard API unavailable in non-secure context; ignore gracefully
    }
  }

  protected onClose(): void {
    if (!this.isSubmitting()) {
      this.closeModal.emit();
    }
  }

  protected async onSubmit(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    if (!isValidContactEmail(this.email())) {
      this.emailError.set(true);
      return;
    }

    if (this.message().trim().length < CONTACT_FIELD_LIMITS.messageMin) {
      this.messageError.set(true);
      return;
    }

    if (!this.name().trim() || !this.subject().trim()) {
      return;
    }

    this.isSubmitting.set(true);
    this.submitErrorKey.set(null);

    try {
      const result = await this.contactService.submitInquiry({
        name: this.name(),
        email: this.email(),
        category: this.category(),
        subject: this.subject(),
        message: this.message(),
        turnstileToken: this.turnstileToken() || undefined,
        website: this.website() || undefined,
      });

      if (!result.ok) {
        this.submitErrorKey.set(mapErrorCodeToKey(result.errorCode));
        return;
      }

      this.resetForm();
      this.submitted.emit();
      this.closeModal.emit();
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private async initTurnstile(host: HTMLElement): Promise<void> {
    this.disposeTurnstile = await this.contactService.mountTurnstile(host, (token) =>
      this.turnstileToken.set(token),
    );
  }

  private resetForm(): void {
    this.name.set('');
    this.email.set('');
    this.category.set('question');
    this.subject.set('');
    this.message.set('');
    this.website.set('');
    this.turnstileToken.set('');
    this.emailError.set(false);
    this.messageError.set(false);
    this.dropdownOpen.set(false);
    this.submitErrorKey.set(null);
  }
}
