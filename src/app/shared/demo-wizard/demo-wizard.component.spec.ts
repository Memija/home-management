import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DemoWizardComponent, DemoWizardStep } from './demo-wizard.component';
import { LanguageService } from '../../services/language.service';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LucideAngularModule, Sparkles, X, ChevronLeft, ChevronRight } from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';

describe('DemoWizardComponent', () => {
  let component: DemoWizardComponent;
  let fixture: ComponentFixture<DemoWizardComponent>;
  let languageServiceMock: any;

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
      imports: [DemoWizardComponent, LucideAngularModule.pick({ Sparkles, X, ChevronLeft, ChevronRight }), TranslatePipe],
      providers: [
        { provide: LanguageService, useValue: languageServiceMock },
      ],
    }).overrideComponent(DemoWizardComponent, {
      set: {
        template: '<div class="demo-wizard">Test Content <h4 class="step-title">STEP1.TITLE</h4> <button aria-label="Next step">Next</button></div>',
        styleUrls: [],
        // We set templateUrl and styleUrl to undefined to prevent the compiler from trying to resolve them
      }
    } as any).compileComponents();

    fixture = TestBed.createComponent(DemoWizardComponent);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput('show', true);
    fixture.componentRef.setInput('steps', mockSteps);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Logic', () => {
    it('should handle navigation boundary logic', () => {
      expect((component as any).isFirstStep()).toBe(true);
      expect((component as any).isLastStep()).toBe(false);

      component.nextStep();
      expect((component as any).currentStep()).toBe(1);

      component.nextStep();
      expect((component as any).isLastStep()).toBe(true);

      component.nextStep(); // Should not advance past last step
      expect((component as any).currentStep()).toBe(2);

      component.previousStep();
      expect((component as any).currentStep()).toBe(1);

      component.previousStep();
      component.previousStep(); // Should not go below 0
      expect((component as any).currentStep()).toBe(0);
    });

    it('should correctly calculate progress percentage', () => {
      // 1 of 3: 33.33%
      expect((component as any).progress()).toBeCloseTo(33.33, 1);

      component.goToStep(1);
      // 2 of 3: 66.66%
      expect((component as any).progress()).toBeCloseTo(66.66, 1);

      component.goToStep(2);
      expect((component as any).progress()).toBe(100);
    });

    it('should reset current step and emit close on close', () => {
      const closeSpy = vi.spyOn(component.close, 'emit');
      component.goToStep(2);

      component.onClose();
      expect((component as any).currentStep()).toBe(0);
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should get correct current step data', () => {
      expect((component as any).currentStepData()).toBe(mockSteps[0]);

      component.goToStep(2);
      expect((component as any).currentStepData()).toBe(mockSteps[2]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle navigation to invalid indices', () => {
      component.goToStep(10);
      expect((component as any).currentStep()).toBe(0);

      component.goToStep(-1);
      expect((component as any).currentStep()).toBe(0);
    });

    it('should return null when step index is out of bounds after steps change', () => {
      component.goToStep(2); // At index 2
      fixture.componentRef.setInput('steps', [mockSteps[0]]); // Now only 1 step
      fixture.detectChanges();

      expect((component as any).currentStepData()).toBeNull();
    });

    it('should show 100% progress if steps array has 0 or 1 element', () => {
      fixture.componentRef.setInput('steps', [mockSteps[0]]);
      fixture.detectChanges();
      expect((component as any).progress()).toBe(100);

      fixture.componentRef.setInput('steps', []);
      fixture.detectChanges();
      expect((component as any).progress()).toBe(100);
    });

    it('should handle isLastStep correctly with empty steps', () => {
      fixture.componentRef.setInput('steps', []);
      fixture.detectChanges();
      expect((component as any).isLastStep()).toBe(true);
    });
  });
});
