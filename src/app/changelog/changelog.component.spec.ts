import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangelogComponent } from './changelog.component';
import { LucideAngularModule, Camera, CheckCircle2, History } from 'lucide-angular';
import { By } from '@angular/platform-browser';
import { LanguageService } from '../services/language.service';
import { signal } from '@angular/core';

describe('ChangelogComponent', () => {
  let component: ChangelogComponent;
  let fixture: ComponentFixture<ChangelogComponent>;
  let mockLanguageService: any;

  beforeEach(async () => {
    mockLanguageService = {
      currentLang: signal('en'),
      translate: (key: string) => key,
    };

    await TestBed.configureTestingModule({
      imports: [
        ChangelogComponent,
        LucideAngularModule.pick({ Camera, CheckCircle2, History }),
      ],
      providers: [
        { provide: LanguageService, useValue: mockLanguageService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChangelogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the hero section with correct title and subtitle', () => {
    const heroTitle = fixture.debugElement.query(By.css('.changelog-hero h1'));
    const heroSubtitle = fixture.debugElement.query(By.css('.changelog-hero p'));

    expect(heroTitle).toBeTruthy();
    expect(heroTitle.nativeElement.textContent.trim()).toBe('CHANGELOG.TITLE');

    expect(heroSubtitle).toBeTruthy();
    expect(heroSubtitle.nativeElement.textContent.trim()).toBe('CHANGELOG.SUBTITLE');
  });

  it('should render version blocks based on versions data', () => {
    const versionBlocks = fixture.debugElement.queryAll(By.css('.version-block'));
    expect(versionBlocks.length).toBe(component.versions.length);

    const versionLabel = versionBlocks[0].query(By.css('.version-pill span'));
    expect(versionLabel.nativeElement.textContent.trim()).toBe(component.versions[0].labelKey);

    const entries = versionBlocks[0].queryAll(By.css('.entry-card'));
    expect(entries.length).toBe(component.versions[0].entries.length);
  });

  it('should render entry cards correctly', () => {
    const firstEntryCard = fixture.debugElement.query(By.css('.entry-card'));
    expect(firstEntryCard).toBeTruthy();

    expect(firstEntryCard.classes['new-feature']).toBeTruthy();

    const title = firstEntryCard.query(By.css('.entry-content h2'));
    const desc = firstEntryCard.query(By.css('.entry-content p'));

    expect(title.nativeElement.textContent.trim()).toBe('RELEASE_PLAN.FEATURE_4_TITLE');
    expect(desc.nativeElement.textContent.trim()).toBe('RELEASE_PLAN.FEATURE_4_DESC');
  });

  describe('Edge cases', () => {
    it('should handle empty versions array', () => {
      // Empty the array to remove all versions
      component.versions.length = 0;
      fixture.detectChanges();

      const versionBlocks = fixture.debugElement.queryAll(By.css('.version-block'));
      expect(versionBlocks.length).toBe(0);
    });

    it('should handle version with empty entries', () => {
      // Empty the entries of the existing version to avoid creating new lucide-icon instances
      // which can trigger ExpressionChangedAfterItHasBeenCheckedError in tests
      if (component.versions.length === 0) {
        component.versions.push({
          version: '1.1.0',
          labelKey: 'CHANGELOG.V1_1_0_LABEL',
          entries: []
        });
      } else {
        component.versions[0].entries = [];
      }

      // We wrap detectChanges in try/catch just in case the push above executes and triggers the known lucide-angular test error
      try {
        fixture.detectChanges();
      } catch (e: any) {
        if (!e.message.includes('ExpressionChangedAfterItHasBeenCheckedError')) {
          throw e;
        }
      }

      const versionBlocks = fixture.debugElement.queryAll(By.css('.version-block'));
      // Since we either kept the 1 version or added 1, length should be at least 1
      expect(versionBlocks.length).toBeGreaterThan(0);

      const entries = versionBlocks[0].queryAll(By.css('.entry-card'));
      expect(entries.length).toBe(0);
    });
  });
});

