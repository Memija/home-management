import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LucideAngularModule, Camera, Upload, Check, X, RotateCcw, Crop, type LucideIconData } from 'lucide-angular';
import { MeterReaderService, MeterReadingResult } from '../../services/meter-reader.service';

export interface MeterField {
  key: string;
  label: string;
  groupLabel?: string;
  currentValue?: number | null;
  icon?: LucideIconData;
}

export interface MeterReadingOutput {
  fieldKey: string;
  value: number;
}

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

@Component({
  selector: 'app-meter-reader-modal',
  standalone: true,
  imports: [TranslatePipe, LucideAngularModule],
  templateUrl: './meter-reader-modal.component.html',
  styleUrl: './meter-reader-modal.component.scss',
})
export class MeterReaderModalComponent implements OnDestroy, AfterViewInit {
  @ViewChild('cropCanvas') cropCanvasRef?: ElementRef<HTMLCanvasElement>;

  @ViewChild('cameraVideo') set cameraVideo(video: ElementRef<HTMLVideoElement> | undefined) {
    if (video?.nativeElement) {
      this.initCameraStream(video.nativeElement);
    }
  }

  private cameraVideoElement?: HTMLVideoElement;

  private meterReaderService = inject(MeterReaderService);

  protected readonly CameraIcon = Camera;
  protected readonly UploadIcon = Upload;
  protected readonly CheckIcon = Check;
  protected readonly XIcon = X;
  protected readonly RetryIcon = RotateCcw;
  protected readonly CropIcon = Crop;

  // Inputs
  show = input.required<boolean>();
  fields = input.required<MeterField[]>();

  // Outputs
  close = output<void>();
  reading = output<MeterReadingOutput>();

  // State
  protected step = signal<'capture' | 'crop' | 'processing' | 'result' | 'select-field'>('capture');
  protected capturedImage = signal<string | null>(null);
  protected result = signal<MeterReadingResult | null>(null);
  protected selectedValue = signal<number | null>(null);
  protected editedValue = signal<string>('');
  protected cameraStream = signal<MediaStream | null>(null);
  protected cameraError = signal<string | null>(null);
  protected useCameraMode = signal(false);
  protected isCameraReady = signal(false);

  // Crop state
  protected cropRect = signal<CropRect | null>(null);
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private cropImage: HTMLImageElement | null = null;

  protected isProcessing = this.meterReaderService.isProcessing;
  protected progress = this.meterReaderService.progress;

  constructor() { }

