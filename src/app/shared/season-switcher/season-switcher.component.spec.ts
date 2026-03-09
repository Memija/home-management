import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SeasonSwitcherComponent } from './season-switcher.component';
import { SeasonService, Season } from '../../services/season.service';
import { signal, WritableSignal, Pipe, PipeTransform } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Pipe({
  name: 'translate',
  standalone: true
})
class MockTranslatePipe implements PipeTransform {
  transform(key: string): string {
    return `${key}_TRANSLATED`;
  }
}

describe('SeasonSwitcherComponent', () => {
  let component: SeasonSwitcherComponent;
  let fixture: ComponentFixture<SeasonSwitcherComponent>;
  let mockSeasonService: any;
  let currentSeasonSignal: WritableSignal<Season>;
  let disabledSignal: WritableSignal<boolean>;

  beforeEach(async () => {
    currentSeasonSignal = signal<Season>('summer');
    disabledSignal = signal<boolean>(false);

    mockSeasonService = {
      currentSeason: currentSeasonSignal,
      disabled: disabledSignal,
      nextSeason: vi.fn(),
      previousSeason: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [SeasonSwitcherComponent, MockTranslatePipe],
      providers: [
        { provide: SeasonService, useValue: mockSeasonService }
      ]
    })
      .overrideComponent(SeasonSwitcherComponent, {
        remove: { imports: [TranslatePipe] },
        add: { imports: [MockTranslatePipe] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(SeasonSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the component when not disabled', () => {
    disabledSignal.set(false);
    fixture.detectChanges();

    const switcherDiv = fixture.debugElement.query(By.css('.season-switcher'));
    expect(switcherDiv).toBeTruthy();
  });

  it('should hide the component entirely and not render DOM when disabled (edge case)', () => {
    disabledSignal.set(true);
    fixture.detectChanges();

    const switcherDiv = fixture.debugElement.query(By.css('.season-switcher'));
    expect(switcherDiv).toBeFalsy();
  });

  it('should call previousSeason on the service when the previous button is clicked', () => {
    disabledSignal.set(false);
    fixture.detectChanges();

    const prevButton = fixture.debugElement.query(By.css('.season-nav-btn.prev'));
    prevButton.triggerEventHandler('click', null);

    expect(mockSeasonService.previousSeason).toHaveBeenCalled();
  });

  it('should call nextSeason on the service when the next button is clicked', () => {
    disabledSignal.set(false);
    fixture.detectChanges();

    const nextButton = fixture.debugElement.query(By.css('.season-nav-btn.next'));
    nextButton.triggerEventHandler('click', null);

    expect(mockSeasonService.nextSeason).toHaveBeenCalled();
  });

  it('should display the correct emoji for summer', () => {
    currentSeasonSignal.set('summer');
    fixture.detectChanges();

    const emojis = fixture.debugElement.queryAll(By.css('.season-emoji'));
    expect(emojis.length).toBe(2);
    expect(emojis[0].nativeElement.textContent.trim()).toBe('☀️');
  });

  it('should display the correct emoji for winter (edge case verifying mapping)', () => {
    currentSeasonSignal.set('winter');
    fixture.detectChanges();

    const emojis = fixture.debugElement.queryAll(By.css('.season-emoji'));
    expect(emojis[0].nativeElement.textContent.trim()).toBe('❄️');

    // Check translated text output relies on current season
    const nameEl = fixture.debugElement.query(By.css('.season-name'));
    expect(nameEl.nativeElement.textContent.trim()).toBe('SEASONS.WINTER.NAME_TRANSLATED');
  });

  it('should dynamically update the names and tagline when the season changes', () => {
    currentSeasonSignal.set('autumn');
    fixture.detectChanges();

    const nameEl = fixture.debugElement.query(By.css('.season-name'));
    const taglineEl = fixture.debugElement.query(By.css('.season-tagline'));

    expect(nameEl.nativeElement.textContent.trim()).toBe('SEASONS.AUTUMN.NAME_TRANSLATED');
    expect(taglineEl.nativeElement.textContent.trim()).toBe('SEASONS.AUTUMN.TAGLINE_TRANSLATED');

    // Change to spring
    currentSeasonSignal.set('spring');
    fixture.detectChanges();

    expect(nameEl.nativeElement.textContent.trim()).toBe('SEASONS.SPRING.NAME_TRANSLATED');
    expect(taglineEl.nativeElement.textContent.trim()).toBe('SEASONS.SPRING.TAGLINE_TRANSLATED');
  });
});
