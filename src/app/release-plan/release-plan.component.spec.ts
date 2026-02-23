import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReleasePlanComponent } from './release-plan.component';
import { TranslatePipe } from '../pipes/translate.pipe';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'translate',
  standalone: true
})
class MockTranslatePipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

describe('ReleasePlanComponent', () => {
  let component: ReleasePlanComponent;
  let fixture: ComponentFixture<ReleasePlanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReleasePlanComponent]
    })
      .overrideComponent(ReleasePlanComponent, {
        remove: { imports: [TranslatePipe] },
        add: { imports: [MockTranslatePipe] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ReleasePlanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with filter "all"', () => {
    expect(component.activeFilter()).toBe('all');
  });

  it('should show all features when filter is "all"', () => {
    component.setFilter('all');
    expect(component.filteredFeatures().length).toBe(4);
  });

  it('should filter features by "new"', () => {
    component.setFilter('new');
    const filtered = component.filteredFeatures();
    expect(filtered.length).toBe(1);
    expect(filtered[0].tag).toBe('new');
  });

  it('should filter features by "enhancement"', () => {
    component.setFilter('enhancement');
    const filtered = component.filteredFeatures();
    expect(filtered.length).toBe(2);
    filtered.forEach(feature => {
      expect(feature.tag).toBe('enhancement');
    });
  });

  it('should filter features by "smart"', () => {
    component.setFilter('smart');
    const filtered = component.filteredFeatures();
    expect(filtered.length).toBe(1);
    expect(filtered[0].tag).toBe('smart');
  });

  it('should calculate filter counts correctly', () => {
    const counts = component.filterOptions();
    expect(counts['all']).toBe(4);
    expect(counts['new']).toBe(1);
    expect(counts['enhancement']).toBe(2);
    expect(counts['smart']).toBe(1);
  });

  it('should return correct translation key for tags', () => {
    expect(component.getTagTranslationKey('new')).toBe('RELEASE_PLAN.NEW_FEATURE');
    expect(component.getTagTranslationKey('enhancement')).toBe('RELEASE_PLAN.ENHANCEMENT');
    expect(component.getTagTranslationKey('smart')).toBe('RELEASE_PLAN.SMART');
  });

  it('should return correct icon for tags', () => {
    expect(component.getTagIcon('new')).toEqual(component.SparklesIcon);
    expect(component.getTagIcon('enhancement')).toEqual(component.EnhancementIcon);
    expect(component.getTagIcon('smart')).toEqual(component.SmartIcon);
  });

  it('should handle switching filters back and forth', () => {
    component.setFilter('new');
    expect(component.activeFilter()).toBe('new');
    expect(component.filteredFeatures().length).toBe(1);

    component.setFilter('all');
    expect(component.activeFilter()).toBe('all');
    expect(component.filteredFeatures().length).toBe(4);
  });
});