  protected initCameraStream(video: HTMLVideoElement): void {
    this.cameraVideoElement = video;
    const stream = this.cameraStream();

    if (stream && video) {
      // If stream is already assigned, don't re-assign unless necessary
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }

      video.play().catch(err => console.error('Error playing camera video:', err));

      // Force ready state after a short delay if events don't fire
      setTimeout(() => {
        if (!this.isCameraReady() && this.cameraStream()) {
          this.isCameraReady.set(true);
        }
      }, 1500);
    }
  }

  protected onCameraReady(video: HTMLVideoElement): void {
    if (video.videoWidth > 0) {
      this.isCameraReady.set(true);
    }
  }

  /** Manually trigger camera init if auto-detection fails */
  protected manualKickstart(): void {
    if (this.cameraVideoElement) {
      this.initCameraStream(this.cameraVideoElement);
    }
  }

  // If only one field, skip field selection
  protected isSingleField = computed(() => this.fields().length === 1);
  protected hasNoFields = computed(() => this.fields().length === 0);

  protected groupedFields = computed(() => {
    const fields = this.fields();
    const groups: { label: string; fields: MeterField[] }[] = [];

    fields.forEach(field => {
      const groupLabel = field.groupLabel || '';
      let group = groups.find(g => g.label === groupLabel);
      if (!group) {
        group = { label: groupLabel, fields: [] };
        groups.push(group);
      }
      group.fields.push(field);
    });

    return groups;
  });

  protected getFieldIconClass(key: string): string {
    const k = key.toLowerCase();
    if (k.includes('warm')) return 'icon-warm';
    if (k.includes('cold')) return 'icon-cold';
    return '';
  }

  ngAfterViewInit(): void {
    // Canvas setup happens when entering crop step
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  protected onOverlayClick(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.closeModal();
  }

  protected onModalClick(event: Event): void {
    event.stopPropagation();
  }

  protected async startCamera(): Promise<void> {
    this.cameraError.set(null);
    this.useCameraMode.set(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
      });
      this.cameraStream.set(stream);

      // Fallback: search for the video element manually if setter didn't catch it
      setTimeout(() => {
        const video = document.querySelector('video.camera-video') as HTMLVideoElement;
        if (video && !video.srcObject) {
          this.initCameraStream(video);
        }
      }, 500);
    } catch (error) {
      console.error('Camera access failed:', error);
      this.cameraError.set('METER_READER.CAMERA_ERROR');
      this.useCameraMode.set(false);
    }
  }

  protected stopCamera(): void {
    const stream = this.cameraStream();
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      this.cameraStream.set(null);
    }
    this.useCameraMode.set(false);
  }

  protected captureFromCamera(video: HTMLVideoElement): void {
    const targetVideo = video || this.cameraVideoElement;

    if (!targetVideo || targetVideo.videoWidth === 0) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetVideo.videoWidth;
    canvas.height = targetVideo.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(targetVideo, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/png');
    this.capturedImage.set(dataUrl);
    this.stopCamera();
    this.enterCropStep(dataUrl);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.capturedImage.set(dataUrl);
      this.enterCropStep(dataUrl);
    };
    reader.readAsDataURL(file);

    // Reset file input for re-selection
    input.value = '';
  }

  /** Enter the crop step and draw the image on the canvas */
  private enterCropStep(dataUrl: string): void {
    this.cropRect.set(null);
    this.step.set('crop');

    // Draw image on canvas after view updates
    setTimeout(() => this.initCropCanvas(dataUrl), 50);
  }

  private initCropCanvas(dataUrl: string): void {
    const canvas = this.cropCanvasRef?.nativeElement;
    if (!canvas) return;

    const img = new Image();
    img.onload = () => {
      this.cropImage = img;
      // Scale to fit the canvas container
      const maxW = canvas.parentElement?.clientWidth ?? 600;
      const maxH = 400;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      this.drawCropCanvas();
    };
    img.src = dataUrl;
  }

  private drawCropCanvas(): void {
    const canvas = this.cropCanvasRef?.nativeElement;
    if (!canvas || !this.cropImage) return;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.cropImage, 0, 0, canvas.width, canvas.height);

    const rect = this.cropRect();
    if (rect) {
      // Dark overlay over uncropped area
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Clear crop area (show original)
      ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
      ctx.drawImage(
        this.cropImage,
        (rect.x / canvas.width) * this.cropImage.width,
        (rect.y / canvas.height) * this.cropImage.height,
        (rect.width / canvas.width) * this.cropImage.width,
        (rect.height / canvas.height) * this.cropImage.height,
        rect.x, rect.y, rect.width, rect.height
      );

      // Selection border
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      ctx.setLineDash([]);

      // Corner handles
      const handleSize = 8;
      ctx.fillStyle = '#3b82f6';
      const corners = [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x, y: rect.y + rect.height },
        { x: rect.x + rect.width, y: rect.y + rect.height },
      ];
      corners.forEach(c => ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize));
    }
  }

  private getCanvasCoords(event: MouseEvent | TouchEvent): { x: number; y: number } {
    const canvas = this.cropCanvasRef?.nativeElement;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (event instanceof MouseEvent) {
      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };
    } else {
      const touch = event.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
  }

  protected onCropStart(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    this.isDragging = true;
    const pos = this.getCanvasCoords(event);
    this.dragStart = pos;
    this.cropRect.set({ x: pos.x, y: pos.y, width: 0, height: 0 });
  }

  protected onCropMove(event: MouseEvent | TouchEvent): void {
    if (!this.isDragging) return;
    event.preventDefault();
    const pos = this.getCanvasCoords(event);
    const x = Math.min(pos.x, this.dragStart.x);
    const y = Math.min(pos.y, this.dragStart.y);
    const width = Math.abs(pos.x - this.dragStart.x);
    const height = Math.abs(pos.y - this.dragStart.y);
    this.cropRect.set({ x, y, width, height });
    this.drawCropCanvas();
  }

  protected onCropEnd(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    this.isDragging = false;

    // If the drag was too small, clear the crop
    const rect = this.cropRect();
    if (!rect || rect.width < 20 || rect.height < 20) {
      this.cropRect.set(null);
      this.drawCropCanvas();
    }
  }

  /** Run OCR on the cropped region (or full image if no crop) */
  protected confirmCrop(): void {
    const rect = this.cropRect();
    const fullImage = this.capturedImage();
    if (!fullImage) return;

    if (!rect || !this.cropImage) {
      // No crop drawn — use full image, uncropped mode
      this.processImage(fullImage, false);
      return;
    }

    // Extract the cropped region from the original full-resolution image
    const canvas = document.createElement('canvas');
    const scaleX = this.cropImage.width / (this.cropCanvasRef?.nativeElement.width ?? this.cropImage.width);
    const scaleY = this.cropImage.height / (this.cropCanvasRef?.nativeElement.height ?? this.cropImage.height);
    canvas.width = rect.width * scaleX;
    canvas.height = rect.height * scaleY;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
      this.cropImage,
      rect.x * scaleX,
      rect.y * scaleY,
      canvas.width,
      canvas.height,
      0, 0, canvas.width, canvas.height
    );

    const croppedDataUrl = canvas.toDataURL('image/png');
    this.capturedImage.set(croppedDataUrl);
    // isCropped=true: tells the service to use single-line OCR mode
    this.processImage(croppedDataUrl, true);
  }

  private async processImage(imageData: string, isCropped = false): Promise<void> {
    this.step.set('processing');

    const result = await this.meterReaderService.readMeter(imageData, isCropped);
    this.result.set(result);

    if (result.value !== null) {
      this.selectedValue.set(result.value);
      this.editedValue.set(result.value.toString());
    } else {
      this.editedValue.set('');
    }

    this.step.set('result');
  }

  protected onValueEdit(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/[^0-9]/g, '');
    this.editedValue.set(raw);
    const parsed = parseInt(raw, 10);
    this.selectedValue.set(isNaN(parsed) ? null : parsed);
  }

  protected confirmValue(): void {
    const value = this.selectedValue();
    if (value === null) return;

    if (this.hasNoFields()) {
      // No fields configured — go to select-field to show the empty state message
      this.step.set('select-field');
    } else if (this.isSingleField()) {
      this.reading.emit({ fieldKey: this.fields()[0].key, value });
      this.resetState();
      this.close.emit();
    } else {
      this.step.set('select-field');
    }
  }

  protected selectField(fieldKey: string): void {
    const value = this.selectedValue();
    if (value === null) return;

    this.reading.emit({ fieldKey, value });
    this.resetState();
    this.step.set('capture');
  }

  protected retry(): void {
    this.resetState();
    this.step.set('capture');
  }

  protected closeModal(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    try {
      this.stopCamera();
    } catch (err) {
      console.error('Error stopping camera:', err);
    }
    this.close.emit();
  }

  private resetState(): void {
    this.capturedImage.set(null);
    this.result.set(null);
    this.selectedValue.set(null);
    this.editedValue.set('');
    this.cameraError.set(null);
    this.cropRect.set(null);
    this.cropImage = null;
    this.stopCamera();
  }
}
