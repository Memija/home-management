import {
  Component,
  inject,
  effect,
  computed,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import { ThemeService } from '../../services/theme.service';
import { SeasonService, Season } from '../../services/season.service';

interface Branch {
  x: number;
  y: number;
  angle: number;
  length: number;
  negLength: number;
  width: number;
  depth: number;
  animDelay: string;
  animDuration: string;
  transform: string;
  counterRotateTransform: string;
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
  transform: string;
  useTransform: string;
  href: string;
}

interface Lantern {
  offsetX: number;
  offsetY: number;
  length: number;
  animDelay: string;
  transform: string;
}

interface Flower {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
  color: string;
  animDelay: string;
  transform: string;
  useTransform: string;
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
  x2: number;
  y2: number;
  height: number;
  animDuration: string;
  animDelay: string;
}

/** Maximum tree depth */
const MAX_DEPTH = 4;
/** Maximum snowflakes — reduced from 250 for performance */
const MAX_SNOWFLAKES = 50;
/** Maximum raindrops — reduced from 120 for performance */
const MAX_RAINDROPS = 30;
/** FPS threshold — below this the tree is disabled */
const MIN_FPS_THRESHOLD = 24;
/** Number of frames to sample for performance detection */
const FPS_SAMPLE_FRAMES = 30;

interface SeasonTreeData {
  readonly branches: Branch[];
  readonly snowflakes: Snowflake[];
  readonly raindrops: Raindrop[];
}

const seasonTreeCache = new Map<Season, SeasonTreeData>();

@Component({
  selector: 'app-nature-tree',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './nature-tree.component.html',
  styleUrl: './nature-tree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NatureTreeComponent {
  branches: Branch[] = [];
  snowflakes: Snowflake[] = [];
  raindrops: Raindrop[] = [];
  season: Season = 'summer';

  // Use a fixed seed so the tree is mostly deterministic and doesn't jitter on reload.
  private seed = 51234;
  private performanceChecked = false;
  private readonly platformId = inject(PLATFORM_ID);

  public readonly themeService = inject(ThemeService);
  protected readonly seasonService = inject(SeasonService);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly isDarkMode = computed(() => this.themeService.resolvedTheme() === 'dark');

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
          console.warn(
            `[NatureTree] Low FPS detected (${fps.toFixed(1)}fps). Disabling tree for better performance.`,
          );
          if (typeof this.seasonService.disableForPerformance === 'function') {
            this.seasonService.disableForPerformance();
          } else {
            this.seasonService.disabled.set(true);
          }
          this.branches = [];
          this.snowflakes = [];
          this.raindrops = [];
          this.cdr.markForCheck();
        }
        return;
      }
      requestAnimationFrame(measureFrame);
    };

    // Delay start until initial hydration and page settle
    setTimeout(() => requestAnimationFrame(measureFrame), 1500);
  }

  private resetAndGenerate() {
    const cached = seasonTreeCache.get(this.season);
    if (cached) {
      this.branches = cached.branches;
      this.snowflakes = cached.snowflakes;
      this.raindrops = cached.raindrops;
      return;
    }

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
      negLength: -240,
      width: 50,
      depth: MAX_DEPTH,
      animDelay: '0s',
      animDuration: '8s',
      transform: 'translate(1000px, 1200px) rotate(0deg)',
      counterRotateTransform: 'rotate(0deg)',
      children: [],
      leaves: [],
      lanterns: [],
      flowers: [],
    };

    this.generateBranchChildren(trunk, MAX_DEPTH);
    this.branches.push(trunk);
    this.generateWeather();

    seasonTreeCache.set(this.season, {
      branches: this.branches,
      snowflakes: this.snowflakes,
      raindrops: this.raindrops,
    });
  }

  private generateWeather() {
    if (this.season === 'winter') {
      for (let i = 0; i < MAX_SNOWFLAKES; i++) {
        this.snowflakes.push({
          x: this.random() * 3000 - 1000,
          y: this.random() * 1200 - 1200,
          size: 1.5 + this.random() * 3.5,
          animDuration: 8 + this.random() * 12 + 's',
          animDelay: '-' + this.random() * 20 + 's',
        });
      }
    } else if (this.season === 'autumn') {
      for (let i = 0; i < MAX_RAINDROPS; i++) {
        const x = this.random() * 3000 - 500;
        const y = this.random() * 1200 - 1200;
        const height = 15 + this.random() * 25;
        this.raindrops.push({
          x,
          y,
          x2: x - height * 0.2,
          y2: y + height,
          height,
          animDuration: 0.4 + this.random() * 0.6 + 's',
          animDelay: '-' + this.random() * 2 + 's',
        });
      }
    }
  }

  // Simple pseudo-random number generator
  private random() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  private addTerminalLeaves(parent: Branch): void {
    if (this.season === 'winter') {
      return;
    }
    const leafCount = this.season === 'autumn' ? 3 : 4;
    for (let i = 0; i < leafCount; i++) {
      const offsetX = this.random() * 50 - 25;
      const offsetY = -(parent.length + this.random() * 50 - 25);
      const rotation = this.random() * 360;
      const scale = 1.2 + this.random() * 2.0;
      const type = Math.floor(this.random() * 3);
      parent.leaves.push({
        offsetX,
        offsetY,
        rotation,
        scale,
        type,
        animDelay: '-' + (this.random() * 5).toFixed(2) + 's',
        transform: `translate(${offsetX}px, ${offsetY}px)`,
        useTransform: `rotate(${rotation}) scale(${scale})`,
        href: `#leaf-${type}`,
      });
    }
  }

  private addLanterns(parent: Branch, depth: number): void {
    if (depth <= 5 && depth >= 2 && this.random() > 0.4 && parent.width < 35) {
      const offsetY = -parent.length;
      parent.lanterns.push({
        offsetX: 0,
        offsetY,
        length: 40 + this.random() * 60,
        animDelay: '-' + (this.random() * 5).toFixed(2) + 's',
        transform: `translate(0px, ${offsetY}px)`,
      });
    }
  }

  private addFlowers(parent: Branch, depth: number): void {
    if (this.season === 'spring' && depth < 4 && this.random() > 0.6) {
      const colors = ['#f472b6', '#fbcfe8', '#fff1f2', '#fda4af'];
      const offsetX = this.random() * 30 - 15;
      const offsetY = -(parent.length + this.random() * 30 - 15);
      const scale = 0.8 + this.random() * 1.2;
      const rotation = this.random() * 360;
      parent.flowers.push({
        offsetX,
        offsetY,
        scale,
        rotation,
        color: colors[Math.floor(this.random() * colors.length)],
        animDelay: '-' + (this.random() * 5).toFixed(2) + 's',
        transform: `translate(${offsetX}px, ${offsetY}px)`,
        useTransform: `rotate(${rotation}) scale(${scale})`,
      });
    }
  }

  private addSideLeaves(parent: Branch, depth: number): void {
    if (depth >= 4 || this.season === 'winter') {
      return;
    }
    const leafCount = this.season === 'autumn' ? 1 : 2;
    for (let i = 0; i < leafCount; i++) {
      if (this.random() > 0.4) {
        const t = this.random();
        const offsetX = this.random() * 40 - 20;
        const offsetY = -(parent.length * t);
        const rotation = this.random() * 360;
        const scale = 1.0 + this.random() * 1.5;
        const type = Math.floor(this.random() * 3);
        parent.leaves.push({
          offsetX,
          offsetY,
          rotation,
          scale,
          type,
          animDelay: '-' + (this.random() * 5).toFixed(2) + 's',
          transform: `translate(${offsetX}px, ${offsetY}px)`,
          useTransform: `rotate(${rotation}) scale(${scale})`,
          href: `#leaf-${type}`,
        });
      }
    }
  }

  private calculateAngleDeltas(depth: number): number[] {
    const maxBranches = depth > 4 ? 2 : 3;
    const numBranches = Math.floor(this.random() * (maxBranches - 1)) + 2;
    const angleSpread = 40 + this.random() * 50;

    let angleDeltas: number[];
    if (numBranches === 2) {
      angleDeltas = [
        -angleSpread / 2 + (this.random() * 15 - 7.5),
        angleSpread / 2 + (this.random() * 15 - 7.5),
      ];
    } else {
      angleDeltas = [
        -angleSpread + this.random() * 10,
        this.random() * 10 - 5,
        angleSpread - this.random() * 10,
      ];
    }

    if (depth === MAX_DEPTH) {
      angleDeltas = [-25, 30, -5];
    }

    return angleDeltas;
  }

  private generateBranchChildren(parent: Branch, depth: number) {
    if (depth === 0) {
      this.addTerminalLeaves(parent);
      return;
    }

    this.addLanterns(parent, depth);
    this.addFlowers(parent, depth);
    this.addSideLeaves(parent, depth);

    const angleDeltas = this.calculateAngleDeltas(depth);
    for (const delta of angleDeltas) {
      const childLength = depth * 40 + this.random() * 45;
      const y = -parent.length;
      const child: Branch = {
        x: 0,
        y,
        angle: delta,
        length: childLength,
        negLength: -childLength,
        width: parent.width * 0.7,
        depth: depth - 1,
        animDelay: '-' + (this.random() * 5).toFixed(2) + 's',
        animDuration: 4 + this.random() * 4 + depth * 0.5 + 's',
        transform: `translate(0px, ${y}px) rotate(${delta}deg)`,
        counterRotateTransform: `rotate(${-delta}deg)`,
        children: [],
        leaves: [],
        lanterns: [],
        flowers: [],
      };
      this.generateBranchChildren(child, depth - 1);
      parent.children.push(child);
    }
  }
}
