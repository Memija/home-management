import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageService } from '../../services/language.service';
import { BenchmarksControlsComponent } from './benchmarks-controls.component';

describe('BenchmarksControlsComponent', () => {
  let fixture: ComponentFixture<BenchmarksControlsComponent>;
  let component: BenchmarksControlsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BenchmarksControlsComponent],
    }).compileComponents();

    await TestBed.inject(LanguageService).ready;
    fixture = TestBed.createComponent(BenchmarksControlsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('householdSizes', [1, 2, 3]);
    fixture.componentRef.setInput('householdSize', 2);
    fixture.componentRef.setInput('householdSizeParams', {
      1: { count: 1 },
      2: { count: 2 },
      3: { count: 3 },
    });
    fixture.componentRef.setInput('isBrowser', true);
    fixture.componentRef.setInput('searchQuery', '');
    fixture.detectChanges();
  });

  it('should highlight active household size button and emit sizeChange when clicked', () => {
    const spy = vi.fn();
    component.sizeChange.subscribe(spy);

    const active = fixture.nativeElement.querySelector('.size-btn.active') as HTMLButtonElement;
    expect(active?.getAttribute('data-size')).toBe('2');

    const size3 = fixture.nativeElement.querySelector(
      '.size-btn[data-size="3"]',
    ) as HTMLButtonElement;
    size3.click();

    expect(spy).toHaveBeenCalledWith(3);
  });

  it('should emit searchChange when typing into the country search input', () => {
    const spy = vi.fn();
    component.searchChange.subscribe(spy);

    const input = fixture.nativeElement.querySelector(
      '#benchmarks-country-search',
    ) as HTMLInputElement;
    input.value = 'poland';
    input.dispatchEvent(new Event('input'));

    expect(spy).toHaveBeenCalledWith('poland');
  });
});
