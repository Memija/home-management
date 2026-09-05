import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SmartImportModalComponent } from './smart-import-modal.component';
import { SmartImportService, ParsedRecord } from '../../services/smart-import.service';
import { LanguageService } from '../../services/language.service';
import { signal, WritableSignal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('SmartImportModalComponent', () => {
  let component: SmartImportModalComponent;
  let fixture: ComponentFixture<SmartImportModalComponent>;
  let mockSmartImportService: { parseRawText: ReturnType<typeof vi.fn> };
  let mockLanguageService: {
    currentLang: WritableSignal<string>;
    translate: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockSmartImportService = {
      parseRawText: vi.fn(),
    };
    mockLanguageService = {
      currentLang: signal('en'),
      translate: vi.fn((key: string) => key),
    };

    await TestBed.configureTestingModule({
      imports: [SmartImportModalComponent],
      providers: [
        { provide: SmartImportService, useValue: mockSmartImportService },
        { provide: LanguageService, useValue: mockLanguageService },
      ],
    })
      .overrideComponent(SmartImportModalComponent, {
        set: { template: '', imports: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SmartImportModalComponent);
    component = fixture.componentInstance;
    component.show = true;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('analyzeText', () => {
    it('should not process if rawText is empty', () => {
      component['rawText'].set('');

      component['analyzeText']();

      expect(mockSmartImportService.parseRawText).not.toHaveBeenCalled();
      expect(component['step']()).toBe('input');
    });

    it('should parse text, set records and change step to preview if text exists', () => {
      const mockRecords: ParsedRecord[] = [
        { date: new Date(), value: 100, originalLine: 'test line' },
      ];
      mockSmartImportService.parseRawText.mockReturnValue(mockRecords);

      component['rawText'].set('some raw text');

      component['analyzeText']();

      expect(mockSmartImportService.parseRawText).toHaveBeenCalledWith('some raw text');
      expect(component['parsedRecords']()).toEqual(mockRecords);
      expect(component['step']()).toBe('preview');
    });

    it('should handle returned empty parsed records properly', () => {
      mockSmartImportService.parseRawText.mockReturnValue([]);

      component['rawText'].set('invalid text');

      component['analyzeText']();

      expect(mockSmartImportService.parseRawText).toHaveBeenCalledWith('invalid text');
      expect(component['parsedRecords']()).toEqual([]);
      expect(component['step']()).toBe('preview');
    });
  });

  describe('confirmImport', () => {
    it('should emit parsed records, reset state, and emit close event', () => {
      const mockRecords: ParsedRecord[] = [
        { date: new Date(), value: 200, originalLine: 'test line 2' },
      ];
      component['parsedRecords'].set(mockRecords);
      component['step'].set('preview');
      component['rawText'].set('some old text');

      vi.spyOn(component.import, 'emit');
      vi.spyOn(component.closeModal, 'emit');

      component['confirmImport']();

      // Check emissions
      expect(component.import.emit).toHaveBeenCalledWith(mockRecords);
      expect(component.closeModal.emit).toHaveBeenCalled();

      // Check reset state
      expect(component['step']()).toBe('input');
      expect(component['rawText']()).toBe('');
      expect(component['parsedRecords']()).toEqual([]);
    });

    it('should handle confirming empty records if no text could be parsed', () => {
      component['parsedRecords'].set([]);

      vi.spyOn(component.import, 'emit');
      vi.spyOn(component.closeModal, 'emit');

      component['confirmImport']();

      expect(component.import.emit).toHaveBeenCalledWith([]);
      expect(component.closeModal.emit).toHaveBeenCalled();
    });
  });

  describe('reset functionality (private method)', () => {
    it('should correctly reset to initial state', () => {
      // Setup dirty state
      component['step'].set('preview');
      component['rawText'].set('dirty text');
      component['parsedRecords'].set([{ date: new Date(), value: 1, originalLine: '1' }]);

      // Call private method
      (component as unknown as { reset: () => void })['reset']();

      // Verify reset state
      expect(component['step']()).toBe('input');
      expect(component['rawText']()).toBe('');
      expect(component['parsedRecords']()).toEqual([]);
    });
  });
});
