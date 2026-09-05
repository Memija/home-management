import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DemoWizardComponent, DemoWizardStep } from './demo-wizard.component';
import { LanguageService } from '../../services/language.service';
import { signal, WritableSignal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Sparkles } from 'lucide-angular';

describe('DemoWizardComponent', () => {
  let component: DemoWizardComponent;
  let fixture: ComponentFixture<DemoWizardComponent>;
  let languageServiceMock: {
    currentLang: WritableSignal<string>;
    translate: ReturnType<typeof vi.fn>;
  };

  const mockSteps: DemoWizardStep[] = [
    { titleKey: 'STEP1.TITLE', descriptionKey: 'STEP1.DESC', icon: Sparkles },
    { titleKey: 'STEP2.TITLE', descriptionKey: 'STEP2.DESC' },
    { titleKey: 'STEP3.TITLE', descriptionKey: 'STEP3.DESC' },
  ];

  beforeEach(async () => {
    languageServiceMock = {
      currentLang: signal('en'),
      translate: vi.fn((key: string) => key),
    };

    await TestBed.configureTestingModule({
      imports: [DemoWizardComponent],
      providers: [{ provide: LanguageService, useValue: languageServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(DemoWizardComponent);
    component = fixture.componentInstance;

    // Set required inputs
    component.show = true;
    component.steps = mockSteps;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Logic', () => {
    it('should handle navigation boundary logic', () => {
      expect(component['isFirstStep']()).toBe(true);
      expect(component['isLastStep']()).toBe(false);

      component.nextStep();
      expect(component['currentStep']()).toBe(1);

      component.nextStep();
      expect(component['isLastStep']()).toBe(true);

      component.nextStep(); // Should not advance past last step
      expect(component['currentStep']()).toBe(2);

      component.previousStep();
      expect(component['currentStep']()).toBe(1);

      component.previousStep();
      component.previousStep(); // Should not go below 0
      expect(component['currentStep']()).toBe(0);
    });

    it('should correctly calculate progress percentage', () => {
      // 1 of 3: 33.33%
      expect(component['progress']()).toBeCloseTo(33.33, 1);

      component.goToStep(1);
      // 2 of 3: 66.66%
      expect(component['progress']()).toBeCloseTo(66.66, 1);

      component.goToStep(2);
      // 3 of 3: 100%
      expect(component['progress']()).toBe(100);
    });

    it('should reset current step and emit close on close', () => {
      vi.spyOn(component.closeModal, 'emit');
      component.goToStep(2);

      component.onClose();

      expect(component['currentStep']()).toBe(0);
      expect(component.closeModal.emit).toHaveBeenCalled();
    });

    it('should get correct current step data', () => {
      expect(component['currentStepData']()).toBe(mockSteps[0]);

      component.goToStep(2);
      expect(component['currentStepData']()).toBe(mockSteps[2]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle navigation to invalid indices', () => {
      component.goToStep(10);
      expect(component['currentStep']()).toBe(0);

      component.goToStep(-1);
      expect(component['currentStep']()).toBe(0);
    });

    it('should return null when step index is out of bounds after steps change', () => {
      component.goToStep(2); // At index 2
      component.steps = [mockSteps[0]]; // Now only 1 step
      fixture.detectChanges();

      expect(component['currentStepData']()).toBeNull();
    });

    it('should show 100% progress if steps array has 0 or 1 element', () => {
      component.steps = [mockSteps[0]];
      fixture.detectChanges();
      expect(component['progress']()).toBe(100);

      component.steps = [];
      fixture.detectChanges();
      expect(component['progress']()).toBe(100);
    });

    it('should handle isLastStep correctly with empty steps', () => {
      component.steps = [];
      fixture.detectChanges();
      expect(component['isLastStep']()).toBe(true);
    });
  });
});
