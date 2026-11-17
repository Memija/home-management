import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { DemoService } from '../services/demo.service';
import { AuthService } from '../services/auth.service';
import { HybridStorageService } from '../services/hybrid-storage.service';
import { NotificationService } from '../services/notification.service';
import { ConsumptionMotivationService } from '../services/consumption-motivation.service';
import { LanguageService, Language } from '../services/language.service';
import { MotivationInsight } from '../models/motivation.model';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Droplets, Flame, Play, X, Zap, TrendingDown, TrendingUp, Sparkles } from 'lucide-angular';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { signal, WritableSignal } from '@angular/core';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockDemoService: Partial<DemoService>;
  let mockAuthService: Partial<AuthService>;
  let mockHybridStorageService: Partial<HybridStorageService>;
  let mockMotivationService: { nextTip: ReturnType<typeof vi.fn> };
  let waterMotivationSignal: WritableSignal<MotivationInsight | null>;
  let heatingMotivationSignal: WritableSignal<MotivationInsight | null>;
  let electricityMotivationSignal: WritableSignal<MotivationInsight | null>;

  const sampleSavingInsight: MotivationInsight = {
    tracker: 'water',
    state: 'saving',
    changePercent: 18,
    latestDailyRate: 82,
    baselineDailyRate: 100,
    unit: 'L',
    titleKey: 'MOTIVATION.WATER.SAVING_TITLE',
    messageKey: 'MOTIVATION.WATER.SAVING_1',
    messageParams: { percent: 18 },
    isNotable: true,
    latestDateIso: '2026-03-08',
    tipIndex: 0,
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();

    waterMotivationSignal = signal<MotivationInsight | null>(null);
    heatingMotivationSignal = signal<MotivationInsight | null>(null);
    electricityMotivationSignal = signal<MotivationInsight | null>(null);

    mockDemoService = {
      isDemoMode: signal(false),
      isLoading: signal(false),
      activateDemo: vi.fn(),
      deactivateDemo: vi.fn(),
    };

    mockAuthService = {
      isAuthenticated: signal(false),
    };

    mockHybridStorageService = {
      hasUserContent: signal(false),
    };

    mockMotivationService = {
      nextTip: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: DemoService, useValue: mockDemoService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: HybridStorageService, useValue: mockHybridStorageService },
        {
          provide: NotificationService,
          useValue: {
            waterMotivation: waterMotivationSignal,
            heatingMotivation: heatingMotivationSignal,
            electricityMotivation: electricityMotivationSignal,
          },
        },
        { provide: ConsumptionMotivationService, useValue: mockMotivationService },
        {
          provide: LanguageService,
          useValue: {
            currentLang: signal<Language>('en'),
            translate: (key: string) => key,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create and render three tracker cards', () => {
    expect(component).toBeTruthy();
    const cards = fixture.debugElement.queryAll(By.css('.tracker-card'));
    expect(cards).toHaveLength(3);
  });

  describe('Icon Initialization', () => {
    it('should have DropletsIcon set to lucide Droplets icon', () => {
      expect(component['DropletsIcon']).toBe(Droplets);
    });

    it('should have FlameIcon set to lucide Flame icon', () => {
      expect(component['FlameIcon']).toBe(Flame);
    });

    it('should have PlayIcon set to lucide Play icon', () => {
      expect(component['PlayIcon']).toBe(Play);
    });

    it('should have XIcon set to lucide X icon', () => {
      expect(component['XIcon']).toBe(X);
    });

    it('should have ZapIcon set to lucide Zap icon', () => {
      expect(component['ZapIcon']).toBe(Zap);
    });
  });

  describe('Demo interactions', () => {
    it('should delegate activateDemo to DemoService', () => {
      void component['activateDemo']();
      expect(mockDemoService.activateDemo).toHaveBeenCalled();
    });

    it('should delegate deactivateDemo to DemoService', () => {
      void component['deactivateDemo']();
      expect(mockDemoService.deactivateDemo).toHaveBeenCalled();
    });
  });

  describe('Consumption Motivation Messages', () => {
    it('should not render motivation status blocks when insights are null', () => {
      const blocks = fixture.debugElement.queryAll(By.css('.motivation-status'));
      expect(blocks).toHaveLength(0);
    });

    it('should render motivation status block with state styling when insight is available', () => {
      waterMotivationSignal.set(sampleSavingInsight);
      fixture.detectChanges();

      const block = fixture.debugElement.query(By.css('.water-card .motivation-status'));
      expect(block).toBeTruthy();
      expect(block.classes['motivation-saving']).toBe(true);

      const message = block.query(By.css('.motivation-message'));
      expect(message.nativeElement.textContent.trim()).toBe('MOTIVATION.WATER.SAVING_1');
    });

    it('should map trend states to matching icons and badge keys', () => {
      expect(component['getMotivationIcon']('saving')).toBe(TrendingDown);
      expect(component['getMotivationIcon']('stable')).toBe(Sparkles);
      expect(component['getMotivationIcon']('spike')).toBe(TrendingUp);

      expect(component['getMotivationBadgeKey']('saving')).toBe('MOTIVATION.BADGE_SAVING');
      expect(component['getMotivationBadgeKey']('stable')).toBe('MOTIVATION.BADGE_STABLE');
      expect(component['getMotivationBadgeKey']('spike')).toBe('MOTIVATION.BADGE_SPIKE');
    });

    it('should cycle motivational tip without triggering card navigation when refresh button is clicked', () => {
      waterMotivationSignal.set(sampleSavingInsight);
      fixture.detectChanges();

      const refreshBtn = fixture.debugElement.query(By.css('.water-card .motivation-refresh-btn'));
      expect(refreshBtn).toBeTruthy();

      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      const stopSpy = vi.spyOn(clickEvent, 'stopPropagation');
      const preventSpy = vi.spyOn(clickEvent, 'preventDefault');

      refreshBtn.nativeElement.dispatchEvent(clickEvent);

      expect(preventSpy).toHaveBeenCalled();
      expect(stopSpy).toHaveBeenCalled();
      expect(mockMotivationService.nextTip).toHaveBeenCalledWith('water');
    });

    it('should render heating stable and electricity spike motivation banners and cycle their tips', () => {
      const heatingStableInsight: MotivationInsight = {
        tracker: 'heating',
        state: 'stable',
        changePercent: 1,
        latestDailyRate: 12.5,
        baselineDailyRate: 12.4,
        unit: 'kWh',
        titleKey: 'MOTIVATION.HEATING.STABLE_TITLE',
        messageKey: 'MOTIVATION.HEATING.STABLE_1',
        messageParams: { percent: 1 },
        isNotable: false,
        latestDateIso: '2026-03-08',
        tipIndex: 0,
      };
      const electricitySpikeInsight: MotivationInsight = {
        tracker: 'electricity',
        state: 'spike',
        changePercent: 22,
        latestDailyRate: 14.2,
        baselineDailyRate: 11.6,
        unit: 'kWh',
        titleKey: 'MOTIVATION.ELECTRICITY.SPIKE_TITLE',
        messageKey: 'MOTIVATION.ELECTRICITY.SPIKE_1',
        messageParams: { percent: 22 },
        isNotable: true,
        latestDateIso: '2026-03-08',
        tipIndex: 0,
      };

      waterMotivationSignal.set(sampleSavingInsight);
      heatingMotivationSignal.set(heatingStableInsight);
      electricityMotivationSignal.set(electricitySpikeInsight);
      fixture.detectChanges();

      const heatingBlock = fixture.debugElement.query(By.css('.heating-card .motivation-status'));
      const electricityBlock = fixture.debugElement.query(
        By.css('.electricity-card .motivation-status'),
      );

      expect(heatingBlock.classes['motivation-stable']).toBe(true);
      expect(electricityBlock.classes['motivation-spike']).toBe(true);

      heatingBlock.query(By.css('.motivation-refresh-btn')).nativeElement.click();
      electricityBlock.query(By.css('.motivation-refresh-btn')).nativeElement.click();

      expect(mockMotivationService.nextTip).toHaveBeenCalledWith('heating');
      expect(mockMotivationService.nextTip).toHaveBeenCalledWith('electricity');
    });
  });
});
