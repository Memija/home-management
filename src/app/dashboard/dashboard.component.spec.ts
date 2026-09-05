import { TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { DemoService } from '../services/demo.service';
import { AuthService } from '../services/auth.service';
import { HybridStorageService } from '../services/hybrid-storage.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Droplets, Flame, Play, X, Zap } from 'lucide-angular';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let mockDemoService: Partial<DemoService>;
  let mockAuthService: Partial<AuthService>;
  let mockHybridStorageService: Partial<HybridStorageService>;

  beforeEach(() => {
    TestBed.resetTestingModule();

    mockDemoService = {
      isDemoMode: signal(false),
      activateDemo: vi.fn(),
      deactivateDemo: vi.fn(),
    };

    mockAuthService = {
      isAuthenticated: signal(false),
    };

    mockHybridStorageService = {
      hasUserContent: signal(false),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DemoService, useValue: mockDemoService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: HybridStorageService, useValue: mockHybridStorageService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
      ],
    });

    component = TestBed.runInInjectionContext(() => new DashboardComponent());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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
      component['activateDemo']();
      expect(mockDemoService.activateDemo).toHaveBeenCalled();
    });

    it('should delegate deactivateDemo to DemoService', () => {
      component['deactivateDemo']();
      expect(mockDemoService.deactivateDemo).toHaveBeenCalled();
    });
  });
});
