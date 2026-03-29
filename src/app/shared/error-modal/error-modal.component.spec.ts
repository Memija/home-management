import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorModalComponent, ErrorInstruction } from './error-modal.component';
import { Pipe, PipeTransform } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { vi } from 'vitest';

@Pipe({
  name: 'translate',
  standalone: true,
})
class MockTranslatePipe implements PipeTransform {
  transform(key: string, args?: any): string {
    if (args) {
      return `${key} ${JSON.stringify(args)}`;
    }
    return key;
  }
}

describe('ErrorModalComponent', () => {
  let component: ErrorModalComponent;
  let fixture: ComponentFixture<ErrorModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorModalComponent],
    })
      .overrideComponent(ErrorModalComponent, {
        remove: { imports: [TranslatePipe] },
        add: { imports: [MockTranslatePipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ErrorModalComponent);
    component = fixture.componentInstance;

    // Default required inputs
    fixture.componentRef.setInput('show', true);
    fixture.componentRef.setInput('message', 'Default Error Message');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Display and Rendering', () => {
    it('should not render anything when show is false', () => {
      fixture.componentRef.setInput('show', false);
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector('.modal-overlay');
      expect(overlay).toBeNull();
    });

    it('should render overlay and content when show is true', () => {
      const overlay = fixture.nativeElement.querySelector('.modal-overlay');
      const content = fixture.nativeElement.querySelector('.modal-content');

      expect(overlay).toBeTruthy();
      expect(content).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.error-message').textContent).toContain(
        'Default Error Message',
      );
    });

    it('should apply correct CSS classes based on modal type', () => {
      // Default type is 'error'
      let content = fixture.nativeElement.querySelector('.modal-content');
      expect(content.classList.contains('warning')).toBe(false);
      expect(content.classList.contains('success')).toBe(false);

      // Warning type
      fixture.componentRef.setInput('type', 'warning');
      fixture.detectChanges();
      content = fixture.nativeElement.querySelector('.modal-content');
      expect(content.classList.contains('warning')).toBe(true);

      // Success type
      fixture.componentRef.setInput('type', 'success');
      fixture.detectChanges();
      content = fixture.nativeElement.querySelector('.modal-content');
      expect(content.classList.contains('success')).toBe(true);
    });
  });

  describe('detailLines computation', () => {
    it('should calculate detailLines correctly from a multiline string', () => {
      fixture.componentRef.setInput('details', 'Line 1\nLine 2\n\nLine 3\n  \n');
      fixture.detectChanges();

      const compAsAny = component as any;
      const lines = compAsAny.detailLines();

      expect(lines.length).toBe(3);
      expect(lines).toEqual(['Line 1', 'Line 2', 'Line 3']);
    });

    it('should handle undefined or empty details gracefully', () => {
      fixture.componentRef.setInput('details', '');
      fixture.detectChanges();

      const compAsAny = component as any;
      expect(compAsAny.detailLines().length).toBe(0);

      // DOM should omit error-details sections
      expect(fixture.nativeElement.querySelector('.error-details')).toBeNull();
    });
  });

  describe('instructions formatting', () => {
    it('should identify strings correctly with isString', () => {
      const compAsAny = component as any;
      expect(compAsAny.isString('hello')).toBe(true);
      expect(compAsAny.isString({ key: 'hello' })).toBe(false);
      expect(compAsAny.isString(null)).toBe(false);
    });

    it('should render string and object instructions correctly', () => {
      const testInstructions: (string | ErrorInstruction)[] = [
        'STRING_INSTRUCTION',
        { key: 'OBJECT_INSTRUCTION', params: { code: 123, word: 'fail' } },
      ];

      fixture.componentRef.setInput('instructions', testInstructions);
      fixture.detectChanges();

      const instructionElements = fixture.nativeElement.querySelectorAll('.error-instructions li');
      expect(instructionElements.length).toBe(2);

      expect(instructionElements[0].textContent.trim()).toBe('STRING_INSTRUCTION');
      expect(instructionElements[1].textContent.trim()).toContain(
        'OBJECT_INSTRUCTION {"code":123,"word":"fail"}',
      );
    });

    it('should not render instructions section if the array is empty', () => {
      fixture.componentRef.setInput('instructions', []);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.error-instructions')).toBeNull();
    });
  });

  describe('Events', () => {
    it('should emit cancel event when close button is clicked', () => {
      vi.spyOn(component.cancel, 'emit');
      const closeBtn = fixture.nativeElement.querySelector('.close-btn');

      closeBtn.click();

      expect(component.cancel.emit).toHaveBeenCalled();
    });

    it('should emit cancel event when primary close button is clicked', () => {
      vi.spyOn(component.cancel, 'emit');
      const primaryBtn = fixture.nativeElement.querySelector('.modal-footer .btn-primary');

      primaryBtn.click();

      expect(component.cancel.emit).toHaveBeenCalled();
    });

    it('should emit cancel event when overlay is clicked', () => {
      vi.spyOn(component.cancel, 'emit');
      const overlay = fixture.nativeElement.querySelector('.modal-overlay');

      overlay.click();

      expect(component.cancel.emit).toHaveBeenCalled();
    });

    it('should stop event propagation when modal content is clicked', () => {
      vi.spyOn(component.cancel, 'emit');
      const content = fixture.nativeElement.querySelector('.modal-content');

      const mockEvent = new MouseEvent('click', { bubbles: true });
      vi.spyOn(mockEvent, 'stopPropagation');

      content.dispatchEvent(mockEvent);

      // Stop propagation should be called, but cancel shouldn't be emitted by the overlay receiving the event
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(component.cancel.emit).not.toHaveBeenCalled();
    });
  });
});
