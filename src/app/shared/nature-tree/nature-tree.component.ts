import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

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

@Component({
  selector: 'app-nature-tree',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nature-tree.component.html',
  styleUrl: './nature-tree.component.scss'
})
export class NatureTreeComponent implements OnInit {
  branches: Branch[] = [];
  snowflakes: Snowflake[] = [];
  raindrops: Raindrop[] = [];
  season: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer';

  // Use a fixed seed so the tree is mostly deterministic and doesn't jitter on reload.
  private seed = 51234;

  constructor(public themeService: ThemeService) { }

  ngOnInit() {
    this.determineSeason();
    // Generate a tree from the center bottom up
    this.resetAndGenerate();
  }

  private determineSeason() {
    const month = new Date().getMonth();
    // Northern Hemisphere Seasons (approximate)
    if (month >= 2 && month <= 4) {
      this.season = 'spring';
    } else if (month >= 5 && month <= 7) {
      this.season = 'summer';
    } else if (month >= 8 && month <= 10) {
      this.season = 'autumn';
    } else {
      this.season = 'winter';
    }
  }

  private resetAndGenerate() {
    this.branches = [];
    this.snowflakes = [];
    this.raindrops = [];
    this.seed = 51234;

    // Generate base trunk
    const START_DEPTH = 6;
    const trunk: Branch = {
      x: 1000,
      y: 1200,
      angle: 0,
      length: 180,
      width: 50,
      depth: START_DEPTH,
      animDelay: '0s',
      animDuration: '8s',
      children: [],
      leaves: [],
      lanterns: [],
      flowers: []
    };

    this.generateBranchChildren(trunk, START_DEPTH);
    this.branches.push(trunk);
    this.generateWeather();
  }

  private generateWeather() {
    if (this.season === 'winter') {
      for (let i = 0; i < 250; i++) {
        this.snowflakes.push({
          x: Math.random() * 3000 - 1000, // Range from -1000 to 2000 to cover 2000px width with wind allowance
          y: Math.random() * 1200 - 1200, // Start above the screen
          size: 1.5 + Math.random() * 3.5,
          animDuration: (8 + Math.random() * 12) + 's',
          animDelay: '-' + (Math.random() * 20) + 's'
        });
      }
    } else if (this.season === 'autumn') {
      for (let i = 0; i < 120; i++) {
        this.raindrops.push({
          x: Math.random() * 3000 - 500, // Starts wider to account for wind
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
      // Add a cluster of leaves at the end of the branches (except in winter)
      if (this.season !== 'winter') {
        const leafCount = this.season === 'autumn' ? 3 : 5; // fewer leaves in autumn
        for (let i = 0; i < leafCount; i++) {
          parent.leaves.push({
            offsetX: this.random() * 50 - 25,
            offsetY: -(parent.length + this.random() * 50 - 25), // Relative to end of branch
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
      if (parent.width < 35) { // don't hang from the thickest branches
        parent.lanterns.push({
          offsetX: 0,
          offsetY: -parent.length, // Hang from end of branch
          length: 40 + this.random() * 60,
          animDelay: '-' + (this.random() * 5).toFixed(2) + 's'
        });
      }
    }

    // Flowers for Spring
    if (this.season === 'spring' && depth < 4 && this.random() > 0.6) {
      const colors = ['#f472b6', '#fbcfe8', '#fff1f2', '#fda4af']; // Pink blossoms
      parent.flowers.push({
        offsetX: this.random() * 30 - 15,
        offsetY: -(parent.length + this.random() * 30 - 15),
        scale: 0.8 + this.random() * 1.2,
        rotation: this.random() * 360,
        color: colors[Math.floor(this.random() * colors.length)],
        animDelay: '-' + (this.random() * 5).toFixed(2) + 's'
      });
    }

    // Add side leaves
    if (depth < 4 && this.season !== 'winter') {
      const leafCount = this.season === 'autumn' ? 1 : 2;
      for (let i = 0; i < leafCount; i++) {
        if (this.random() > 0.4) {
          const t = this.random();
          parent.leaves.push({
            offsetX: this.random() * 40 - 20,
            offsetY: -(parent.length * t), // Along the branch
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

    // Note: New angles are relative to 0 so we just specify the rotation delta from the parent
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
    if (depth === 6) {
      angleDeltas = [-25, 30, -5];
    }

    for (const delta of angleDeltas) {
      const childLength = depth * 32 + this.random() * 45; // Shorter as depth decreases
      const child: Branch = {
        x: 0,
        y: -parent.length, // Children start at the end of the parent branch
        angle: delta, // Relative rotation
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
