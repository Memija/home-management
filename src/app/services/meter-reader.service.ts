import { Injectable, signal } from '@angular/core';

/**
 * Result from OCR meter reading
 */
export interface MeterReadingResult {
  /** The extracted numeric value */
  value: number | null;
  /** Raw text recognized by OCR */
  rawText: string;
  /** Confidence score (0-100) */
  confidence: number;
  /** All numeric candidates found */
  candidates: number[];
}

/** Internal result from a single OCR pass */
interface TesseractWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

interface OcrPassResult {
  text: string;
  confidence: number;
  words: TesseractWord[];
}

interface ScoredCandidate {
  value: number;
  text: string;
  confidence: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

/**
 * Service for reading meter values from images using Tesseract.js OCR.
 * Uses a multi-pass strategy with different image preprocessing techniques
 * to maximize accuracy on various meter types (analog, digital LCD, heat allocators).
 * Lazy-loads Tesseract to avoid increasing initial bundle size.
 */
@Injectable({ providedIn: 'root' })
export class MeterReaderService {
  /** Processing state exposed as signal for UI binding */
  readonly isProcessing = signal(false);
  /** Progress percentage (0-100) during OCR */
  readonly progress = signal(0);

  private tesseractWorker: unknown = null;

  /**
   * @param imageSource - File or base64 data URL
   * @param isCropped - When true, the image is already cropped to just the digits.
   *                    Uses a single-line OCR mode with upscaling for best accuracy.
   */
  async readMeter(imageSource: File | string, isCropped = false): Promise<MeterReadingResult> {
    this.isProcessing.set(true);
    this.progress.set(0);

    try {
      const { imageData, imgWidth, imgHeight } = await this.prepareImageData(imageSource, isCropped);

      const ocrResults = isCropped
        ? await this.runCroppedMode(imageData)
        : await this.runFullImageMode(imageData);

      this.progress.set(95);

      const { candidates, bestRawText, bestOverallConfidence } = this.aggregateOcrResults(ocrResults, imgWidth, imgHeight);

      const value = this.scoreAndSelectBest(candidates, isCropped);
      const uniqueValues = [...new Set(candidates.map(c => c.value))].sort((a, b) => b - a);

      return {
        value,
        rawText: bestRawText,
        confidence: bestOverallConfidence,
        candidates: uniqueValues,
      };
    } catch (error: unknown) {
      console.error('Meter reading OCR failed:', error);
      return { value: null, rawText: `ERROR: ${(error as Error)?.message || error}`, confidence: 0, candidates: [] };
    } finally {
      this.isProcessing.set(false);
      this.progress.set(100);
    }
  }

  /**
   * Prepares the image data and calculates its dimensions.
   * Upscales the image if it is pre-cropped.
   */
  private async prepareImageData(imageSource: File | string, isCropped: boolean): Promise<{ imageData: string, imgWidth: number, imgHeight: number }> {
    let imageData: string;
    if (imageSource instanceof File) {
      imageData = await this.fileToDataUrl(imageSource);
    } else {
      imageData = imageSource;
    }

    // When pre-cropped, upscale to ensure Tesseract has enough resolution
    if (isCropped) {
      imageData = await this.upscaleImage(imageData, 600);
    }

    // Get image dimensions for centrality calculation
    const img = new Image();
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = imageData;
    });

