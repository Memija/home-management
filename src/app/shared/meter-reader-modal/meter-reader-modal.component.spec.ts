import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MeterReaderModalComponent } from './meter-reader-modal.component';
import { MeterReaderService } from '../../services/meter-reader.service';
import { signal } from '@angular/core';
import { LanguageService } from '../../services/language.service';

class MockMeterReaderService {
  isProcessing = signal(false);
  progress = signal(0);
  readMeter = vi.fn().mockResolvedValue({
    value: 1234,
    rawText: '1234',
    confidence: 90,
    candidates: [1234],
  });
}

describe('MeterReaderModalComponent', () => {
  let component: MeterReaderModalComponent;
  let fixture: ComponentFixture<MeterReaderModalComponent>;
  let meterReaderService: MockMeterReaderService;

  beforeEach(async () => {
    const mockLanguageService = {
      currentLang: signal('en'),
      translate: vi.fn((key: string) => key),
    };

    await TestBed.configureTestingModule({
      imports: [MeterReaderModalComponent],
      providers: [
        { provide: MeterReaderService, useClass: MockMeterReaderService },
        { provide: LanguageService, useValue: mockLanguageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MeterReaderModalComponent);
    component = fixture.componentInstance;
    meterReaderService = TestBed.inject(MeterReaderService) as unknown as MockMeterReaderService;

    // Set required inputs
    component.show = true;
    component.fields = [{ key: 'water', label: 'Water' }];

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Camera initialization and fallback', () => {
    it('should handle camera access error gracefully', async () => {
      const originalGetUserMedia = navigator.mediaDevices?.getUserMedia;

      if (!navigator.mediaDevices) {
        (navigator as unknown as { mediaDevices: Partial<MediaDevices> }).mediaDevices = {};
      }

      navigator.mediaDevices.getUserMedia = vi
        .fn()
        .mockRejectedValue(new Error('Permission denied'));

      await component['startCamera']();

      expect(component['cameraError']()).toBe('METER_READER.CAMERA_ERROR');
      expect(component['useCameraMode']()).toBe(false);

      if (originalGetUserMedia) {
        navigator.mediaDevices.getUserMedia = originalGetUserMedia;
      }
    });
  });

  describe('OCR Processing Flow', () => {
    it('should process image and move to result step', async () => {
      await component['processImage']('data:image/png;base64,sample', false);

      expect(meterReaderService.readMeter).toHaveBeenCalledWith(
        'data:image/png;base64,sample',
        false,
      );
      expect(component['step']()).toBe('result');
      expect(component['selectedValue']()).toBe(1234);
      expect(component['editedValue']()).toBe('1234');
    });

    it('should handle OCR returning null value', async () => {
      meterReaderService.readMeter.mockResolvedValueOnce({
        value: null,
        confidence: 0,
        rawText: '',
      });

      await component['processImage']('data:image/png;base64,sample', false);

      expect(component['step']()).toBe('result');
      expect(component['selectedValue']()).toBeNull();
      expect(component['editedValue']()).toBe('');
    });

    it('should filter non-numeric input when editing value', () => {
      const mockEvent = {
        target: { value: '123a45b' },
      } as unknown as Event;

      component['onValueEdit'](mockEvent);

      expect(component['editedValue']()).toBe('12345');
      expect(component['selectedValue']()).toBe(12345);
    });

    it('should set selectedValue to null when input is empty or invalid', () => {
      const mockEvent = {
        target: { value: '' },
      } as unknown as Event;

      component['onValueEdit'](mockEvent);

      expect(component['editedValue']()).toBe('');
      expect(component['selectedValue']()).toBeNull();
    });
  });

  describe('Field Selection and Emission', () => {
    it('should emit reading and close for single field', () => {
      vi.spyOn(component.reading, 'emit');
      vi.spyOn(component.closeModal, 'emit');

      component['selectedValue'].set(456);
      component['confirmValue']();

      expect(component.reading.emit).toHaveBeenCalledWith({ fieldKey: 'water', value: 456 });
      expect(component.closeModal.emit).toHaveBeenCalled();
    });

    it('should go to select-field step if multiple fields exist', () => {
      vi.spyOn(component.reading, 'emit');
      component.fields = [
        { key: 'water1', label: 'Water 1' },
        { key: 'water2', label: 'Water 2' },
      ];
      fixture.detectChanges();

      component['selectedValue'].set(456);
      component['confirmValue']();

      expect(component.reading.emit).not.toHaveBeenCalled();
      expect(component['step']()).toBe('select-field');
    });

    it('should go to select-field step if no fields exist (empty state)', () => {
      component.fields = [];
      fixture.detectChanges();

      component['selectedValue'].set(456);
      component['confirmValue']();

      expect(component['step']()).toBe('select-field');
    });

    it('should emit reading and reset state when selecting a field', () => {
      vi.spyOn(component.reading, 'emit');
      component['selectedValue'].set(789);

      component['selectField']('water2');

      expect(component.reading.emit).toHaveBeenCalledWith({ fieldKey: 'water2', value: 789 });
      expect(component['step']()).toBe('capture');
      expect(component['selectedValue']()).toBeNull();
    });
  });

  describe('File Selection', () => {
    it('should not do anything on file select if no file', () => {
      const event = { target: { files: [] } } as unknown as Event;
      component['onFileSelected'](event);
      expect(component['capturedImage']()).toBeNull();
    });

    it('should not do anything if file is not an image', () => {
      const event = { target: { files: [{ type: 'application/pdf' }] } } as unknown as Event;
      component['onFileSelected'](event);
      expect(component['capturedImage']()).toBeNull();
    });
  });

  describe('Cropping Logic', () => {
    it('should clear crop if drag region is too small', () => {
      component['cropRect'].set({ x: 10, y: 10, width: 10, height: 10 });

      const mockEvent = new MouseEvent('mouseup');
      component['onCropEnd'](mockEvent);

      expect(component['cropRect']()).toBeNull();
    });

    it('should retain crop if drag region is large enough', () => {
      component['cropRect'].set({ x: 10, y: 10, width: 50, height: 50 });

      const mockEvent = new MouseEvent('mouseup');
      const compAny = component as unknown as Record<string, (...args: unknown[]) => unknown>;
      vi.spyOn(compAny, 'drawCropCanvas');
      component['onCropEnd'](mockEvent);

      expect(component['cropRect']()).toEqual({ x: 10, y: 10, width: 50, height: 50 });
    });

    it('should process full image if confirmCrop is called without crop rect', () => {
      const compAny = component as unknown as Record<string, (...args: unknown[]) => unknown>;
      vi.spyOn(compAny, 'processImage');
      component['capturedImage'].set('fake-image-data');
      component['cropRect'].set(null);

      component['confirmCrop']();

      expect(compAny['processImage']).toHaveBeenCalledWith('fake-image-data', false);
    });
  });
});
