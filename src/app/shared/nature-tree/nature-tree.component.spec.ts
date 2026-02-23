import { NatureTreeComponent } from './nature-tree.component';
import { ThemeService } from '../../services/theme.service';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('NatureTreeComponent', () => {
  let component: NatureTreeComponent;

  const mockThemeService = {
    isDarkTheme: signal(false)
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2023, 6, 15)); // Summer time by default

    // Direct instantiation since it's a simple component and avoids templateUrl resolution issues in Vitest
    component = new NatureTreeComponent(mockThemeService as unknown as ThemeService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Season Determination', () => {
    it('should determine spring correctly', () => {
      vi.setSystemTime(new Date(2023, 3, 15)); // April
      component.ngOnInit();
      expect(component.season).toBe('spring');
    });

    it('should determine summer correctly', () => {
      vi.setSystemTime(new Date(2023, 6, 15)); // July
      component.ngOnInit();
      expect(component.season).toBe('summer');
    });

    it('should determine autumn correctly', () => {
      vi.setSystemTime(new Date(2023, 9, 15)); // October
      component.ngOnInit();
      expect(component.season).toBe('autumn');
    });

    it('should determine winter correctly', () => {
      vi.setSystemTime(new Date(2023, 0, 15)); // January
      component.ngOnInit();
      expect(component.season).toBe('winter');
    });
  });

  describe('Weather Generation', () => {
    it('should generate snowflakes in winter', () => {
      vi.setSystemTime(new Date(2023, 0, 15)); // January
      component.ngOnInit();
      expect(component.snowflakes.length).toBeGreaterThan(0);
      expect(component.raindrops.length).toBe(0);
    });

    it('should generate raindrops in autumn', () => {
      vi.setSystemTime(new Date(2023, 9, 15)); // October
      component.ngOnInit();
      expect(component.raindrops.length).toBeGreaterThan(0);
      expect(component.snowflakes.length).toBe(0);
    });

    it('should generate no weather in summer', () => {
      vi.setSystemTime(new Date(2023, 6, 15)); // July
      component.ngOnInit();
      expect(component.snowflakes.length).toBe(0);
      expect(component.raindrops.length).toBe(0);
    });

    it('should generate no weather in spring', () => {
      vi.setSystemTime(new Date(2023, 3, 15)); // April
      component.ngOnInit();
      expect(component.snowflakes.length).toBe(0);
      expect(component.raindrops.length).toBe(0);
    });
  });

  describe('Tree Generation', () => {
    it('should generate branches', () => {
      component.ngOnInit();
      expect(component.branches.length).toBeGreaterThan(0);
      // Main trunk should have children
      expect(component.branches[0].children.length).toBeGreaterThan(0);
    });

    it('should generate flowers only in spring', () => {
      vi.setSystemTime(new Date(2023, 3, 15)); // April
      component.ngOnInit();

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
      vi.setSystemTime(new Date(2023, 0, 15)); // January
      component.ngOnInit();

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
      vi.setSystemTime(new Date(2023, 6, 15)); // July
      component.ngOnInit();

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
