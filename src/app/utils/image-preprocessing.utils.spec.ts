import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ScoredCandidate,
  applyVerticalErosion,
  binarizeImageData,
  computeAverageBrightnessAndGrayscale,
  extractNumbersFromOcrText,
  fileToDataUrl,
  preprocessContrast,
  preprocessInverted,
  scoreAndSelectBestCandidate,
  setupCanvas,
  upscaleImage,
} from './image-preprocessing.utils';

interface MockCanvasSetup {
  mockCanvas: {
    width: number;
    height: number;
    getContext: ReturnType<typeof vi.fn>;
    toDataURL: ReturnType<typeof vi.fn>;
  };
  mockCtx: {
    imageSmoothingEnabled: boolean;
    imageSmoothingQuality: ImageSmoothingQuality;
    drawImage: ReturnType<typeof vi.fn>;
    getImageData: ReturnType<typeof vi.fn>;
    putImageData: ReturnType<typeof vi.fn>;
  };
}

function createCanvasSpy(options?: {
  imageData?: Uint8ClampedArray;
  dataUrl?: string;
}): MockCanvasSetup {
  const origCreateElement = document.createElement.bind(document);
  const pixelBuffer = options?.imageData ?? new Uint8ClampedArray(16);

  const mockCtx = {
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low' as ImageSmoothingQuality,
    drawImage: vi.fn(),
    getImageData: vi.fn().mockReturnValue({ data: pixelBuffer }),
    putImageData: vi.fn(),
  };

  const mockCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn().mockReturnValue(mockCtx),
    toDataURL: vi.fn().mockReturnValue(options?.dataUrl ?? 'data:image/png;base64,processed'),
  };

  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName === 'canvas') {
      return mockCanvas as unknown as HTMLCanvasElement;
    }
    return origCreateElement(tagName);
  });

  return { mockCanvas, mockCtx };
}

function createImageSpy(options: { width: number; height: number; shouldFail?: boolean }): void {
  vi.spyOn(window, 'Image').mockImplementation(function () {
    const img = {
      width: options.width,
      height: options.height,
      onload: null as ((this: GlobalEventHandlers, ev: Event) => unknown) | null,
      onerror: null as OnErrorEventHandler,
    } as unknown as HTMLImageElement;

    Object.defineProperty(img, 'src', {
      set() {
        queueMicrotask(() => {
          if (options.shouldFail) {
            img.onerror?.(new Event('error'));
          } else {
            img.onload?.(new Event('load'));
          }
        });
      },
    });

    return img;
  });
}

function buildCandidate(overrides: Partial<ScoredCandidate> = {}): ScoredCandidate {
  return {
    value: 12345,
    text: '12345',
    confidence: 80,
    centerX: 0.5,
    centerY: 0.5,
    width: 0.2,
    height: 0.1,
    ...overrides,
  };
}

