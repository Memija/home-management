import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PredictionsPanelComponent } from './predictions-panel.component';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Pipe, PipeTransform, signal } from '@angular/core';
import { vi, afterEach } from 'vitest';
import { By } from '@angular/platform-browser';
import { MultiPredictionResult, PredictionResult } from '../../services/prediction.service';

// Helper to update signal inputs without relying on Angular metadata
function setComponentInput(component: any, prop: string, value: any) {
  if (!component[`${prop}_mock`]) {
    component[`${prop}_mock`] = signal(value);
    Object.defineProperty(component, prop, { get: () => component[`${prop}_mock`] });
  } else {
    component[`${prop}_mock`].set(value);
  }
}

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

@Pipe({ name: 'translate', standalone: true })
class MockTranslatePipe implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a minimal PredictionResult suitable for most tests. */
function buildPrediction(overrides: Partial<PredictionResult> = {}): PredictionResult {
  return {
    daily30: 10,
    daily30Min: 8,
    daily30Max: 12,
    daily90: 11,
    daily90Min: 9,
    daily90Max: 13,
    dailyHalfYear: 12,
    dailyHalfYearMin: 10,
    dailyHalfYearMax: 14,
    dailyYear: 13,
    dailyYearMin: 11,
    dailyYearMax: 15,
    dailyDecade: 14,
    dailyDecadeMin: 12,
    dailyDecadeMax: 16,
    monthlyRates: [],
    trend: 'stable',
    trendPercentage: 0,
    confidence: 'medium',
    averageDaily: 10.5,
    unit: 'L',
    ...overrides,
  };
}

