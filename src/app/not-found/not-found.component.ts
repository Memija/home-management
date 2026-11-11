import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Compass, House, LayoutDashboard } from 'lucide-angular';
import { TranslatePipe } from '../pipes/translate.pipe';
import { ThemeService } from '../services/theme.service';
import { buildAerialScene, getCarTransformsAtTime } from './not-found-scene.builder';

/**
 * Fallback page for unknown URLs featuring a full-viewport realistic aerial SVG
 * landscape of a dense forest, architectural houses, winding highways, two river
 * bridges, driving cars, and a fractal-shoreline lake chain arranged in a `404` shape.
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, TranslatePipe],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {
  private readonly themeService = inject(ThemeService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly resolvedTheme = this.themeService.resolvedTheme;
  readonly scene = buildAerialScene();
  readonly carTransforms = signal<readonly string[]>(getCarTransformsAtTime(this.scene.cars, 0));

  readonly CompassIcon = Compass;
  readonly HomeIcon = House;
  readonly DashboardIcon = LayoutDashboard;

  constructor() {
    if (isPlatformBrowser(this.platformId) && typeof requestAnimationFrame === 'function') {
      let frameId = 0;
      const tick = (nowMs: number): void => {
        this.carTransforms.set(getCarTransformsAtTime(this.scene.cars, nowMs * 0.001));
        frameId = requestAnimationFrame(tick);
      };
      frameId = requestAnimationFrame(tick);
      this.destroyRef.onDestroy(() => cancelAnimationFrame(frameId));
    }
  }
}
