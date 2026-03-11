import { Component, inject, signal, HostListener, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ThemeService, Theme } from '../services/theme.service';
import { LanguageService } from '../services/language.service';
import { LanguageSwitcherComponent } from '../components/language-switcher/language-switcher.component';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, LanguageSwitcherComponent, TranslatePipe],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements OnInit, OnDestroy {
  protected readonly themeService = inject(ThemeService);
  protected readonly languageService = inject(LanguageService);
  private readonly platformId = inject(PLATFORM_ID);

  protected scrollY = signal(0);
  protected roadProgress = signal(0);
  protected isVisible = signal<Record<string, boolean>>({});
  private isDragging = false;
  private readonly onDragMoveBound = this.onDragMove.bind(this);
  private readonly onDragEndBound = this.onDragEnd.bind(this);

  protected readonly featureKeys = [
    {
      icon: '💧',
      titleKey: 'LANDING.FEATURES.WATER_TITLE',
      descKey: 'LANDING.FEATURES.WATER_DESC',
      color: '#3b82f6'
    },
    {
      icon: '🔥',
      titleKey: 'LANDING.FEATURES.HEATING_TITLE',
      descKey: 'LANDING.FEATURES.HEATING_DESC',
      color: '#f59e0b'
    },
    {
      icon: '⚡',
      titleKey: 'LANDING.FEATURES.ELECTRICITY_TITLE',
      descKey: 'LANDING.FEATURES.ELECTRICITY_DESC',
      color: '#8b5cf6'
    },
    {
      icon: '👨‍👩‍👧‍👦',
      titleKey: 'LANDING.FEATURES.FAMILY_TITLE',
      descKey: 'LANDING.FEATURES.FAMILY_DESC',
      color: '#10b981'
    },
    {
      icon: '📊',
      titleKey: 'LANDING.FEATURES.ANALYTICS_TITLE',
      descKey: 'LANDING.FEATURES.ANALYTICS_DESC',
      color: '#ec4899'
    },
    {
      icon: '🌍',
      titleKey: 'LANDING.FEATURES.COUNTRY_TITLE',
      descKey: 'LANDING.FEATURES.COUNTRY_DESC',
      color: '#f97316'
    },
    {
      icon: '☁️',
      titleKey: 'LANDING.FEATURES.CLOUD_TITLE',
      descKey: 'LANDING.FEATURES.CLOUD_DESC',
      color: '#06b6d4'
    },
    {
      icon: '📄',
      titleKey: 'LANDING.FEATURES.EXPORT_TITLE',
      descKey: 'LANDING.FEATURES.EXPORT_DESC',
      color: '#14b8a6'
    }
  ];

  protected readonly statKeys = [
    { value: '100%', labelKey: 'LANDING.STATS.FREE' },
    { value: '3', labelKey: 'LANDING.STATS.TRACKERS' },
    { value: '∞', labelKey: 'LANDING.STATS.DATA_POINTS' },
    { value: '0', labelKey: 'LANDING.STATS.ADS' }
  ];

  protected readonly leftScenery = [
    { top: 8, left: 28, delay: 0.1, type: 'tree', icon: '🌳' },
    { top: 16, left: 24, delay: 0.15, type: 'house', icon: '🏡' },
    { top: 24, left: 28, delay: 0.2, type: 'tree', icon: '🌲' },
    { top: 34, left: 34, delay: 0.25, type: 'tree', icon: '🌳' },
    { top: 44, left: 38, delay: 0.3, type: 'house', icon: '🏠' },
    { top: 52, left: 34, delay: 0.35, type: 'tree', icon: '🌲' },
    { top: 62, left: 28, delay: 0.4, type: 'tree', icon: '🌳' },
    { top: 72, left: 24, delay: 0.45, type: 'house', icon: '🏡' },
    { top: 82, left: 28, delay: 0.5, type: 'tree', icon: '🌲' },
    { top: 92, left: 32, delay: 0.55, type: 'tree', icon: '🌳' },
  ];

  protected readonly rightScenery = [
    { top: 10, left: 62, delay: 0.12, type: 'tree', icon: '🌲' },
    { top: 20, left: 64, delay: 0.18, type: 'house', icon: '🏘️' },
    { top: 30, left: 66, delay: 0.24, type: 'tree', icon: '🌳' },
    { top: 40, left: 72, delay: 0.3, type: 'house', icon: '🏠' },
    { top: 48, left: 74, delay: 0.36, type: 'tree', icon: '🌲' },
    { top: 58, left: 70, delay: 0.42, type: 'tree', icon: '🌳' },
    { top: 66, left: 64, delay: 0.48, type: 'house', icon: '🏡' },
    { top: 76, left: 60, delay: 0.54, type: 'tree', icon: '🌲' },
    { top: 86, left: 64, delay: 0.6, type: 'tree', icon: '🌳' },
    { top: 94, left: 66, delay: 0.66, type: 'house', icon: '🏠' },
  ];

  protected readonly floatingIcons = [
    { icon: '💧', top: '15%', left: '10%', delay: '0s', size: '2.5rem' },
    { icon: '🔥', top: '25%', left: 'auto', right: '15%', delay: '-4s', size: '2rem' },
    { icon: '⚡', top: '60%', left: '20%', delay: '-8s', size: '2.2rem' },
    { icon: '📊', top: '70%', left: 'auto', right: '10%', delay: '-12s', size: '1.8rem' },
    { icon: '🏠', top: '40%', left: '70%', delay: '-16s', size: '3rem' }
  ];

  private observer: IntersectionObserver | null = null;

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrollY.set(window.scrollY);
    this.updateRoadProgress();
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.setupIntersectionObserver();
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('mousemove', this.onDragMoveBound);
      document.removeEventListener('mouseup', this.onDragEndBound);
    }
  }

  private setupIntersectionObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const id = entry.target.getAttribute('data-animate');
          if (id && entry.isIntersecting) {
            // Once visible, stay visible (don't hide on leave)
            this.isVisible.update(prev => ({ ...prev, [id]: true }));
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );

    // Observe after a tick so the DOM is ready
    setTimeout(() => {
      document.querySelectorAll('[data-animate]').forEach(el => {
        this.observer?.observe(el);
      });
    }, 100);
  }

  protected getParallaxTransform(speed: number): string {
    return `translateY(${this.scrollY() * speed}px)`;
  }

  private updateRoadProgress(): void {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    this.roadProgress.set(maxScroll > 0 ? Math.min((this.scrollY() / maxScroll) * 100, 100) : 0);
  }

  /**
   * Handle click on the road track to jump to a scroll position
   */
  protected onRoadClick(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clickY = event.clientY - rect.top;
    const percentage = clickY / rect.height;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: percentage * maxScroll, behavior: 'smooth' });
  }

  /**
   * Start dragging the house icon to scroll
   */
  protected onRoadDragStart(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
    document.addEventListener('mousemove', this.onDragMoveBound);
    document.addEventListener('mouseup', this.onDragEndBound);
  }

  private onDragMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    const roadEl = document.querySelector('.road-progress') as HTMLElement;
    if (!roadEl) return;
    const rect = roadEl.getBoundingClientRect();
    const posY = Math.max(0, Math.min(event.clientY - rect.top, rect.height));
    const percentage = posY / rect.height;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: percentage * maxScroll });
  }

  private onDragEnd(): void {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.onDragMoveBound);
    document.removeEventListener('mouseup', this.onDragEndBound);
  }

  /**
   * Cycle through themes: light → dark → system → light
   */
  protected cycleTheme(): void {
    const current = this.themeService.currentTheme();
    const themeOrder: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themeOrder.indexOf(current);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    this.themeService.setTheme(themeOrder[nextIndex]);
  }

  protected getThemeIcon(): string {
    const current = this.themeService.currentTheme();
    if (current === 'system') return '🖥️';
    return this.themeService.resolvedTheme() === 'dark' ? '🌙' : '☀️';
  }

  protected getThemeTitle(): string {
    const current = this.themeService.currentTheme();
    const resolved = this.themeService.resolvedTheme();

    const themeNames: Record<Theme, string> = {
      light: this.languageService.translate('SETTINGS.THEME_LIGHT'),
      dark: this.languageService.translate('SETTINGS.THEME_DARK'),
      system: this.languageService.translate('SETTINGS.THEME_SYSTEM')
    };

    if (current === 'system') {
      const resolvedName = themeNames[resolved];
      return `${themeNames.system} (${resolvedName})`;
    }
    return themeNames[current];
  }
}
