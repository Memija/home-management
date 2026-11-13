import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ArrowDown, ArrowUp, ArrowUpDown, Flame } from 'lucide-angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BenchmarksSortHeaderComponent } from './benchmarks-sort-header.component';

describe('BenchmarksSortHeaderComponent', () => {
  let fixture: ComponentFixture<BenchmarksSortHeaderComponent>;
  let component: BenchmarksSortHeaderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BenchmarksSortHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BenchmarksSortHeaderComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('column', 'heating');
    fixture.componentRef.setInput('label', 'Space Heating');
    fixture.componentRef.setInput('icon', Flame);
    fixture.componentRef.setInput('activeColumn', 'country');
    fixture.componentRef.setInput('direction', 'asc');
    fixture.detectChanges();
  });

  it('should display inactive sort icon when another column is active and emit column on click', () => {
    expect(component.isActive()).toBe(false);
    expect(component.sortIcon()).toBe(ArrowUpDown);

    const spy = vi.fn();
    component.sortSelected.subscribe(spy);

    const button = fixture.nativeElement.querySelector('button.sort-btn') as HTMLButtonElement;
    button.click();

    expect(spy).toHaveBeenCalledWith('heating');
  });

  it('should switch sort icon between ascending and descending when active', () => {
    fixture.componentRef.setInput('activeColumn', 'heating');
    fixture.componentRef.setInput('direction', 'asc');
    fixture.detectChanges();

    expect(component.isActive()).toBe(true);
    expect(component.sortIcon()).toBe(ArrowUp);

    fixture.componentRef.setInput('direction', 'desc');
    fixture.detectChanges();

    expect(component.sortIcon()).toBe(ArrowDown);
  });

  it('should render optional info tooltip only when tooltip text is provided', () => {
    expect(fixture.nativeElement.querySelector('.header-info-tooltip')).toBeNull();

    fixture.componentRef.setInput('tooltip', 'Fixed 100 m² reference dwelling');
    fixture.detectChanges();

    const tooltipEl = fixture.nativeElement.querySelector('.header-info-tooltip');
    expect(tooltipEl).toBeTruthy();
    expect(tooltipEl.getAttribute('aria-label')).toBe('Fixed 100 m² reference dwelling');
  });
});