    return { imageData, imgWidth: img.width, imgHeight: img.height };
  }

  /**
   * Runs OCR in single-line mode with two focused passes for pre-cropped images.
   */
  private async runCroppedMode(imageData: string): Promise<OcrPassResult[]> {
    // Pass 1: PSM 7 (single text line), clean image
    this.progress.set(10);
    const pass1 = await this.runOcrPass(imageData, '0123456789.,', '7');

    // Pass 2: PSM 7, high-contrast binarized
    this.progress.set(50);
    const contrastImage = await this.preprocessContrast(imageData);
    const pass2 = await this.runOcrPass(contrastImage, '0123456789.,', '7');

    return [pass1, pass2];
  }

  /**
   * Runs OCR in full image mode with three different preprocessing strategies.
   */
  private async runFullImageMode(imageData: string): Promise<OcrPassResult[]> {
    this.progress.set(5);
    const pass1 = await this.runOcrPass(imageData);

    this.progress.set(35);
    const contrastImage = await this.preprocessContrast(imageData);
    const pass2 = await this.runOcrPass(contrastImage, '0123456789.,');

    this.progress.set(65);
    const invertedImage = await this.preprocessInverted(imageData);
    const pass3 = await this.runOcrPass(invertedImage, '0123456789.,');

    return [pass1, pass2, pass3];
  }

  /**
   * Aggregates OCR results from multiple passes, extracting numerical candidates.
   */
  private aggregateOcrResults(passes: OcrPassResult[], imgWidth: number, imgHeight: number): { candidates: ScoredCandidate[], bestRawText: string, bestOverallConfidence: number } {
    const candidates: ScoredCandidate[] = [];
    let bestRawText = '';
    let bestOverallConfidence = 0;

    for (const pass of passes) {
      if (pass.confidence > bestOverallConfidence) {
        bestOverallConfidence = pass.confidence;
        bestRawText = pass.text;
      }

      if (pass.words.length > 0) {
        pass.words.forEach(word => {
          const numbers = this.extractNumbers(word.text);
          if (numbers.length > 0) {
            const centerX = (word.bbox.x0 + word.bbox.x1) / 2;
            const centerY = (word.bbox.y0 + word.bbox.y1) / 2;
            const width = word.bbox.x1 - word.bbox.x0;
            const height = word.bbox.y1 - word.bbox.y0;

            numbers.forEach(val => {
              candidates.push({
                value: val, text: word.text, confidence: word.confidence,
                centerX: centerX / imgWidth, centerY: centerY / imgHeight,
                width: width / imgWidth, height: height / imgHeight
              });
            });
          }
        });
      } else {
        // Fallback: no word bboxes — extract from raw text, place at center
        const numbers = this.extractNumbers(pass.text);
        numbers.forEach(val => {
          candidates.push({
            value: val, text: String(val), confidence: pass.confidence,
            centerX: 0.5, centerY: 0.5, width: 0.2, height: 0.1
          });
        });
      }
    }

    return { candidates, bestRawText, bestOverallConfidence };
  }

  /**
   * Clean up the Tesseract worker to free memory.
   */
  async dispose(): Promise<void> {
    if (this.tesseractWorker) {
      await (this.tesseractWorker as { terminate: () => Promise<void> }).terminate();
      this.tesseractWorker = null;
    }
  }

  /**
   * Run a single OCR pass on an image.
   */
  private async runOcrPass(imageData: string, whitelist?: string, psm?: string): Promise<OcrPassResult> {
    const worker = await this.getWorker();

    await worker.setParameters({
      tessedit_char_whitelist: whitelist ?? '0123456789.,OolISsBbZz',
      tessedit_pageseg_mode: (psm ?? '11') as any,
    });

    const result = await worker.recognize(imageData);
    return {
      text: result.data.text,
      confidence: result.data.confidence,
      words: (result.data.words ?? []).map((w: TesseractWord) => ({
        text: w.text,
        confidence: w.confidence,
        bbox: w.bbox
      }))
    };
  }

  /**
   * Lazy-load and initialize the Tesseract worker.
   */
  private async getWorker(): Promise<any> {
    if (this.tesseractWorker) {
      return this.tesseractWorker;
    }

    // tesseract.js v7's ESM bundle (`tesseract.esm.min.js`) only exposes a
    // default export wrapping the CJS object. When Angular's production bundler
    // resolves the dynamic import it picks up the ESM file, so named-export
    // destructuring `{ createWorker }` yields `undefined` → "t is not a function".
    // We therefore check the default export first and fall back to the module
    // root, which handles both CommonJS and ESM interop.
    const tesseractModule = await import('tesseract.js');
    const createWorker: typeof tesseractModule.createWorker =
      // ESM default-export path (production build)
      (tesseractModule.default as typeof tesseractModule)?.createWorker ??
      // Named-export path (dev build / CJS interop)
      tesseractModule.createWorker;

    const worker = await createWorker('eng', 1, {
      workerPath: '/assets/tesseract/worker.min.js',
      corePath: '/assets/tesseract/core/tesseract-core.wasm.js',
      langPath: '/assets/tesseract-lang',
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') {
          const passProgress = Math.round(m.progress * 100);
          const currentBase = this.progress();
          this.progress.set(Math.min(currentBase + Math.round(passProgress * 0.3), 100));
        }
      },
    });

    // PSM.SPARSE_TEXT (11) works best for finding numbers scattered across a meter face.
    // user_defined_dpi prevents Tesseract from estimating image resolution, which suppresses
    // the noisy "Estimating resolution as XXX" log that Tesseract prints to the worker console.
    await worker.setParameters({
      tessedit_pageseg_mode: '11' as any,
      tessedit_char_whitelist: '0123456789.,OolISsBbZz',
      preserve_interword_spaces: '1',
      user_defined_dpi: '70',
    });

    this.tesseractWorker = worker;
    return worker;
  }

  /**
   * Helper to scale canvas context and draw image
   */
  private setupCanvas(img: HTMLImageElement): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
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
  private fileToDataUrl(file: File): Promise<string> {
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
  private upscaleImage(dataUrl: string, minHeight: number): Promise<string> {
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
        // Use image smoothing for upscaling
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
  private preprocessContrast(dataUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const { canvas, ctx } = this.setupCanvas(img);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Calculate average brightness to use as a dynamic threshold
        let totalBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          totalBrightness += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        }
        const avgBrightness = totalBrightness / (data.length / 4);
        
        // Create a temporary array for morphological operation
        const grayData = new Uint8Array(data.length / 4);
        for (let i = 0; i < data.length; i += 4) {
          grayData[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        }

        const w = canvas.width;
        const h = canvas.height;
        const dilatedData = new Uint8Array(grayData.length);

        // Morphological Erosion (expands dark areas)
        // Vertical only! This helps connect horizontally broken 7-segment LCD digits
        // without accidentally merging horizontally adjacent printed labels
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            let minVal = grayData[idx];
            
            // Check vertical neighbors
            if (y > 0) minVal = Math.min(minVal, grayData[idx - w]);
            if (y < h - 1) minVal = Math.min(minVal, grayData[idx + w]);

            dilatedData[idx] = minVal;
          }
        }
        
        // Use a threshold slightly lower than average to catch faint LCD segments
        const threshold = avgBrightness * 0.95;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            const gray = dilatedData[idx];
            // Strict binary: black or white
            const val = gray > threshold ? 255 : 0;
            
            const dataIdx = idx * 4;
            data[dataIdx] = val;
            data[dataIdx + 1] = val;
            data[dataIdx + 2] = val;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  /**
   * Preprocessing pass: Inverted binary.
   * Good for odometer-style meters where numbers are white on black dials.
   */
  private preprocessInverted(dataUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const { canvas, ctx } = this.setupCanvas(img);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        let totalBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          totalBrightness += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        }
        const avgBrightness = totalBrightness / (data.length / 4);

        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          // Invert and binary threshold
          const val = (255 - gray) > (255 - avgBrightness * 1.1) ? 255 : 0;
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
  private extractNumbers(text: string): number[] {
    if (!text) return [];

    // Pre-clean: fix common OCR misreads
    let cleaned = text
      .replace(/[oO]/g, '0') // O → 0
      .replace(/[lI|]/g, '1') // l, I, | → 1
      .replace(/[zZ]/g, '2') // Z → 2
      .replace(/[sS]/g, '5') // S → 5
      .replace(/[bB]/g, '8'); // B → 8

    // Match contiguous number blocks (e.g., "15432", "1.234,56")
    const numberPatterns = cleaned.match(/[\d]+[.,\d]*[\d]|[\d]+/g) || [];

    return numberPatterns
      .map((n) => {
        // Handle European format (1.234,56) vs US format (1,234.56)
        let normalized = n;

        const commas = (normalized.match(/,/g) || []).length;
        const dots = (normalized.match(/\./g) || []).length;

        // If European format "1.234,56" or "12,34"
        if (commas === 1 && dots <= 1 && normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
          normalized = normalized.replace(/\./g, '').replace(',', '.');
        } 
        // If US format "1,234.56" or "12.34"
        else if (dots === 1 && commas <= 1 && normalized.lastIndexOf('.') > normalized.lastIndexOf(',')) {
          normalized = normalized.replace(/,/g, '');
        }
        // If multiple of same separator, assume thousand separators "1,234,567" or "1.234.567"
        else {
          normalized = normalized.replace(/[.,]/g, '');
        }

        return parseFloat(normalized);
      })
      .filter((n) => !isNaN(n) && n >= 0);
  }

  private scoreAndSelectBest(candidates: ScoredCandidate[], isCropped = false): number | null {
    if (candidates.length === 0) return null;

    if (isCropped) {
      // In cropped mode the image IS the reading — just return highest-confidence candidate.
      // De-duplicate by value and pick the one Tesseract was most confident about.
      const best = candidates.reduce((max, c) => c.confidence > max.confidence ? c : max);
      return best.value;
    }

    const scored = candidates.map(c => {
      let score = c.confidence;

      // Centrality: distance from center (0.5, 0.5)
      const distFromCenter = Math.sqrt(Math.pow(c.centerX - 0.5, 2) + Math.pow(c.centerY - 0.5, 2));
      const centralityFactor = 1 - Math.min(distFromCenter * 2, 1);
      score *= (1 + centralityFactor);

      // Length heuristic: meter readings are typically 4-7 digits
      const digits = Math.floor(c.value).toString().length;
      if (digits >= 4 && digits <= 7) {
        score *= 1.5;
      } else if (digits > 8) {
        // Heavy penalty for suspected concatenations
        score *= 0.1;
      } else if (digits < 3) {
        score *= 0.5;
      }

      return { candidate: c, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored[0].candidate.value;
  }
}
