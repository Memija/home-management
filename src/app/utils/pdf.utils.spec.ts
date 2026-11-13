import type { jsPDF } from 'jspdf';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConsumptionRecord } from '../models/records.model';
import {
  calculateHeatingPdfDiff,
  calculateWaterPdfDiff,
  drawHeatingYearSeparator,
  formatSignedDiff,
  loadImageAsBase64,
  renderPdfPageNumbers,
  renderPdfReportHeader,
  sortRecordsByDateAsc,
} from './pdf.utils';

interface MockPdfSpies {
  doc: jsPDF;
  addImage: ReturnType<typeof vi.fn>;
  setFontSize: ReturnType<typeof vi.fn>;
  setFont: ReturnType<typeof vi.fn>;
  setTextColor: ReturnType<typeof vi.fn>;
  text: ReturnType<typeof vi.fn>;
  setPage: ReturnType<typeof vi.fn>;
  getNumberOfPages: ReturnType<typeof vi.fn>;
  setDrawColor: ReturnType<typeof vi.fn>;
  setLineWidth: ReturnType<typeof vi.fn>;
  line: ReturnType<typeof vi.fn>;
}

function createMockPdfDoc(pageCount = 1, width = 297, height = 210): MockPdfSpies {
  const spies = {
    addImage: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    setPage: vi.fn(),
    getNumberOfPages: vi.fn().mockReturnValue(pageCount),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    line: vi.fn(),
    internal: {
      pageSize: { width, height },
    },
  };

  return {
    ...spies,
    doc: spies as unknown as jsPDF,
  };
}

function installMockImage(behavior: {
  width?: number;
  height?: number;
  shouldFailFor?: (url: string, attempt: number) => boolean;
}): { getAttemptCount: () => number; getInstances: () => { crossOrigin: string; src: string }[] } {
  let attempts = 0;
  const instances: { crossOrigin: string; src: string }[] = [];

  class MockImage {
    width = behavior.width ?? 64;
    height = behavior.height ?? 48;
    crossOrigin = '';
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    private currentSrc = '';

    get src(): string {
      return this.currentSrc;
    }

    set src(url: string) {
      this.currentSrc = url;
      attempts++;
      const currentAttempt = attempts;
      instances.push({ crossOrigin: this.crossOrigin, src: url });
      queueMicrotask(() => {
        if (behavior.shouldFailFor?.(url, currentAttempt)) {
          this.onerror?.();
        } else {
          this.onload?.();
        }
      });
    }
  }

  vi.stubGlobal('Image', MockImage);
  return {
    getAttemptCount: () => attempts,
    getInstances: () => instances,
  };
}

function installMockCanvas(options?: { nullContextOnFirstCall?: boolean; dataUrl?: string }): {
  drawImage: ReturnType<typeof vi.fn>;
  getLastDimensions: () => { width: number; height: number };
} {
  const origCreateElement = document.createElement.bind(document);
  const drawImage = vi.fn();
  let getContextCalls = 0;
  let lastWidth = 0;
  let lastHeight = 0;

  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName === 'canvas') {
      const mockCanvas = {
        set width(val: number) {
          lastWidth = val;
        },
        get width(): number {
          return lastWidth;
        },
        set height(val: number) {
          lastHeight = val;
        },
        get height(): number {
          return lastHeight;
        },
        getContext: vi.fn(() => {
          getContextCalls++;
          if (options?.nullContextOnFirstCall && getContextCalls === 1) {
            return null;
          }
          return { drawImage };
        }),
        toDataURL: vi.fn().mockReturnValue(options?.dataUrl ?? 'data:image/png;base64,logo'),
      };
      return mockCanvas as unknown as HTMLCanvasElement;
    }
    return origCreateElement(tagName);
  });

  return {
    drawImage,
    getLastDimensions: () => ({ width: lastWidth, height: lastHeight }),
  };
}

function buildWaterRecord(overrides: Partial<ConsumptionRecord> = {}): ConsumptionRecord {
  return {
    date: new Date('2025-01-01T00:00:00Z'),
    kitchenWarm: 10,
    kitchenCold: 20,
    bathroomWarm: 30,
    bathroomCold: 40,
    ...overrides,
  };
}

