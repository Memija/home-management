import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildAerialScene, getCarTransformsAtTime } from '../not-found-scene.builder';
import { NotFoundSceneComponent } from './not-found-scene.component';

describe('NotFoundSceneComponent', () => {
  let fixture: ComponentFixture<NotFoundSceneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundSceneComponent],
    }).compileComponents();

    const scene = buildAerialScene();
    fixture = TestBed.createComponent(NotFoundSceneComponent);
    fixture.componentRef.setInput('scene', scene);
    fixture.componentRef.setInput('carTransforms', getCarTransformsAtTime(scene.cars, 0));
    fixture.componentRef.setInput('resolvedTheme', 'dark');
    fixture.detectChanges();
  });

  it('should render the aerial SVG stage with dark theme class and night lamp glows', () => {
    const stage = fixture.nativeElement.querySelector('.aerial-stage');
    expect(stage?.classList.contains('theme-dark')).toBe(true);
    expect(stage?.querySelectorAll('.night-only').length).toBeGreaterThan(0);
  });

  it('should omit night-only glows when resolvedTheme is light', () => {
    fixture.componentRef.setInput('resolvedTheme', 'light');
    fixture.detectChanges();

    const stage = fixture.nativeElement.querySelector('.aerial-stage');
    expect(stage?.classList.contains('theme-dark')).toBe(false);
    expect(stage?.querySelectorAll('.night-only').length).toBe(0);
  });

  it('should bind custom portrait viewBox to the aerial SVG element', () => {
    fixture.componentRef.setInput('viewBox', '200 -753 1520 3289');
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('svg.aerial-svg');
    expect(svg?.getAttribute('viewBox')).toBe('200 -753 1520 3289');
  });
});
