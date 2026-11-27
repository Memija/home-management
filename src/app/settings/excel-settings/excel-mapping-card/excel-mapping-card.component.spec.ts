import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { ExcelMappingCardComponent } from './excel-mapping-card.component';
import { LanguageService } from '../../../services/language.service';

describe('ExcelMappingCardComponent', () => {
  let component: ExcelMappingCardComponent;
  let fixture: ComponentFixture<ExcelMappingCardComponent>;

  beforeEach(async () => {
    const mockLanguageService = {
      currentLang: signal('en'),
      translate: vi.fn((key: string) => key),
    };

    await TestBed.configureTestingModule({
      imports: [ExcelMappingCardComponent],
      providers: [{ provide: LanguageService, useValue: mockLanguageService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ExcelMappingCardComponent);
    component = fixture.componentInstance;
  });

  it('should render label and input with value', () => {
    fixture.componentRef.setInput('fieldId', 'water-date');
    fixture.componentRef.setInput('label', 'Date Column');
    fixture.componentRef.setInput('value', 'Date');
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input#water-date') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('Date');
  });

  it('should emit valueChange on input', () => {
    fixture.componentRef.setInput('fieldId', 'water-date');
    fixture.detectChanges();

    const spy = vi.spyOn(component.valueChange, 'emit');
    const input = fixture.nativeElement.querySelector('input#water-date') as HTMLInputElement;
    input.value = 'Datum';
    input.dispatchEvent(new Event('input'));

    expect(spy).toHaveBeenCalledWith('Datum');
  });

  it('should display validation error when present', () => {
    fixture.componentRef.setInput('value', 'Invalid!');
    fixture.componentRef.setInput('validationError', 'Invalid column name');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Invalid column name');
  });

  it('should display duplicate warning when isDuplicate is true', () => {
    fixture.componentRef.setInput('value', 'Date');
    fixture.componentRef.setInput('validationError', '');
    fixture.componentRef.setInput('isDuplicate', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('EXCEL.VALIDATION_DUPLICATES');
  });
});
