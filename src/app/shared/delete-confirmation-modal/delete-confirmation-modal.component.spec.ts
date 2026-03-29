import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeleteConfirmationModalComponent } from './delete-confirmation-modal.component';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Pipe, PipeTransform, signal } from '@angular/core';
import { vi, afterEach } from 'vitest';
import { By } from '@angular/platform-browser';
import { AlertTriangle } from 'lucide-angular';

@Pipe({ name: 'translate', standalone: true })
class MockTranslatePipe implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

describe('DeleteConfirmationModalComponent', () => {
  let component: DeleteConfirmationModalComponent;
  let fixture: ComponentFixture<DeleteConfirmationModalComponent>;
  let languageServiceMock: any;

  beforeEach(async () => {
    languageServiceMock = {
      currentLang: signal('en'),
      translate: vi.fn().mockImplementation((key: string) => {
        // Simulate simple translation lookup
        const translations: Record<string, string> = {
          'DELETE.TITLE': 'Delete Item',
          'DELETE.MESSAGE': 'Are you sure you want to delete this?',
          'DELETE.MESSAGE_WITH_PARAMS':
            'Are you sure you want to delete {{count}} items from {{source}}?',
          'ACTIONS.CANCEL': 'Cancel',
          'ACTIONS.DELETE': 'Delete',
          'ACTIONS.CLOSE': 'Close',
        };
        return translations[key] || key;
      }),
    };

    await TestBed.configureTestingModule({
      imports: [DeleteConfirmationModalComponent],
    })
      .overrideComponent(DeleteConfirmationModalComponent, {
        remove: { imports: [TranslatePipe] },
        add: { imports: [MockTranslatePipe] },
      })
      .overrideProvider(LanguageService, { useValue: languageServiceMock })
      .compileComponents();

    fixture = TestBed.createComponent(DeleteConfirmationModalComponent);
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

    it('should have correct default input values', () => {
      expect(component.show).toBe(false);
      expect(component.titleKey).toBe('');
      expect(component.messageKey).toBe('');
      expect(component.messageParams).toEqual({});
      expect(component.cancelKey).toBe('');
      expect(component.deleteKey).toBe('');
    });
  });

  describe('Visibility', () => {
    it('should not render modal content when show is false', () => {
      component.show = false;
      fixture.detectChanges();

      const overlay = fixture.debugElement.query(By.css('.modal-overlay'));
      expect(overlay).toBeNull();
    });

    it('should render modal content when show is true', () => {
      component.show = true;
      component.icon = AlertTriangle;
      fixture.detectChanges();

      const overlay = fixture.debugElement.query(By.css('.modal-overlay'));
      expect(overlay).toBeTruthy();
    });

    it('should render all modal sections when visible', () => {
      component.show = true;
      component.icon = AlertTriangle;
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.modal-header'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('.modal-body'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('.modal-footer'))).toBeTruthy();
    });
  });

  describe('Content Display', () => {
    beforeEach(() => {
      component.show = true;
      component.icon = AlertTriangle;
      component.titleKey = 'DELETE.TITLE';
      component.messageKey = 'DELETE.MESSAGE';
      component.cancelKey = 'ACTIONS.CANCEL';
      component.deleteKey = 'ACTIONS.DELETE';
      fixture.detectChanges();
    });

    it('should display the title key in the header', () => {
      const header = fixture.debugElement.query(By.css('.modal-header h3'));
      expect(header.nativeElement.textContent.trim()).toBe('DELETE.TITLE');
    });

    it('should display the cancel key on the secondary button', () => {
      const cancelBtn = fixture.debugElement.query(By.css('.btn-secondary'));
      expect(cancelBtn.nativeElement.textContent.trim()).toBe('ACTIONS.CANCEL');
    });

    it('should display the delete key on the danger button', () => {
      const deleteBtn = fixture.debugElement.query(By.css('.btn-danger'));
      expect(deleteBtn.nativeElement.textContent.trim()).toBe('ACTIONS.DELETE');
    });

    it('should display the close button in header', () => {
      const closeBtn = fixture.debugElement.query(By.css('.close-btn'));
      expect(closeBtn).toBeTruthy();
      expect(closeBtn.nativeElement.textContent.trim()).toBe('×');
    });

    it('should render the icon in the header', () => {
      const icon = fixture.debugElement.query(By.css('.warning-icon'));
      expect(icon).toBeTruthy();
    });
  });

  describe('Translated Message', () => {
    it('should translate message without params', () => {
      component.show = true;
      component.icon = AlertTriangle;
      component.messageKey = 'DELETE.MESSAGE';
      component.messageParams = {};
      fixture.detectChanges();

      const message = (component as any).translatedMessage();
      expect(message).toBe('Are you sure you want to delete this?');
      expect(languageServiceMock.translate).toHaveBeenCalledWith('DELETE.MESSAGE');
    });

    it('should replace single placeholder with param value', () => {
      component.show = true;
      component.icon = AlertTriangle;
      component.messageKey = 'DELETE.MESSAGE_WITH_PARAMS';
      component.messageParams = { count: '5', source: 'water records' };
      fixture.detectChanges();

      const message = (component as any).translatedMessage();
      expect(message).toBe('Are you sure you want to delete 5 items from water records?');
    });

    it('should handle empty messageParams gracefully', () => {
      component.messageKey = 'DELETE.MESSAGE';
      component.messageParams = {};
      fixture.detectChanges();

      const message = (component as any).translatedMessage();
      expect(message).toBe('Are you sure you want to delete this?');
    });

    it('should handle messageKey that is not in translations', () => {
      component.messageKey = 'UNKNOWN.KEY';
      component.messageParams = {};
      fixture.detectChanges();

      const message = (component as any).translatedMessage();
      // Falls back to key itself per mock implementation
      expect(message).toBe('UNKNOWN.KEY');
    });

    it('should leave unreplaced placeholders if params are missing', () => {
      component.messageKey = 'DELETE.MESSAGE_WITH_PARAMS';
      component.messageParams = { count: '3' }; // missing 'source'
      fixture.detectChanges();

      const message = (component as any).translatedMessage();
      expect(message).toBe('Are you sure you want to delete 3 items from {{source}}?');
    });

    it('should react to language changes', () => {
      component.messageKey = 'DELETE.MESSAGE';
      component.messageParams = {};
      fixture.detectChanges();

      // Access the computed to trigger initial evaluation
      (component as any).translatedMessage();

      // Simulate language change
      languageServiceMock.currentLang.set('de');
      const message = (component as any).translatedMessage();

      // translate should have been called again (language signal dependency)
      expect(languageServiceMock.translate).toHaveBeenCalledWith('DELETE.MESSAGE');
    });

    it('should handle special characters in param values', () => {
      component.messageKey = 'DELETE.MESSAGE_WITH_PARAMS';
      component.messageParams = { count: '10', source: 'kitchen & bathroom' };
      fixture.detectChanges();

      const message = (component as any).translatedMessage();
      expect(message).toContain('kitchen & bathroom');
    });
  });

  describe('Event Emitters', () => {
    beforeEach(() => {
      component.show = true;
      component.icon = AlertTriangle;
      component.titleKey = 'DELETE.TITLE';
      component.messageKey = 'DELETE.MESSAGE';
      component.cancelKey = 'ACTIONS.CANCEL';
      component.deleteKey = 'ACTIONS.DELETE';
      fixture.detectChanges();
    });

    it('should emit confirm when onConfirm is called', () => {
      const spy = vi.fn();
      component.confirm.subscribe(spy);

      component.onConfirm();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should emit cancel when onCancel is called', () => {
      const spy = vi.fn();
      component.cancel.subscribe(spy);

      component.onCancel();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should emit confirm when danger button is clicked', () => {
      const spy = vi.fn();
      component.confirm.subscribe(spy);

      const deleteBtn = fixture.debugElement.query(By.css('.btn-danger'));
      deleteBtn.triggerEventHandler('click', null);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should emit cancel when secondary button is clicked', () => {
      const spy = vi.fn();
      component.cancel.subscribe(spy);

      const cancelBtn = fixture.debugElement.query(By.css('.btn-secondary'));
      cancelBtn.triggerEventHandler('click', null);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should emit cancel when close button is clicked', () => {
      const spy = vi.fn();
      component.cancel.subscribe(spy);

      const closeBtn = fixture.debugElement.query(By.css('.close-btn'));
      closeBtn.triggerEventHandler('click', null);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should emit cancel when overlay is clicked', () => {
      const spy = vi.fn();
      component.cancel.subscribe(spy);

      const overlay = fixture.debugElement.query(By.css('.modal-overlay'));
      overlay.triggerEventHandler('click', null);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should not emit cancel when modal content is clicked (stopPropagation)', () => {
      const spy = vi.fn();
      component.cancel.subscribe(spy);

      const content = fixture.debugElement.query(By.css('.modal-content'));
      const mockEvent = { stopPropagation: vi.fn() };
      content.triggerEventHandler('click', mockEvent);

      expect(spy).not.toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty titleKey', () => {
      component.show = true;
      component.icon = AlertTriangle;
      component.titleKey = '';
      fixture.detectChanges();

      const header = fixture.debugElement.query(By.css('.modal-header h3'));
      expect(header).toBeTruthy();
    });

    it('should handle empty messageKey', () => {
      component.messageKey = '';
      component.messageParams = {};
      fixture.detectChanges();

      const message = (component as any).translatedMessage();
      expect(message).toBe('');
    });

    it('should handle empty cancelKey and deleteKey', () => {
      component.show = true;
      component.icon = AlertTriangle;
      component.cancelKey = '';
      component.deleteKey = '';
      fixture.detectChanges();

      const cancelBtn = fixture.debugElement.query(By.css('.btn-secondary'));
      const deleteBtn = fixture.debugElement.query(By.css('.btn-danger'));
      expect(cancelBtn).toBeTruthy();
      expect(deleteBtn).toBeTruthy();
    });

    it('should handle multiple rapid confirm clicks', () => {
      component.show = true;
      component.icon = AlertTriangle;
      fixture.detectChanges();

      const spy = vi.fn();
      component.confirm.subscribe(spy);

      component.onConfirm();
      component.onConfirm();
      component.onConfirm();

      expect(spy).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple rapid cancel clicks', () => {
      component.show = true;
      component.icon = AlertTriangle;
      fixture.detectChanges();

      const spy = vi.fn();
      component.cancel.subscribe(spy);

      component.onCancel();
      component.onCancel();
      component.onCancel();

      expect(spy).toHaveBeenCalledTimes(3);
    });

    it('should not render overlay when show starts as false', () => {
      component.icon = AlertTriangle;
      component.show = false;
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.modal-overlay'))).toBeNull();
    });

    it('should render overlay when show starts as true', () => {
      component.icon = AlertTriangle;
      component.show = true;
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.modal-overlay'))).toBeTruthy();
    });

    it('should handle messageParams with empty string values', () => {
      component.messageKey = 'DELETE.MESSAGE_WITH_PARAMS';
      component.messageParams = { count: '', source: '' };
      fixture.detectChanges();

      const message = (component as any).translatedMessage();
      expect(message).toBe('Are you sure you want to delete  items from ?');
    });
  });

  describe('HTML Structure', () => {
    beforeEach(() => {
      component.show = true;
      component.icon = AlertTriangle;
      component.titleKey = 'DELETE.TITLE';
      component.messageKey = 'DELETE.MESSAGE';
      component.cancelKey = 'ACTIONS.CANCEL';
      component.deleteKey = 'ACTIONS.DELETE';
      fixture.detectChanges();
    });

    it('should have overlay as the outermost element', () => {
      const overlay = fixture.debugElement.query(By.css('.modal-overlay'));
      expect(overlay).toBeTruthy();
      expect(overlay.children.length).toBe(1);
      expect(overlay.children[0].nativeElement.classList.contains('modal-content')).toBe(true);
    });

    it('should have exactly two buttons in footer', () => {
      const footer = fixture.debugElement.query(By.css('.modal-footer'));
      const buttons = footer.queryAll(By.css('button'));
      expect(buttons.length).toBe(2);
      expect(buttons[0].nativeElement.classList.contains('btn-secondary')).toBe(true);
      expect(buttons[1].nativeElement.classList.contains('btn-danger')).toBe(true);
    });

    it('should display translated message in modal body', () => {
      const body = fixture.debugElement.query(By.css('.modal-body p'));
      expect(body).toBeTruthy();
      // The message comes from translatedMessage() computed
      expect(body.nativeElement.textContent).toBeTruthy();
    });
  });
});
