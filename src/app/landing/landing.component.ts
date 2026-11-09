import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ThemeService, Theme } from '../services/theme.service';
import { LanguageService } from '../services/language.service';
import { LanguageSwitcherComponent } from '../components/language-switcher/language-switcher.component';
import { TranslatePipe } from '../pipes/translate.pipe';
import {
  LucideAngularModule,
  Droplets,
  Flame,
  Zap,
  Users,
  ChartBar,
  Brain,
  Globe,
  Cloud,
  FileSpreadsheet,
  BookOpen,
  Pencil,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Layers,
  Infinity as LucideInfinity,
  Camera,
  ArrowRight,
  ArrowDown,
  CircleCheck,
  Sun,
  Moon,
  Monitor,
  House,
  Trees,
  Activity,
  Clock,
  Sparkle,
  LayoutDashboard,
  Bell,
  Plus,
  Play,
  SlidersHorizontal,
} from 'lucide-angular';

import {
  ALL_SCENERY,
  FEATURE_KEYS,
  FLOATING_BADGES,
  HERO_ROAD_PATH,
  HIGHLIGHT_KEYS,
  HOW_STEPS,
  LEFT_SCENERY,
  PAGE_ROAD_PATH,
  RIGHT_SCENERY,
  STAT_KEYS,
} from './landing.constants';
import { LandingFaqComponent } from './landing-faq/landing-faq.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    RouterLink,
    LanguageSwitcherComponent,
    LandingFaqComponent,
    TranslatePipe,
    LucideAngularModule,
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent implements OnInit, OnDestroy {
  private static readonly THEME_ORDER: readonly Theme[] = ['light', 'dark', 'system'];
  private static readonly THEME_KEYS: Record<Theme, string> = {
    light: 'SETTINGS.THEME_LIGHT',
    dark: 'SETTINGS.THEME_DARK',
    system: 'SETTINGS.THEME_SYSTEM',
  };
  protected readonly heroOrbs = ['orb-teal', 'orb-blue', 'orb-indigo'] as const;
  protected readonly ctaRings = [1, 2, 3] as const;

  protected readonly themeService = inject(ThemeService);
  protected readonly languageService = inject(LanguageService);
  private readonly platformId = inject(PLATFORM_ID);

  // Icons
  readonly DropletsIcon = Droplets;
  readonly FlameIcon = Flame;
  readonly ZapIcon = Zap;
  readonly UsersIcon = Users;
  readonly BarChart3Icon = ChartBar;
  readonly BrainIcon = Brain;
  readonly GlobeIcon = Globe;
  readonly CloudIcon = Cloud;
  readonly FileSpreadsheetIcon = FileSpreadsheet;
  readonly BookOpenIcon = BookOpen;
  readonly PencilIcon = Pencil;
  readonly TrendingUpIcon = TrendingUp;
  readonly SparklesIcon = Sparkles;
  readonly SparkleIcon = Sparkle;
  readonly ShieldCheckIcon = ShieldCheck;
  readonly LayersIcon = Layers;
  readonly InfinityIcon = LucideInfinity;
  readonly CameraIcon = Camera;
  readonly ArrowRightIcon = ArrowRight;
  readonly ArrowDownIcon = ArrowDown;
  readonly CheckCircle2Icon = CircleCheck;
  readonly SunIcon = Sun;
  readonly MoonIcon = Moon;
  readonly MonitorIcon = Monitor;
  readonly HomeIcon = House;
  readonly TreesIcon = Trees;
  readonly ActivityIcon = Activity;
  readonly ClockIcon = Clock;
  readonly LayoutDashboardIcon = LayoutDashboard;
  readonly BellIcon = Bell;
  readonly PlusIcon = Plus;
  readonly PlayIcon = Play;
  readonly SlidersHorizontalIcon = SlidersHorizontal;

  protected readonly scrollY = signal(0);
  protected readonly isScrolled = computed(() => this.scrollY() > 50);
  protected readonly roadProgress = signal(0);
  protected readonly isVisible = signal<Record<string, boolean>>({});

  private isDragging = false;
  private dragRoadRect: DOMRect | null = null;
  private dragMaxScroll: number | null = null;
  private cachedMaxScroll = 0;
  private readonly onWindowScrollBound = this.onWindowScroll.bind(this);
  private readonly onWindowResizeBound = this.onWindowResize.bind(this);
  private readonly onDragMoveBound = this.onDragMove.bind(this);
  private readonly onDragEndBound = this.onDragEnd.bind(this);

  protected readonly highlightKeys = HIGHLIGHT_KEYS;
  protected readonly featureKeys = FEATURE_KEYS;
  protected readonly statKeys = STAT_KEYS;
  protected readonly leftScenery = LEFT_SCENERY;
  protected readonly rightScenery = RIGHT_SCENERY;
  protected readonly allScenery = ALL_SCENERY;
  protected readonly floatingBadges = FLOATING_BADGES;
  protected readonly howSteps = HOW_STEPS;
  protected readonly heroRoadPath = HERO_ROAD_PATH;
  protected readonly pageRoadPath = PAGE_ROAD_PATH;

  private observer: IntersectionObserver | null = null;
  private scrollRafId: number | null = null;

  protected readonly themeIcon = computed(() => this.getThemeIcon());
  protected readonly themeTitle = computed(() => {
    this.languageService.currentLang();
    this.languageService.translationVersion?.();
    return this.getThemeTitle();
  });
  private readonly clampedParallaxScroll = computed(() => Math.min(this.scrollY(), 900));
  protected readonly floatingIconsParallax = computed(() => this.getParallaxTransform(-0.25));

  onWindowScroll(): void {
    if (this.scrollRafId !== null) return;
    this.scrollRafId = requestAnimationFrame(() => {
      this.scrollRafId = null;
      this.onScroll();
    });
  }

  onWindowResize(): void {
    this.cachedMaxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  onScroll(): void {
    this.scrollY.set(window.scrollY);
    this.updateRoadProgress();
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('scroll', this.onWindowScrollBound, { passive: true });
      window.addEventListener('resize', this.onWindowResizeBound, { passive: true });
      this.setupIntersectionObserver();
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.scrollRafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.scrollRafId);
      this.scrollRafId = null;
    }
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('scroll', this.onWindowScrollBound);
      window.removeEventListener('resize', this.onWindowResizeBound);
      document.removeEventListener('mousemove', this.onDragMoveBound);
      document.removeEventListener('mouseup', this.onDragEndBound);
    }
  }

  private setupIntersectionObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        const currentVisible = this.isVisible();
        let newlyVisible: Record<string, boolean> | null = null;
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          const id = target.dataset['animate'];
          if (id && entry.isIntersecting) {
            if (!currentVisible[id]) {
              newlyVisible ??= {};
              newlyVisible[id] = true;
            }
            this.observer?.unobserve(target);
          }
        }
        if (newlyVisible) {
          const batch = newlyVisible;
          this.isVisible.update((prev) => ({ ...prev, ...batch }));
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' },
    );

    setTimeout(() => {
      this.onWindowResize();
      document.querySelectorAll('[data-animate]').forEach((el) => {
        this.observer?.observe(el);
      });
    }, 100);
  }

  protected getParallaxTransform(speed: number): string {
    return `translateY(${this.clampedParallaxScroll() * speed}px)`;
  }

  private updateRoadProgress(): void {
    const maxScroll =
      this.cachedMaxScroll > 0
        ? this.cachedMaxScroll
        : document.documentElement.scrollHeight - window.innerHeight;
    if (this.cachedMaxScroll <= 0 && maxScroll > 0) {
      this.cachedMaxScroll = maxScroll;
    }
    const rawProgress = maxScroll > 0 ? Math.min((this.scrollY() / maxScroll) * 100, 100) : 0;
    this.roadProgress.set(Math.round(rawProgress * 10) / 10);
  }

  protected onRoadClick(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clickY = event.clientY - rect.top;
    const percentage = clickY / rect.height;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: percentage * maxScroll, behavior: 'smooth' });
  }

  protected onRoadKeydown(event: Event): void {
    const e = event as KeyboardEvent;
    if (e.key === 'Enter' || e.key === ' ') {
      event.preventDefault();
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const currentScroll = this.scrollY();
      const nextScroll = Math.min(currentScroll + window.innerHeight * 0.25, maxScroll);
      window.scrollTo({ top: nextScroll, behavior: 'smooth' });
    }
  }

  protected onRoadDragStart(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
    const roadEl = document.querySelector('.road-progress') as HTMLElement | null;
    this.dragRoadRect = roadEl ? roadEl.getBoundingClientRect() : null;
    this.dragMaxScroll = document.documentElement.scrollHeight - window.innerHeight;
    document.addEventListener('mousemove', this.onDragMoveBound);
    document.addEventListener('mouseup', this.onDragEndBound);
  }

  private onDragMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    const rect =
      this.dragRoadRect ??
      (document.querySelector('.road-progress') as HTMLElement | null)?.getBoundingClientRect();
    if (!rect) return;
    const posY = Math.max(0, Math.min(event.clientY - rect.top, rect.height));
    const percentage = posY / rect.height;
    const maxScroll =
      this.dragMaxScroll ?? document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: percentage * maxScroll });
  }

  private onDragEnd(): void {
    this.isDragging = false;
    this.dragRoadRect = null;
    this.dragMaxScroll = null;
    document.removeEventListener('mousemove', this.onDragMoveBound);
    document.removeEventListener('mouseup', this.onDragEndBound);
  }

  protected cycleTheme(): void {
    const current = this.themeService.currentTheme();
    const currentIndex = LandingComponent.THEME_ORDER.indexOf(current);
    const nextIndex = (currentIndex + 1) % LandingComponent.THEME_ORDER.length;
    this.themeService.setTheme(LandingComponent.THEME_ORDER[nextIndex]);
  }

  protected getThemeIcon(): string {
    const current = this.themeService.currentTheme();
    if (current === 'system') return '🖥️';
    return this.themeService.resolvedTheme() === 'dark' ? '🌙' : '☀️';
  }

  protected getThemeTitle(): string {
    const current = this.themeService.currentTheme();
    const currentName = this.languageService.translate(LandingComponent.THEME_KEYS[current]);

    if (current === 'system') {
      const resolved = this.themeService.resolvedTheme();
      const resolvedName = this.languageService.translate(LandingComponent.THEME_KEYS[resolved]);
      return `${currentName} (${resolvedName})`;
    }
    return currentName;
  }
}
