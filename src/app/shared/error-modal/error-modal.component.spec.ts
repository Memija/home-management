import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorModalComponent, ErrorInstruction } from './error-modal.component';
import { signal } from '@angular/core';
import { LanguageService } from '../../services/language.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ErrorModalComponent', () => {
  let component: ErrorModalComponent;
  let fixture: ComponentFixture<ErrorModalComponent>;

  beforeEach(async () => {
    const mockLanguageService = {
      currentLang: signal('en'),
      translate: vi.fn((key: string, args?: Record<string, unknown>) => {
        if (args) {
          return `${key} ${JSON.stringify(args)}`;
        }
        return key;
      }),
    };

    await TestBed.configureTestingModule({
      imports: [ErrorModalComponent],
      providers: [{ provide: LanguageService, useValue: mockLanguageService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorModalComponent);
    component = fixture.componentInstance;

    // Default inputs
    component.show = true;
    component.message = 'Default Error Message';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Display and Rendering', () => {
    it('should not render anything when show is false', () => {
      component.show = false;
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
      component.type = 'warning';
      fixture.detectChanges();
      content = fixture.nativeElement.querySelector('.modal-content');
      expect(content.classList.contains('warning')).toBe(true);

      // Success type
      component.type = 'success';
      fixture.detectChanges();
      content = fixture.nativeElement.querySelector('.modal-content');
      expect(content.classList.contains('success')).toBe(true);
    });
  });

  describe('detailLines computation', () => {
    it('should calculate detailLines correctly from a multiline string', () => {
      component.details = 'Line 1\nLine 2\n\nLine 3\n  \n';
      fixture.detectChanges();

      const lines = component.detailLines();

      expect(lines.length).toBe(3);
      expect(lines).toEqual(['Line 1', 'Line 2', 'Line 3']);
    });

    it('should handle undefined or empty details gracefully', () => {
      component.details = '';
      fixture.detectChanges();

      expect(component.detailLines().length).toBe(0);

      // DOM should omit error-details sections
      expect(fixture.nativeElement.querySelector('.error-details')).toBeNull();
    });
  });

  describe('instructions formatting', () => {
    it('should identify strings correctly with isString', () => {
      expect(component.isString('hello')).toBe(true);
      expect(component.isString({ key: 'hello' })).toBe(false);
      expect(component.isString(null)).toBe(false);
    });

    it('should render string and object instructions correctly', () => {
      const testInstructions: (string | ErrorInstruction)[] = [
        'STRING_INSTRUCTION',
        { key: 'OBJECT_INSTRUCTION', params: { code: 123, word: 'fail' } },
      ];

      component.instructions = testInstructions;
      fixture.detectChanges();

      const instructionElements = fixture.nativeElement.querySelectorAll('.error-instructions li');
      expect(instructionElements.length).toBe(2);

      expect(instructionElements[0].textContent.trim()).toBe('STRING_INSTRUCTION');
      expect(instructionElements[1].textContent.trim()).toContain(
        'OBJECT_INSTRUCTION {"code":123,"word":"fail"}',
      );
    });

    it('should not render instructions section if the array is empty', () => {
      component.instructions = [];
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.error-instructions')).toBeNull();
    });
  });

  describe('Events', () => {
    it('should emit cancel event when close button is clicked', () => {
      vi.spyOn(component.cancelModal, 'emit');
      const closeBtn = fixture.nativeElement.querySelector('.close-btn');

      closeBtn.click();

      expect(component.cancelModal.emit).toHaveBeenCalled();
    });

    it('should emit cancel event when primary close button is clicked', () => {
      vi.spyOn(component.cancelModal, 'emit');
      const primaryBtn = fixture.nativeElement.querySelector('.modal-footer .btn-primary');

      primaryBtn.click();

      expect(component.cancelModal.emit).toHaveBeenCalled();
    });

    it('should emit cancel event when overlay is clicked', () => {
      vi.spyOn(component.cancelModal, 'emit');
      const overlay = fixture.nativeElement.querySelector('.modal-overlay');

      overlay.click();

      expect(component.cancelModal.emit).toHaveBeenCalled();
    });

    it('should stop event propagation when modal content is clicked', () => {
      vi.spyOn(component.cancelModal, 'emit');
      const content = fixture.nativeElement.querySelector('.modal-content');

      const mockEvent = new MouseEvent('click', { bubbles: true });
      vi.spyOn(mockEvent, 'stopPropagation');

      content.dispatchEvent(mockEvent);

      // Stop propagation should be called, but cancel shouldn't be emitted by the overlay receiving the event
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(component.cancelModal.emit).not.toHaveBeenCalled();
    });
  });
});
