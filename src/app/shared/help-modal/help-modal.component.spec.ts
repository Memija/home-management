import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HelpModalComponent } from './help-modal.component';
import { Pipe, PipeTransform } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { vi } from 'vitest';

@Pipe({
  name: 'translate',
  standalone: true
})
class MockTranslatePipe implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

describe('HelpModalComponent', () => {
  let component: HelpModalComponent;
  let fixture: ComponentFixture<HelpModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelpModalComponent]
    })
      .overrideComponent(HelpModalComponent, {
        remove: { imports: [TranslatePipe] },
        add: { imports: [MockTranslatePipe] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(HelpModalComponent);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput('show', true);
    fixture.componentRef.setInput('titleKey', 'TEST.TITLE');
    fixture.componentRef.setInput('steps', [
      { titleKey: 'STEP.1', descriptionKey: 'DESC.1' },
      { titleKey: 'STEP.2', descriptionKey: 'DESC.2', imageUrl: 'img.png' }
    ]);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initial state', () => {
    it('should initialize with correct step settings', () => {
      const compAsAny = component as any;
      expect(compAsAny.currentStep()).toBe(0);
      expect(compAsAny.totalSteps()).toBe(2);
      expect(compAsAny.isFirstStep()).toBe(true);
      expect(compAsAny.isLastStep()).toBe(false);
      expect(compAsAny.currentStepData()).toEqual({ titleKey: 'STEP.1', descriptionKey: 'DESC.1' });
    });
  });

  describe('Navigation', () => {
    it('should navigate to next step', () => {
      const compAsAny = component as any;

      component.nextStep();

      expect(compAsAny.currentStep()).toBe(1);
      expect(compAsAny.isFirstStep()).toBe(false);
      expect(compAsAny.isLastStep()).toBe(true);
      expect(compAsAny.currentStepData()).toEqual({ titleKey: 'STEP.2', descriptionKey: 'DESC.2', imageUrl: 'img.png' });
    });

    it('should not navigate past last step', () => {
      const compAsAny = component as any;

      component.nextStep(); // to step 1 (last)
      component.nextStep(); // shouldn't go to 2

      expect(compAsAny.currentStep()).toBe(1);
    });

    it('should navigate to previous step', () => {
      const compAsAny = component as any;

      component.nextStep(); // Go to step 1
      component.previousStep(); // Go back to step 0

      expect(compAsAny.currentStep()).toBe(0);
      expect(compAsAny.isFirstStep()).toBe(true);
    });

    it('should not navigate before first step', () => {
      const compAsAny = component as any;

      component.previousStep(); // Already at 0

      expect(compAsAny.currentStep()).toBe(0);
    });
  });

  describe('onClose', () => {
    it('should emit close event and reset currentStep to 0', () => {
      const compAsAny = component as any;
      vi.spyOn(component.close, 'emit');

      component.nextStep(); // move to step 1
      expect(compAsAny.currentStep()).toBe(1);

      component.onClose();

      expect(component.close.emit).toHaveBeenCalled();
      expect(compAsAny.currentStep()).toBe(0); // Should reset
    });
  });

  describe('Edge cases', () => {
    it('should handle zero steps', () => {
      fixture.componentRef.setInput('steps', []);
      fixture.detectChanges();

      const compAsAny = component as any;

      expect(compAsAny.totalSteps()).toBe(0);
      expect(compAsAny.currentStepData()).toBeNull();
      expect(compAsAny.isLastStep()).toBe(true);

      component.nextStep();
      expect(compAsAny.currentStep()).toBe(0); // Should remain index 0

      component.previousStep();
      expect(compAsAny.currentStep()).toBe(0); // Should remain index 0
    });

    it('should handle one step', () => {
      fixture.componentRef.setInput('steps', [{ titleKey: 'STEP.1', descriptionKey: 'DESC.1' }]);
      fixture.detectChanges();

      const compAsAny = component as any;

      expect(compAsAny.totalSteps()).toBe(1);
      expect(compAsAny.isFirstStep()).toBe(true);
      expect(compAsAny.isLastStep()).toBe(true);
      expect(compAsAny.currentStepData()).toEqual({ titleKey: 'STEP.1', descriptionKey: 'DESC.1' });

      component.nextStep(); // shouldn't go anywhere since isLastStep is true
      expect(compAsAny.currentStep()).toBe(0);
    });
  });
});
