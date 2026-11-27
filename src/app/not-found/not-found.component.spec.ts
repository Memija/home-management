import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, signal } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { Compass, House, LayoutDashboard } from 'lucide-angular';
import { NotFoundComponent } from './not-found.component';
import {
  buildAerialScene,
  computeAerialViewBox,
  DEFAULT_AERIAL_VIEWBOX,
  getCarTransformsAtTime,
} from './not-found-scene.builder';
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
    expect(component.scene.houses).toHaveLength(17);
    expect(component.scene.docks).toHaveLength(6);
    expect(component.scene.bridges).toHaveLength(2);
    expect(component.scene.cars).toHaveLength(10);
    expect(buildAerialScene()).toBe(component.scene);
  });

  it('should advance car transforms along the road waypoints over time', () => {
    const t0 = getCarTransformsAtTime(component.scene.cars, 0);
    const t5 = getCarTransformsAtTime(component.scene.cars, 5);
    expect(t0).toHaveLength(10);
    expect(t5).toHaveLength(10);
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
    expect(ssrComponent.svgViewBox()).toBe(DEFAULT_AERIAL_VIEWBOX);
  });

  it('should compute a wide-framed portrait viewBox on mobile portrait viewports so all 404 lakes remain visible', () => {
    expect(computeAerialViewBox(1920, 1080)).toBe(DEFAULT_AERIAL_VIEWBOX);
    expect(computeAerialViewBox(844, 390)).toBe(DEFAULT_AERIAL_VIEWBOX);
    expect(computeAerialViewBox(0, 0)).toBe(DEFAULT_AERIAL_VIEWBOX);

    const portraitBox = computeAerialViewBox(390, 844);
    const [minX, minY, width, height] = portraitBox.split(' ').map(Number);
    expect(minX).toBe(200);
    expect(width).toBe(1520);
    expect(minX + width).toBe(1720);
    expect(minY).toBeLessThan(0);
    expect(height).toBeGreaterThan(3000);
  });

  it('should update svgViewBox dynamically when window resizes to portrait mobile', () => {
    const origW = window.innerWidth;
    const origH = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 812, configurable: true });

    window.dispatchEvent(new Event('resize'));
    expect(component.svgViewBox()).toBe(computeAerialViewBox(375, 812));

    Object.defineProperty(window, 'innerWidth', { value: origW, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: origH, configurable: true });
    window.dispatchEvent(new Event('resize'));
  });
});
