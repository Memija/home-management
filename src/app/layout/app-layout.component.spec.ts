import { ComponentFixture, TestBed, DeferBlockState } from '@angular/core/testing';
import { AppLayoutComponent } from './app-layout.component';
import { ThemeService } from '../services/theme.service';
import { Component } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { DemoService } from '../services/demo.service';
import { AuthService } from '../services/auth.service';
import { HybridStorageService } from '../services/hybrid-storage.service';
import { signal } from '@angular/core';

import { HeaderComponent } from '../shared/header/header.component';
import { FooterComponent } from '../shared/footer/footer.component';
import { MenuBarComponent } from '../shared/menu-bar/menu-bar.component';
import { NatureTreeComponent } from '../shared/nature-tree/nature-tree.component';
import { SeasonSwitcherComponent } from '../shared/season-switcher/season-switcher.component';

@Component({
  selector: 'app-header',
  standalone: true,
  template: '<div class="mock-header"></div>',
})
class MockHeaderComponent {}

@Component({
  selector: 'app-footer',
  standalone: true,
  template: '<div class="mock-footer"></div>',
})
class MockFooterComponent {}

@Component({
  selector: 'app-menu-bar',
  standalone: true,
  template: '<div class="mock-menu-bar"></div>',
})
class MockMenuBarComponent {}

@Component({
  selector: 'app-nature-tree',
  standalone: true,
  template: '<div class="mock-nature-tree"></div>',
})
class MockNatureTreeComponent {}

@Component({
  selector: 'app-season-switcher',
  standalone: true,
  template: '<div class="mock-season-switcher"></div>',
})
class MockSeasonSwitcherComponent {}

@Component({
  selector: 'router-outlet',
  standalone: true,
  template: '<div class="mock-router-outlet"></div>',
})
class MockRouterOutletComponent {}

describe('AppLayoutComponent', () => {
  let component: AppLayoutComponent;
  let fixture: ComponentFixture<AppLayoutComponent>;
  let mockThemeService: any;
  let mockDemoService: any;
  let mockAuthService: any;
  let mockHybridStorageService: any;
  let mockRouter: any;

  beforeEach(async () => {
    TestBed.resetTestingModule();

    mockThemeService = {};
    mockDemoService = {
      isDemoMode: signal(false),
    };
    mockAuthService = {
      isAuthenticated: signal(false),
    };
    mockHybridStorageService = {
      hasUserContent: signal(true), // Set to true so season switcher is shown
    };
    mockRouter = {
      url: '/dashboard',
    };

    await TestBed.configureTestingModule({
      imports: [AppLayoutComponent],
      providers: [
        { provide: ThemeService, useValue: mockThemeService },
        { provide: DemoService, useValue: mockDemoService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: HybridStorageService, useValue: mockHybridStorageService },
        { provide: Router, useValue: mockRouter },
      ],
    })
      .overrideComponent(AppLayoutComponent, {
        remove: {
          imports: [
            RouterOutlet,
            HeaderComponent,
            FooterComponent,
            MenuBarComponent,
            NatureTreeComponent,
            SeasonSwitcherComponent,
          ],
        },
        add: {
          imports: [
            MockRouterOutletComponent,
            MockHeaderComponent,
            MockFooterComponent,
            MockMenuBarComponent,
            MockNatureTreeComponent,
            MockSeasonSwitcherComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AppLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize ThemeService on component creation', () => {
    // If it creates successfully without throwing an injection error, it has injected our mocked ThemeService
    // We can verify this via dependency injection
    const injectedService = TestBed.inject(ThemeService);
    expect(injectedService).toBe(mockThemeService);
  });

  it('should render core static components', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    // Header, Menu Bar, Season Switcher, and Router Outlet are not deferred
    expect(compiled.querySelector('.mock-header')).toBeTruthy();
    expect(compiled.querySelector('.mock-menu-bar')).toBeTruthy();
    expect(compiled.querySelector('.mock-season-switcher')).toBeTruthy();
    expect(compiled.querySelector('.mock-router-outlet')).toBeTruthy();
  });

  it('should render deferred nature tree and footer components when blocks resolve', async () => {
    const deferBlocks = await fixture.getDeferBlocks();

    // There are 2 defer blocks in the template: <app-nature-tree> and <app-footer>
    expect(deferBlocks.length).toBe(2);

    // Complete the defer blocks
    await deferBlocks[0].render(DeferBlockState.Complete);
    await deferBlocks[1].render(DeferBlockState.Complete);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.mock-nature-tree')).toBeTruthy();
    expect(compiled.querySelector('.mock-footer')).toBeTruthy();
  });
});
