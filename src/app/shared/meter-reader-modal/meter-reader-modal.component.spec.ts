import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MeterReaderModalComponent } from './meter-reader-modal.component';
import { MeterReaderService } from '../../services/meter-reader.service';
import { Pipe, PipeTransform, signal } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Pipe({ name: 'translate', standalone: true })
class MockTranslatePipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

class MockMeterReaderService {
  isProcessing = signal(false);
  progress = signal(0);
  readMeter = vi.fn().mockResolvedValue({
    value: 1234,
    rawText: '1234',
    confidence: 90,
    candidates: [1234]
  });
}

describe('MeterReaderModalComponent', () => {
  let component: MeterReaderModalComponent;
  let fixture: ComponentFixture<MeterReaderModalComponent>;
  let meterReaderService: MockMeterReaderService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeterReaderModalComponent, MockTranslatePipe],
      providers: [
        { provide: MeterReaderService, useClass: MockMeterReaderService }
      ]
    }).overrideComponent(MeterReaderModalComponent, {
      remove: { imports: [TranslatePipe] },
      add: { imports: [MockTranslatePipe] }
    }).compileComponents();

    fixture = TestBed.createComponent(MeterReaderModalComponent);
    component = fixture.componentInstance;
    meterReaderService = TestBed.inject(MeterReaderService) as unknown as MockMeterReaderService;

    // Set required inputs
    fixture.componentRef.setInput('show', true);
    fixture.componentRef.setInput('fields', [
      { key: 'water', label: 'Water' }
    ]);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Camera initialization and fallback', () => {
    it('should handle camera access error gracefully', async () => {
      const originalGetUserMedia = navigator.mediaDevices?.getUserMedia;

      if (!navigator.mediaDevices) {
        (navigator as any).mediaDevices = {};
      }

      navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied')) as any;

      await component['startCamera']();

      expect(component['cameraError']()).toBe('METER_READER.CAMERA_ERROR');
      expect(component['useCameraMode']()).toBe(false);

      if (originalGetUserMedia) {
        navigator.mediaDevices.getUserMedia = originalGetUserMedia;
      }
    });
  });

  describe('Image Processing', () => {
    it('should process image and move to result step', async () => {
      await component['processImage']('fake-data-url', false);

      expect(meterReaderService.readMeter).toHaveBeenCalledWith('fake-data-url', false);
      expect(component['step']()).toBe('result');
      expect(component['selectedValue']()).toBe(1234);
      expect(component['editedValue']()).toBe('1234');
    });

    it('should handle OCR returning null value', async () => {
      meterReaderService.readMeter.mockResolvedValue({
        value: null,
        rawText: 'abc',
        confidence: 10,
        candidates: []
      });

      await component['processImage']('fake-data-url', false);

      expect(component['selectedValue']()).toBeNull();
      expect(component['editedValue']()).toBe('');
      expect(component['step']()).toBe('result');
    });
  });

  describe('Value Editing', () => {
    it('should filter non-numeric input when editing value', () => {
      const event = { target: { value: '12a3b4' } } as unknown as Event;
      component['onValueEdit'](event);

      expect(component['editedValue']()).toBe('1234');
      expect(component['selectedValue']()).toBe(1234);
    });

    it('should set selectedValue to null when input is empty or invalid', () => {
      const event = { target: { value: 'abc' } } as unknown as Event;
      component['onValueEdit'](event);

      expect(component['editedValue']()).toBe('');
      expect(component['selectedValue']()).toBeNull();
    });
  });

  describe('Field Selection and Emission', () => {
    it('should emit reading and close for single field', () => {
      vi.spyOn(component.reading, 'emit');
      vi.spyOn(component.close, 'emit');

      component['selectedValue'].set(456);
      component['confirmValue']();

      expect(component.reading.emit).toHaveBeenCalledWith({ fieldKey: 'water', value: 456 });
      expect(component.close.emit).toHaveBeenCalled();
    });

    it('should go to select-field step if multiple fields exist', () => {
      vi.spyOn(component.reading, 'emit');
      fixture.componentRef.setInput('fields', [
        { key: 'water1', label: 'Water 1' },
        { key: 'water2', label: 'Water 2' }
      ]);
      fixture.detectChanges();

      component['selectedValue'].set(456);
      component['confirmValue']();

      expect(component.reading.emit).not.toHaveBeenCalled();
      expect(component['step']()).toBe('select-field');
    });

    it('should go to select-field step if no fields exist (empty state)', () => {
      fixture.componentRef.setInput('fields', []);
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
      vi.spyOn<any, any>(component, 'drawCropCanvas');
      component['onCropEnd'](mockEvent);

      expect(component['cropRect']()).toEqual({ x: 10, y: 10, width: 50, height: 50 });
    });

    it('should process full image if confirmCrop is called without crop rect', () => {
      vi.spyOn<any, any>(component, 'processImage');
      component['capturedImage'].set('fake-image-data');
      component['cropRect'].set(null);

      component['confirmCrop']();

      expect(component['processImage']).toHaveBeenCalledWith('fake-image-data', false);
    });
  });
});
