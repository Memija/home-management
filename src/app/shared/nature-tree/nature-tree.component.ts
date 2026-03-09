import { Component, inject, effect, ChangeDetectionStrategy, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';
import { SeasonService, Season } from '../../services/season.service';

interface Branch {
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
  depth: number;
  animDelay: string;
  animDuration: string;
  children: Branch[];
  leaves: Leaf[];
  lanterns: Lantern[];
  flowers: Flower[];
}

interface Leaf {
  offsetX: number;
  offsetY: number;
  rotation: number;
  scale: number;
  type: number;
  animDelay: string;
}

interface Lantern {
  offsetX: number;
  offsetY: number;
  length: number;
  animDelay: string;
}

interface Flower {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
  color: string;
  animDelay: string;
}

interface Snowflake {
  x: number;
  y: number;
  size: number;
  animDuration: string;
  animDelay: string;
}

interface Raindrop {
  x: number;
  y: number;
  height: number;
  animDuration: string;
  animDelay: string;
}

/** Maximum tree depth */
const MAX_DEPTH = 5;
/** Maximum snowflakes — reduced from 250 for performance */
const MAX_SNOWFLAKES = 50;
/** Maximum raindrops — reduced from 120 for performance */
const MAX_RAINDROPS = 30;
/** FPS threshold — below this the tree is disabled */
const MIN_FPS_THRESHOLD = 24;
/** Number of frames to sample for performance detection */
const FPS_SAMPLE_FRAMES = 30;

@Component({
  selector: 'app-nature-tree',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nature-tree.component.html',
  styleUrl: './nature-tree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NatureTreeComponent {
  branches: Branch[] = [];
  snowflakes: Snowflake[] = [];
  raindrops: Raindrop[] = [];
  season: Season = 'summer';

  // Use a fixed seed so the tree is mostly deterministic and doesn't jitter on reload.
  private seed = 51234;
  private performanceChecked = false;
  private platformId = inject(PLATFORM_ID);

  public themeService = inject(ThemeService);
  protected seasonService = inject(SeasonService);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    // Reactively regenerate the tree whenever the season changes
    effect(() => {
      this.season = this.seasonService.currentSeason();

      // If already disabled due to poor performance, don't regenerate
      if (this.seasonService.disabled()) return;

      this.resetAndGenerate();
      this.cdr.markForCheck();

      // Run performance check only once (on first render)
      if (!this.performanceChecked && isPlatformBrowser(this.platformId)) {
        this.performanceChecked = true;
        this.checkPerformance();
      }
    });
  }

  /**
   * Measures FPS over a short sampling period.
   * If FPS is below the threshold, disables the tree entirely.
   */
  private checkPerformance(): void {
    let frameCount = 0;
    let startTime = 0;

    const measureFrame = (timestamp: number) => {
      if (frameCount === 0) {
        startTime = timestamp;
      }
      frameCount++;

      if (frameCount >= FPS_SAMPLE_FRAMES) {
        const elapsed = timestamp - startTime;
        const fps = (FPS_SAMPLE_FRAMES / elapsed) * 1000;

        if (fps < MIN_FPS_THRESHOLD) {
          console.warn(`[NatureTree] Low FPS detected (${fps.toFixed(1)}fps). Disabling tree for better performance.`);
          this.seasonService.disabled.set(true);
          this.branches = [];
          this.snowflakes = [];
          this.raindrops = [];
          this.cdr.markForCheck();
        }
        return;
      }
      requestAnimationFrame(measureFrame);
    };

    // Delay start slightly to let the tree render first
    setTimeout(() => requestAnimationFrame(measureFrame), 200);
  }

  private resetAndGenerate() {
    this.branches = [];
    this.snowflakes = [];
    this.raindrops = [];
    this.seed = 51234;

    // Generate base trunk
    const trunk: Branch = {
      x: 1000,
      y: 1200,
      angle: 0,
      length: 240,
      width: 50,
      depth: MAX_DEPTH,
      animDelay: '0s',
      animDuration: '8s',
      children: [],
      leaves: [],
      lanterns: [],
      flowers: []
    };

    this.generateBranchChildren(trunk, MAX_DEPTH);
    this.branches.push(trunk);
    this.generateWeather();
  }

  private generateWeather() {
    if (this.season === 'winter') {
      for (let i = 0; i < MAX_SNOWFLAKES; i++) {
        this.snowflakes.push({
          x: Math.random() * 3000 - 1000,
          y: Math.random() * 1200 - 1200,
          size: 1.5 + Math.random() * 3.5,
          animDuration: (8 + Math.random() * 12) + 's',
          animDelay: '-' + (Math.random() * 20) + 's'
        });
      }
    } else if (this.season === 'autumn') {
      for (let i = 0; i < MAX_RAINDROPS; i++) {
        this.raindrops.push({
          x: Math.random() * 3000 - 500,
          y: Math.random() * 1200 - 1200,
          height: 15 + Math.random() * 25,
          animDuration: (0.4 + Math.random() * 0.6) + 's',
          animDelay: '-' + (Math.random() * 2) + 's'
        });
      }
    }
  }

  // Simple pseudo-random number generator
  private random() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  private generateBranchChildren(parent: Branch, depth: number) {
    if (depth === 0) {
      // Add a cluster of leaves at the end of branches (except in winter)
      if (this.season !== 'winter') {
        const leafCount = this.season === 'autumn' ? 3 : 4;
        for (let i = 0; i < leafCount; i++) {
          parent.leaves.push({
            offsetX: this.random() * 50 - 25,
            offsetY: -(parent.length + this.random() * 50 - 25),
            rotation: this.random() * 360,
            scale: 1.2 + this.random() * 2.0,
            type: Math.floor(this.random() * 3),
            animDelay: '-' + (this.random() * 5).toFixed(2) + 's'
          });
        }
      }
      return;
    }

    // Lanterns on medium depth branches
    if (depth <= 5 && depth >= 2 && this.random() > 0.4) {
      if (parent.width < 35) {
        parent.lanterns.push({
          offsetX: 0,
          offsetY: -parent.length,
          length: 40 + this.random() * 60,
          animDelay: '-' + (this.random() * 5).toFixed(2) + 's'
        });
      }
    }

    // Flowers for Spring
    if (this.season === 'spring' && depth < 4 && this.random() > 0.6) {
      const colors = ['#f472b6', '#fbcfe8', '#fff1f2', '#fda4af'];
      parent.flowers.push({
        offsetX: this.random() * 30 - 15,
        offsetY: -(parent.length + this.random() * 30 - 15),
        scale: 0.8 + this.random() * 1.2,
        rotation: this.random() * 360,
        color: colors[Math.floor(this.random() * colors.length)],
        animDelay: '-' + (this.random() * 5).toFixed(2) + 's'
      });
    }

    // Add side leaves along branches
    if (depth < 4 && this.season !== 'winter') {
      const leafCount = this.season === 'autumn' ? 1 : 2;
      for (let i = 0; i < leafCount; i++) {
        if (this.random() > 0.4) {
          const t = this.random();
          parent.leaves.push({
            offsetX: this.random() * 40 - 20,
            offsetY: -(parent.length * t),
            rotation: this.random() * 360,
            scale: 1.0 + this.random() * 1.5,
            type: Math.floor(this.random() * 3),
            animDelay: '-' + (this.random() * 5).toFixed(2) + 's'
          });
        }
      }
    }

    const maxBranches = depth > 4 ? 2 : 3;
    const numBranches = Math.floor(this.random() * (maxBranches - 1)) + 2;

    // Spread angle becomes wider as depth decrements
    const angleSpread = 40 + this.random() * 50;

    let angleDeltas: number[] = [];
    if (numBranches === 2) {
      angleDeltas = [
        -angleSpread / 2 + (this.random() * 15 - 7.5),
        angleSpread / 2 + (this.random() * 15 - 7.5)
      ];
    } else {
      angleDeltas = [
        -angleSpread + (this.random() * 10),
        (this.random() * 10 - 5),
        angleSpread - (this.random() * 10)
      ];
    }

    // Ensure root splits look nice
    if (depth === MAX_DEPTH) {
      angleDeltas = [-25, 30, -5];
    }

    for (const delta of angleDeltas) {
      const childLength = depth * 40 + this.random() * 45;
      const child: Branch = {
        x: 0,
        y: -parent.length,
        angle: delta,
        length: childLength,
        width: parent.width * 0.7,
        depth: depth - 1,
        animDelay: '-' + (this.random() * 5).toFixed(2) + 's',
        animDuration: (4 + (this.random() * 4) + (depth * 0.5)) + 's',
        children: [],
        leaves: [],
        lanterns: [],
        flowers: []
      };
      this.generateBranchChildren(child, depth - 1);
      parent.children.push(child);
    }
  }
}
