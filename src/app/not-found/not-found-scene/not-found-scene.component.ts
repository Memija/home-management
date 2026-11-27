import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AerialSceneData, DEFAULT_AERIAL_VIEWBOX } from '../not-found-scene.builder';

@Component({
  selector: 'app-not-found-scene',
  standalone: true,
  templateUrl: './not-found-scene.component.html',
  styleUrl: './not-found-scene.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundSceneComponent {
  readonly scene = input.required<AerialSceneData>();
  readonly carTransforms = input.required<readonly string[]>();
  readonly resolvedTheme = input.required<'light' | 'dark'>();
  readonly viewBox = input<string>(DEFAULT_AERIAL_VIEWBOX);
}
