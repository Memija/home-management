import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PredictionsPanelComponent } from './predictions-panel.component';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Pipe, PipeTransform, signal } from '@angular/core';
import { vi, afterEach } from 'vitest';
import { By } from '@angular/platform-browser';
import { MultiPredictionResult, PredictionResult } from '../../services/prediction.service';

// Helper to update signal inputs without relying on Angular metadata
function setComponentInput(component: unknown, prop: string, value: unknown) {
  if (
    !(component as Record<string, import('@angular/core').WritableSignal<unknown>>)[`${prop}_mock`]
  ) {
    (component as Record<string, import('@angular/core').WritableSignal<unknown>>)[`${prop}_mock`] =
      signal(value);
    Object.defineProperty(component, prop, {
      get: () =>
        (component as Record<string, import('@angular/core').WritableSignal<unknown>>)[
          `${prop}_mock`
        ],
    });
  } else {
    (component as Record<string, import('@angular/core').WritableSignal<unknown>>)[
      `${prop}_mock`
    ].set(value);
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
  let languageServiceMock: unknown;

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
      expect(cards).toHaveLength(0);
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
      expect(cards).toHaveLength(5);
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
    it.each([
      { trend: 'rising' as const, expectedKey: 'TrendingUpIcon' },
      { trend: 'falling' as const, expectedKey: 'TrendingDownIcon' },
      { trend: 'stable' as const, expectedKey: 'MinusIcon' },
      { trend: null, expectedKey: 'MinusIcon' },
    ])('should return correct icon when trend is $trend', ({ trend, expectedKey }) => {
      setComponentInput(component, 'prediction', trend ? buildMultiPrediction({ trend }) : null);
      fixture.detectChanges();
      const icon = component['trendIcon']();
      expect(icon).toBe(component[expectedKey as keyof typeof component]);
    });
  });

  // -------------------------------------------------------------------------
  // Computed: trendClass
  // -------------------------------------------------------------------------

  describe('trendClass computed', () => {
    it.each([
      { trend: 'rising' as const, expected: 'rising' },
      { trend: 'falling' as const, expected: 'falling' },
      { trend: 'stable' as const, expected: 'stable' },
      { trend: null, expected: 'stable' },
    ])('should return "$expected" when trend is $trend', ({ trend, expected }) => {
      setComponentInput(component, 'prediction', trend ? buildMultiPrediction({ trend }) : null);
      fixture.detectChanges();
      expect(component['trendClass']()).toBe(expected);
    });
  });

  // -------------------------------------------------------------------------
  // Computed: confidenceClass
  // -------------------------------------------------------------------------

  describe('confidenceClass computed', () => {
    it.each([
      { confidence: 'high' as const, expected: 'high' },
      { confidence: 'medium' as const, expected: 'medium' },
      { confidence: 'low' as const, expected: 'low' },
      { confidence: null, expected: 'low' },
    ])('should return "$expected" when confidence is $confidence', ({ confidence, expected }) => {
      setComponentInput(
        component,
        'prediction',
        confidence ? buildMultiPrediction({ confidence }) : null,
      );
      fixture.detectChanges();
      expect(component['confidenceClass']()).toBe(expected);
    });
  });

  // -------------------------------------------------------------------------
  // Computed: accuracyClass
  // -------------------------------------------------------------------------

  describe('accuracyClass computed', () => {
    it.each([
      { accuracy: 90, expected: 'accuracy-high', desc: '>= 85' },
      { accuracy: 85, expected: 'accuracy-high', desc: 'exactly 85' },
      { accuracy: 75, expected: 'accuracy-medium', desc: '>= 70 and < 85' },
      { accuracy: 70, expected: 'accuracy-medium', desc: 'exactly 70' },
      { accuracy: 55, expected: 'accuracy-low', desc: '< 70' },
      { accuracy: undefined, expected: '', desc: 'undefined' },
      { accuracy: null, expected: '', desc: 'null prediction' },
    ])('should return "$expected" when accuracyPercentage is $desc', ({ accuracy, expected }) => {
      setComponentInput(
        component,
        'prediction',
        accuracy === null ? null : buildMultiPrediction({ accuracyPercentage: accuracy }),
      );
      fixture.detectChanges();
      expect(component['accuracyClass']()).toBe(expected);
    });
  });

  // -------------------------------------------------------------------------
  // Computed: typeClass
  // -------------------------------------------------------------------------

  describe('typeClass computed', () => {
    it.each(['water' as const, 'electricity' as const, 'heating' as const])(
      'should return "%s" when type is %s',
      (type) => {
        setComponentInput(component, 'type', type);
        fixture.detectChanges();
        expect(component['typeClass']()).toBe(type);
      },
    );

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
      expect(component['categoryPredictions']()).toEqual([]);
    });

    it('should return empty array when categories is undefined', () => {
      setComponentInput(component, 'prediction', buildMultiPrediction());
      fixture.detectChanges();
      expect(component['categoryPredictions']()).toEqual([]);
    });

    it('should map category keys to their PredictionResult values', () => {
      const catPred = buildPrediction({ trend: 'rising' });
      setComponentInput(component, 'prediction', buildMultiPrediction({}, { bathroom: catPred }));
      fixture.detectChanges();
      const cats = component['categoryPredictions']();
      expect(cats).toHaveLength(1);
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
      const cats = component['categoryPredictions']();
      expect(cats[0].key).toBe('WATER.BATHROOM');
    });

    it('should fall back to raw key when no display name is configured', () => {
      const catPred = buildPrediction();
      setComponentInput(component, 'prediction', buildMultiPrediction({}, { kitchen: catPred }));
      setComponentInput(component, 'categoryNames', {});
      fixture.detectChanges();
      const cats = component['categoryPredictions']();
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
      expect(items).toHaveLength(2);
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
    beforeEach(() => {
      setComponentInput(component, 'prediction', buildMultiPrediction());
      fixture.detectChanges();
    });

    it('should emit periodChange with the selected period when selectPeriod is called', () => {
      const spy = vi.fn();
      component.periodChange.subscribe(spy);

      component['selectPeriod'](90);
      expect(spy).toHaveBeenCalledWith(90);
    });

    it.each([
      { period: 30, index: 0 },
      { period: 90, index: 1 },
      { period: 180, index: 2 },
      { period: 365, index: 3 },
      { period: 3650, index: 4 },
    ])('should emit $period when the corresponding card button is clicked', ({ period, index }) => {
      const spy = vi.fn();
      component.periodChange.subscribe(spy);

      const cards = fixture.debugElement.queryAll(By.css('.prediction-card'));
      cards[index].triggerEventHandler('click', null);
      expect(spy).toHaveBeenCalledWith(period);
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
      setComponentInput(
        component,
        'prediction',
        buildMultiPrediction({ appliedCorrection: undefined }),
      );
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
      setComponentInput(
        component,
        'prediction',
        buildMultiPrediction({ accuracyPercentage: undefined }),
      );
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
      setComponentInput(
        component,
        'prediction',
        buildMultiPrediction({ trendPercentage: undefined }),
      );
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
