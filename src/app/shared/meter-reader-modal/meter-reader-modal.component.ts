import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  input,
  output,
  signal,
  computed,
  inject,
  OnDestroy,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import {
  LucideAngularModule,
  Camera,
  Upload,
  Check,
  X,
  RotateCcw,
  Crop,
  type LucideIconData,
} from 'lucide-angular';
import { MeterReaderService, MeterReadingResult } from '../../services/meter-reader.service';
import { FILE_SECURITY_LIMITS, validateFileSize } from '../../utils/file-security.utils';
import {
  captureVideoFrameDataUrl,
  computeDragCropRect,
  CropRect,
  drawCropOverlay,
  extractCroppedImageDataUrl,
  getCanvasCoords,
  groupMeterFields,
  scaleCanvasToFitImage,
} from './image-crop.helper';

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

@Component({
  selector: 'app-meter-reader-modal',
  standalone: true,
  imports: [NgTemplateOutlet, TranslatePipe, LucideAngularModule],
  templateUrl: './meter-reader-modal.component.html',
  styleUrl: './meter-reader-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeterReaderModalComponent implements OnDestroy {
  cropCanvasRef?: ElementRef<HTMLCanvasElement>;

  @ViewChild('cropCanvas') set cropCanvas(canvas: ElementRef<HTMLCanvasElement> | undefined) {
    this.cropCanvasRef = canvas;
    const dataUrl = this.capturedImage();
    if (canvas?.nativeElement && dataUrl && this.step() === 'crop') {
      this.initCropCanvas(dataUrl);
    }
  }

  @ViewChild('cameraVideo') set cameraVideo(video: ElementRef<HTMLVideoElement> | undefined) {
    if (video?.nativeElement) {
      this.initCameraStream(video.nativeElement);
    }
  }

  private cameraVideoElement?: HTMLVideoElement;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly meterReaderService = inject(MeterReaderService);
  private readonly languageService = inject(LanguageService, { optional: true });

  protected readonly CameraIcon = Camera;
  protected readonly UploadIcon = Upload;
  protected readonly CheckIcon = Check;
  protected readonly XIcon = X;
  protected readonly RetryIcon = RotateCcw;
  protected readonly CropIcon = Crop;

  readonly show = input<boolean>(false);

  readonly fields = input<MeterField[], MeterField[] | null | undefined>([], {
    transform: (val) => val || [],
  });

  readonly closeModal = output<void>();
  readonly reading = output<MeterReadingOutput>();

  protected readonly hasNoFields = computed(() => this.fields().length === 0);
  protected readonly isSingleField = computed(() => this.fields().length === 1);
  protected readonly groupedFields = computed(() => {
    this.languageService?.currentLang();
    this.languageService?.translationVersion?.();
    return groupMeterFields(this.fields()).map((group) => ({
      ...group,
      fields: group.fields.map((field) => {
        const lowerKey = field.key.toLowerCase();
        const translatedName = this.languageService
          ? this.languageService.translate(field.label)
          : field.label;
        const assignTitle = this.languageService
          ? this.languageService.translate('METER_READER.ASSIGN_TO', { name: translatedName })
          : translatedName;
        return {
          ...field,
          translatedName,
          assignTitle,
          isWarm: lowerKey.includes('warm'),
          isCold: lowerKey.includes('cold'),
        };
      }),
    }));
  });

  protected readonly step = signal<'capture' | 'crop' | 'processing' | 'result' | 'select-field'>(
    'capture',
  );
  protected readonly capturedImage = signal<string | null>(null);
  protected readonly result = signal<MeterReadingResult | null>(null);
  protected readonly selectedValue = signal<number | null>(null);
  protected readonly editedValue = signal<string>('');
  protected readonly cameraStream = signal<MediaStream | null>(null);
  protected readonly cameraError = signal<string | null>(null);
  protected readonly useCameraMode = signal(false);
  protected readonly isCameraReady = signal(false);

  protected readonly cropRect = signal<CropRect | null>(null);
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private cropImage: HTMLImageElement | null = null;
  private cachedCanvasRect: DOMRect | null = null;

  protected readonly isProcessing = this.meterReaderService.isProcessing;
  protected readonly progress = this.meterReaderService.progress;

  protected initCameraStream(video: HTMLVideoElement): void {
    this.cameraVideoElement = video;
    const stream = this.cameraStream();

    if (stream && video) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }

      video.play().catch((err) => console.error('Error playing camera video:', err));

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

  protected getFieldIconClass(key: string): string {
    const k = key.toLowerCase();
    if (k.includes('warm')) return 'icon-warm';
    if (k.includes('cold')) return 'icon-cold';
    return '';
  }

  ngOnDestroy(): void {
    this.stopCamera();
    void this.meterReaderService.dispose?.();
  }

  protected onOverlayClick(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.onClose();
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
          height: { ideal: 1080 },
        },
      });
      this.cameraStream.set(stream);

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
    const dataUrl = captureVideoFrameDataUrl(video || this.cameraVideoElement);
    if (!dataUrl) return;

    this.capturedImage.set(dataUrl);
    this.stopCamera();
    this.enterCropStep(dataUrl);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    if (!validateFileSize(file, FILE_SECURITY_LIMITS.MAX_IMAGE_FILE_SIZE_BYTES)) {
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.capturedImage.set(dataUrl);
      this.enterCropStep(dataUrl);
      input.value = '';
      this.cdr.markForCheck();
    };
    reader.onerror = () => {
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  private enterCropStep(dataUrl: string): void {
    this.cropImage = null;
    this.cropRect.set(null);
    this.step.set('crop');
    this.cdr.markForCheck();
    if (this.cropCanvasRef?.nativeElement) {
      this.initCropCanvas(dataUrl);
    }
  }

  private initCropCanvas(dataUrl: string): void {
    const canvas = this.cropCanvasRef?.nativeElement;
    if (!canvas) return;

    const img = new Image();
    img.onload = () => {
      this.cropImage = img;
      scaleCanvasToFitImage(canvas, img);
      this.drawCropCanvas();
      this.cdr.markForCheck();
    };
    img.src = dataUrl;
  }

  private drawCropCanvas(): void {
    drawCropOverlay(this.cropCanvasRef?.nativeElement, this.cropImage, this.cropRect());
  }

  protected onCropStart(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    this.isDragging = true;
    const canvas = this.cropCanvasRef?.nativeElement;
    this.cachedCanvasRect = canvas ? canvas.getBoundingClientRect() : null;
    const pos = getCanvasCoords(canvas, event, this.cachedCanvasRect);
    this.dragStart = pos;
    this.cropRect.set({ x: pos.x, y: pos.y, width: 0, height: 0 });
  }

  protected onCropMove(event: MouseEvent | TouchEvent): void {
    if (!this.isDragging) return;
    event.preventDefault();
    const pos = getCanvasCoords(this.cropCanvasRef?.nativeElement, event, this.cachedCanvasRect);
    this.cropRect.set(computeDragCropRect(this.dragStart, pos));
    this.drawCropCanvas();
  }

  protected onCropEnd(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    this.isDragging = false;
    this.cachedCanvasRect = null;

    const rect = this.cropRect();
    if (!rect || rect.width < 20 || rect.height < 20) {
      this.cropRect.set(null);
      this.drawCropCanvas();
    }
  }

  protected confirmCrop(): void {
    const rect = this.cropRect();
    const fullImage = this.capturedImage();
    if (!fullImage) return;

    if (!rect || !this.cropImage) {
      void this.processImage(fullImage, false);
      return;
    }

    const croppedDataUrl = extractCroppedImageDataUrl(
      this.cropCanvasRef?.nativeElement,
      this.cropImage,
      rect,
    );
    this.capturedImage.set(croppedDataUrl);
    void this.processImage(croppedDataUrl, true);
  }

  private async processImage(imageData: string, isCropped = false): Promise<void> {
    this.step.set('processing');
    this.cdr.markForCheck();

    const result = await this.meterReaderService.readMeter(imageData, isCropped);
    this.result.set(result);

    if (result.value !== null) {
      this.selectedValue.set(result.value);
      this.editedValue.set(result.value.toString());
    } else {
      this.editedValue.set('');
    }

    this.step.set('result');
    this.cdr.markForCheck();
  }

  protected onValueEdit(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/\D/g, '');
    this.editedValue.set(raw);
    const parsed = Number.parseInt(raw, 10);
    this.selectedValue.set(Number.isNaN(parsed) ? null : parsed);
  }

  protected confirmValue(): void {
    const value = this.selectedValue();
    if (value === null) return;

    if (this.hasNoFields()) {
      this.step.set('select-field');
    } else if (this.isSingleField()) {
      this.reading.emit({ fieldKey: this.fields()[0].key, value });
      this.resetState();
      this.closeModal.emit();
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

  protected onClose(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    try {
      this.stopCamera();
    } catch (err) {
      console.error('Error stopping camera:', err);
    }
    void this.meterReaderService.dispose?.();
    this.closeModal.emit();
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