/** Builds a MultiPredictionResult with an optional categories map. */
function buildMultiPrediction(
  totalOverrides: Partial<PredictionResult> = {},
  categories?: Record<string, PredictionResult>,
): MultiPredictionResult {
  return {
    total: buildPrediction(totalOverrides),
    ...(categories ? { categories } : {}),
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('PredictionsPanelComponent', () => {
  let component: PredictionsPanelComponent;
  let fixture: ComponentFixture<PredictionsPanelComponent>;
  let languageServiceMock: any;

  beforeEach(async () => {
    languageServiceMock = {
      currentLang: signal('en'),
      translate: vi.fn().mockImplementation((key: string) => key),
    };

    await TestBed.configureTestingModule({
      imports: [PredictionsPanelComponent],
    })
      .overrideComponent(PredictionsPanelComponent, {
        remove: { imports: [TranslatePipe] },
        add: { imports: [MockTranslatePipe] },
      })
      .overrideProvider(LanguageService, { useValue: languageServiceMock })
      .compileComponents();

    fixture = TestBed.createComponent(PredictionsPanelComponent);
    component = fixture.componentInstance;

    // Initialize default inputs
    setComponentInput(component, 'prediction', null);
    setComponentInput(component, 'selectedPeriod', 30);
    setComponentInput(component, 'type', 'water');
    setComponentInput(component, 'minRecords', 4);
    setComponentInput(component, 'categoryNames', {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Creation & defaults
  // -------------------------------------------------------------------------

  describe('Creation and Defaults', () => {
    it('should create', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should default prediction to null', () => {
      expect(component.prediction()).toBeNull();
    });

    it('should default selectedPeriod to 30', () => {
      expect(component.selectedPeriod()).toBe(30);
    });

    it('should default type to "water"', () => {
      expect(component.type()).toBe('water');
    });

    it('should default minRecords to 4', () => {
      expect(component.minRecords()).toBe(4);
    });

    it('should default categoryNames to empty object', () => {
      expect(component.categoryNames()).toEqual({});
    });
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  describe('Empty State (null prediction)', () => {
    beforeEach(() => {
      setComponentInput(component, 'prediction', null);
      fixture.detectChanges();
    });

    it('should render the empty-state element', () => {
      const emptyState = fixture.debugElement.query(By.css('.empty-state'));
      expect(emptyState).toBeTruthy();
    });

    it('should NOT render the predictions-header', () => {
      const header = fixture.debugElement.query(By.css('.predictions-header'));
      expect(header).toBeNull();
    });

    it('should NOT render prediction cards', () => {
      const cards = fixture.debugElement.queryAll(By.css('.prediction-card'));
      expect(cards.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Loaded state
  // -------------------------------------------------------------------------

  describe('Loaded State (prediction provided)', () => {
    beforeEach(() => {
      setComponentInput(component, 'prediction', buildMultiPrediction());
      fixture.detectChanges();
    });

    it('should NOT render the empty-state element', () => {
      const emptyState = fixture.debugElement.query(By.css('.empty-state'));
      expect(emptyState).toBeNull();
    });

    it('should render the predictions-header', () => {
      const header = fixture.debugElement.query(By.css('.predictions-header'));
      expect(header).toBeTruthy();
    });

    it('should render exactly 5 prediction cards (30, 90, 180, 365, 3650)', () => {
      const cards = fixture.debugElement.queryAll(By.css('.prediction-card'));
      expect(cards.length).toBe(5);
    });

    it('should mark the 30-day card as active by default', () => {
      const cards = fixture.debugElement.queryAll(By.css('.prediction-card'));
      expect(cards[0].nativeElement.classList.contains('active')).toBe(true);
    });

    it('should NOT mark other period cards as active by default', () => {
      const cards = fixture.debugElement.queryAll(By.css('.prediction-card'));
      for (let i = 1; i < cards.length; i++) {
        expect(cards[i].nativeElement.classList.contains('active')).toBe(false);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Computed: trendIcon
  // -------------------------------------------------------------------------

  describe('trendIcon computed', () => {
    it('should return TrendingUp icon when trend is "rising"', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ trend: 'rising' }));
      fixture.detectChanges();
      const icon = (component as any).trendIcon();
      expect(icon).toBe((component as any).TrendingUpIcon);
    });

    it('should return TrendingDown icon when trend is "falling"', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ trend: 'falling' }));
      fixture.detectChanges();
      const icon = (component as any).trendIcon();
      expect(icon).toBe((component as any).TrendingDownIcon);
    });

    it('should return Minus icon when trend is "stable"', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ trend: 'stable' }));
      fixture.detectChanges();
      const icon = (component as any).trendIcon();
      expect(icon).toBe((component as any).MinusIcon);
    });

    it('should return Minus icon when prediction is null', () => {
      setComponentInput(component, 'prediction', null);
      fixture.detectChanges();
      const icon = (component as any).trendIcon();
      expect(icon).toBe((component as any).MinusIcon);
    });
  });

  // -------------------------------------------------------------------------
  // Computed: trendClass
  // -------------------------------------------------------------------------

  describe('trendClass computed', () => {
    it('should return "rising" when trend is rising', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ trend: 'rising' }));
      fixture.detectChanges();
      expect((component as any).trendClass()).toBe('rising');
    });

    it('should return "falling" when trend is falling', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ trend: 'falling' }));
      fixture.detectChanges();
      expect((component as any).trendClass()).toBe('falling');
    });

    it('should return "stable" when trend is stable', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ trend: 'stable' }));
      fixture.detectChanges();
      expect((component as any).trendClass()).toBe('stable');
    });

    it('should return "stable" when prediction is null', () => {
      setComponentInput(component, 'prediction', null);
      fixture.detectChanges();
      expect((component as any).trendClass()).toBe('stable');
    });
  });

  // -------------------------------------------------------------------------
  // Computed: confidenceClass
  // -------------------------------------------------------------------------

  describe('confidenceClass computed', () => {
    it('should return "high" when confidence is high', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ confidence: 'high' }));
      fixture.detectChanges();
      expect((component as any).confidenceClass()).toBe('high');
    });

    it('should return "medium" when confidence is medium', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ confidence: 'medium' }));
      fixture.detectChanges();
      expect((component as any).confidenceClass()).toBe('medium');
    });

    it('should return "low" when confidence is low', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ confidence: 'low' }));
      fixture.detectChanges();
      expect((component as any).confidenceClass()).toBe('low');
    });

    it('should return "low" when prediction is null', () => {
      setComponentInput(component, 'prediction', null);
      fixture.detectChanges();
      expect((component as any).confidenceClass()).toBe('low');
    });
  });

  // -------------------------------------------------------------------------
  // Computed: accuracyClass
  // -------------------------------------------------------------------------

  describe('accuracyClass computed', () => {
    it('should return "accuracy-high" when accuracyPercentage >= 85', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ accuracyPercentage: 90 }));
      fixture.detectChanges();
      expect((component as any).accuracyClass()).toBe('accuracy-high');
    });

    it('should return "accuracy-high" when accuracyPercentage is exactly 85', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ accuracyPercentage: 85 }));
      fixture.detectChanges();
      expect((component as any).accuracyClass()).toBe('accuracy-high');
    });

    it('should return "accuracy-medium" when accuracyPercentage is >= 70 and < 85', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ accuracyPercentage: 75 }));
      fixture.detectChanges();
      expect((component as any).accuracyClass()).toBe('accuracy-medium');
    });

    it('should return "accuracy-medium" when accuracyPercentage is exactly 70', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ accuracyPercentage: 70 }));
      fixture.detectChanges();
      expect((component as any).accuracyClass()).toBe('accuracy-medium');
    });

    it('should return "accuracy-low" when accuracyPercentage < 70', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ accuracyPercentage: 55 }));
      fixture.detectChanges();
      expect((component as any).accuracyClass()).toBe('accuracy-low');
    });

    it('should return empty string when accuracyPercentage is undefined', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ accuracyPercentage: undefined }));
      fixture.detectChanges();
      expect((component as any).accuracyClass()).toBe('');
    });

    it('should return empty string when prediction is null', () => {
      setComponentInput(component, 'prediction', null);
      fixture.detectChanges();
      expect((component as any).accuracyClass()).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // Computed: typeClass
  // -------------------------------------------------------------------------

  describe('typeClass computed', () => {
    it('should return "water" when type is water', () => {
      setComponentInput(component, 'type', 'water');
      fixture.detectChanges();
      expect((component as any).typeClass()).toBe('water');
    });

    it('should return "electricity" when type is electricity', () => {
      setComponentInput(component, 'type', 'electricity');
      fixture.detectChanges();
      expect((component as any).typeClass()).toBe('electricity');
    });

    it('should return "heating" when type is heating', () => {
      setComponentInput(component, 'type', 'heating');
      fixture.detectChanges();
      expect((component as any).typeClass()).toBe('heating');
    });

    it('should apply the typeClass to the section element', () => {
      setComponentInput(component, 'type', 'electricity');
      fixture.detectChanges();
      const section = fixture.debugElement.query(By.css('section.predictions-section'));
      expect(section.nativeElement.classList.contains('electricity')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Computed: categoryPredictions
  // -------------------------------------------------------------------------

  describe('categoryPredictions computed', () => {
    it('should return empty array when prediction is null', () => {
      setComponentInput(component, 'prediction', null);
      fixture.detectChanges();
      expect((component as any).categoryPredictions()).toEqual([]);
    });

    it('should return empty array when categories is undefined', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction());
      fixture.detectChanges();
      expect((component as any).categoryPredictions()).toEqual([]);
    });

    it('should map category keys to their PredictionResult values', () => {
      const catPred = buildPrediction({ trend: 'rising' });
      setComponentInput(component, 'prediction', buildMultiPrediction({}, { bathroom: catPred }));
      fixture.detectChanges();
      const cats = (component as any).categoryPredictions();
      expect(cats.length).toBe(1);
      expect(cats[0].key).toBe('bathroom');
      expect(cats[0].value).toEqual(catPred);
    });

    it('should replace category key with display name from categoryNames input', () => {
      const catPred = buildPrediction();
      setComponentInput(
        component,
        'prediction',
        buildMultiPrediction({}, { bathroom: catPred, kitchen: catPred }),
      );
      setComponentInput(component, 'categoryNames', { bathroom: 'WATER.BATHROOM' });
      fixture.detectChanges();
      const cats = (component as any).categoryPredictions();
      expect(cats[0].key).toBe('WATER.BATHROOM');
    });

    it('should fall back to raw key when no display name is configured', () => {
      const catPred = buildPrediction();
      setComponentInput(component, 'prediction', buildMultiPrediction({}, { kitchen: catPred }));
      setComponentInput(component, 'categoryNames', {});
      fixture.detectChanges();
      const cats = (component as any).categoryPredictions();
      expect(cats[0].key).toBe('kitchen');
    });

    it('should render category items in the DOM', () => {
      const catPred = buildPrediction();
      setComponentInput(
        component,
        'prediction',
        buildMultiPrediction({}, { bathroom: catPred, kitchen: catPred }),
      );
      fixture.detectChanges();
      const items = fixture.debugElement.queryAll(By.css('.category-item'));
      expect(items.length).toBe(2);
    });

    it('should NOT render the category-predictions section when empty', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction());
      fixture.detectChanges();
      const section = fixture.debugElement.query(By.css('.category-predictions'));
      expect(section).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Period selection
  // -------------------------------------------------------------------------

  describe('Period Selection', () => {
    const periods: Array<30 | 90 | 180 | 365 | 3650> = [30, 90, 180, 365, 3650];

    beforeEach(() => {
      setComponentInput(component, 'prediction', buildMultiPrediction());
      fixture.detectChanges();
    });

    it('should emit periodChange with the selected period when selectPeriod is called', () => {
      const spy = vi.fn();
      component.periodChange.subscribe(spy);

      (component as any).selectPeriod(90);
      expect(spy).toHaveBeenCalledWith(90);
    });

    periods.forEach((period, index) => {
      it(`should emit ${period} when the corresponding card button is clicked`, () => {
        const spy = vi.fn();
        component.periodChange.subscribe(spy);

        const cards = fixture.debugElement.queryAll(By.css('.prediction-card'));
        cards[index].triggerEventHandler('click', null);
        expect(spy).toHaveBeenCalledWith(period);
      });
    });

    it('should mark only the selected period card as active', () => {
      setComponentInput(component, 'selectedPeriod', 90);
      fixture.detectChanges();

      const cards = fixture.debugElement.queryAll(By.css('.prediction-card'));
      // Index 1 = 90-day card
      expect(cards[1].nativeElement.classList.contains('active')).toBe(true);
      [0, 2, 3, 4].forEach((i) =>
        expect(cards[i].nativeElement.classList.contains('active')).toBe(false),
      );
    });

    it('should emit each period once per click even when clicked multiple times', () => {
      const spy = vi.fn();
      component.periodChange.subscribe(spy);

      const cards = fixture.debugElement.queryAll(By.css('.prediction-card'));
      cards[2].triggerEventHandler('click', null);
      cards[2].triggerEventHandler('click', null);
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // Auto-correction notice
  // -------------------------------------------------------------------------

  describe('Auto-correction Notice', () => {
    it('should render the notice when appliedCorrection is set', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ appliedCorrection: 1.05 }));
      fixture.detectChanges();
      const notice = fixture.debugElement.query(By.css('.auto-correction-notice'));
      expect(notice).toBeTruthy();
    });

    it('should NOT render the notice when appliedCorrection is undefined', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ appliedCorrection: undefined }));
      fixture.detectChanges();
      const notice = fixture.debugElement.query(By.css('.auto-correction-notice'));
      expect(notice).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Accuracy badge
  // -------------------------------------------------------------------------

  describe('Accuracy Badge', () => {
    it('should render the accuracy badge when accuracyPercentage is present', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ accuracyPercentage: 80 }));
      fixture.detectChanges();
      const badge = fixture.debugElement.query(By.css('.accuracy-badge'));
      expect(badge).toBeTruthy();
    });

    it('should NOT render the accuracy badge when accuracyPercentage is undefined', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ accuracyPercentage: undefined }));
      fixture.detectChanges();
      const badge = fixture.debugElement.query(By.css('.accuracy-badge'));
      expect(badge).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle switching from null to a valid prediction', () => {
      setComponentInput(component, 'prediction', null);
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('.empty-state'))).toBeTruthy();

      setComponentInput(component, 'prediction', buildMultiPrediction());
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('.empty-state'))).toBeNull();
      expect(fixture.debugElement.query(By.css('.predictions-header'))).toBeTruthy();
    });

    it('should handle switching from a valid prediction to null', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction());
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('.predictions-header'))).toBeTruthy();

      setComponentInput(component, 'prediction', null);
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('.empty-state'))).toBeTruthy();
    });

    it('should NOT render trendPercentage span when trendPercentage is undefined', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ trendPercentage: undefined }));
      fixture.detectChanges();
      const trendPercent = fixture.debugElement.query(By.css('.trend-percent'));
      expect(trendPercent).toBeNull();
    });

    it('should render trendPercentage span and display value when trendPercentage is 0', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ trendPercentage: 0 }));
      fixture.detectChanges();
      const trendPercent = fixture.debugElement.query(By.css('.trend-percent'));
      expect(trendPercent).toBeTruthy();
      expect(trendPercent.nativeElement.textContent).toContain('0%');
    });

    it('should render trendPercentage span and display value when trendPercentage is non-zero', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction({ trendPercentage: 15 }));
      fixture.detectChanges();
      const trendPercent = fixture.debugElement.query(By.css('.trend-percent'));
      expect(trendPercent).toBeTruthy();
      expect(trendPercent.nativeElement.textContent).toContain('15%');
    });
  });
});
