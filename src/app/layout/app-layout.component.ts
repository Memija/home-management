import { Component, inject, computed } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { HeaderComponent } from '../shared/header/header.component';
import { FooterComponent } from '../shared/footer/footer.component';
import { MenuBarComponent } from '../shared/menu-bar/menu-bar.component';
import { ThemeService } from '../services/theme.service';
import { DemoService } from '../services/demo.service';
import { NatureTreeComponent } from '../shared/nature-tree/nature-tree.component';
import { SeasonSwitcherComponent } from '../shared/season-switcher/season-switcher.component';
import { AuthService } from '../services/auth.service';
import { HybridStorageService } from '../services/hybrid-storage.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    MenuBarComponent,
    NatureTreeComponent,
    SeasonSwitcherComponent,
  ],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss',
})
export class AppLayoutComponent {
  // Inject ThemeService to ensure it initializes when entering the app
  private readonly themeService = inject(ThemeService);
  protected readonly demoService = inject(DemoService);
  protected readonly authService = inject(AuthService);
  protected readonly hybridStorageService = inject(HybridStorageService);
  private readonly router = inject(Router);

  /**
   * Hide season switcher when demo is active OR when the dashboard activation banner is shown
   */
  protected canShowSeasonSwitcher = computed(() => {
    // Hide if in demo mode
    if (this.demoService.isDemoMode()) {
      return false;
    }

    // Hide if activation banner is shown on dashboard
    const isDashboard = this.router.url === '/' || this.router.url === '/dashboard' || this.router.url.startsWith('/dashboard/');
    const isActivationBannerShown = !this.authService.isAuthenticated() && !this.hybridStorageService.hasUserContent() && isDashboard;

    return !isActivationBannerShown;
  });
}
