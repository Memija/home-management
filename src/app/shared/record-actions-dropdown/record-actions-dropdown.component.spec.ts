import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { RecordActionsDropdownComponent } from './record-actions-dropdown.component';
import { LanguageService } from '../../services/language.service';

describe('RecordActionsDropdownComponent', () => {
  let component: RecordActionsDropdownComponent;
  let fixture: ComponentFixture<RecordActionsDropdownComponent>;

  beforeEach(async () => {
    const mockLanguageService = {
      currentLang: signal('en'),
      translate: vi.fn((key: string) => key),
    };

    await TestBed.configureTestingModule({
      imports: [RecordActionsDropdownComponent],
      providers: [{ provide: LanguageService, useValue: mockLanguageService }],
    }).compileComponents();

    fixture = TestBed.createComponent(RecordActionsDropdownComponent);
    component = fixture.componentInstance;
  });

  it('should create and build default input IDs and WATER translation keys', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component['jsonInputId']).toBe('import-file');
    expect(component['excelInputId']).toBe('import-excel-file');
    expect(component['key']('EXPORT')).toBe('WATER.EXPORT');
  });

  it('should use custom idSuffix and HEATING translation prefix when provided', () => {
    fixture.componentRef.setInput('idSuffix', 'heating');
    fixture.componentRef.setInput('translationPrefix', 'HEATING');
    fixture.detectChanges();

    expect(component['jsonInputId']).toBe('import-file-heating');
    expect(component['excelInputId']).toBe('import-excel-file-heating');
    expect(component['key']('EXPORT')).toBe('HEATING.EXPORT');
  });

  it('should emit export events when export buttons are clicked', () => {
    fixture.componentRef.setInput('excelEnabled', true);
    fixture.detectChanges();

    const jsonSpy = vi.spyOn(component.exportJson, 'emit');
    const excelSpy = vi.spyOn(component.exportExcel, 'emit');
    const pdfSpy = vi.spyOn(component.exportPdf, 'emit');

    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('button.json-item') as HTMLButtonElement).click();
    (root.querySelector('button.excel-item') as HTMLButtonElement).click();
    (root.querySelector('button.pdf-item') as HTMLButtonElement).click();

    expect(jsonSpy).toHaveBeenCalledTimes(1);
    expect(excelSpy).toHaveBeenCalledTimes(1);
    expect(pdfSpy).toHaveBeenCalledTimes(1);
  });

  it('should render and emit smartImport when showSmartImport is true', () => {
    fixture.componentRef.setInput('showSmartImport', true);
    fixture.detectChanges();

    const smartSpy = vi.spyOn(component.smartImport, 'emit');
    const smartBtn = fixture.nativeElement.querySelector('button.smart-item') as HTMLButtonElement;
    expect(smartBtn).not.toBeNull();
    smartBtn.click();
    expect(smartSpy).toHaveBeenCalledTimes(1);
  });
});
