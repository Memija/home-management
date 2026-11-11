import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  captureVideoFrameDataUrl,
  computeDragCropRect,
  drawCropOverlay,
  extractCroppedImageDataUrl,
  getCanvasCoords,
  groupMeterFields,
  scaleCanvasToFitImage,
} from './image-crop.helper';
import type { MeterField } from './meter-reader-modal.component';

describe('image-crop.helper', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('groupMeterFields', () => {
    it('should return an empty array when given no fields', () => {
      expect(groupMeterFields([])).toEqual([]);
    });

    it('should group fields by groupLabel while preserving insertion order', () => {
      const fields: MeterField[] = [
        { key: 'kw', label: 'Warm', groupLabel: 'Kitchen' },
        { key: 'bw', label: 'Warm', groupLabel: 'Bathroom' },
        { key: 'kc', label: 'Cold', groupLabel: 'Kitchen' },
      ];

      expect(groupMeterFields(fields)).toEqual([
        {
          label: 'Kitchen',
          fields: [
            { key: 'kw', label: 'Warm', groupLabel: 'Kitchen' },
            { key: 'kc', label: 'Cold', groupLabel: 'Kitchen' },
          ],
        },
        {
          label: 'Bathroom',
          fields: [{ key: 'bw', label: 'Warm', groupLabel: 'Bathroom' }],
        },
      ]);
    });

    it('should default missing groupLabel to an empty string', () => {
      const fields: MeterField[] = [
        { key: 'elec', label: 'Electricity' },
        { key: 'gas', label: 'Gas', groupLabel: '' },
      ];

      expect(groupMeterFields(fields)).toEqual([
        {
          label: '',
          fields: [
            { key: 'elec', label: 'Electricity' },
            { key: 'gas', label: 'Gas', groupLabel: '' },
          ],
        },
      ]);
    });
  });

  describe('captureVideoFrameDataUrl', () => {
    it('should return null when video is undefined', () => {
      expect(captureVideoFrameDataUrl(undefined)).toBeNull();
    });

    it('should return null when videoWidth is 0', () => {
      const video = { videoWidth: 0, videoHeight: 0 } as unknown as HTMLVideoElement;
      expect(captureVideoFrameDataUrl(video)).toBeNull();
    });

    it('should draw the video frame to an offscreen canvas and return a PNG data URL', () => {
      const drawImage = vi.fn();
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({ drawImage }),
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,video-frame'),
      } as unknown as HTMLCanvasElement;

      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas);

      const video = { videoWidth: 1280, videoHeight: 720 } as unknown as HTMLVideoElement;
      const result = captureVideoFrameDataUrl(video);

      expect(result).toBe('data:image/png;base64,video-frame');
      expect(mockCanvas.width).toBe(1280);
      expect(mockCanvas.height).toBe(720);
      expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 1280, 720);
      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png');
    });
  });

  describe('scaleCanvasToFitImage', () => {
    it('should scale down image when larger than container width or maxH', () => {
      const canvas = {
        width: 0,
        height: 0,
        parentElement: { clientWidth: 500 },
      } as unknown as HTMLCanvasElement;
      const img = { width: 1000, height: 800 } as unknown as HTMLImageElement;

      scaleCanvasToFitImage(canvas, img, 400);

      expect(canvas.width).toBe(500);
      expect(canvas.height).toBe(400);
    });

    it('should not upscale image when smaller than container and maxH', () => {
      const canvas = {
        width: 0,
        height: 0,
        parentElement: { clientWidth: 800 },
      } as unknown as HTMLCanvasElement;
      const img = { width: 300, height: 200 } as unknown as HTMLImageElement;

      scaleCanvasToFitImage(canvas, img, 400);

      expect(canvas.width).toBe(300);
      expect(canvas.height).toBe(200);
    });

    it('should fall back to 600px max width when parentElement is null', () => {
      const canvas = {
        width: 0,
        height: 0,
        parentElement: null,
      } as unknown as HTMLCanvasElement;
      const img = { width: 1200, height: 600 } as unknown as HTMLImageElement;

      scaleCanvasToFitImage(canvas, img);

      expect(canvas.width).toBe(600);
      expect(canvas.height).toBe(300);
    });

    it('should fall back to 600px max width when parentElement clientWidth is 0', () => {
      const canvas = {
        width: 0,
        height: 0,
        parentElement: { clientWidth: 0 },
      } as unknown as HTMLCanvasElement;
      const img = { width: 1200, height: 600 } as unknown as HTMLImageElement;

      scaleCanvasToFitImage(canvas, img);

      expect(canvas.width).toBe(600);
      expect(canvas.height).toBe(300);
    });
  });

  describe('drawCropOverlay', () => {
    const createMockCtx = () => ({
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      setLineDash: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
    });

    it('should return early when canvas is undefined or cropImage is null', () => {
      const img = { width: 400, height: 200 } as unknown as HTMLImageElement;
      expect(() => drawCropOverlay(undefined, img, null)).not.toThrow();

      const canvas = document.createElement('canvas');
      expect(() => drawCropOverlay(canvas, null, null)).not.toThrow();
    });

    it('should draw only the base image when rect is null', () => {
      const ctx = createMockCtx();
      const canvas = {
        width: 200,
        height: 100,
        getContext: vi.fn().mockReturnValue(ctx),
      } as unknown as HTMLCanvasElement;
      const img = { width: 400, height: 200 } as unknown as HTMLImageElement;

      drawCropOverlay(canvas, img, null);

      expect(ctx.clearRect).toHaveBeenCalledTimes(1);
      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 200, 100);
      expect(ctx.drawImage).toHaveBeenCalledTimes(1);
      expect(ctx.drawImage).toHaveBeenCalledWith(img, 0, 0, 200, 100);
      expect(ctx.strokeRect).not.toHaveBeenCalled();
    });

    it('should draw dark overlay, cropped region, dashed border, and 4 corner handles when rect is provided', () => {
      const ctx = createMockCtx();
      const canvas = {
        width: 200,
        height: 100,
        getContext: vi.fn().mockReturnValue(ctx),
      } as unknown as HTMLCanvasElement;
      const img = { width: 400, height: 200 } as unknown as HTMLImageElement;
      const rect = { x: 20, y: 10, width: 100, height: 50 };

      drawCropOverlay(canvas, img, rect);

      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 200, 100);
      expect(ctx.clearRect).toHaveBeenCalledWith(20, 10, 100, 50);
      expect(ctx.drawImage).toHaveBeenCalledWith(img, 40, 20, 200, 100, 20, 10, 100, 50);
      expect(ctx.setLineDash).toHaveBeenCalledWith([6, 3]);
      expect(ctx.strokeRect).toHaveBeenCalledWith(20, 10, 100, 50);
      expect(ctx.setLineDash).toHaveBeenCalledWith([]);
      // 1 full-canvas dark overlay + 4 corner handles = 5 fillRect calls
      expect(ctx.fillRect).toHaveBeenCalledTimes(5);
    });
  });

  describe('getCanvasCoords', () => {
    it('should return { x: 0, y: 0 } when canvas is undefined', () => {
      const event = new MouseEvent('mousedown', { clientX: 50, clientY: 50 });
      expect(getCanvasCoords(undefined, event)).toEqual({ x: 0, y: 0 });
    });

    it('should convert MouseEvent coordinates using canvas scale', () => {
      const canvas = {
        width: 400,
        height: 200,
        getBoundingClientRect: () => ({ left: 10, top: 20, width: 200, height: 100 }),
      } as unknown as HTMLCanvasElement;
      const event = new MouseEvent('mousedown', { clientX: 60, clientY: 45 });

      expect(getCanvasCoords(canvas, event)).toEqual({ x: 100, y: 50 });
    });

    it('should convert TouchEvent coordinates using canvas scale', () => {
      const canvas = {
        width: 300,
        height: 150,
        getBoundingClientRect: () => ({ left: 5, top: 10, width: 100, height: 50 }),
      } as unknown as HTMLCanvasElement;
      const touchEvent = {
        touches: [{ clientX: 25, clientY: 30 }],
      } as unknown as TouchEvent;

      expect(getCanvasCoords(canvas, touchEvent)).toEqual({ x: 60, y: 60 });
    });
  });

  describe('computeDragCropRect', () => {
    it('should compute normalized rect when dragging down-right', () => {
      expect(computeDragCropRect({ x: 10, y: 20 }, { x: 110, y: 70 })).toEqual({
        x: 10,
        y: 20,
        width: 100,
        height: 50,
      });
    });

    it('should compute normalized rect when dragging up-left', () => {
      expect(computeDragCropRect({ x: 110, y: 70 }, { x: 10, y: 20 })).toEqual({
        x: 10,
        y: 20,
        width: 100,
        height: 50,
      });
    });
  });

  describe('extractCroppedImageDataUrl', () => {
    it('should extract scaled crop region from full-resolution image', () => {
      const drawImage = vi.fn();
      const offscreenCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({ drawImage }),
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,cropped'),
      } as unknown as HTMLCanvasElement;
      vi.spyOn(document, 'createElement').mockReturnValue(offscreenCanvas);

      const cropCanvas = { width: 200, height: 100 } as unknown as HTMLCanvasElement;
      const cropImage = { width: 600, height: 300 } as unknown as HTMLImageElement;
      const rect = { x: 10, y: 20, width: 50, height: 30 };

      const result = extractCroppedImageDataUrl(cropCanvas, cropImage, rect);

      expect(result).toBe('data:image/png;base64,cropped');
      expect(offscreenCanvas.width).toBe(150);
      expect(offscreenCanvas.height).toBe(90);
      expect(drawImage).toHaveBeenCalledWith(cropImage, 30, 60, 150, 90, 0, 0, 150, 90);
    });

    it('should fall back to 1:1 scale when cropCanvas is undefined', () => {
      const drawImage = vi.fn();
      const offscreenCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({ drawImage }),
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,unscaled'),
      } as unknown as HTMLCanvasElement;
      vi.spyOn(document, 'createElement').mockReturnValue(offscreenCanvas);

      const cropImage = { width: 600, height: 300 } as unknown as HTMLImageElement;
      const rect = { x: 10, y: 20, width: 50, height: 30 };

      const result = extractCroppedImageDataUrl(undefined, cropImage, rect);

      expect(result).toBe('data:image/png;base64,unscaled');
      expect(offscreenCanvas.width).toBe(50);
      expect(offscreenCanvas.height).toBe(30);
      expect(drawImage).toHaveBeenCalledWith(cropImage, 10, 20, 50, 30, 0, 0, 50, 30);
    });
  });
});
