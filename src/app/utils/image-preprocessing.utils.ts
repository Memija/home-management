/** Internal word bounding-box result from a single OCR pass */
export interface TesseractWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

/** Result from a single OCR pass */
export interface OcrPassResult {
  text: string;
  confidence: number;
  words: TesseractWord[];
}

/** Numeric candidate extracted from OCR with spatial metadata */
export interface ScoredCandidate {
  value: number;
  text: string;
  confidence: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

/**
 * Helper to scale canvas context and draw image
 */
export function setupCanvas(img: HTMLImageElement): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  const MAX_DIMENSION = 1000; // Tesseract works best when characters aren't too massive

  let width = img.width;
  let height = img.height;

  if (width > height && width > MAX_DIMENSION) {
    height *= MAX_DIMENSION / width;
    width = MAX_DIMENSION;
  } else if (height > MAX_DIMENSION) {
    width *= MAX_DIMENSION / height;
    height = MAX_DIMENSION;
  }

  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return { canvas, ctx };
}

/**
 * Convert a File to a base64 data URL.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Upscale a small image to a minimum height so Tesseract has enough resolution.
 * Cropped regions of a meter are often very small; Tesseract needs ~50px per character minimum.
 */
export function upscaleImage(dataUrl: string, minHeight: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.height >= minHeight) {
        resolve(dataUrl);
        return;
      }
      const scale = minHeight / img.height;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Preprocessing pass: Strict Binarization (Black & White).
 * Good for LCD displays where we need to isolate dark segments from light background.
 */
export function preprocessContrast(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { canvas, ctx } = setupCanvas(img);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const { avgBrightness, grayData } = computeAverageBrightnessAndGrayscale(data);
      const dilatedData = applyVerticalErosion(grayData, canvas.width, canvas.height);
      binarizeImageData(data, dilatedData, avgBrightness * 0.95);

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function computeAverageBrightnessAndGrayscale(data: Uint8ClampedArray): {
  avgBrightness: number;
  grayData: Uint8Array;
} {
  const pixelCount = data.length / 4;
  const grayData = new Uint8Array(pixelCount);
  let totalBrightness = 0;

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    grayData[i / 4] = gray;
    totalBrightness += gray;
  }

  return {
    avgBrightness: totalBrightness / pixelCount,
    grayData,
  };
}

export function applyVerticalErosion(grayData: Uint8Array, w: number, h: number): Uint8Array {
  const dilatedData = new Uint8Array(grayData.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      let minVal = grayData[idx];

      if (y > 0) minVal = Math.min(minVal, grayData[idx - w]);
      if (y < h - 1) minVal = Math.min(minVal, grayData[idx + w]);

      dilatedData[idx] = minVal;
    }
  }
  return dilatedData;
}

export function binarizeImageData(
  data: Uint8ClampedArray,
  dilatedData: Uint8Array,
  threshold: number,
): void {
  for (let idx = 0; idx < dilatedData.length; idx++) {
    const val = dilatedData[idx] > threshold ? 255 : 0;
    const dataIdx = idx * 4;
    data[dataIdx] = val;
    data[dataIdx + 1] = val;
    data[dataIdx + 2] = val;
  }
}

/**
 * Preprocessing pass: Inverted binary.
 * Good for odometer-style meters where numbers are white on black dials.
 */
export function preprocessInverted(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { canvas, ctx } = setupCanvas(img);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const { avgBrightness, grayData } = computeAverageBrightnessAndGrayscale(data);
      const threshold = 255 - avgBrightness * 1.1;

      for (let idx = 0; idx < grayData.length; idx++) {
        const val = 255 - grayData[idx] > threshold ? 255 : 0;
        const i = idx * 4;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Extract all numeric values from OCR text.
 * Handles various formats: "12345", "12,345", "1.234", "12345.6"
 * Also handles OCR artifacts like "O" for "0", "l" for "1", etc.
 */
export function extractNumbersFromOcrText(text: string): number[] {
  if (!text) return [];

  const cleaned = text
    .replace(/[oO]/g, '0')
    .replace(/[lI|]/g, '1')
    .replace(/[zZ]/g, '2')
    .replace(/[sS]/g, '5')
    .replace(/[bB]/g, '8');

  const numberPatterns = cleaned.match(/\d+[.,\d]*\d|\d+/g) || [];

  return numberPatterns
    .map((n) => {
      let normalized = n;
      const commas = (normalized.match(/,/g) || []).length;
      const dots = (normalized.match(/\./g) || []).length;

      if (commas === 1 && dots <= 1 && normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
        normalized = normalized.replaceAll('.', '').replace(',', '.');
      } else if (
        dots === 1 &&
        commas <= 1 &&
        normalized.lastIndexOf('.') > normalized.lastIndexOf(',')
      ) {
        normalized = normalized.replaceAll(',', '');
      } else {
        normalized = normalized.replace(/[.,]/g, '');
      }

      return Number.parseFloat(normalized);
    })
    .filter((n) => !Number.isNaN(n) && n >= 0);
}

/**
 * Score OCR numeric candidates and select the best meter reading value.
 */
export function scoreAndSelectBestCandidate(
  candidates: ScoredCandidate[],
  isCropped = false,
): number | null {
  if (candidates.length === 0) return null;

  if (isCropped) {
    const best = candidates.reduce(
      (max, c) => (c.confidence > max.confidence ? c : max),
      candidates[0],
    );
    return best.value;
  }

  const scored = candidates.map((c) => {
    let score = c.confidence;

    const distFromCenter = Math.sqrt(Math.pow(c.centerX - 0.5, 2) + Math.pow(c.centerY - 0.5, 2));
    const centralityFactor = 1 - Math.min(distFromCenter * 2, 1);
    score *= 1 + centralityFactor;

    const digits = Math.floor(c.value).toString().length;
    if (digits >= 4 && digits <= 7) {
      score *= 1.5;
    } else if (digits > 8) {
      score *= 0.1;
    } else if (digits < 3) {
      score *= 0.5;
    }

    return { candidate: c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].candidate.value;
}
