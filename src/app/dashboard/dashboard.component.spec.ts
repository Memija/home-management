import { TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { DemoService } from '../services/demo.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Droplets, Flame, Play, X, Zap } from 'lucide-angular';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let mockDemoService: Partial<DemoService>;

  beforeEach(() => {
    TestBed.resetTestingModule();

    mockDemoService = {
      isDemoMode: signal(false),
      activateDemo: vi.fn(),
      deactivateDemo: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DemoService, useValue: mockDemoService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } }
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
      expect((component as any).DropletsIcon).toBe(Droplets);
    });

    it('should have FlameIcon set to lucide Flame icon', () => {
      expect((component as any).FlameIcon).toBe(Flame);
    });

    it('should have PlayIcon set to lucide Play icon', () => {
      expect((component as any).PlayIcon).toBe(Play);
    });

    it('should have XIcon set to lucide X icon', () => {
      expect((component as any).XIcon).toBe(X);
    });

    it('should have ZapIcon set to lucide Zap icon', () => {
      expect((component as any).ZapIcon).toBe(Zap);
    });
  });

  describe('Demo interactions', () => {
    it('should delegate activateDemo to DemoService', () => {
      (component as any).activateDemo();
      expect(mockDemoService.activateDemo).toHaveBeenCalled();
    });

    it('should delegate deactivateDemo to DemoService', () => {
      (component as any).deactivateDemo();
      expect(mockDemoService.deactivateDemo).toHaveBeenCalled();
    });
  });
});
