import { TestBed } from '@angular/core/testing';
import { MeterReaderService } from './meter-reader.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('MeterReaderService', () => {
  let service: MeterReaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MeterReaderService]
    });
    service = TestBed.inject(MeterReaderService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('extractNumbers (private)', () => {
    it('should extract normal numbers', () => {
      const numbers = (service as any).extractNumbers('12345');
      expect(numbers).toEqual([12345]);
    });

    it('should extract European format numbers', () => {
      const numbers = (service as any).extractNumbers('1.234,56');
      expect(numbers).toEqual([1234.56]);
    });

    it('should extract US format numbers', () => {
      const numbers = (service as any).extractNumbers('1,234.56');
      expect(numbers).toEqual([1234.56]);
    });

    it('should handle multiple thousand separators', () => {
      const numbers1 = (service as any).extractNumbers('1.234.567');
      expect(numbers1).toEqual([1234567]);

      const numbers2 = (service as any).extractNumbers('1,234,567');
      expect(numbers2).toEqual([1234567]);
    });

    it('should handle OCR misreads', () => {
      // O -> 0, l -> 1, Z -> 2, S -> 5, B -> 8
      const numbers = (service as any).extractNumbers('OlZSB');
      expect(numbers).toEqual([1258]); // 01258 parsed as float is 1258
    });

    it('should handle multiple numbers in text', () => {
      const numbers = (service as any).extractNumbers('12345.6 789');
      expect(numbers).toEqual([12345.6, 789]);
    });

    it('should ignore punctuation only text', () => {
      const numbers = (service as any).extractNumbers('. , .,');
      expect(numbers).toEqual([]);
    });

    it('should handle empty or null string', () => {
      expect((service as any).extractNumbers('')).toEqual([]);
      expect((service as any).extractNumbers(null)).toEqual([]);
    });
  });

  describe('scoreAndSelectBest (private)', () => {
    it('should select best by confidence when isCropped is true', () => {
      const candidates = [
        { value: 123, confidence: 50 },
        { value: 456, confidence: 90 },
        { value: 789, confidence: 70 }
      ];
      const result = (service as any).scoreAndSelectBest(candidates, true);
      expect(result).toBe(456);
    });

    it('should apply centrality and length heuristics when isCropped is false', () => {
      const candidates = [
        // High confidence but bad length and off-center
        { value: 1, confidence: 90, centerX: 0.1, centerY: 0.1, text: '1', width: 0.1, height: 0.1 },
        // Moderate confidence, perfect length (5 digits) and perfectly centered
        { value: 12345, confidence: 80, centerX: 0.5, centerY: 0.5, text: '12345', width: 0.1, height: 0.1 },
        // Low confidence, bad length
        { value: 123456789, confidence: 50, centerX: 0.5, centerY: 0.5, text: '123456789', width: 0.1, height: 0.1 },
      ];
      const result = (service as any).scoreAndSelectBest(candidates, false);
      // Because of length heuristics (* 1.5 for 4-7 digits) and centrality, 12345 should win
      expect(result).toBe(12345);
    });
    
    it('should penalize candidates with more than 8 digits', () => {
      const candidates = [
        { value: 123456789, confidence: 90, centerX: 0.5, centerY: 0.5, text: '123456789', width: 0.1, height: 0.1 },
        { value: 12345, confidence: 50, centerX: 0.5, centerY: 0.5, text: '12345', width: 0.1, height: 0.1 },
      ];
      const result = (service as any).scoreAndSelectBest(candidates, false);
      expect(result).toBe(12345);
    });

    it('should penalize candidates with less than 3 digits', () => {
      const candidates = [
        { value: 12, confidence: 90, centerX: 0.5, centerY: 0.5, text: '12', width: 0.1, height: 0.1 },
        { value: 1234, confidence: 50, centerX: 0.5, centerY: 0.5, text: '1234', width: 0.1, height: 0.1 },
      ];
      const result = (service as any).scoreAndSelectBest(candidates, false);
      expect(result).toBe(1234);
    });

    it('should return null if no candidates', () => {
      expect((service as any).scoreAndSelectBest([], false)).toBeNull();
      expect((service as any).scoreAndSelectBest([], true)).toBeNull();
    });
  });

  describe('readMeter', () => {
    let mockWorker: any;

    beforeEach(() => {
      mockWorker = {
        setParameters: vi.fn().mockResolvedValue(undefined),
        recognize: vi.fn().mockResolvedValue({
          data: {
            text: '12345',
            confidence: 85,
            words: [
              { text: '12345', confidence: 85, bbox: { x0: 10, y0: 10, x1: 50, y1: 20 } }
            ]
          }
        }),
        terminate: vi.fn().mockResolvedValue(undefined)
      };

      vi.spyOn(service as any, 'getWorker').mockResolvedValue(mockWorker);
      vi.spyOn(service as any, 'prepareImageData').mockResolvedValue({
        imageData: 'data:image/png;base64,mock',
        imgWidth: 100,
        imgHeight: 100
      });
      vi.spyOn(service as any, 'preprocessContrast').mockResolvedValue('data:image/png;base64,mock-contrast');
      vi.spyOn(service as any, 'preprocessInverted').mockResolvedValue('data:image/png;base64,mock-inverted');
    });

    it('should process cropped image properly with 2 passes', async () => {
      const result = await service.readMeter('data:image/png;base64,mock', true);
      
      expect(service.isProcessing()).toBe(false);
      expect(service.progress()).toBe(100);
      
      expect((service as any).prepareImageData).toHaveBeenCalledWith('data:image/png;base64,mock', true);
      
      // 2 passes for cropped
      expect(mockWorker.recognize).toHaveBeenCalledTimes(2);
      
      expect(result.value).toBe(12345);
      expect(result.confidence).toBe(85);
      expect(result.candidates).toEqual([12345]);
    });

    it('should process full image properly with 3 passes', async () => {
      const mockFile = new File([], 'test.png');
      const result = await service.readMeter(mockFile, false);
      
      expect((service as any).prepareImageData).toHaveBeenCalledWith(mockFile, false);
      
      // 3 passes for full
      expect(mockWorker.recognize).toHaveBeenCalledTimes(3);
      
      expect(result.value).toBe(12345);
      expect(result.candidates).toEqual([12345]);
    });

    it('should fallback to pass text if words array is empty', async () => {
      mockWorker.recognize.mockResolvedValue({
        data: { text: '67890', confidence: 80, words: [] }
      });
      
      const result = await service.readMeter('data:image/png;base64,mock', true);
      
      expect(result.value).toBe(67890);
      expect(result.candidates).toEqual([67890]);
      expect(result.rawText).toBe('67890');
    });

    it('should return null if no numbers are found', async () => {
      mockWorker.recognize.mockResolvedValue({
        data: { text: '.', confidence: 50, words: [] }
      });
      
      const result = await service.readMeter('data:image/png;base64,mock', false);
      
      expect(result.value).toBeNull();
      expect(result.candidates.length).toBe(0);
    });

    it('should handle OCR failures gracefully', async () => {
      mockWorker.recognize.mockRejectedValue(new Error('OCR Engine crashed'));
      
      const result = await service.readMeter('data:image/png;base64,mock', true);
      
      expect(result.value).toBeNull();
      expect(result.rawText).toContain('OCR Engine crashed');
      expect(result.confidence).toBe(0);
      expect(result.candidates).toEqual([]);
      expect(service.isProcessing()).toBe(false);
      expect(service.progress()).toBe(100);
    });
  });

  describe('dispose', () => {
    it('should terminate the tesseract worker if it exists', async () => {
      const mockWorker = { terminate: vi.fn().mockResolvedValue(undefined) };
      (service as any).tesseractWorker = mockWorker;

      await service.dispose();

      expect(mockWorker.terminate).toHaveBeenCalled();
      expect((service as any).tesseractWorker).toBeNull();
    });

    it('should do nothing if worker does not exist', async () => {
      await service.dispose();
      // Should not throw
      expect((service as any).tesseractWorker).toBeNull();
    });
  });

  describe('runOcrPass (private)', () => {
    it('should configure worker and return OcrPassResult', async () => {
      const mockWorker = {
        setParameters: vi.fn().mockResolvedValue(undefined),
        recognize: vi.fn().mockResolvedValue({
          data: {
            text: 'test',
            confidence: 90,
            words: [{ text: 'test', confidence: 90, bbox: { x0: 0, y0: 0, x1: 10, y1: 10 } }]
          }
        })
      };
      vi.spyOn(service as any, 'getWorker').mockResolvedValue(mockWorker);

      const result = await (service as any).runOcrPass('imgData', '0123', '7');

      expect(mockWorker.setParameters).toHaveBeenCalledWith({
        tessedit_char_whitelist: '0123',
        tessedit_pageseg_mode: '7'
      });
      expect(mockWorker.recognize).toHaveBeenCalledWith('imgData');
      expect(result.text).toBe('test');
      expect(result.confidence).toBe(90);
      expect(result.words.length).toBe(1);
    });
    
    it('should handle undefined words in recognize output', async () => {
      const mockWorker = {
        setParameters: vi.fn().mockResolvedValue(undefined),
        recognize: vi.fn().mockResolvedValue({
          data: { text: 'test', confidence: 90 } // no words
        })
      };
      vi.spyOn(service as any, 'getWorker').mockResolvedValue(mockWorker);
      const result = await (service as any).runOcrPass('imgData');
      expect(result.words).toEqual([]);
    });
  });

  describe('prepareImageData (private)', () => {
    it('should load image dimensions', async () => {
      vi.spyOn(service as any, 'fileToDataUrl').mockResolvedValue('data:image/png;base64,mock');
      vi.spyOn(service as any, 'upscaleImage').mockResolvedValue('data:image/png;base64,mock');
      
      const imgSpy = vi.spyOn(window, 'Image').mockImplementation(function() {
        const img: any = {};
        Object.defineProperty(img, 'src', {
          set() { setTimeout(() => img.onload && img.onload(), 0); }
        });
        img.width = 150;
        img.height = 150;
        return img as HTMLImageElement;
      });

      const result = await (service as any).prepareImageData('data', false);
      expect(result.imgWidth).toBe(150);
      
      imgSpy.mockRestore();
    });
  });

  describe('preprocessing and file utilities (private)', () => {
    it('should run preprocessContrast and return data url', async () => {
      const mockCanvas = {
        width: 100, height: 100,
        getContext: vi.fn().mockReturnValue({
          drawImage: vi.fn(),
          getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(400) }),
          putImageData: vi.fn()
        }),
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,contrast')
      };
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'canvas') return mockCanvas as any;
        return document.createElement(tag);
      });
      const imgSpy = vi.spyOn(window, 'Image').mockImplementation(function() {
        const img: any = {};
        Object.defineProperty(img, 'src', {
          set() { setTimeout(() => img.onload && img.onload(), 0); }
        });
        img.width = 100;
        img.height = 100;
        return img as HTMLImageElement;
      });

      const result = await (service as any).preprocessContrast('data');
      expect(result).toBe('data:image/png;base64,contrast');

      createElementSpy.mockRestore();
      imgSpy.mockRestore();
    });

    it('should run preprocessInverted and return data url', async () => {
      const mockCanvas = {
        width: 100, height: 100,
        getContext: vi.fn().mockReturnValue({
          drawImage: vi.fn(),
          getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(400) }),
          putImageData: vi.fn()
        }),
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,inverted')
      };
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'canvas') return mockCanvas as any;
        return document.createElement(tag);
      });
      const imgSpy = vi.spyOn(window, 'Image').mockImplementation(function() {
        const img: any = {};
        Object.defineProperty(img, 'src', {
          set() { setTimeout(() => img.onload && img.onload(), 0); }
        });
        img.width = 100;
        img.height = 100;
        return img as HTMLImageElement;
      });

      const result = await (service as any).preprocessInverted('data');
      expect(result).toBe('data:image/png;base64,inverted');

      createElementSpy.mockRestore();
      imgSpy.mockRestore();
    });

    it('should run upscaleImage and return data url', async () => {
      const mockCanvas = {
        width: 200, height: 200,
        getContext: vi.fn().mockReturnValue({
          drawImage: vi.fn(),
        }),
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,upscaled')
      };
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'canvas') return mockCanvas as any;
        return document.createElement(tag);
      });
      const imgSpy = vi.spyOn(window, 'Image').mockImplementation(function() {
        const img: any = {};
        Object.defineProperty(img, 'src', {
          set() { setTimeout(() => img.onload && img.onload(), 0); }
        });
        img.width = 10;
        img.height = 10;
        return img as HTMLImageElement;
      });

      const result = await (service as any).upscaleImage('data', 100);
      expect(result).toBe('data:image/png;base64,upscaled');

      createElementSpy.mockRestore();
      imgSpy.mockRestore();
    });
  });

  describe('getWorker (private)', () => {
    it('should return existing worker if already initialized', async () => {
      const mockWorker = { setParameters: vi.fn() };
      (service as any).tesseractWorker = mockWorker;
      const worker = await (service as any).getWorker();
      expect(worker).toBe(mockWorker);
    });
  });
});
