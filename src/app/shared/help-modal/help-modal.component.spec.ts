import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HelpModalComponent, HelpStep } from './help-modal.component';
import { Signal, WritableSignal, signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LanguageService } from '../../services/language.service';

interface HelpModalInternal {
  currentStep: WritableSignal<number>;
  totalSteps: Signal<number>;
  isFirstStep: Signal<boolean>;
  isLastStep: Signal<boolean>;
  currentStepData: Signal<HelpStep | null>;
}

describe('HelpModalComponent', () => {
  let component: HelpModalComponent;
  let fixture: ComponentFixture<HelpModalComponent>;

  beforeEach(async () => {
    const mockLanguageService = {
      currentLang: signal('en'),
      translate: vi.fn((key: string) => key),
    };

    await TestBed.configureTestingModule({
      imports: [HelpModalComponent],
      providers: [{ provide: LanguageService, useValue: mockLanguageService }],
    }).compileComponents();

    fixture = TestBed.createComponent(HelpModalComponent);
    component = fixture.componentInstance;

    // Set required inputs
    component.show = true;
    component.titleKey = 'TEST.TITLE';
    component.steps = [
      { titleKey: 'STEP.1', descriptionKey: 'DESC.1' },
      { titleKey: 'STEP.2', descriptionKey: 'DESC.2', imageUrl: 'img.png' },
    ];

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initial state', () => {
    it('should initialize with correct step settings', () => {
      const internal = component as unknown as HelpModalInternal;
      expect(internal.currentStep()).toBe(0);
      expect(internal.totalSteps()).toBe(2);
      expect(internal.isFirstStep()).toBe(true);
      expect(internal.isLastStep()).toBe(false);
      expect(internal.currentStepData()).toEqual({ titleKey: 'STEP.1', descriptionKey: 'DESC.1' });
    });
  });

  describe('Navigation', () => {
    it('should navigate to next step', () => {
      const internal = component as unknown as HelpModalInternal;

      component.nextStep();

      expect(internal.currentStep()).toBe(1);
      expect(internal.isFirstStep()).toBe(false);
      expect(internal.isLastStep()).toBe(true);
      expect(internal.currentStepData()).toEqual({
        titleKey: 'STEP.2',
        descriptionKey: 'DESC.2',
        imageUrl: 'img.png',
      });
    });

    it('should not navigate past last step', () => {
      const internal = component as unknown as HelpModalInternal;

      component.nextStep(); // to step 1 (last)
      component.nextStep(); // shouldn't go to 2

      expect(internal.currentStep()).toBe(1);
    });

    it('should navigate to previous step', () => {
      const internal = component as unknown as HelpModalInternal;

      component.nextStep(); // Go to step 1
      component.previousStep(); // Go back to step 0

      expect(internal.currentStep()).toBe(0);
      expect(internal.isFirstStep()).toBe(true);
    });

    it('should not navigate before first step', () => {
      const internal = component as unknown as HelpModalInternal;

      component.previousStep(); // Already at 0

      expect(internal.currentStep()).toBe(0);
    });
  });

  describe('onClose', () => {
    it('should emit close event and reset currentStep to 0', () => {
      const internal = component as unknown as HelpModalInternal;
      vi.spyOn(component.closeModal, 'emit');

      component.nextStep(); // move to step 1
      expect(internal.currentStep()).toBe(1);

      component.onClose();

      expect(component.closeModal.emit).toHaveBeenCalled();
      expect(internal.currentStep()).toBe(0); // Should reset
    });
  });

  describe('Edge cases', () => {
    it('should handle zero steps', () => {
      component.steps = [];
      fixture.detectChanges();

      const internal = component as unknown as HelpModalInternal;

      expect(internal.totalSteps()).toBe(0);
      expect(internal.currentStepData()).toBeNull();
      expect(internal.isLastStep()).toBe(true);

      component.nextStep();
      expect(internal.currentStep()).toBe(0); // Should remain index 0

      component.previousStep();
      expect(internal.currentStep()).toBe(0); // Should remain index 0
    });

    it('should handle one step', () => {
      component.steps = [{ titleKey: 'STEP.1', descriptionKey: 'DESC.1' }];
      fixture.detectChanges();

      const internal = component as unknown as HelpModalInternal;

      expect(internal.totalSteps()).toBe(1);
      expect(internal.isFirstStep()).toBe(true);
      expect(internal.isLastStep()).toBe(true);
      expect(internal.currentStepData()).toEqual({ titleKey: 'STEP.1', descriptionKey: 'DESC.1' });

      component.nextStep(); // shouldn't go anywhere since isLastStep is true
      expect(internal.currentStep()).toBe(0);
    });
  });
});
