import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DemoTourComponent, DemoTourStep } from './demo-tour.component';
import { signal, PLATFORM_ID } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LucideAngularModule, ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';

describe('DemoTourComponent', () => {
  let component: DemoTourComponent;
  let fixture: ComponentFixture<DemoTourComponent>;

  const mockSteps: DemoTourStep[] = [
    { selector: '#step1', titleKey: 'STEP1.TITLE', descriptionKey: 'STEP1.DESC' },
    { selector: '#step2', titleKey: 'STEP2.TITLE', descriptionKey: 'STEP2.DESC' },
    { selector: '#step3', titleKey: 'STEP3.TITLE', descriptionKey: 'STEP3.DESC' },
  ];

  const mockElement = {
    getBoundingClientRect: vi.fn(() => ({
      top: 100,
      left: 100,
      width: 200,
      height: 50,
      bottom: 150,
      right: 300,
    })),
    scrollIntoView: vi.fn(),
  };

  let languageServiceMock: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    languageServiceMock = {
      currentLang: signal('en'),
      translate: vi.fn((key: string) => key),
    };

    // We already have jsdom environment, so we just spy on the existing globals
    const originalQuerySelector = document.querySelector.bind(document);
    vi.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
      if (selector === '#step1' || selector === '#step2' || selector === '#step3') {
        return mockElement as unknown as Element;
      }
      return originalQuerySelector(selector);
    });

    // Mock window properties if needed
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1024);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(768);
    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'removeEventListener');

    // Patch window.scrollTo since it's used by scrollIntoView sometimes or by the component
    window.scrollTo = vi.fn();

    await TestBed.configureTestingModule({
      imports: [
        DemoTourComponent,
        LucideAngularModule.pick({ ChevronLeft, ChevronRight, X, Sparkles }),
        TranslatePipe,
      ],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: LanguageService, useValue: languageServiceMock },
      ],
    }).overrideComponent(DemoTourComponent, {
      set: {
        template: '<div class="demo-tour">Test Content</div>',
        templateUrl: undefined,
        styleUrl: undefined,
        styleUrls: [],
      }
    } as any).compileComponents();

    fixture = TestBed.createComponent(DemoTourComponent);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput('show', false);
    fixture.componentRef.setInput('steps', mockSteps);

    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Lifecycle and Initialization', () => {
    it('should start tour when show input becomes true', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      fixture.componentRef.setInput('show', true);
      fixture.detectChanges();

      // startTour is called, which has a 200ms delay for gotoStep
      vi.advanceTimersByTime(200);
      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

      // gotoStep(0) triggers scrollIntoView and 450ms delay for recalc
      expect(mockElement.scrollIntoView).toHaveBeenCalled();

      vi.advanceTimersByTime(450);
      expect((component as any).isActive()).toBe(true);
    });

    it('should cleanup when show input becomes false', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      fixture.componentRef.setInput('show', true);
      fixture.detectChanges();

      fixture.componentRef.setInput('show', false);
      fixture.detectChanges();

      expect((component as any).isActive()).toBe(false);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('Navigation Logic', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('show', true);
      fixture.detectChanges();
      vi.advanceTimersByTime(650); // Complete startTour (200) + gotoStep (450)
    });

    it('should navigate to next step', () => {
      (component as any).nextStep();
      expect((component as any).isTransitioning()).toBe(true);

      vi.advanceTimersByTime(200); // transitionToStep delay
      expect((component as any).currentStep()).toBe(1);

      vi.advanceTimersByTime(450); // gotoStep delay
      expect((component as any).isTransitioning()).toBe(false);
    });

    it('should navigate to previous step', () => {
      // Go to step 1 first
      (component as any).nextStep();
      vi.advanceTimersByTime(650);
      expect((component as any).currentStep()).toBe(1);

      (component as any).previousStep();
      vi.advanceTimersByTime(200);
      expect((component as any).currentStep()).toBe(0);

      vi.advanceTimersByTime(450);
    });

    it('should close tour when next is called on last step', () => {
      const closeSpy = vi.spyOn(component.close, 'emit');
      (component as any).currentStep.set(2); // Last step

      (component as any).nextStep();

      expect(closeSpy).toHaveBeenCalled();
      expect((component as any).currentStep()).toBe(0);
    });

    it('should handle overlay click by going to next step', () => {
      const nextStepSpy = vi.spyOn(component as any, 'nextStep');
      (component as any).onOverlayClick();
      expect(nextStepSpy).toHaveBeenCalled();
    });
  });

  describe('Computeds', () => {
    it('should calculate progress correctly', () => {
      expect((component as any).progress()).toBeCloseTo(33.33, 1);

      (component as any).currentStep.set(1);
      expect((component as any).progress()).toBeCloseTo(66.66, 1);

      (component as any).currentStep.set(2);
      expect((component as any).progress()).toBe(100);
    });

    it('should identify first and last steps', () => {
      expect((component as any).isFirstStep()).toBe(true);
      expect((component as any).isLastStep()).toBe(false);

      (component as any).currentStep.set(2);
      expect((component as any).isFirstStep()).toBe(false);
      expect((component as any).isLastStep()).toBe(true);
    });

    it('should handle empty steps in computeds', () => {
      fixture.componentRef.setInput('steps', []);
      fixture.detectChanges();

      expect((component as any).totalSteps()).toBe(0);
      expect((component as any).isLastStep()).toBe(true);
      expect((component as any).progress()).toBe(100);
      expect((component as any).currentStepData()).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should skip step if element is not found', () => {
      const originalQuerySelector = document.querySelector.bind(document);
      // Mock querySelector to return null for step 1
      vi.mocked(document.querySelector).mockImplementation((selector: string) => {
        if (selector === '#step1') return null;
        if (selector === '#step2') return mockElement as unknown as Element;
        return originalQuerySelector(selector);
      });

      fixture.componentRef.setInput('show', true);
      fixture.detectChanges();

      vi.advanceTimersByTime(200); // startTour -> gotoStep(0)

      // gotoStep(0) finds no element, should try gotoStep(1)
      expect((component as any).currentStep()).toBe(1);

      vi.advanceTimersByTime(450); // gotoStep(1) delay
      expect((component as any).isActive()).toBe(true);
    });

    it('should close if no elements are found at all', () => {
      const originalQuerySelector = document.querySelector.bind(document);
      vi.mocked(document.querySelector).mockImplementation((selector: string) => {
        if (selector.startsWith('#step')) return null;
        return originalQuerySelector(selector);
      });
      const closeSpy = vi.spyOn(component.close, 'emit');

      fixture.componentRef.setInput('show', true);
      fixture.detectChanges();
      vi.advanceTimersByTime(200);

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should handle resize events', () => {
      fixture.componentRef.setInput('show', true);
      fixture.detectChanges();
      (component as any).targetElement = mockElement;

      const recalcSpy = vi.spyOn(component as any, 'recalcPositions');

      // Simulate resize
      (component as any).resizeHandler();
      expect(recalcSpy).toHaveBeenCalled();
    });
  });

  describe('Positioning', () => {
    it('should calculate positions correctly', () => {
      (component as any).targetElement = mockElement;
      (component as any).recalcPositions();

      // Spotlight calculations (padding = 10)
      // mockElement: top 100, left 100, width 200, height 50
      expect((component as any).spotTop()).toBe(90);
      expect((component as any).spotLeft()).toBe(90);
      expect((component as any).spotWidth()).toBe(220);
      expect((component as any).spotHeight()).toBe(70);

      // Tooltip position (spaceBelow = 768 - 150 - 10 = 608)
      // spaceBelow (608) > tooltipEstimatedH (190) + 16, so position = bottom
      expect((component as any).tipPosition()).toBe('bottom');
      expect((component as any).tipTop()).toBe(150 + 10 + 14); // rect.bottom + padding + 14
    });

    it('should position tooltip on top if not enough space below', () => {
      // Mock window height to be small
      vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(200);

      (component as any).targetElement = mockElement;
      (component as any).recalcPositions();

      expect((component as any).tipPosition()).toBe('top');
      // rect.top (100) - padding (10) - estH (190) - 14 = -114
      expect((component as any).tipTop()).toBe(12);
    });
  });
});
