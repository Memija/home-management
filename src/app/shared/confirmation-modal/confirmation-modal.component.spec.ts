import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationModalComponent } from './confirmation-modal.component';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Pipe, PipeTransform, signal, WritableSignal } from '@angular/core';
import { vi, afterEach, describe, it, expect, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';
import { Info } from 'lucide-angular';
import { ConfirmationModalHarness } from './confirmation-modal.harness';
import { getHarness } from '../../../testing';

@Pipe({ name: 'translate', standalone: true })
class MockTranslatePipe implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

describe('ConfirmationModalComponent', () => {
  let component: ConfirmationModalComponent;
  let fixture: ComponentFixture<ConfirmationModalComponent>;
  let languageServiceMock: {
    currentLang: WritableSignal<string>;
    translate: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    languageServiceMock = {
      currentLang: signal('en'),
      translate: vi.fn().mockImplementation((key: string) => key),
    };

    await TestBed.configureTestingModule({
      imports: [ConfirmationModalComponent],
    })
      .overrideComponent(ConfirmationModalComponent, {
        remove: { imports: [TranslatePipe] },
        add: { imports: [MockTranslatePipe] },
      })
      .overrideProvider(LanguageService, { useValue: languageServiceMock })
      .compileComponents();

    fixture = TestBed.createComponent(ConfirmationModalComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Creation and Defaults', () => {
    it('should create', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should not show by default', () => {
      expect(component.show).toBe(false);
    });

    it('should have empty titleKey by default', () => {
      expect(component.titleKey).toBe('');
    });

    it('should have empty messageKey by default', () => {
      expect(component.messageKey).toBe('');
    });

    it('should have empty messageParams by default', () => {
      expect(component.messageParams).toEqual({});
    });

    it('should have empty cancelKey by default', () => {
      expect(component.cancelKey).toBe('');
    });

    it('should have empty confirmKey by default', () => {
      expect(component.confirmKey).toBe('');
    });
  });

  describe('translatedMessage', () => {
    it('should translate the message key', () => {
      component.messageKey = 'TEST.MESSAGE';
      fixture.detectChanges();

      component['translatedMessage']();
      expect(languageServiceMock.translate).toHaveBeenCalledWith('TEST.MESSAGE');
    });

    it('should replace placeholders with params', () => {
      languageServiceMock.translate.mockReturnValue('Hello {{name}}, you have {{count}} items');
      component.messageKey = 'TEST.MESSAGE';
      component.messageParams = { name: 'John', count: '5' };
      fixture.detectChanges();

      const result = component['translatedMessage']();
      expect(result).toBe('Hello John, you have 5 items');
    });

    it('should handle message with no placeholders', () => {
      languageServiceMock.translate.mockReturnValue('Simple message');
      component.messageKey = 'TEST.SIMPLE';
      component.messageParams = {};
      fixture.detectChanges();

      const result = component['translatedMessage']();
      expect(result).toBe('Simple message');
    });

    it('should handle single placeholder', () => {
      languageServiceMock.translate.mockReturnValue('Delete {{item}}?');
      component.messageKey = 'TEST.DELETE';
      component.messageParams = { item: 'record' };
      fixture.detectChanges();

      const result = component['translatedMessage']();
      expect(result).toBe('Delete record?');
    });

    it('should leave unreplaced placeholders if param not provided', () => {
      languageServiceMock.translate.mockReturnValue('Hello {{name}}');
      component.messageKey = 'TEST.MSG';
      component.messageParams = {};
      fixture.detectChanges();

      const result = component['translatedMessage']();
      expect(result).toBe('Hello {{name}}');
    });

    it('should react to language changes', () => {
      component.messageKey = 'TEST.MESSAGE';
      fixture.detectChanges();

      component['translatedMessage']();

      languageServiceMock.currentLang.set('de');
      component['translatedMessage']();

      // translate should have been called at least twice
      expect(languageServiceMock.translate).toHaveBeenCalledWith('TEST.MESSAGE');
    });
  });

  describe('onConfirm', () => {
    it('should emit confirm event', () => {
      const spy = vi.fn();
      component.confirm.subscribe(spy);

      component.onConfirm();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onCancel', () => {
    it('should emit cancel event', () => {
      const spy = vi.fn();
      component.cancelModal.subscribe(spy);

      component.onCancel();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('DOM Rendering - Hidden State', () => {
    it('should not render modal when show is false', () => {
      component.show = false;
      fixture.detectChanges();

      const overlay = fixture.debugElement.query(By.css('.modal-overlay'));
      expect(overlay).toBeNull();
    });
  });

  describe('DOM Rendering - Visible State', () => {
    beforeEach(() => {
      component.show = true;
      component.titleKey = 'TEST.TITLE';
      component.messageKey = 'TEST.MESSAGE';
      component.cancelKey = 'TEST.CANCEL';
      component.confirmKey = 'TEST.CONFIRM';
      component.icon = Info;
      fixture.detectChanges();
    });

    it('should render modal overlay when show is true', () => {
      const overlay = fixture.debugElement.query(By.css('.modal-overlay'));
      expect(overlay).toBeTruthy();
    });

    it('should render modal content', () => {
      const content = fixture.debugElement.query(By.css('.modal-content'));
      expect(content).toBeTruthy();
    });

    it('should render modal header with title', () => {
      const header = fixture.debugElement.query(By.css('.modal-header h3'));
      expect(header).toBeTruthy();
      expect(header.nativeElement.textContent).toContain('TEST.TITLE');
    });

    it('should render modal body with message', () => {
      const body = fixture.debugElement.query(By.css('.modal-body p'));
      expect(body).toBeTruthy();
    });

    it('should render cancel button', () => {
      const cancelBtn = fixture.debugElement.query(By.css('.btn-secondary'));
      expect(cancelBtn).toBeTruthy();
      expect(cancelBtn.nativeElement.textContent).toContain('TEST.CANCEL');
    });

    it('should render confirm button', () => {
      const confirmBtn = fixture.debugElement.query(By.css('.btn-primary'));
      expect(confirmBtn).toBeTruthy();
      expect(confirmBtn.nativeElement.textContent).toContain('TEST.CONFIRM');
    });

    it('should render close button with × symbol', () => {
      const closeBtn = fixture.debugElement.query(By.css('.close-btn'));
      expect(closeBtn).toBeTruthy();
      expect(closeBtn.nativeElement.textContent).toContain('×');
    });

    it('should render icon in header', () => {
      const icon = fixture.debugElement.query(By.css('.info-icon'));
      expect(icon).toBeTruthy();
    });

    it('should emit cancel when overlay is clicked', () => {
      const spy = vi.fn();
      component.cancelModal.subscribe(spy);

      const overlay = fixture.debugElement.query(By.css('.modal-overlay'));
      overlay.triggerEventHandler('click', null);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should not emit cancel when modal content is clicked (stopPropagation)', () => {
      const spy = vi.fn();
      component.cancelModal.subscribe(spy);

      const content = fixture.debugElement.query(By.css('.modal-content'));
      const mockEvent = { stopPropagation: vi.fn() };
      content.triggerEventHandler('click', mockEvent);

      expect(spy).not.toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should emit cancel when close button is clicked', () => {
      const spy = vi.fn();
      component.cancelModal.subscribe(spy);

      const closeBtn = fixture.debugElement.query(By.css('.close-btn'));
      closeBtn.triggerEventHandler('click', null);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should emit cancel when cancel button is clicked', () => {
      const spy = vi.fn();
      component.cancelModal.subscribe(spy);

      const cancelBtn = fixture.debugElement.query(By.css('.btn-secondary'));
      cancelBtn.triggerEventHandler('click', null);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should emit confirm when confirm button is clicked', () => {
      const spy = vi.fn();
      component.confirm.subscribe(spy);

      const confirmBtn = fixture.debugElement.query(By.css('.btn-primary'));
      confirmBtn.triggerEventHandler('click', null);

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should not render overlay when show is false', () => {
      component.show = false;
      component.icon = Info;
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('.modal-overlay'))).toBeNull();
    });

    it('should render overlay when show is initially true', () => {
      component.show = true;
      component.icon = Info;
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('.modal-overlay'))).toBeTruthy();
    });

    it('should handle empty message key', () => {
      languageServiceMock.translate.mockReturnValue('');
      component.messageKey = '';
      fixture.detectChanges();

      const result = component['translatedMessage']();
      expect(result).toBe('');
    });

    it('should handle special characters in params', () => {
      languageServiceMock.translate.mockReturnValue('Value: {{val}}');
      component.messageKey = 'TEST.MSG';
      component.messageParams = { val: '<script>alert("xss")</script>' };
      fixture.detectChanges();

      const result = component['translatedMessage']();
      expect(result).toBe('Value: <script>alert("xss")</script>');
    });

    it('should handle params with empty values', () => {
      languageServiceMock.translate.mockReturnValue('Name: {{name}}');
      component.messageKey = 'TEST.MSG';
      component.messageParams = { name: '' };
      fixture.detectChanges();

      const result = component['translatedMessage']();
      expect(result).toBe('Name: ');
    });

    it('should handle multiple calls to onConfirm', () => {
      const spy = vi.fn();
      component.confirm.subscribe(spy);

      component.onConfirm();
      component.onConfirm();
      component.onConfirm();

      expect(spy).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple calls to onCancel', () => {
      const spy = vi.fn();
      component.cancelModal.subscribe(spy);

      component.onCancel();
      component.onCancel();

      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Using ConfirmationModalHarness', () => {
    let harness: ConfirmationModalHarness;

    beforeEach(async () => {
      harness = await getHarness(fixture, ConfirmationModalHarness);
    });

    it('should report open state accurately', async () => {
      fixture.componentRef.setInput('show', false);
      expect(await harness.isOpen()).toBe(false);

      fixture.componentRef.setInput('icon', Info);
      fixture.componentRef.setInput('show', true);
      expect(await harness.isOpen()).toBe(true);
    });

    it('should read title and message text via harness', async () => {
      fixture.componentRef.setInput('icon', Info);
      fixture.componentRef.setInput('show', true);
      fixture.componentRef.setInput('titleKey', 'CONFIRM.TITLE');
      fixture.componentRef.setInput('messageKey', 'CONFIRM.MESSAGE');

      expect(await harness.getTitleText()).toBe('CONFIRM.TITLE');
      expect(await harness.getMessageText()).toBe('CONFIRM.MESSAGE');
    });

    it('should trigger confirm event on clicking confirm button via harness', async () => {
      fixture.componentRef.setInput('icon', Info);
      fixture.componentRef.setInput('show', true);

      const confirmSpy = vi.fn();
      component.confirm.subscribe(confirmSpy);

      await harness.clickConfirm();
      expect(confirmSpy).toHaveBeenCalledTimes(1);
    });

    it('should trigger cancel event on clicking cancel button via harness', async () => {
      fixture.componentRef.setInput('icon', Info);
      fixture.componentRef.setInput('show', true);

      const cancelSpy = vi.fn();
      component.cancelModal.subscribe(cancelSpy);

      await harness.clickCancel();
      expect(cancelSpy).toHaveBeenCalledTimes(1);
    });

    it('should trigger cancel event on clicking close button via harness', async () => {
      fixture.componentRef.setInput('icon', Info);
      fixture.componentRef.setInput('show', true);

      const cancelSpy = vi.fn();
      component.cancelModal.subscribe(cancelSpy);

      await harness.clickClose();
      expect(cancelSpy).toHaveBeenCalledTimes(1);
    });

    it('should trigger cancel event on clicking overlay via harness', async () => {
      fixture.componentRef.setInput('icon', Info);
      fixture.componentRef.setInput('show', true);

      const cancelSpy = vi.fn();
      component.cancelModal.subscribe(cancelSpy);

      await harness.clickOverlay();
      expect(cancelSpy).toHaveBeenCalledTimes(1);
    });
  });
});
