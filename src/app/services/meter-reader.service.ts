import { Injectable, signal } from '@angular/core';
import {
  TesseractWord,
  OcrPassResult,
  ScoredCandidate,
  fileToDataUrl,
  upscaleImage,
  preprocessContrast,
  preprocessInverted,
  extractNumbersFromOcrText,
  scoreAndSelectBestCandidate,
} from '../utils/image-preprocessing.utils';

interface TesseractWorker {
  setParameters(p: Record<string, unknown>): Promise<unknown>;
  recognize(
    i: unknown,
  ): Promise<{ data: { text: string; confidence: number; words: TesseractWord[] } }>;
}

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
  private workerPromise: Promise<unknown> | null = null;

  /**
   * Pre-warms the Tesseract WASM worker in the background (e.g. while the user crops the image).
   */
  async warmup(): Promise<void> {
    try {
      await this.getWorker();
    } catch {
      // Ignore warmup errors; readMeter will surface any actual failure
    }
  }

  /**
   * @param imageSource - File or base64 data URL
   * @param isCropped - When true, the image is already cropped to just the digits.
   *                    Uses a single-line OCR mode with upscaling for best accuracy.
   */
  async readMeter(imageSource: File | string, isCropped = false): Promise<MeterReadingResult> {
    this.isProcessing.set(true);
    this.progress.set(0);

    try {
      const { imageData, imgWidth, imgHeight } = await this.prepareImageData(
        imageSource,
        isCropped,
      );

      const ocrResults = isCropped
        ? await this.runCroppedMode(imageData)
        : await this.runFullImageMode(imageData);

      this.progress.set(95);

      const { candidates, bestRawText, bestOverallConfidence } = this.aggregateOcrResults(
        ocrResults,
        imgWidth,
        imgHeight,
      );

      const value = this.scoreAndSelectBest(candidates, isCropped);
      const uniqueValues = [...new Set(candidates.map((c) => c.value))].sort((a, b) => b - a);

      return {
        value,
        rawText: bestRawText,
        confidence: bestOverallConfidence,
        candidates: uniqueValues,
      };
    } catch (error: unknown) {
      console.error('Meter reading OCR failed:', error);
      return {
        value: null,
        rawText: `ERROR: ${(error as Error)?.message || error}`,
        confidence: 0,
        candidates: [],
      };
    } finally {
      this.isProcessing.set(false);
      this.progress.set(100);
    }
  }

  /**
   * Prepares the image data and calculates its dimensions.
   * Upscales the image if it is pre-cropped.
   */
  private async prepareImageData(
    imageSource: File | string,
    isCropped: boolean,
  ): Promise<{ imageData: string; imgWidth: number; imgHeight: number }> {
    let imageData =
      imageSource instanceof File ? await this.fileToDataUrl(imageSource) : imageSource;

    if (isCropped) {
      imageData = await this.upscaleImage(imageData, 600);
    }

    const img = new Image();
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = imageData;
    });

    return { imageData, imgWidth: img.width, imgHeight: img.height };
  }

  /**
   * Runs OCR in single-line mode with two focused passes for pre-cropped images.
   * Overlaps main-thread contrast preprocessing with Web Worker Pass 1 recognition.
   */
  private async runCroppedMode(imageData: string): Promise<OcrPassResult[]> {
    this.progress.set(10);
    const contrastPromise = this.preprocessContrast(imageData);
    const pass1 = await this.runOcrPass(imageData, '0123456789.,', '7');

    this.progress.set(50);
    const contrastImage = await contrastPromise;
    const pass2 = await this.runOcrPass(contrastImage, '0123456789.,', '7');

    return [pass1, pass2];
  }

  /**
   * Runs OCR in full image mode with three different preprocessing strategies.
   * Overlaps main-thread contrast & inversion preprocessing with Web Worker Pass 1 recognition.
   */
  private async runFullImageMode(imageData: string): Promise<OcrPassResult[]> {
    this.progress.set(5);
    const contrastPromise = this.preprocessContrast(imageData);
    const invertedPromise = this.preprocessInverted(imageData);
    const pass1 = await this.runOcrPass(imageData);

    this.progress.set(35);
    const contrastImage = await contrastPromise;
    const pass2 = await this.runOcrPass(contrastImage, '0123456789.,');

    this.progress.set(65);
    const invertedImage = await invertedPromise;
    const pass3 = await this.runOcrPass(invertedImage, '0123456789.,');

    return [pass1, pass2, pass3];
  }

  /**
   * Aggregates OCR results from multiple passes, extracting numerical candidates.
   */
  private aggregateOcrResults(
    passes: OcrPassResult[],
    imgWidth: number,
    imgHeight: number,
  ): { candidates: ScoredCandidate[]; bestRawText: string; bestOverallConfidence: number } {
    const candidates: ScoredCandidate[] = [];
    let bestRawText = '';
    let bestOverallConfidence = 0;

    for (const pass of passes) {
      if (pass.confidence > bestOverallConfidence) {
        bestOverallConfidence = pass.confidence;
        bestRawText = pass.text;
      }

      if (pass.words.length > 0) {
        pass.words.forEach((word) => {
          const numbers = this.extractNumbers(word.text);
          if (numbers.length > 0) {
            const centerX = (word.bbox.x0 + word.bbox.x1) / 2;
            const centerY = (word.bbox.y0 + word.bbox.y1) / 2;
            const width = word.bbox.x1 - word.bbox.x0;
            const height = word.bbox.y1 - word.bbox.y0;

            numbers.forEach((val) => {
              candidates.push({
                value: val,
                text: word.text,
                confidence: word.confidence,
                centerX: centerX / imgWidth,
                centerY: centerY / imgHeight,
                width: width / imgWidth,
                height: height / imgHeight,
              });
            });
          }
        });
      } else {
        const numbers = this.extractNumbers(pass.text);
        numbers.forEach((val) => {
          candidates.push({
            value: val,
            text: String(val),
            confidence: pass.confidence,
            centerX: 0.5,
            centerY: 0.5,
            width: 0.2,
            height: 0.1,
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
    this.workerPromise = null;
    if (this.tesseractWorker) {
      await (this.tesseractWorker as { terminate: () => Promise<void> }).terminate();
      this.tesseractWorker = null;
    }
  }

  /**
   * Run a single OCR pass on an image.
   */
  private async runOcrPass(
    imageData: string,
    whitelist?: string,
    psm?: string,
  ): Promise<OcrPassResult> {
    const worker = await this.getWorker();

    await (worker as unknown as TesseractWorker).setParameters({
      tessedit_char_whitelist: whitelist ?? '0123456789.,OolISsBbZz',
      tessedit_pageseg_mode: (psm ?? '11') as unknown,
    });

    const result = await (worker as unknown as TesseractWorker).recognize(imageData);
    return {
      text: result.data.text,
      confidence: result.data.confidence,
      words: (result.data.words ?? []).map((w: TesseractWord) => ({
        text: w.text,
        confidence: w.confidence,
        bbox: w.bbox,
      })),
    };
  }

  /**
   * Lazy-load and initialize the Tesseract worker.
   */
  private async getWorker(): Promise<unknown> {
    if (this.tesseractWorker) {
      return this.tesseractWorker;
    }
    if (this.workerPromise) {
      return this.workerPromise;
    }

    this.workerPromise = (async () => {
      const tesseractModule = await import('tesseract.js');
      const createWorker: typeof tesseractModule.createWorker =
        (tesseractModule.default as typeof tesseractModule)?.createWorker ??
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

      await (worker as unknown as TesseractWorker).setParameters({
        tessedit_pageseg_mode: '11' as unknown,
        tessedit_char_whitelist: '0123456789.,OolISsBbZz',
        preserve_interword_spaces: '1',
        user_defined_dpi: '70',
      });

      this.tesseractWorker = worker;
      return worker;
    })().catch((err) => {
      this.workerPromise = null;
      throw err;
    });

    return this.workerPromise;
  }

  private fileToDataUrl(file: File): Promise<string> {
    return fileToDataUrl(file);
  }

  private upscaleImage(dataUrl: string, minHeight: number): Promise<string> {
    return upscaleImage(dataUrl, minHeight);
  }

  private preprocessContrast(dataUrl: string): Promise<string> {
    return preprocessContrast(dataUrl);
  }

  private preprocessInverted(dataUrl: string): Promise<string> {
    return preprocessInverted(dataUrl);
  }

  private extractNumbers(text: string): number[] {
    return extractNumbersFromOcrText(text);
  }

  private scoreAndSelectBest(candidates: ScoredCandidate[], isCropped = false): number | null {
    return scoreAndSelectBestCandidate(candidates, isCropped);
  }
}
