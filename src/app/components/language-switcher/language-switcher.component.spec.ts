import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LanguageSwitcherComponent } from './language-switcher.component';
import { LanguageService } from '../../services/language.service';
import { signal, NO_ERRORS_SCHEMA, Pipe, PipeTransform, WritableSignal } from '@angular/core';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { CommonModule } from '@angular/common';

@Pipe({
  name: 'translate',
  standalone: true,
})
class MockTranslatePipe implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

describe('LanguageSwitcherComponent', () => {
  let component: LanguageSwitcherComponent;
  let fixture: ComponentFixture<LanguageSwitcherComponent>;
  let languageServiceMock: {
    currentLang: WritableSignal<string>;
    currentLocale: WritableSignal<string>;
    setLanguage: Mock;
    translate: Mock;
  };

  beforeEach(async () => {
    languageServiceMock = {
      currentLang: signal('en'),
      currentLocale: signal('en-US'),
      setLanguage: vi.fn(),
      translate: vi.fn().mockImplementation((key) => key),
    };

    await TestBed.configureTestingModule({
      imports: [LanguageSwitcherComponent, MockTranslatePipe],
      providers: [{ provide: LanguageService, useValue: languageServiceMock }],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(LanguageSwitcherComponent, {
        set: {
          imports: [CommonModule, MockTranslatePipe],
          template: '<div>Mock Template</div>',
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LanguageSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
