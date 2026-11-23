import { Component, EventEmitter, Input, Output, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Bug, CircleQuestionMark, Lightbulb, Star } from 'lucide-angular';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SUPPORT_EMAIL } from '../../models/contact.model';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ContactService } from '../../services/contact.service';
import { HelpModalComponent, HelpStep } from '../help-modal/help-modal.component';
import { ContactModalComponent } from './contact-modal.component';

@Pipe({ name: 'translate', standalone: true })
class MockTranslatePipe implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

@Component({ selector: 'app-help-modal', standalone: true, template: '' })
class MockHelpModalComponent {
  @Input() show = false;
  @Input() titleKey = '';
  @Input() steps: HelpStep[] = [];
  @Output() closeModal = new EventEmitter<void>();
}

describe('ContactModalComponent', () => {
  let component: ContactModalComponent;
  let fixture: ComponentFixture<ContactModalComponent>;
  let mockContactService: {
    getTurnstileSiteKey: ReturnType<typeof vi.fn>;
    mountTurnstile: ReturnType<typeof vi.fn>;
    submitInquiry: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockContactService = {
      getTurnstileSiteKey: vi.fn().mockReturnValue(''),
      mountTurnstile: vi.fn().mockResolvedValue(null),
      submitInquiry: vi.fn().mockResolvedValue({ ok: true }),
    };

    await TestBed.configureTestingModule({
      imports: [ContactModalComponent],
      providers: [{ provide: ContactService, useValue: mockContactService }],
    })
      .overrideComponent(ContactModalComponent, {
        remove: { imports: [TranslatePipe, HelpModalComponent] },
        add: { imports: [MockTranslatePipe, MockHelpModalComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ContactModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function fillValidForm(): void {
    component.name.set('Jane Doe');
    component['onEmailChange']('jane@example.com');
    component.subject.set('Meter reading question');
    component['onMessageChange']('How can I export my water readings to PDF?');
    fixture.detectChanges();
  }

  describe('Defaults and Category Dropdown', () => {
    it('should initialize with empty fields, default question category, and 5 help steps', () => {
      expect(component.name()).toBe('');
      expect(component.email()).toBe('');
      expect(component.category()).toBe('question');
      expect(component.subject()).toBe('');
      expect(component.message()).toBe('');
      expect(component.canSubmit()).toBe(false);
      expect(component['helpSteps']).toHaveLength(5);
    });

    it('should map each inquiry category to its icon and translation key', () => {
      expect(component['getCategoryIcon']('question')).toBe(CircleQuestionMark);
      expect(component['getCategoryIcon']('bug')).toBe(Bug);
      expect(component['getCategoryIcon']('feature')).toBe(Lightbulb);
      expect(component['getCategoryIcon']('feedback')).toBe(Star);
      expect(component['getCategoryLabelKey']('bug')).toBe('CONTACT.CATEGORY_BUG');
    });

    it('should toggle category dropdown, select category, and close on outside click or Escape', () => {
      component['toggleDropdown']();
      expect(component.dropdownOpen()).toBe(true);

      component['selectCategory']('feature');
      expect(component.category()).toBe('feature');
      expect(component.dropdownOpen()).toBe(false);

      component['toggleDropdown']();
      component['onEscape']();
      expect(component.dropdownOpen()).toBe(false);

      component['toggleDropdown']();
      component['onDocumentClick']({ target: document.body } as unknown as MouseEvent);
      expect(component.dropdownOpen()).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate email and minimum message length dynamically', () => {
      component['onEmailChange']('invalid-email');
      expect(component.emailError()).toBe(true);

      component['onEmailChange']('valid@example.com');
      expect(component.emailError()).toBe(false);

      component['onMessageChange']('short');
      expect(component.messageError()).toBe(true);

      component['onMessageChange']('At least ten characters here.');
      expect(component.messageError()).toBe(false);
    });

    it('should block submission and set validation flags when submitted with invalid email or short message', async () => {
      component.name.set('Jane');
      component.subject.set('Hi');
      component.email.set('bad');
      component.message.set('Valid length message here');

      await component['onSubmit']();
      expect(component.emailError()).toBe(true);
      expect(mockContactService.submitInquiry).not.toHaveBeenCalled();

      component.email.set('jane@example.com');
      component.emailError.set(false);
      component.message.set('short');

      await component['onSubmit']();
      expect(component.messageError()).toBe(true);
      expect(mockContactService.submitInquiry).not.toHaveBeenCalled();
    });
  });

  describe('Submission and Error Recovery', () => {
    it('should submit inquiry, reset form, and emit submitted and closeModal on success', async () => {
      const submittedSpy = vi.fn();
      const closeSpy = vi.fn();
      component.submitted.subscribe(submittedSpy);
      component.closeModal.subscribe(closeSpy);

      fillValidForm();
      component['selectCategory']('bug');
      expect(component.canSubmit()).toBe(true);

      await component['onSubmit']();

      expect(mockContactService.submitInquiry).toHaveBeenCalledWith({
        name: 'Jane Doe',
        email: 'jane@example.com',
        category: 'bug',
        subject: 'Meter reading question',
        message: 'How can I export my water readings to PDF?',
        turnstileToken: undefined,
        website: undefined,
      });
      expect(submittedSpy).toHaveBeenCalledTimes(1);
      expect(closeSpy).toHaveBeenCalledTimes(1);
      expect(component.name()).toBe('');
      expect(component.category()).toBe('question');
    });

    it('should preserve user input and surface mapped error keys when submission fails', async () => {
      const submittedSpy = vi.fn();
      component.submitted.subscribe(submittedSpy);
      fillValidForm();

      mockContactService.submitInquiry.mockResolvedValueOnce({
        ok: false,
        errorCode: 'rate_limited',
      });
      await component['onSubmit']();
      expect(component.submitErrorKey()).toBe('CONTACT.ERROR_RATE_LIMITED');
      expect(component.message()).toBe('How can I export my water readings to PDF?');
      expect(submittedSpy).not.toHaveBeenCalled();

      mockContactService.submitInquiry.mockResolvedValueOnce({
        ok: false,
        errorCode: 'captcha_failed',
      });
      await component['onSubmit']();
      expect(component.submitErrorKey()).toBe('CONTACT.ERROR_CAPTCHA');

      mockContactService.submitInquiry.mockResolvedValueOnce({
        ok: false,
        errorCode: 'network_error',
      });
      await component['onSubmit']();
      expect(component.submitErrorKey()).toBe('CONTACT.ERROR_GENERIC');
    });
  });

  describe('Direct Support Email Copy and Turnstile Lifecycle', () => {
    it('should copy support@home-management.dev to clipboard and reset copied badge after 2s', async () => {
      vi.useFakeTimers();
      const writeTextSpy = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextSpy },
        configurable: true,
      });

      await component['copySupportEmail']();

      expect(writeTextSpy).toHaveBeenCalledWith(SUPPORT_EMAIL);
      expect(component.emailCopied()).toBe(true);

      vi.advanceTimersByTime(2000);
      expect(component.emailCopied()).toBe(false);
      vi.useRealTimers();
    });

    it('should require turnstileToken when Turnstile is enabled and dispose widget on destroy', async () => {
      const disposeSpy = vi.fn();
      mockContactService.getTurnstileSiteKey.mockReturnValue('1x00000000000000000000AA');
      mockContactService.mountTurnstile.mockImplementation(
        async (_el: HTMLElement, cb: (token: string) => void) => {
          cb('turnstile-ok');
          return disposeSpy;
        },
      );

      const tfFixture = TestBed.createComponent(ContactModalComponent);
      const tfComp = tfFixture.componentInstance;
      tfFixture.detectChanges();
      await Promise.resolve();

      expect(tfComp.hasTurnstile()).toBe(true);
      expect(tfComp.turnstileToken()).toBe('turnstile-ok');

      tfFixture.destroy();
      expect(disposeSpy).toHaveBeenCalledTimes(1);
    });
  });
});
