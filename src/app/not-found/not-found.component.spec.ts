import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, signal } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { Compass, House, LayoutDashboard } from 'lucide-angular';
import { NotFoundComponent } from './not-found.component';
import { buildAerialScene, getCarTransformsAtTime } from './not-found-scene.builder';
import { ThemeService } from '../services/theme.service';

/**
 * Unit tests for NotFoundComponent and its procedural aerial 404 scene builder.
 *
 * Uses TestBed.runInInjectionContext to create the component class directly,
 * bypassing external template/style resolution issues in the Vitest environment.
 */
describe('NotFoundComponent', () => {
  let component: NotFoundComponent;
  const resolvedThemeSignal = signal<'light' | 'dark'>('dark');

  beforeEach(() => {
    resolvedThemeSignal.set('dark');
    TestBed.configureTestingModule({
      providers: [
        { provide: ThemeService, useValue: { resolvedTheme: resolvedThemeSignal } },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    component = TestBed.runInInjectionContext(() => new NotFoundComponent());
  });

  it('should create the component instance', () => {
    expect(component).toBeInstanceOf(NotFoundComponent);
  });

  it('should expose the compass, home and dashboard icons', () => {
    expect(component.CompassIcon).toBe(Compass);
    expect(component.HomeIcon).toBe(House);
    expect(component.DashboardIcon).toBe(LayoutDashboard);
  });

  it('should expose the reactive resolvedTheme signal for day/night scene switching', () => {
    expect(component.resolvedTheme()).toBe('dark');
    resolvedThemeSignal.set('light');
    expect(component.resolvedTheme()).toBe('light');
  });

  it('should deterministically build the aerial forest, houses, docks, two bridges, and driving cars', () => {
    expect(component.scene.trees.length).toBeGreaterThan(250);
    expect(component.scene.houses.length).toBe(17);
    expect(component.scene.docks.length).toBe(6);
    expect(component.scene.bridges.length).toBe(2);
    expect(component.scene.cars.length).toBe(10);
    expect(buildAerialScene()).toBe(component.scene);
  });

  it('should advance car transforms along the road waypoints over time', () => {
    const t0 = getCarTransformsAtTime(component.scene.cars, 0);
    const t5 = getCarTransformsAtTime(component.scene.cars, 5);
    expect(t0.length).toBe(10);
    expect(t5.length).toBe(10);
    expect(t5[0]).not.toBe(t0[0]);
  });

  it('should sort forest trees back-to-front by Y coordinate for canopy depth', () => {
    const { trees } = component.scene;
    for (let i = 1; i < trees.length; i++) {
      expect(trees[i].y).toBeGreaterThanOrEqual(trees[i - 1].y);
    }
  });

  it('should be creatable on the server platform (SSR safe)', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ThemeService, useValue: { resolvedTheme: signal<'light' | 'dark'>('light') } },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });

    const ssrComponent = TestBed.runInInjectionContext(() => new NotFoundComponent());
    expect(ssrComponent).toBeTruthy();
  });
});