describe('image-preprocessing.utils', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setupCanvas', () => {
    it('should preserve dimensions when image width and height are within 1000px', () => {
      const { mockCanvas, mockCtx } = createCanvasSpy();
      const img = { width: 640, height: 480 } as HTMLImageElement;

      const result = setupCanvas(img);

      expect(result.canvas).toBe(mockCanvas);
      expect(mockCanvas.width).toBe(640);
      expect(mockCanvas.height).toBe(480);
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d', { willReadFrequently: true });
      expect(mockCtx.drawImage).toHaveBeenCalledWith(img, 0, 0, 640, 480);
    });

    it('should scale landscape images down proportionally when width exceeds 1000px', () => {
      const { mockCanvas, mockCtx } = createCanvasSpy();
      const img = { width: 2000, height: 1500 } as HTMLImageElement;

      setupCanvas(img);

      expect(mockCanvas.width).toBe(1000);
      expect(mockCanvas.height).toBe(750);
      expect(mockCtx.drawImage).toHaveBeenCalledWith(img, 0, 0, 1000, 750);
    });

    it('should scale portrait and square images down proportionally when height exceeds 1000px', () => {
      const { mockCanvas } = createCanvasSpy();

      setupCanvas({ width: 800, height: 1600 } as HTMLImageElement);
      expect(mockCanvas.width).toBe(500);
      expect(mockCanvas.height).toBe(1000);

      setupCanvas({ width: 1400, height: 1400 } as HTMLImageElement);
      expect(mockCanvas.width).toBe(1000);
      expect(mockCanvas.height).toBe(1000);
    });
  });

  describe('fileToDataUrl', () => {
    it('should resolve with a base64 data URL when FileReader succeeds', async () => {
      const file = new File(['meter-reading'], 'meter.png', { type: 'image/png' });

      const dataUrl = await fileToDataUrl(file);

      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it('should reject with an error when FileReader fails', async () => {
      vi.spyOn(window, 'FileReader').mockImplementation(function () {
        const reader = {
          onload: null as ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null,
          onerror: null as ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null,
          readAsDataURL() {
            queueMicrotask(() => {
              reader.onerror?.call(
                reader as unknown as FileReader,
                new ProgressEvent('error') as ProgressEvent<FileReader>,
              );
            });
          },
        };
        return reader as unknown as FileReader;
      });

      const file = new File(['bad'], 'broken.png', { type: 'image/png' });
      await expect(fileToDataUrl(file)).rejects.toThrow('Failed to read file');
    });
  });

  describe('upscaleImage', () => {
    it('should return original dataUrl without creating a canvas when image meets minHeight', async () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      createImageSpy({ width: 300, height: 120 });

      const result = await upscaleImage('data:image/png;base64,original', 100);

      expect(result).toBe('data:image/png;base64,original');
      expect(createElementSpy).not.toHaveBeenCalled();
    });

    it('should upscale image with high smoothing quality when height is below minHeight', async () => {
      const { mockCanvas, mockCtx } = createCanvasSpy({
        dataUrl: 'data:image/png;base64,upscaled',
      });
      createImageSpy({ width: 50, height: 25 });

      const result = await upscaleImage('data:image/png;base64,small', 100);

      expect(result).toBe('data:image/png;base64,upscaled');
      expect(mockCanvas.width).toBe(200);
      expect(mockCanvas.height).toBe(100);
      expect(mockCtx.imageSmoothingEnabled).toBe(true);
      expect(mockCtx.imageSmoothingQuality).toBe('high');
      expect(mockCtx.drawImage).toHaveBeenCalledTimes(1);
    });

    it('should fall back to original dataUrl when image fails to load', async () => {
      createImageSpy({ width: 0, height: 0, shouldFail: true });

      const result = await upscaleImage('data:image/png;base64,invalid', 100);

      expect(result).toBe('data:image/png;base64,invalid');
    });
  });

  describe('computeAverageBrightnessAndGrayscale', () => {
    it('should compute weighted luminance per pixel and exact average brightness', () => {
      const rgba = new Uint8ClampedArray([255, 255, 255, 255, 100, 150, 200, 128]);

      const { avgBrightness, grayData } = computeAverageBrightnessAndGrayscale(rgba);

      expect(Array.from(grayData)).toEqual([255, 140]);
      expect(avgBrightness).toBeCloseTo(197.875, 5);
    });
  });

  describe('applyVerticalErosion', () => {
    it('should take vertical 3x1 minimums while keeping columns independent', () => {
      const gray = new Uint8Array([200, 50, 100, 180, 220, 240]);

      const eroded = applyVerticalErosion(gray, 2, 3);

      expect(Array.from(eroded)).toEqual([100, 50, 100, 50, 100, 180]);
    });
  });

  describe('binarizeImageData', () => {
    it('should threshold RGB channels to 0 or 255 while preserving alpha values', () => {
      const rgba = new Uint8ClampedArray([10, 20, 30, 200, 40, 50, 60, 150]);
      const dilated = new Uint8Array([100, 101]);

      binarizeImageData(rgba, dilated, 100);

      expect(Array.from(rgba)).toEqual([0, 0, 0, 200, 255, 255, 255, 150]);
    });
  });

  describe('preprocessContrast', () => {
    it('should binarize dark segments against light background and return PNG dataUrl', async () => {
      const rgba = new Uint8ClampedArray([20, 20, 20, 255, 240, 240, 240, 255]);
      const { mockCtx } = createCanvasSpy({
        imageData: rgba,
        dataUrl: 'data:image/png;base64,contrast',
      });
      createImageSpy({ width: 2, height: 1 });

      const result = await preprocessContrast('data:image/png;base64,raw');

      expect(result).toBe('data:image/png;base64,contrast');
      expect(Array.from(rgba)).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
      expect(mockCtx.putImageData).toHaveBeenCalledWith({ data: rgba }, 0, 0);
    });

    it('should resolve original dataUrl when image loading fails', async () => {
      createImageSpy({ width: 0, height: 0, shouldFail: true });

      await expect(preprocessContrast('data:image/png;base64,raw')).resolves.toBe(
        'data:image/png;base64,raw',
      );
    });
  });

  describe('preprocessInverted', () => {
    it('should invert pixel brightness before thresholding and return PNG dataUrl', async () => {
      const rgba = new Uint8ClampedArray([20, 20, 20, 255, 240, 240, 240, 255]);
      const { mockCtx } = createCanvasSpy({
        imageData: rgba,
        dataUrl: 'data:image/png;base64,inverted',
      });
      createImageSpy({ width: 2, height: 1 });

      const result = await preprocessInverted('data:image/png;base64,raw');

      expect(result).toBe('data:image/png;base64,inverted');
      expect(Array.from(rgba)).toEqual([255, 255, 255, 255, 0, 0, 0, 255]);
      expect(mockCtx.putImageData).toHaveBeenCalledWith({ data: rgba }, 0, 0);
    });

    it('should resolve original dataUrl when image loading fails', async () => {
      createImageSpy({ width: 0, height: 0, shouldFail: true });

      await expect(preprocessInverted('data:image/png;base64,raw')).resolves.toBe(
        'data:image/png;base64,raw',
      );
    });
  });

  describe('extractNumbersFromOcrText', () => {
    it('should return an empty array for empty or punctuation-only strings', () => {
      expect(extractNumbersFromOcrText('')).toEqual([]);
      expect(extractNumbersFromOcrText('... ,,, ---')).toEqual([]);
    });

    it('should normalize common OCR character misreads into digits', () => {
      expect(extractNumbersFromOcrText('oO lI| zZ sS bB')).toEqual([0, 111, 22, 55, 88]);
    });

    it('should parse European decimals, US decimals, and repeated thousand separators', () => {
      expect(extractNumbersFromOcrText('1.234,56')).toEqual([1234.56]);
      expect(extractNumbersFromOcrText('45,6')).toEqual([45.6]);
      expect(extractNumbersFromOcrText('1,234.56')).toEqual([1234.56]);
      expect(extractNumbersFromOcrText('45.6')).toEqual([45.6]);
      expect(extractNumbersFromOcrText('1.234.567')).toEqual([1234567]);
      expect(extractNumbersFromOcrText('1,234,567')).toEqual([1234567]);
    });

    it('should extract multiple readings from mixed OCR text', () => {
      expect(extractNumbersFromOcrText('kWh: 00123,4 - 987654')).toEqual([123.4, 987654]);
    });
  });

  describe('scoreAndSelectBestCandidate', () => {
    it('should return null when candidates list is empty', () => {
      expect(scoreAndSelectBestCandidate([])).toBeNull();
      expect(scoreAndSelectBestCandidate([], true)).toBeNull();
    });

    it('should select candidate with highest confidence when isCropped is true', () => {
      const candidates = [
        buildCandidate({ value: 12, confidence: 65, centerX: 0.5, centerY: 0.5 }),
        buildCandidate({ value: 123456789, confidence: 95, centerX: 0.05, centerY: 0.05 }),
        buildCandidate({ value: 54321, confidence: 80, centerX: 0.5, centerY: 0.5 }),
      ];

      expect(scoreAndSelectBestCandidate(candidates, true)).toBe(123456789);
    });

    it('should favor central 4-to-7 digit meter readings over off-center or atypical lengths', () => {
      const centralMeterReading = buildCandidate({
        value: 45678,
        confidence: 70,
        centerX: 0.5,
        centerY: 0.5,
      });
      const cornerReading = buildCandidate({
        value: 99999,
        confidence: 95,
        centerX: 0,
        centerY: 0,
      });
      const threeDigitReading = buildCandidate({
        value: 456,
        confidence: 90,
        centerX: 0.5,
        centerY: 0.5,
      });

      expect(
        scoreAndSelectBestCandidate([cornerReading, threeDigitReading, centralMeterReading]),
      ).toBe(45678);
    });

    it('should penalize short (<3 digits) and serial-length (>8 digits) candidates', () => {
      const twoDigit = buildCandidate({ value: 42, confidence: 80 });
      const nineDigitSerial = buildCandidate({ value: 123456789, confidence: 80 });
      const eightDigitNeutral = buildCandidate({ value: 12345678, confidence: 50 });

      expect(scoreAndSelectBestCandidate([nineDigitSerial, twoDigit])).toBe(42);
      expect(scoreAndSelectBestCandidate([twoDigit, eightDigitNeutral])).toBe(12345678);
    });
  });
});
