import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { HeaderComponent } from './header.component';
import { Router } from '@angular/router';
import { DemoService } from '../../services/demo.service';
import { NotificationService, Notification } from '../../services/notification.service';
import { ThemeService } from '../../services/theme.service';
import { LanguageService } from '../../services/language.service';
import { signal, computed, Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { LanguageSwitcherComponent } from '../../components/language-switcher/language-switcher.component';
import { AuthButtonComponent } from '../../components/auth-button/auth-button.component';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  template: ''
})
class MockLanguageSwitcherComponent { }

@Component({
  selector: 'app-auth-button',
  standalone: true,
  template: ''
})
class MockAuthButtonComponent { }

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let router: any;
  let demoService: any;
  let notificationService: any;
  let themeService: any;
  let languageService: any;

  // Mock signals
  const currentThemeSignal = signal<'light' | 'dark' | 'system'>('system');
  const resolvedThemeSignal = signal<'light' | 'dark'>('light');
  const notificationsSignal = signal<Notification[]>([]);
  const currentLangSignal = signal<'en' | 'de'>('en');

  beforeEach(async () => {
    // Create spies for services
    const routerSpy = { navigate: vi.fn().mockResolvedValue(true) };
    const demoSpy = { deactivateDemo: vi.fn() };

    // NotificationService mock
    const notificationSpy = {
      dismissNotification: vi.fn(),
      notifications: computed(() => notificationsSignal())
    };

    // ThemeService mock
    const themeSpy = {
      setTheme: vi.fn(),
      currentTheme: currentThemeSignal,
      resolvedTheme: resolvedThemeSignal
    };

    // LanguageService mock
    const languageSpy = {
      translate: vi.fn().mockImplementation((key: string) => {
        if (key === 'SETTINGS.THEME_LIGHT') return 'Light';
        if (key === 'SETTINGS.THEME_DARK') return 'Dark';
        if (key === 'SETTINGS.THEME_SYSTEM') return 'System';
        return key;
      }),
      currentLang: currentLangSignal,
      setLanguage: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [HeaderComponent, NoopAnimationsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: DemoService, useValue: demoSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: ThemeService, useValue: themeSpy },
        { provide: LanguageService, useValue: languageSpy }
      ]
    })
      .overrideComponent(HeaderComponent, {
        remove: { imports: [LanguageSwitcherComponent, AuthButtonComponent] },
        add: { imports: [MockLanguageSwitcherComponent, MockAuthButtonComponent] }
      })
      .overrideTemplate(HeaderComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;

    router = TestBed.inject(Router);
    demoService = TestBed.inject(DemoService);
    notificationService = TestBed.inject(NotificationService);
    themeService = TestBed.inject(ThemeService);
    languageService = TestBed.inject(LanguageService);

    // Reset signals before each test
    currentThemeSignal.set('system');
    resolvedThemeSignal.set('light');
    notificationsSignal.set([]);
    currentLangSignal.set('en');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Theme Logic', () => {
    it('should cycle themes correctly: system -> light -> dark -> system', () => {
      // Initial state is system (set in beforeEach)

      // 1. system -> light
      currentThemeSignal.set('system');
      (component as any).cycleTheme();
      expect(themeService.setTheme).toHaveBeenCalledWith('light');

      // 2. light -> dark
      currentThemeSignal.set('light');
      (component as any).cycleTheme();
      expect(themeService.setTheme).toHaveBeenCalledWith('dark');

      // 3. dark -> system
      currentThemeSignal.set('dark');
      (component as any).cycleTheme();
      expect(themeService.setTheme).toHaveBeenCalledWith('system');
    });

    it('should return correct theme title', () => {
      // Case 1: System (Light)
      currentThemeSignal.set('system');
      resolvedThemeSignal.set('light');
      expect((component as any).getThemeTitle()).toBe('System (Light)');

      // Case 2: System (Dark)
      currentThemeSignal.set('system');
      resolvedThemeSignal.set('dark');
      expect((component as any).getThemeTitle()).toBe('System (Dark)');

      // Case 3: Light
      currentThemeSignal.set('light');
      expect((component as any).getThemeTitle()).toBe('Light');

      // Case 4: Dark
      currentThemeSignal.set('dark');
      expect((component as any).getThemeTitle()).toBe('Dark');
    });
  });

  describe('Notifications', () => {
    it('should toggle notification panel', () => {
      expect((component as any).isNotificationPanelOpen()).toBe(false);

      (component as any).toggleNotificationPanel();
      expect((component as any).isNotificationPanelOpen()).toBe(true);

      (component as any).toggleNotificationPanel();
      expect((component as any).isNotificationPanelOpen()).toBe(false);
    });

    it('should navigate to notification route and handle fragments', async () => {
      vi.useFakeTimers();
      const notification: Notification = {
        id: '1',
        type: 'info',
        titleKey: 'Title',
        messageKey: 'Message',
        priority: 'low',
        dismissible: true,
        route: '/target-route',
        fragment: 'target-fragment'
      };

      // Mock document.getElementById and scrollIntoView
      const mockElement = document.createElement('div');
      mockElement.scrollIntoView = () => { };
      vi.spyOn(mockElement, 'scrollIntoView');
      vi.spyOn(document, 'getElementById').mockReturnValue(mockElement);

      (component as any).isNotificationPanelOpen.set(true);

      (component as any).navigateToNotification(notification);

      // Should close panel
      expect((component as any).isNotificationPanelOpen()).toBe(false);

      // Should navigate
      expect(router.navigate).toHaveBeenCalledWith(['/target-route'], { fragment: 'target-fragment' });

      // Run pending promises (router.navigate.then)
      await Promise.resolve();

      // Advance time to trigger setTimeout
      vi.advanceTimersByTime(200);

      expect(document.getElementById).toHaveBeenCalledWith('target-fragment');
      expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });

      vi.useRealTimers();
    });

    it('should not navigate if no route is provided', () => {
      const notification: Notification = {
        id: '1',
        type: 'info',
        titleKey: 'Title',
        messageKey: 'Message',
        priority: 'low',
        dismissible: true
      };

      (component as any).navigateToNotification(notification);

      expect(router.navigate).not.toHaveBeenCalled();
      expect((component as any).isNotificationPanelOpen()).toBe(false); // Should still close panel
    });

    it('should close notification panel when clicking outside', () => {
      (component as any).isNotificationPanelOpen.set(true);
      fixture.detectChanges();

      // Create a click event on document body
      const event = new MouseEvent('click', { bubbles: true });
      document.dispatchEvent(event);
      fixture.detectChanges();

      expect((component as any).isNotificationPanelOpen()).toBe(false);
    });

    it('should NOT close notification panel when clicking inside', () => {
      (component as any).isNotificationPanelOpen.set(true);
      fixture.detectChanges();

      // Click on the component's element
      const element = fixture.nativeElement;
      const event = new MouseEvent('click', { bubbles: true });
      element.dispatchEvent(event);
      fixture.detectChanges();

      expect((component as any).isNotificationPanelOpen()).toBe(true);
    });
  });
});
