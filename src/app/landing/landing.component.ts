import {
  Component,
  inject,
  signal,
  HostListener,
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
  BarChart3,
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
  CheckCircle2,
  Sun,
  Moon,
  Monitor,
  Home,
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

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, LanguageSwitcherComponent, TranslatePipe, LucideAngularModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit, OnDestroy {
  protected readonly themeService = inject(ThemeService);
  protected readonly languageService = inject(LanguageService);
  private readonly platformId = inject(PLATFORM_ID);

  // Icons
  readonly DropletsIcon = Droplets;
  readonly FlameIcon = Flame;
  readonly ZapIcon = Zap;
  readonly UsersIcon = Users;
  readonly BarChart3Icon = BarChart3;
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
  readonly CheckCircle2Icon = CheckCircle2;
  readonly SunIcon = Sun;
  readonly MoonIcon = Moon;
  readonly MonitorIcon = Monitor;
  readonly HomeIcon = Home;
  readonly TreesIcon = Trees;
  readonly ActivityIcon = Activity;
  readonly ClockIcon = Clock;
  readonly LayoutDashboardIcon = LayoutDashboard;
  readonly BellIcon = Bell;
  readonly PlusIcon = Plus;
  readonly PlayIcon = Play;
  readonly SlidersHorizontalIcon = SlidersHorizontal;

  protected scrollY = signal(0);
  protected roadProgress = signal(0);
  protected isVisible = signal<Record<string, boolean>>({});

  private isDragging = false;
  private readonly onDragMoveBound = this.onDragMove.bind(this);
  private readonly onDragEndBound = this.onDragEnd.bind(this);

  protected readonly highlightKeys = [
    {
      icon: ShieldCheck,
      titleKey: 'LANDING.HIGHLIGHTS.LOCAL_TITLE',
      descKey: 'LANDING.HIGHLIGHTS.LOCAL_DESC',
      tags: [
        'LANDING.HIGHLIGHTS.LOCAL_TAG_1',
        'LANDING.HIGHLIGHTS.LOCAL_TAG_2',
        'LANDING.HIGHLIGHTS.LOCAL_TAG_3',
      ],
      themeClass: 'highlight--local',
      color: '#10b981',
    },
    {
      icon: Brain,
      titleKey: 'LANDING.HIGHLIGHTS.PREDICT_TITLE',
      descKey: 'LANDING.HIGHLIGHTS.PREDICT_DESC',
      tags: [
        'LANDING.HIGHLIGHTS.PREDICT_TAG_1',
        'LANDING.HIGHLIGHTS.PREDICT_TAG_2',
        'LANDING.HIGHLIGHTS.PREDICT_TAG_3',
      ],
      themeClass: 'highlight--predict',
      color: '#a855f7',
    },
    {
      icon: Layers,
      titleKey: 'LANDING.HIGHLIGHTS.UNIFIED_TITLE',
      descKey: 'LANDING.HIGHLIGHTS.UNIFIED_DESC',
      tags: [
        'LANDING.HIGHLIGHTS.UNIFIED_TAG_1',
        'LANDING.HIGHLIGHTS.UNIFIED_TAG_2',
        'LANDING.HIGHLIGHTS.UNIFIED_TAG_3',
      ],
      themeClass: 'highlight--unified',
      color: '#0284c7',
    },
    {
      icon: Globe,
      titleKey: 'LANDING.HIGHLIGHTS.PRIVACY_TITLE',
      descKey: 'LANDING.HIGHLIGHTS.PRIVACY_DESC',
      tags: [
        'LANDING.HIGHLIGHTS.PRIVACY_TAG_1',
        'LANDING.HIGHLIGHTS.PRIVACY_TAG_2',
        'LANDING.HIGHLIGHTS.PRIVACY_TAG_3',
      ],
      themeClass: 'highlight--privacy',
      color: '#f43f5e',
    },
  ];

  protected readonly featureKeys = [
    {
      icon: Droplets,
      titleKey: 'LANDING.FEATURES.WATER_TITLE',
      descKey: 'LANDING.FEATURES.WATER_DESC',
      color: '#3b82f6',
    },
    {
      icon: Flame,
      titleKey: 'LANDING.FEATURES.HEATING_TITLE',
      descKey: 'LANDING.FEATURES.HEATING_DESC',
      color: '#f59e0b',
    },
    {
      icon: Zap,
      titleKey: 'LANDING.FEATURES.ELECTRICITY_TITLE',
      descKey: 'LANDING.FEATURES.ELECTRICITY_DESC',
      color: '#8b5cf6',
    },
    {
      icon: Users,
      titleKey: 'LANDING.FEATURES.FAMILY_TITLE',
      descKey: 'LANDING.FEATURES.FAMILY_DESC',
      color: '#10b981',
    },
    {
      icon: BarChart3,
      titleKey: 'LANDING.FEATURES.ANALYTICS_TITLE',
      descKey: 'LANDING.FEATURES.ANALYTICS_DESC',
      color: '#ec4899',
    },
    {
      icon: Brain,
      titleKey: 'LANDING.FEATURES.PREDICTIONS_TITLE',
      descKey: 'LANDING.FEATURES.PREDICTIONS_DESC',
      color: '#a855f7',
    },
    {
      icon: Globe,
      titleKey: 'LANDING.FEATURES.COUNTRY_TITLE',
      descKey: 'LANDING.FEATURES.COUNTRY_DESC',
      color: '#f97316',
    },
    {
      icon: Cloud,
      titleKey: 'LANDING.FEATURES.CLOUD_TITLE',
      descKey: 'LANDING.FEATURES.CLOUD_DESC',
      color: '#06b6d4',
    },
    {
      icon: FileSpreadsheet,
      titleKey: 'LANDING.FEATURES.EXPORT_TITLE',
      descKey: 'LANDING.FEATURES.EXPORT_DESC',
      color: '#14b8a6',
    },
  ];

  protected readonly statKeys = [
    { value: '100%', labelKey: 'LANDING.STATS.FREE', icon: Sparkles },
    { value: '3', labelKey: 'LANDING.STATS.TRACKERS', icon: Layers },
    { value: '∞', labelKey: 'LANDING.STATS.DATA_POINTS', icon: LucideInfinity },
    { value: '0', labelKey: 'LANDING.STATS.ADS', icon: ShieldCheck },
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

  protected readonly floatingBadges = [
    { icon: Droplets, top: '16%', left: '8%', delay: '0s', size: '20', color: '#3b82f6' },
    {
      icon: Flame,
      top: '24%',
      left: 'auto',
      right: '10%',
      delay: '-4s',
      size: '18',
      color: '#f59e0b',
    },
    { icon: Zap, top: '62%', left: '10%', delay: '-8s', size: '18', color: '#8b5cf6' },
    {
      icon: BarChart3,
      top: '72%',
      left: 'auto',
      right: '8%',
      delay: '-12s',
      size: '18',
      color: '#ec4899',
    },
    {
      icon: Home,
      top: '44%',
      left: 'auto',
      right: '18%',
      delay: '-16s',
      size: '22',
      color: '#10b981',
    },
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
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('data-animate');
          if (id && entry.isIntersecting) {
            this.isVisible.update((prev) => ({ ...prev, [id]: true }));
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' },
    );

    setTimeout(() => {
      document.querySelectorAll('[data-animate]').forEach((el) => {
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
      system: this.languageService.translate('SETTINGS.THEME_SYSTEM'),
    };

    if (current === 'system') {
      const resolvedName = themeNames[resolved];
      return `${themeNames.system} (${resolvedName})`;
    }
    return themeNames[current];
  }
}