describe('pdf.utils', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('loadImageAsBase64', () => {
    it('should load an image with anonymous CORS, draw it onto a sized canvas, and cache per URL', async () => {
      const imageTracker = installMockImage({ width: 128, height: 96 });
      const canvasTracker = installMockCanvas({ dataUrl: 'data:image/png;base64,encoded' });

      const firstPromise = loadImageAsBase64('/assets/logo.png');
      const secondPromise = loadImageAsBase64('/assets/logo.png');

      expect(firstPromise).toBe(secondPromise);
      await expect(firstPromise).resolves.toBe('data:image/png;base64,encoded');
      expect(imageTracker.getAttemptCount()).toBe(1);
      expect(imageTracker.getInstances()[0]).toEqual({
        crossOrigin: 'anonymous',
        src: '/assets/logo.png',
      });
      expect(canvasTracker.getLastDimensions()).toEqual({ width: 128, height: 96 });
      expect(canvasTracker.drawImage).toHaveBeenCalledTimes(1);
    });

    it('should cache distinct URLs independently under the same Image constructor', async () => {
      const imageTracker = installMockImage({});
      installMockCanvas({ dataUrl: 'data:image/png;base64,img' });

      await loadImageAsBase64('/assets/one.png');
      await loadImageAsBase64('/assets/two.png');

      expect(imageTracker.getAttemptCount()).toBe(2);
    });

    it('should evict failed URLs on image load error so subsequent retries can succeed', async () => {
      const imageTracker = installMockImage({
        shouldFailFor: (_url, attempt) => attempt === 1,
      });
      installMockCanvas({ dataUrl: 'data:image/png;base64,recovered' });

      await expect(loadImageAsBase64('/assets/flaky.png')).rejects.toThrow(
        'Failed to load image: /assets/flaky.png',
      );
      await expect(loadImageAsBase64('/assets/flaky.png')).resolves.toBe(
        'data:image/png;base64,recovered',
      );
      expect(imageTracker.getAttemptCount()).toBe(2);
    });

    it('should reject and evict URL from cache when 2D canvas context is unavailable', async () => {
      installMockImage({});
      installMockCanvas({
        nullContextOnFirstCall: true,
        dataUrl: 'data:image/png;base64,retry-ok',
      });

      await expect(loadImageAsBase64('/assets/no-ctx.png')).rejects.toThrow(
        'Could not get canvas context',
      );
      await expect(loadImageAsBase64('/assets/no-ctx.png')).resolves.toBe(
        'data:image/png;base64,retry-ok',
      );
    });
  });

  describe('sortRecordsByDateAsc', () => {
    it('should return a new shallow copy for empty and single-element arrays', () => {
      const empty: { date: Date }[] = [];
      const single = [{ date: new Date('2025-05-01T00:00:00Z') }];

      const sortedEmpty = sortRecordsByDateAsc(empty);
      const sortedSingle = sortRecordsByDateAsc(single);

      expect(sortedEmpty).toEqual([]);
      expect(sortedEmpty).not.toBe(empty);
      expect(sortedSingle).toEqual(single);
      expect(sortedSingle).not.toBe(single);
    });

    it('should fast-path already sorted records (including equal timestamps) without mutating input', () => {
      const input = [
        { id: 'a', date: new Date('2025-01-01T00:00:00Z') },
        { id: 'b', date: new Date('2025-01-01T00:00:00Z') },
        { id: 'c', date: new Date('2025-02-01T00:00:00Z') },
      ];

      const result = sortRecordsByDateAsc(input);

      expect(result.map((r) => r.id)).toEqual(['a', 'b', 'c']);
      expect(result).not.toBe(input);
    });

    it('should sort out-of-order records ascending without mutating the original array and support non-Date date representations', () => {
      const input = [
        { id: 'mar', date: new Date('2025-03-01T00:00:00Z') },
        { id: 'jan', date: '2025-01-15T00:00:00Z' as unknown as Date },
        { id: 'feb', date: { seconds: 1738368000 } as unknown as Date },
      ];
      const snapshot = [...input];

      const result = sortRecordsByDateAsc(input);

      expect(result.map((r) => r.id)).toEqual(['jan', 'feb', 'mar']);
      expect(input).toEqual(snapshot);
    });
  });

  describe('renderPdfReportHeader', () => {
    it('should embed provided logoPromise and draw styled header text', async () => {
      const pdf = createMockPdfDoc();

      await renderPdfReportHeader(pdf.doc, {
        appName: 'Home Management',
        title: 'Water Report',
        generatedText: 'Generated on 2026-11-13',
        themeColor: [14, 165, 233],
        logoPromise: Promise.resolve('data:image/png;base64,custom'),
      });

      expect(pdf.addImage).toHaveBeenCalledWith(
        'data:image/png;base64,custom',
        'PNG',
        14,
        8,
        15,
        15,
      );
      expect(pdf.setFont).toHaveBeenCalledWith('helvetica', 'bold');
      expect(pdf.setTextColor).toHaveBeenCalledWith(14, 165, 233);
      expect(pdf.text).toHaveBeenCalledWith('Home Management', 32, 16);
      expect(pdf.text).toHaveBeenCalledWith('Water Report', 14, 32);
      expect(pdf.text).toHaveBeenCalledWith('Generated on 2026-11-13', 14, 40);
      expect(pdf.setTextColor).toHaveBeenLastCalledWith(0);
    });

    it('should load default /assets/logo-128.png when logoPromise is omitted', async () => {
      const imageTracker = installMockImage({});
      installMockCanvas({ dataUrl: 'data:image/png;base64,default-logo' });
      const pdf = createMockPdfDoc();

      await renderPdfReportHeader(pdf.doc, {
        appName: 'App',
        title: 'Heating',
        generatedText: 'Today',
        themeColor: [239, 68, 68],
      });

      expect(imageTracker.getInstances()[0]?.src).toBe('/assets/logo-128.png');
      expect(pdf.addImage).toHaveBeenCalledWith(
        'data:image/png;base64,default-logo',
        'PNG',
        14,
        8,
        15,
        15,
      );
    });

    it('should warn and still render all header text when logo loading fails', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const pdf = createMockPdfDoc();
      const logoError = new Error('Missing logo');

      await renderPdfReportHeader(pdf.doc, {
        appName: 'App',
        title: 'Electricity',
        generatedText: 'Today',
        themeColor: [234, 179, 8],
        logoPromise: Promise.reject(logoError),
      });

      expect(warnSpy).toHaveBeenCalledWith('Could not load logo for PDF:', logoError);
      expect(pdf.addImage).not.toHaveBeenCalled();
      expect(pdf.text).toHaveBeenCalledWith('App', 32, 16);
      expect(pdf.text).toHaveBeenCalledWith('Electricity', 14, 32);
      expect(pdf.text).toHaveBeenCalledWith('Today', 14, 40);
    });
  });

  describe('renderPdfPageNumbers', () => {
    it('should render centered i / N footers across all pages', () => {
      const pdf = createMockPdfDoc(3, 297, 210);

      renderPdfPageNumbers(pdf.doc);

      expect(pdf.setPage).toHaveBeenCalledTimes(3);
      expect(pdf.text).toHaveBeenNthCalledWith(1, '1 / 3', 148.5, 200, { align: 'center' });
      expect(pdf.text).toHaveBeenNthCalledWith(2, '2 / 3', 148.5, 200, { align: 'center' });
      expect(pdf.text).toHaveBeenNthCalledWith(3, '3 / 3', 148.5, 200, { align: 'center' });
    });

    it('should do nothing when document reports zero pages', () => {
      const pdf = createMockPdfDoc(0);

      renderPdfPageNumbers(pdf.doc);

      expect(pdf.setPage).not.toHaveBeenCalled();
      expect(pdf.text).not.toHaveBeenCalled();
    });
  });

  describe('formatSignedDiff', () => {
    it('should prefix zero, negative zero, and positive numbers with + and keep - for negatives', () => {
      expect(formatSignedDiff(0)).toBe('+0.00');
      expect(formatSignedDiff(-0)).toBe('+0.00');
      expect(formatSignedDiff(12.346)).toBe('+12.35');
      expect(formatSignedDiff(-4.5)).toBe('-4.50');
    });
  });

  describe('calculateWaterPdfDiff', () => {
    it('should sum positive deltas across all four water meters and return +0.00 when unchanged', () => {
      const prev = buildWaterRecord({
        kitchenWarm: 10,
        kitchenCold: 20,
        bathroomWarm: 30,
        bathroomCold: 40,
      });
      const curr = buildWaterRecord({
        kitchenWarm: 12.5,
        kitchenCold: 25,
        bathroomWarm: 31.25,
        bathroomCold: 41.25,
      });

      expect(calculateWaterPdfDiff(curr, prev)).toBe('+10.00');
      expect(calculateWaterPdfDiff(prev, prev)).toBe('+0.00');
    });

    it('should treat decreased individual water meter readings as meter resets using current value', () => {
      const prev = buildWaterRecord({
        kitchenWarm: 100,
        kitchenCold: 50,
        bathroomWarm: 80,
        bathroomCold: 40,
      });
      const curr = buildWaterRecord({
        kitchenWarm: 5, // reset -> +5
        kitchenCold: 55, // normal -> +5
        bathroomWarm: 0, // reset to zero -> +0
        bathroomCold: 42.5, // normal -> +2.5
      });

      expect(calculateWaterPdfDiff(curr, prev)).toBe('+12.50');
    });
  });

  describe('calculateHeatingPdfDiff', () => {
    it('should handle normal increases, room meter resets, newly added rooms, and empty room maps', () => {
      expect(calculateHeatingPdfDiff({ rooms: {} }, { rooms: {} })).toBe('+0.00');

      const prev = { rooms: { living: 100, bedroom: 50, hallway: 30 } };
      const curr = {
        rooms: {
          living: 120, // +20
          bedroom: 8, // meter reset (< 50) -> +8
          hallway: 0, // meter reset to zero -> +0
          office: 15, // new room -> +15
        },
      };

      expect(calculateHeatingPdfDiff(curr, prev)).toBe('+43.00');
    });

    it('should handle rooms removed since prevRecord for positive, zero, and negative previous values and ignore prototype keys', () => {
      const proto = { inheritedRoom: 500 };
      const currRooms = Object.assign(Object.create(proto) as Record<string, number>, {
        living: 10,
      });
      const prevPositiveRemoved = Object.assign(Object.create(proto) as Record<string, number>, {
        living: 10,
        removedPositive: 75,
        removedZero: 0,
      });

      expect(calculateHeatingPdfDiff({ rooms: currRooms }, { rooms: prevPositiveRemoved })).toBe(
        '+0.00',
      );

      const prevNegativeRemoved = { rooms: { removedNegative: -6 } };
      expect(calculateHeatingPdfDiff({ rooms: {} }, prevNegativeRemoved)).toBe('+6.00');
    });
  });

  describe('drawHeatingYearSeparator', () => {
    it('should draw a horizontal separator at first body column when the year changes', () => {
      const pdf = createMockPdfDoc(1, 297, 210);
      const sortedRecords = [
        { date: new Date('2024-12-20T00:00:00Z') },
        { date: '2025-01-05T00:00:00Z' as unknown as Date },
      ];

      drawHeatingYearSeparator(
        {
          section: 'body',
          row: { index: 1 },
          column: { index: 0 },
          doc: pdf.doc,
          cell: { y: 72.5 },
        },
        sortedRecords,
      );

      expect(pdf.setDrawColor).toHaveBeenCalledWith(150, 150, 150);
      expect(pdf.setLineWidth).toHaveBeenCalledWith(0.5);
      expect(pdf.line).toHaveBeenCalledWith(14, 72.5, 283, 72.5);
    });

    it('should not draw a separator for same-year rows, row index 0, non-zero columns, or non-body sections', () => {
      const pdf = createMockPdfDoc(1, 297, 210);
      const sortedRecords = [
        { date: new Date('2024-06-01T00:00:00Z') },
        { date: new Date('2024-12-01T00:00:00Z') },
        { date: new Date('2025-01-01T00:00:00Z') },
      ];

      // Same year (row 1: 2024 vs row 0: 2024)
      drawHeatingYearSeparator(
        { section: 'body', row: { index: 1 }, column: { index: 0 }, doc: pdf.doc, cell: { y: 50 } },
        sortedRecords,
      );
      // First row (index 0)
      drawHeatingYearSeparator(
        { section: 'body', row: { index: 0 }, column: { index: 0 }, doc: pdf.doc, cell: { y: 50 } },
        sortedRecords,
      );
      // Non-zero column on year boundary (row 2, col 1)
      drawHeatingYearSeparator(
        { section: 'body', row: { index: 2 }, column: { index: 1 }, doc: pdf.doc, cell: { y: 50 } },
        sortedRecords,
      );
      // Header section on year boundary
      drawHeatingYearSeparator(
        { section: 'head', row: { index: 2 }, column: { index: 0 }, doc: pdf.doc, cell: { y: 50 } },
        sortedRecords,
      );

      expect(pdf.line).not.toHaveBeenCalled();
    });
  });
});
