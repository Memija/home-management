import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageService } from '../../../services/language.service';
import { ChartControlsComponent } from './chart-controls.component';

describe('ChartControlsComponent', () => {
  let fixture: ComponentFixture<ChartControlsComponent>;
  let component: ChartControlsComponent;

  beforeEach(async () => {
    const languageServiceMock = {
      currentLang: signal('en'),
      translationVersion: signal(0),
      translate: vi.fn((key: string) => key),
    };

    await TestBed.configureTestingModule({
      imports: [ChartControlsComponent],
      providers: [{ provide: LanguageService, useValue: languageServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(ChartControlsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('chartType', 'water');
    fixture.componentRef.setInput('displayMode', 'incremental');
    fixture.componentRef.setInput('currentView', 'total');
    fixture.componentRef.setInput('timeRange', 'all');
    fixture.componentRef.setInput('granularity', 'raw');
    fixture.componentRef.setInput('showGranularityToggle', true);
    fixture.detectChanges();
  });

  it('should render view filters for water and omit them for electricity', () => {
    expect(fixture.nativeElement.querySelectorAll('.chart-filters button')).toHaveLength(4);

    fixture.componentRef.setInput('chartType', 'electricity');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.chart-filters')).toBeNull();
  });

  it('should emit timeRangeChange and granularityChange when pills are clicked', () => {
    const rangeSpy = vi.fn();
    const granSpy = vi.fn();
    component.timeRangeChange.subscribe(rangeSpy);
    component.granularityChange.subscribe(granSpy);

    const rangeButtons = fixture.nativeElement.querySelectorAll('.chart-range-pills button');
    rangeButtons[0].click();
    expect(rangeSpy).toHaveBeenCalledWith('3m');

    const granButtons = fixture.nativeElement.querySelectorAll('.chart-granularity-pills button');
    granButtons[1].click();
    expect(granSpy).toHaveBeenCalledWith('monthly');
  });
});
