import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DemoTourComponent, DemoTourStep } from './demo-tour.component';
import { signal, PLATFORM_ID } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
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
      x: 100,
      y: 100,
      toJSON: () => ({}),
    })),
    scrollIntoView: vi.fn(),
  } as unknown as Element;

  let languageServiceMock: Partial<LanguageService>;

  beforeEach(async () => {
    vi.useFakeTimers();
    languageServiceMock = {
      currentLang: signal('en'),
      translate: vi.fn((key: string) => key),
    };

    const originalQuerySelector = document.querySelector.bind(document);
    vi.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
      if (selector === '#step1' || selector === '#step2' || selector === '#step3') {
        return mockElement;
      }
      return originalQuerySelector(selector);
    });

    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1024);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(768);
    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'removeEventListener');

    window.scrollTo = vi.fn();

    await TestBed.configureTestingModule({
      imports: [DemoTourComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: LanguageService, useValue: languageServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DemoTourComponent);
    component = fixture.componentInstance;

    component.show = false;
    component.steps = mockSteps;

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

      component.show = true;
      fixture.detectChanges();

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    });

    it('should cleanup event listeners on destroy', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      component.ngOnDestroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    });

    it('should do nothing in SSR environment', async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [DemoTourComponent],
        providers: [
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: LanguageService, useValue: languageServiceMock },
        ],
      }).compileComponents();

      const ssrFixture = TestBed.createComponent(DemoTourComponent);
      const ssrComponent = ssrFixture.componentInstance;

      ssrComponent.show = true;
      ssrComponent.steps = mockSteps;
      ssrFixture.detectChanges();

      expect(ssrComponent['isActive']()).toBe(false);
    });
  });

  describe('Step Navigation', () => {
    beforeEach(() => {
      component.show = true;
      fixture.detectChanges();
      vi.advanceTimersByTime(650); // wait for startTour delays
    });

    it('should navigate to next step', () => {
      expect(component['currentStep']()).toBe(0);

      component['nextStep']();
      expect(component['isTransitioning']()).toBe(true);

      vi.advanceTimersByTime(200); // fade out delay
      expect(component['currentStep']()).toBe(1);

      vi.advanceTimersByTime(450); // fade in delay
      expect(component['isTransitioning']()).toBe(false);
    });

    it('should navigate to previous step', () => {
      component['nextStep']();
      vi.advanceTimersByTime(650);
      expect(component['currentStep']()).toBe(1);

      component['previousStep']();
      vi.advanceTimersByTime(200);
      expect(component['currentStep']()).toBe(0);

      vi.advanceTimersByTime(450);
    });

    it('should close tour when next is called on last step', () => {
      const closeSpy = vi.spyOn(component.closeModal, 'emit');
      component['currentStep'].set(2);

      component['nextStep']();

      expect(closeSpy).toHaveBeenCalled();
      expect(component['currentStep']()).toBe(0);
    });

    it('should handle overlay click by going to next step', () => {
      const nextStepSpy = vi.spyOn(component as unknown as { nextStep: () => void }, 'nextStep');
      component['onOverlayClick']();
      expect(nextStepSpy).toHaveBeenCalled();
    });
  });

  describe('Computeds', () => {
    it('should calculate progress correctly', () => {
      expect(component['progress']()).toBeCloseTo(33.33, 1);

      component['currentStep'].set(1);
      expect(component['progress']()).toBeCloseTo(66.66, 1);

      component['currentStep'].set(2);
      expect(component['progress']()).toBe(100);
    });

    it('should identify first and last steps', () => {
      expect(component['isFirstStep']()).toBe(true);
      expect(component['isLastStep']()).toBe(false);

      component['currentStep'].set(2);
      expect(component['isFirstStep']()).toBe(false);
      expect(component['isLastStep']()).toBe(true);
    });

    it('should handle empty steps in computeds', () => {
      component.steps = [];
      fixture.detectChanges();

      expect(component['totalSteps']()).toBe(0);
      expect(component['isLastStep']()).toBe(true);
      expect(component['progress']()).toBe(100);
      expect(component['currentStepData']()).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should skip step if element is not found', () => {
      const originalQuerySelector = document.querySelector.bind(document);
      vi.mocked(document.querySelector).mockImplementation((selector: string) => {
        if (selector === '#step1') return null;
        if (selector === '#step2') return mockElement;
        return originalQuerySelector(selector);
      });

      component.show = true;
      fixture.detectChanges();

      vi.advanceTimersByTime(200);

      expect(component['currentStep']()).toBe(1);

      vi.advanceTimersByTime(450);
      expect(component['isActive']()).toBe(true);
    });

    it('should close if no elements are found at all', () => {
      const originalQuerySelector = document.querySelector.bind(document);
      vi.mocked(document.querySelector).mockImplementation((selector: string) => {
        if (selector.startsWith('#step')) return null;
        return originalQuerySelector(selector);
      });
      const closeSpy = vi.spyOn(component.closeModal, 'emit');

      component.show = true;
      fixture.detectChanges();
      vi.advanceTimersByTime(200);

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should handle resize events', () => {
      component.show = true;
      fixture.detectChanges();
      component['targetElement'] = mockElement;

      const recalcSpy = vi.spyOn(
        component as unknown as { recalcPositions: () => void },
        'recalcPositions',
      );

      component['resizeHandler']();
      expect(recalcSpy).toHaveBeenCalled();
    });
  });

  describe('Positioning', () => {
    it('should calculate positions correctly', () => {
      component['targetElement'] = mockElement;
      component['recalcPositions']();

      expect(component['spotTop']()).toBe(90);
      expect(component['spotLeft']()).toBe(90);
      expect(component['spotWidth']()).toBe(220);
      expect(component['spotHeight']()).toBe(70);

      expect(component['tipPosition']()).toBe('bottom');
      expect(component['tipTop']()).toBe(150 + 10 + 14);
    });

    it('should position tooltip on top if not enough space below', () => {
      vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(200);

      component['targetElement'] = mockElement;
      component['recalcPositions']();

      expect(component['tipPosition']()).toBe('top');
      expect(component['tipTop']()).toBe(12);
    });
  });
});
