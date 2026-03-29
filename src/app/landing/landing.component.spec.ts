import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LandingComponent } from './landing.component';
import { ThemeService, Theme } from '../services/theme.service';
import { LanguageService } from '../services/language.service';
import { PLATFORM_ID, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { vi, afterEach } from 'vitest';

describe('LandingComponent', () => {
  let component: LandingComponent;
  let fixture: ComponentFixture<LandingComponent>;
  let themeServiceMock: any;
  let languageServiceMock: any;
  let intersectionObserverMock: any;

  // To handle the intersection observer callback
  let observerCallback: IntersectionObserverCallback;

  beforeEach(async () => {
    themeServiceMock = {
      setTheme: vi.fn(),
      currentTheme: signal<Theme>('light'),
      resolvedTheme: signal<Theme>('light'),
    };

    languageServiceMock = {
      translate: vi.fn().mockImplementation((key: string) => `translated_${key}`),
      currentLang: signal('en'),
    };

    intersectionObserverMock = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };

    // Mock IntersectionObserver
    (window as any).IntersectionObserver = function (callback: IntersectionObserverCallback) {
      observerCallback = callback;
      this.observe = intersectionObserverMock.observe;
      this.unobserve = intersectionObserverMock.unobserve;
      this.disconnect = intersectionObserverMock.disconnect;
    };

    await TestBed.configureTestingModule({
      imports: [LandingComponent],
      providers: [
        provideRouter([]),
        { provide: ThemeService, useValue: themeServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Theme Management', () => {
    it('should cycle theme from light to dark', () => {
      // Mock the current theme
      (themeServiceMock as any).currentTheme = signal<Theme>('light');
      component['cycleTheme']();
      expect(themeServiceMock.setTheme).toHaveBeenCalledWith('dark');
    });

    it('should cycle theme from dark to system', () => {
      (themeServiceMock as any).currentTheme = signal<Theme>('dark');
      component['cycleTheme']();
      expect(themeServiceMock.setTheme).toHaveBeenCalledWith('system');
    });

    it('should cycle theme from system to light', () => {
      (themeServiceMock as any).currentTheme = signal<Theme>('system');
      component['cycleTheme']();
      expect(themeServiceMock.setTheme).toHaveBeenCalledWith('light');
    });

    it('should return correct theme icon for light theme', () => {
      (themeServiceMock as any).currentTheme = signal<Theme>('light');
      (themeServiceMock as any).resolvedTheme = signal<Theme>('light');
      expect(component['getThemeIcon']()).toBe('☀️');
    });

    it('should return correct theme icon for dark theme', () => {
      (themeServiceMock as any).currentTheme = signal<Theme>('dark');
      (themeServiceMock as any).resolvedTheme = signal<Theme>('dark');
      expect(component['getThemeIcon']()).toBe('🌙');
    });

    it('should return system icon if theme is system', () => {
      (themeServiceMock as any).currentTheme = signal<Theme>('system');
      expect(component['getThemeIcon']()).toBe('🖥️');
    });

    it('should return correct title for light theme', () => {
      (themeServiceMock as any).currentTheme = signal<Theme>('light');
      expect(component['getThemeTitle']()).toBe('translated_SETTINGS.THEME_LIGHT');
    });

    it('should return correct title for system theme based on resolved theme', () => {
      (themeServiceMock as any).currentTheme = signal<Theme>('system');
      (themeServiceMock as any).resolvedTheme = signal<Theme>('dark');
      expect(component['getThemeTitle']()).toBe(
        'translated_SETTINGS.THEME_SYSTEM (translated_SETTINGS.THEME_DARK)',
      );
    });
  });

  describe('Scroll and Viewport', () => {
    it('should set element as visible when intersected', async () => {
      fixture.detectChanges(); // This will call ngOnInit and construct the observer
      await new Promise((resolve) => setTimeout(resolve, 150)); // wait for setTimeout

      const observerDiv = document.createElement('div');
      observerDiv.setAttribute('data-animate', 'test-id');

      const mockEntry = {
        isIntersecting: true,
        target: observerDiv,
      } as unknown as IntersectionObserverEntry;

      observerCallback([mockEntry], {} as IntersectionObserver);

      expect(component['isVisible']()['test-id']).toBe(true);
    });

    it('should not update visibility if element is not intersecting', async () => {
      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 150));

      const observerDiv = document.createElement('div');
      observerDiv.setAttribute('data-animate', 'test-id');

      const mockEntry = {
        isIntersecting: false,
        target: observerDiv,
      } as unknown as IntersectionObserverEntry;

      observerCallback([mockEntry], {} as IntersectionObserver);

      expect(component['isVisible']()['test-id']).toBeUndefined();
    });

    it('should handle missing data-animate attribute gracefully', async () => {
      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 150));

      const observerDiv = document.createElement('div');

      const mockEntry = {
        isIntersecting: true,
        target: observerDiv,
      } as unknown as IntersectionObserverEntry;

      observerCallback([mockEntry], {} as IntersectionObserver);

      // Visibility state shouldn't change
      expect(Object.keys(component['isVisible']()).length).toBe(0);
    });

    it('should update scrollY and roadProgress on window scroll', () => {
      fixture.detectChanges();
      vi.spyOn<any, any>(component, 'updateRoadProgress');

      // We can directly call the handler to prevent flakiness
      Object.defineProperty(window, 'scrollY', { value: 100, writable: true });
      component.onScroll();

      expect(component['scrollY']()).toBe(100);
      expect(component['updateRoadProgress']).toHaveBeenCalled();
    });

    it('should return correct parallax transform', () => {
      component['scrollY'].set(100);
      expect(component['getParallaxTransform'](0.5)).toBe('translateY(50px)');
    });
  });

  describe('Road Dragging', () => {
    it('should update scroll on road drag start', () => {
      fixture.detectChanges();

      const evt = new MouseEvent('mousedown');
      vi.spyOn(evt, 'preventDefault').mockImplementation(() => {});
      vi.spyOn(evt, 'stopPropagation').mockImplementation(() => {});
      vi.spyOn(document, 'addEventListener');

      component['onRoadDragStart'](evt);

      expect(component['isDragging']).toBe(true);
      expect(evt.preventDefault).toHaveBeenCalled();
      expect(evt.stopPropagation).toHaveBeenCalled();

      expect(document.addEventListener).toHaveBeenCalledWith(
        'mousemove',
        component['onDragMoveBound'],
      );
      expect(document.addEventListener).toHaveBeenCalledWith(
        'mouseup',
        component['onDragEndBound'],
      );
    });

    it('should calculate scroll correctly on mouse move', () => {
      // Setup the road element mock
      const roadEl = document.createElement('div');
      roadEl.className = 'road-progress';
      vi.spyOn(roadEl, 'getBoundingClientRect').mockReturnValue({
        top: 0,
        height: 100,
        bottom: 100,
        left: 0,
        right: 100,
        width: 100,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as any);

      // Mock querySelector to return our controlled element
      vi.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
        if (selector === '.road-progress') return roadEl;
        return null;
      });

      // Stub window height and scroll
      Object.defineProperty(document.documentElement, 'scrollHeight', {
        value: 1000,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'innerHeight', {
        value: 500,
        writable: true,
        configurable: true,
      });
      vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

      component['isDragging'] = true;
      const mouseMoveEvt = new MouseEvent('mousemove', { clientY: 50 });

      component['onDragMove'](mouseMoveEvt);

      // Percentage is 50 / 100 = 0.5. Max scroll is 1000 - 500 = 500. Expected top: 0.5 * 500 = 250
      (expect(window.scrollTo) as any).toHaveBeenCalledWith({ top: 250 } as ScrollToOptions);
    });

    it('should not update scroll on mouse move if not dragging', () => {
      vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
      component['isDragging'] = false;

      const mouseMoveEvt = new MouseEvent('mousemove', { clientY: 50 });
      component['onDragMove'](mouseMoveEvt);

      expect(window.scrollTo).not.toHaveBeenCalled();
    });

    it('should stop dragging on mouse up', () => {
      vi.spyOn(document, 'removeEventListener');
      component['isDragging'] = true;

      component['onDragEnd']();

      expect(component['isDragging']).toBe(false);
      expect(document.removeEventListener).toHaveBeenCalledWith(
        'mousemove',
        component['onDragMoveBound'],
      );
      expect(document.removeEventListener).toHaveBeenCalledWith(
        'mouseup',
        component['onDragEndBound'],
      );
    });

    it('should handle click on road correctly', () => {
      const roadEl = document.createElement('div');
      vi.spyOn(roadEl, 'getBoundingClientRect').mockReturnValue({
        top: 0,
        height: 100,
        bottom: 100,
        left: 0,
        right: 100,
        width: 100,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as any);

      const evt = {
        currentTarget: roadEl,
        clientY: 50,
      } as unknown as MouseEvent;

      Object.defineProperty(document.documentElement, 'scrollHeight', {
        value: 1000,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'innerHeight', {
        value: 500,
        writable: true,
        configurable: true,
      });
      vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

      component['onRoadClick'](evt);

      (expect(window.scrollTo) as any).toHaveBeenCalledWith({
        top: 250,
        behavior: 'smooth',
      } as ScrollToOptions);
    });
  });

  describe('Server-side Rendering', () => {
    it('should not initialize IntersectionObserver if not in browser environment', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [LandingComponent],
        providers: [
          provideRouter([]),
          { provide: ThemeService, useValue: themeServiceMock },
          { provide: LanguageService, useValue: languageServiceMock },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      }).compileComponents();

      const fixtureServer = TestBed.createComponent(LandingComponent);
      const componentServer = fixtureServer.componentInstance;

      vi.spyOn<any, any>(componentServer, 'setupIntersectionObserver').mockImplementation(() => {});

      fixtureServer.detectChanges(); // calls ngOnInit

      expect(componentServer['setupIntersectionObserver']).not.toHaveBeenCalled();
    });

    it('should not remove event listeners on destroy if not in browser environment', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [LandingComponent],
        providers: [
          provideRouter([]),
          { provide: ThemeService, useValue: themeServiceMock },
          { provide: LanguageService, useValue: languageServiceMock },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      }).compileComponents();

      const fixtureServer = TestBed.createComponent(LandingComponent);
      const componentServer = fixtureServer.componentInstance;

      const spy = vi.spyOn(document, 'removeEventListener');
      spy.mockClear(); // Clear any calls from previous test cleanup

      componentServer.ngOnDestroy();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Observables lifecycle', () => {
    it('should disconnect observer on destroy', () => {
      fixture.detectChanges();
      component.ngOnDestroy();
      expect(intersectionObserverMock.disconnect).toHaveBeenCalled();
    });
  });
});
