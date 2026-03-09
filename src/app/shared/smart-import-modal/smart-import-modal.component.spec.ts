import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SmartImportModalComponent } from './smart-import-modal.component';
import { SmartImportService, ParsedRecord } from '../../services/smart-import.service';
import { LanguageService } from '../../services/language.service';
import { signal } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Pipe, PipeTransform } from '@angular/core';
import { vi } from 'vitest';

@Pipe({
  name: 'translate',
  standalone: true
})
class MockTranslatePipe implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

describe('SmartImportModalComponent', () => {
  let component: SmartImportModalComponent;
  let fixture: ComponentFixture<SmartImportModalComponent>;
  let mockSmartImportService: any;
  let mockLanguageService: any;

  beforeEach(async () => {
    mockSmartImportService = {
      parseRawText: vi.fn()
    };
    mockLanguageService = {
      currentLang: signal('en'),
      translate: vi.fn((key: string) => key)
    };

    await TestBed.configureTestingModule({
      imports: [SmartImportModalComponent],
      providers: [
        { provide: SmartImportService, useValue: mockSmartImportService },
        { provide: LanguageService, useValue: mockLanguageService }
      ]
    })
      .overrideComponent(SmartImportModalComponent, {
        remove: { imports: [TranslatePipe] },
        add: { imports: [MockTranslatePipe] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(SmartImportModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('show', true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('analyzeText', () => {
    it('should not process if rawText is empty', () => {
      const compAsAny = component as any;
      compAsAny.rawText.set('');

      compAsAny.analyzeText();

      expect(mockSmartImportService.parseRawText).not.toHaveBeenCalled();
      expect(compAsAny.step()).toBe('input');
    });

    it('should parse text, set records and change step to preview if text exists', () => {
      const mockRecords: ParsedRecord[] = [
        { date: new Date(), value: 100, originalLine: 'test line' }
      ];
      mockSmartImportService.parseRawText.mockReturnValue(mockRecords);

      const compAsAny = component as any;
      compAsAny.rawText.set('some raw text');

      compAsAny.analyzeText();

      expect(mockSmartImportService.parseRawText).toHaveBeenCalledWith('some raw text');
      expect(compAsAny.parsedRecords()).toEqual(mockRecords);
      expect(compAsAny.step()).toBe('preview');
    });

    it('should handle returned empty parsed records properly', () => {
      mockSmartImportService.parseRawText.mockReturnValue([]);

      const compAsAny = component as any;
      compAsAny.rawText.set('invalid text');

      compAsAny.analyzeText();

      expect(mockSmartImportService.parseRawText).toHaveBeenCalledWith('invalid text');
      expect(compAsAny.parsedRecords()).toEqual([]);
      expect(compAsAny.step()).toBe('preview');
    });
  });

  describe('confirmImport', () => {
    it('should emit parsed records, reset state, and emit close event', () => {
      const mockRecords: ParsedRecord[] = [
        { date: new Date(), value: 200, originalLine: 'test line 2' }
      ];
      const compAsAny = component as any;
      compAsAny.parsedRecords.set(mockRecords);
      compAsAny.step.set('preview');
      compAsAny.rawText.set('some old text');

      vi.spyOn(component.import, 'emit');
      vi.spyOn(component.close, 'emit');

      compAsAny.confirmImport();

      // Check emissions
      expect(component.import.emit).toHaveBeenCalledWith(mockRecords);
      expect(component.close.emit).toHaveBeenCalled();

      // Check reset state
      expect(compAsAny.step()).toBe('input');
      expect(compAsAny.rawText()).toBe('');
      expect(compAsAny.parsedRecords()).toEqual([]);
    });

    it('should handle confirming empty records if no text could be parsed', () => {
      const compAsAny = component as any;
      compAsAny.parsedRecords.set([]);

      vi.spyOn(component.import, 'emit');
      vi.spyOn(component.close, 'emit');

      compAsAny.confirmImport();

      expect(component.import.emit).toHaveBeenCalledWith([]);
      expect(component.close.emit).toHaveBeenCalled();
    });
  });

  describe('reset functionality (private method)', () => {
    it('should correctly reset to initial state', () => {
      const compAsAny = component as any;
      // Setup dirty state
      compAsAny.step.set('preview');
      compAsAny.rawText.set('dirty text');
      compAsAny.parsedRecords.set([{ date: new Date(), value: 1, originalLine: '1' }]);

      // Call private method
      compAsAny.reset();

      // Verify reset state
      expect(compAsAny.step()).toBe('input');
      expect(compAsAny.rawText()).toBe('');
      expect(compAsAny.parsedRecords()).toEqual([]);
    });
  });
});
