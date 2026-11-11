import type { MeterField } from './meter-reader-modal.component';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Groups meter fields by their `groupLabel` while preserving insertion order.
 */
export function groupMeterFields(fields: MeterField[]): { label: string; fields: MeterField[] }[] {
  const groups: { label: string; fields: MeterField[] }[] = [];
  const groupMap = new Map<string, MeterField[]>();

  for (const field of fields) {
    const label = field.groupLabel || '';
    if (!groupMap.has(label)) {
      groupMap.set(label, []);
      groups.push({ label, fields: groupMap.get(label)! });
    }
    groupMap.get(label)!.push(field);
  }

  return groups;
}

/**
 * Captures the current video frame onto an offscreen canvas and returns a PNG data URL.
 */
export function captureVideoFrameDataUrl(video: HTMLVideoElement | undefined): string | null {
  if (!video || video.videoWidth === 0) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/png');
}

/**
 * Scales the canvas dimensions to fit the image within the container's width and max height.
 */
export function scaleCanvasToFitImage(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  maxH = 400,
): void {
  const maxW = canvas.parentElement?.clientWidth || 600;
  const scale = Math.min(maxW / img.width, maxH / img.height, 1);
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
}

/**
 * Draws the loaded image and optional crop selection overlay onto the canvas.
 */
export function drawCropOverlay(
  canvas: HTMLCanvasElement | undefined,
  cropImage: HTMLImageElement | null,
  rect: CropRect | null,
): void {
  if (!canvas || !cropImage) return;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(cropImage, 0, 0, canvas.width, canvas.height);

  if (!rect) return;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
  ctx.drawImage(
    cropImage,
    (rect.x / canvas.width) * cropImage.width,
    (rect.y / canvas.height) * cropImage.height,
    (rect.width / canvas.width) * cropImage.width,
    (rect.height / canvas.height) * cropImage.height,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
  );

  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 3]);
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.setLineDash([]);

  const handleSize = 8;
  ctx.fillStyle = '#3b82f6';
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x, y: rect.y + rect.height },
    { x: rect.x + rect.width, y: rect.y + rect.height },
  ];
  corners.forEach((c) =>
    ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize),
  );
}

/**
 * Converts a mouse or touch event position into scaled canvas coordinates.
 */
export function getCanvasCoords(
  canvas: HTMLCanvasElement | undefined,
  event: MouseEvent | TouchEvent,
  cachedRect?: DOMRect | null,
): { x: number; y: number } {
  if (!canvas) return { x: 0, y: 0 };
  const rect = cachedRect ?? canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  if (event instanceof MouseEvent) {
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  const touch = event.touches[0];
  return {
    x: (touch.clientX - rect.left) * scaleX,
    y: (touch.clientY - rect.top) * scaleY,
  };
}

/**
 * Computes a normalized CropRect from drag start and current coordinates.
 */
export function computeDragCropRect(
  dragStart: { x: number; y: number },
  currentPos: { x: number; y: number },
): CropRect {
  return {
    x: Math.min(currentPos.x, dragStart.x),
    y: Math.min(currentPos.y, dragStart.y),
    width: Math.abs(currentPos.x - dragStart.x),
    height: Math.abs(currentPos.y - dragStart.y),
  };
}

/**
 * Extracts the selected crop region from the full-resolution source image as a PNG data URL.
 */
export function extractCroppedImageDataUrl(
  cropCanvas: HTMLCanvasElement | undefined,
  cropImage: HTMLImageElement,
  rect: CropRect,
): string {
  const canvas = document.createElement('canvas');
  const scaleX = cropImage.width / (cropCanvas?.width ?? cropImage.width);
  const scaleY = cropImage.height / (cropCanvas?.height ?? cropImage.height);
  canvas.width = rect.width * scaleX;
  canvas.height = rect.height * scaleY;

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    cropImage,
    rect.x * scaleX,
    rect.y * scaleY,
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return canvas.toDataURL('image/png');
}
