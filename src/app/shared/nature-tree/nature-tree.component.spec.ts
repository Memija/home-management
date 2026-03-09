import { NatureTreeComponent } from './nature-tree.component';
import { ThemeService } from '../../services/theme.service';
import { SeasonService, Season } from '../../services/season.service';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('NatureTreeComponent', () => {
  let component: NatureTreeComponent;
  let mockSeasonService: { currentSeason: ReturnType<typeof signal<Season>>; setSeason: (s: Season) => void };

  const mockThemeService = {
    isDarkTheme: signal(false),
    resolvedTheme: signal('light' as const)
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2023, 6, 15)); // Summer time by default

    mockSeasonService = {
      currentSeason: signal<Season>('summer'),
      setSeason: (s: Season) => mockSeasonService.currentSeason.set(s)
    };

    // Direct instantiation with manual season/tree setup since effect() requires Angular runtime
    component = Object.create(NatureTreeComponent.prototype);
    component.branches = [];
    component.snowflakes = [];
    component.raindrops = [];
    component.season = 'summer';
    component.themeService = mockThemeService as unknown as ThemeService;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Weather Generation', () => {
    it('should generate snowflakes in winter', () => {
      component.season = 'winter';
      // Access private method via bracket notation for testing
      (component as any).resetAndGenerate();
      expect(component.snowflakes.length).toBeGreaterThan(0);
      expect(component.raindrops.length).toBe(0);
    });

    it('should generate raindrops in autumn', () => {
      component.season = 'autumn';
      (component as any).resetAndGenerate();
      expect(component.raindrops.length).toBeGreaterThan(0);
      expect(component.snowflakes.length).toBe(0);
    });

    it('should generate no weather in summer', () => {
      component.season = 'summer';
      (component as any).resetAndGenerate();
      expect(component.snowflakes.length).toBe(0);
      expect(component.raindrops.length).toBe(0);
    });

    it('should generate no weather in spring', () => {
      component.season = 'spring';
      (component as any).resetAndGenerate();
      expect(component.snowflakes.length).toBe(0);
      expect(component.raindrops.length).toBe(0);
    });
  });

  describe('Tree Generation', () => {
    it('should generate branches', () => {
      component.season = 'summer';
      (component as any).resetAndGenerate();
      expect(component.branches.length).toBeGreaterThan(0);
      // Main trunk should have children
      expect(component.branches[0].children.length).toBeGreaterThan(0);
    });

    it('should generate flowers only in spring', () => {
      component.season = 'spring';
      (component as any).resetAndGenerate();

      let hasFlowers = false;
      const scanFlowers = (branches: any[]) => {
        for (const branch of branches) {
          if (branch.flowers && branch.flowers.length > 0) hasFlowers = true;
          scanFlowers(branch.children);
        }
      };
      scanFlowers(component.branches);

      expect(hasFlowers).toBe(true);
    });

    it('should not generate leaves in winter', () => {
      component.season = 'winter';
      (component as any).resetAndGenerate();

      let hasLeaves = false;
      const scanLeaves = (branches: any[]) => {
        for (const branch of branches) {
          if (branch.leaves && branch.leaves.length > 0) hasLeaves = true;
          scanLeaves(branch.children);
        }
      };
      scanLeaves(component.branches);

      // Winter should not have leaves
      expect(hasLeaves).toBe(false);
    });

    it('should generate leaves in summer', () => {
      component.season = 'summer';
      (component as any).resetAndGenerate();

      let hasLeaves = false;
      const scanLeaves = (branches: any[]) => {
        for (const branch of branches) {
          if (branch.leaves && branch.leaves.length > 0) hasLeaves = true;
          scanLeaves(branch.children);
        }
      };
      scanLeaves(component.branches);

      expect(hasLeaves).toBe(true);
    });
  });
});
