import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContactModalComponent, EmailClient } from './contact-modal.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { HelpModalComponent } from '../help-modal/help-modal.component';
import { Pipe, PipeTransform, Component, Input, Output, EventEmitter } from '@angular/core';
import { vi, afterEach } from 'vitest';
import { By } from '@angular/platform-browser';

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
  @Input() steps: any[] = [];
  @Output() close = new EventEmitter<void>();
}

describe('ContactModalComponent', () => {
  let component: ContactModalComponent;
  let fixture: ComponentFixture<ContactModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactModalComponent],
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

  describe('Creation and Defaults', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have empty name by default', () => {
      expect(component.name()).toBe('');
    });

    it('should have empty email by default', () => {
      expect(component.email()).toBe('');
    });

    it('should have empty subject by default', () => {
      expect(component.subject()).toBe('');
    });

    it('should have empty message by default', () => {
      expect(component.message()).toBe('');
    });

    it('should default email client to "default"', () => {
      expect(component.emailClient()).toBe('default');
    });

    it('should have no email error by default', () => {
      expect(component.emailError()).toBe(false);
    });

    it('should have dropdown closed by default', () => {
      expect(component.dropdownOpen()).toBe(false);
    });

    it('should have 5 help steps defined', () => {
      expect((component as any).helpSteps.length).toBe(5);
    });

    it('should have help modal hidden by default', () => {
      expect((component as any).showHelpModal()).toBe(false);
    });
  });

  describe('Email Validation', () => {
    it('should accept valid email addresses', () => {
      expect((component as any).validateEmail('user@example.com')).toBe(true);
      expect((component as any).validateEmail('test.name@domain.org')).toBe(true);
      expect((component as any).validateEmail('a@b.co')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect((component as any).validateEmail('')).toBe(false);
      expect((component as any).validateEmail('no-at-sign')).toBe(false);
      expect((component as any).validateEmail('@missing-local.com')).toBe(false);
      expect((component as any).validateEmail('missing@domain')).toBe(false);
      expect((component as any).validateEmail('spaces in@email.com')).toBe(false);
    });

    it('should reject email with no domain extension', () => {
      expect((component as any).validateEmail('user@domain')).toBe(false);
    });

    it('should reject email with spaces', () => {
      expect((component as any).validateEmail('user @example.com')).toBe(false);
      expect((component as any).validateEmail('user@ example.com')).toBe(false);
    });
  });

  describe('onEmailChange', () => {
    it('should update the email signal', () => {
      (component as any).onEmailChange('test@example.com');
      expect(component.email()).toBe('test@example.com');
    });

    it('should set emailError to true for invalid email', () => {
      (component as any).onEmailChange('invalid-email');
      expect(component.emailError()).toBe(true);
    });

    it('should clear emailError for valid email', () => {
      (component as any).onEmailChange('invalid-email');
      expect(component.emailError()).toBe(true);

      (component as any).onEmailChange('valid@email.com');
      expect(component.emailError()).toBe(false);
    });

    it('should clear emailError when email is empty', () => {
      (component as any).onEmailChange('invalid-email');
      expect(component.emailError()).toBe(true);

      (component as any).onEmailChange('');
      expect(component.emailError()).toBe(false);
    });
  });

  describe('toggleDropdown', () => {
    it('should open dropdown when closed', () => {
      (component as any).toggleDropdown();
      expect(component.dropdownOpen()).toBe(true);
    });

    it('should close dropdown when open', () => {
      (component as any).toggleDropdown();
      (component as any).toggleDropdown();
      expect(component.dropdownOpen()).toBe(false);
    });
  });

  describe('selectEmailClient', () => {
    it('should set the email client', () => {
      (component as any).selectEmailClient('gmail');
      expect(component.emailClient()).toBe('gmail');
    });

    it('should close the dropdown after selection', () => {
      component.dropdownOpen.set(true);
      (component as any).selectEmailClient('outlook');
      expect(component.dropdownOpen()).toBe(false);
    });

    it('should handle all client types', () => {
      const clients: EmailClient[] = ['default', 'outlook', 'gmail'];
      clients.forEach((client) => {
        (component as any).selectEmailClient(client);
        expect(component.emailClient()).toBe(client);
      });
    });
  });

  describe('getClientIcon', () => {
    it('should return LaptopIcon for default', () => {
      expect((component as any).getClientIcon('default')).toBe((component as any).LaptopIcon);
    });

    it('should return MailIcon for outlook', () => {
      expect((component as any).getClientIcon('outlook')).toBe((component as any).MailIcon);
    });

    it('should return AtSignIcon for gmail', () => {
      expect((component as any).getClientIcon('gmail')).toBe((component as any).AtSignIcon);
    });
  });

  describe('getClientLabel', () => {
    it('should return "Outlook" for outlook', () => {
      expect((component as any).getClientLabel('outlook')).toBe('Outlook');
    });

    it('should return "Gmail" for gmail', () => {
      expect((component as any).getClientLabel('gmail')).toBe('Gmail');
    });

    it('should return empty string for default', () => {
      expect((component as any).getClientLabel('default')).toBe('');
    });
  });

  describe('onClose', () => {
    it('should emit close event', () => {
      const spy = vi.fn();
      component.close.subscribe(spy);

      (component as any).onClose();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onCompose', () => {
    const fillForm = () => {
      component.name.set('John Doe');
      component.email.set('john@example.com');
      component.subject.set('Test Subject');
      component.message.set('Test message content');
    };

    it('should not emit when name is empty', () => {
      const spy = vi.fn();
      component.compose.subscribe(spy);

      component.email.set('john@example.com');
      component.subject.set('Test');
      component.message.set('Content');

      (component as any).onCompose();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit when email is empty', () => {
      const spy = vi.fn();
      component.compose.subscribe(spy);

      component.name.set('John');
      component.subject.set('Test');
      component.message.set('Content');

      (component as any).onCompose();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit when subject is empty', () => {
      const spy = vi.fn();
      component.compose.subscribe(spy);

      component.name.set('John');
      component.email.set('john@example.com');
      component.message.set('Content');

      (component as any).onCompose();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit when message is empty', () => {
      const spy = vi.fn();
      component.compose.subscribe(spy);

      component.name.set('John');
      component.email.set('john@example.com');
      component.subject.set('Test');

      (component as any).onCompose();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit when email is invalid', () => {
      const spy = vi.fn();
      component.compose.subscribe(spy);

      component.name.set('John');
      component.email.set('invalid-email');
      component.subject.set('Test');
      component.message.set('Content');

      (component as any).onCompose();
      expect(spy).not.toHaveBeenCalled();
      expect(component.emailError()).toBe(true);
    });

    it('should emit compose with form data when valid', () => {
      const spy = vi.fn();
      component.compose.subscribe(spy);

      fillForm();
      (component as any).onCompose();

      expect(spy).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Subject',
        message: 'Test message content',
        client: 'default',
      });
    });

    it('should include selected email client in compose data', () => {
      const spy = vi.fn();
      component.compose.subscribe(spy);

      fillForm();
      component.emailClient.set('gmail');
      (component as any).onCompose();

      expect(spy).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Subject',
        message: 'Test message content',
        client: 'gmail',
      });
    });

    it('should reset form after successful compose', () => {
      const spy = vi.fn();
      component.compose.subscribe(spy);

      fillForm();
      component.emailClient.set('outlook');
      (component as any).onCompose();

      expect(component.name()).toBe('');
      expect(component.email()).toBe('');
      expect(component.subject()).toBe('');
      expect(component.message()).toBe('');
      expect(component.emailClient()).toBe('default');
      expect(component.emailError()).toBe(false);
      expect(component.dropdownOpen()).toBe(false);
    });

    it('should emit close after successful compose', () => {
      const closeSpy = vi.fn();
      const composeSpy = vi.fn();
      component.close.subscribe(closeSpy);
      component.compose.subscribe(composeSpy);

      fillForm();
      (component as any).onCompose();

      expect(composeSpy).toHaveBeenCalledTimes(1);
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('should not reset form when validation fails', () => {
      component.name.set('John');
      component.email.set('invalid');
      component.subject.set('Test');
      component.message.set('Content');

      (component as any).onCompose();

      // Form should NOT be reset since validation failed
      expect(component.name()).toBe('John');
      expect(component.subject()).toBe('Test');
      expect(component.message()).toBe('Content');
    });
  });

  describe('Help Modal', () => {
    it('should open help modal', () => {
      (component as any).showHelpModal.set(true);
      expect((component as any).showHelpModal()).toBe(true);
    });

    it('should close help modal', () => {
      (component as any).showHelpModal.set(true);
      (component as any).showHelpModal.set(false);
      expect((component as any).showHelpModal()).toBe(false);
    });

    it('should have correct help step keys', () => {
      const steps = (component as any).helpSteps;
      expect(steps[0].titleKey).toBe('CONTACT.HELP_STEP_1_TITLE');
      expect(steps[0].descriptionKey).toBe('CONTACT.HELP_STEP_1_DESC');
      expect(steps[4].titleKey).toBe('CONTACT.HELP_STEP_5_TITLE');
      expect(steps[4].descriptionKey).toBe('CONTACT.HELP_STEP_5_DESC');
    });
  });

  describe('Edge Cases', () => {
    it('should handle email with valid format but unusual TLD', () => {
      expect((component as any).validateEmail('user@example.museum')).toBe(true);
    });

    it('should handle email with subdomain', () => {
      expect((component as any).validateEmail('user@mail.example.com')).toBe(true);
    });

    it('should handle email with plus addressing', () => {
      expect((component as any).validateEmail('user+tag@example.com')).toBe(true);
    });

    it('should handle rapid email client switching', () => {
      (component as any).selectEmailClient('gmail');
      (component as any).selectEmailClient('outlook');
      (component as any).selectEmailClient('default');
      (component as any).selectEmailClient('gmail');
      expect(component.emailClient()).toBe('gmail');
    });

    it('should handle rapid dropdown toggling', () => {
      (component as any).toggleDropdown();
      (component as any).toggleDropdown();
      (component as any).toggleDropdown();
      (component as any).toggleDropdown();
      expect(component.dropdownOpen()).toBe(false);
    });

    it('should handle form submission with whitespace-only fields', () => {
      const spy = vi.fn();
      component.compose.subscribe(spy);

      // Whitespace-only name still passes the truthy check
      component.name.set('   ');
      component.email.set('test@test.com');
      component.subject.set('   ');
      component.message.set('   ');

      (component as any).onCompose();
      // Whitespace-only strings are truthy, so compose should emit
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should handle email validation then correction', () => {
      (component as any).onEmailChange('bad');
      expect(component.emailError()).toBe(true);

      (component as any).onEmailChange('bad@');
      expect(component.emailError()).toBe(true);

      (component as any).onEmailChange('bad@email');
      expect(component.emailError()).toBe(true);

      (component as any).onEmailChange('bad@email.com');
      expect(component.emailError()).toBe(false);
    });

    it('should handle multiple compose calls with valid data', () => {
      const composeSpy = vi.fn();
      component.compose.subscribe(composeSpy);

      // First compose
      component.name.set('John');
      component.email.set('john@test.com');
      component.subject.set('Subject 1');
      component.message.set('Message 1');
      (component as any).onCompose();

      // Form is reset, fill again
      component.name.set('Jane');
      component.email.set('jane@test.com');
      component.subject.set('Subject 2');
      component.message.set('Message 2');
      (component as any).onCompose();

      expect(composeSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('DOM Rendering', () => {
    it('should render the modal overlay', () => {
      const overlay = fixture.debugElement.query(By.css('.modal-overlay'));
      expect(overlay).toBeTruthy();
    });

    it('should render the modal container', () => {
      const container = fixture.debugElement.query(By.css('.modal-container'));
      expect(container).toBeTruthy();
    });

    it('should render the form with all required fields', () => {
      const nameInput = fixture.debugElement.query(By.css('#contact-name'));
      const emailInput = fixture.debugElement.query(By.css('#contact-email'));
      const subjectInput = fixture.debugElement.query(By.css('#contact-subject'));
      const messageTextarea = fixture.debugElement.query(By.css('#contact-message'));

      expect(nameInput).toBeTruthy();
      expect(emailInput).toBeTruthy();
      expect(subjectInput).toBeTruthy();
      expect(messageTextarea).toBeTruthy();
    });

    it('should render cancel and send buttons', () => {
      const cancelBtn = fixture.debugElement.query(By.css('.btn-secondary'));
      const sendBtn = fixture.debugElement.query(By.css('.btn-primary'));

      expect(cancelBtn).toBeTruthy();
      expect(sendBtn).toBeTruthy();
    });

    it('should disable send button when form is incomplete', () => {
      fixture.detectChanges();

      const sendBtn = fixture.debugElement.query(By.css('.btn-primary'));
      expect(sendBtn.nativeElement.disabled).toBe(true);
    });

    it('should render close button in header', () => {
      const closeBtn = fixture.debugElement.query(By.css('.close-btn'));
      expect(closeBtn).toBeTruthy();
    });

    it('should render help button in header', () => {
      const helpBtn = fixture.debugElement.query(By.css('.help-btn'));
      expect(helpBtn).toBeTruthy();
    });

    it('should emit close when overlay is clicked', () => {
      const spy = vi.fn();
      component.close.subscribe(spy);

      const overlay = fixture.debugElement.query(By.css('.modal-overlay'));
      overlay.triggerEventHandler('click', null);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should not emit close when modal container is clicked (stopPropagation)', () => {
      const spy = vi.fn();
      component.close.subscribe(spy);

      const container = fixture.debugElement.query(By.css('.modal-container'));
      const mockEvent = { stopPropagation: vi.fn() };
      container.triggerEventHandler('click', mockEvent);

      expect(spy).not.toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should render the email client selector', () => {
      const selector = fixture.debugElement.query(By.css('.custom-select'));
      expect(selector).toBeTruthy();
    });

    it('should have proper ARIA attributes on email client selector', () => {
      const selector = fixture.debugElement.query(By.css('.custom-select'));
      expect(selector.nativeElement.getAttribute('role')).toBe('combobox');
      expect(selector.nativeElement.getAttribute('aria-haspopup')).toBe('listbox');
    });

    it('should not show email error message by default', () => {
      const errorMsg = fixture.debugElement.query(By.css('.error-message'));
      expect(errorMsg).toBeNull();
    });
  });
});
