import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  OnDestroy,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';

export interface DemoTourStep {
  /** CSS selector to highlight on the page */
  selector: string;
  /** i18n key for step title */
  titleKey: string;
  /** i18n key for step description */
  descriptionKey: string;
}

export type DemoTourTheme = 'water' | 'heating' | 'electricity' | 'settings';

@Component({
  selector: 'app-demo-tour',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe],
  templateUrl: './demo-tour.component.html',
  styleUrl: './demo-tour.component.scss',
})
export class DemoTourComponent implements OnDestroy {
  show = input.required<boolean>();
  steps = input.required<DemoTourStep[]>();
  theme = input<DemoTourTheme>('water');

  close = output<void>();

  private platformId = inject(PLATFORM_ID);

  // Icons
  protected readonly PrevIcon = ChevronLeft;
  protected readonly NextIcon = ChevronRight;
  protected readonly CloseIcon = X;
  protected readonly SparklesIcon = Sparkles;

  // State
  protected currentStep = signal(0);
  protected isActive = signal(false);
  protected isTransitioning = signal(false);

  // Spotlight position
  protected spotTop = signal(0);
  protected spotLeft = signal(0);
  protected spotWidth = signal(0);
  protected spotHeight = signal(0);

  // Tooltip position
  protected tipTop = signal(0);
  protected tipLeft = signal(0);
  protected tipPosition = signal<'top' | 'bottom'>('bottom');

  // Computeds
  protected totalSteps = computed(() => this.steps().length);
  protected currentStepData = computed(() => {
    const s = this.steps();
    const i = this.currentStep();
    return s[i] ?? null;
  });
  protected isFirstStep = computed(() => this.currentStep() === 0);
  protected isLastStep = computed(
    () => this.totalSteps() === 0 || this.currentStep() === this.totalSteps() - 1,
  );
  protected progress = computed(() => {
    const total = this.totalSteps();
    if (total <= 1) return 100;
    return ((this.currentStep() + 1) / total) * 100;
  });

  private targetElement: Element | null = null;
  private scrollHandler = () => this.recalcPositions();
  private resizeHandler = () => this.recalcPositions();
  private positionTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      if (this.show()) {
        this.startTour();
      } else {
        this.cleanup();
      }
    });
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  // ===== Public navigation =====

  protected nextStep(): void {
    const next = this.currentStep() + 1;
    if (next < this.totalSteps()) {
      this.transitionToStep(next);
    } else {
      this.onClose();
    }
  }

  protected previousStep(): void {
    const prev = this.currentStep() - 1;
    if (prev >= 0) {
      this.transitionToStep(prev);
    }
  }

  protected onOverlayClick(): void {
    this.nextStep();
  }

  protected onClose(): void {
    this.cleanup();
    this.currentStep.set(0);
    this.close.emit();
  }

  // ===== Private =====

  private startTour(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.currentStep.set(0);
    window.addEventListener('scroll', this.scrollHandler, true);
    window.addEventListener('resize', this.resizeHandler);

    // Small delay to ensure DOM is rendered
    setTimeout(() => this.gotoStep(0), 200);
  }

  private cleanup(): void {
    this.isActive.set(false);
    this.isTransitioning.set(false);
    this.targetElement = null;
    if (this.positionTimer) {
      clearTimeout(this.positionTimer);
      this.positionTimer = null;
    }
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('scroll', this.scrollHandler, true);
      window.removeEventListener('resize', this.resizeHandler);
    }
  }

  private transitionToStep(index: number): void {
    this.isTransitioning.set(true);

    // Fade tooltip out, then move spotlight
    setTimeout(() => {
      this.currentStep.set(index);
      this.gotoStep(index);
    }, 200);
  }

  private gotoStep(index: number): void {
    const stepsArr = this.steps();
    if (index < 0 || index >= stepsArr.length) return;

    const step = stepsArr[index];
    const el = document.querySelector(step.selector);

    if (!el) {
      // Skip missing elements - try next
      if (index < stepsArr.length - 1) {
        this.currentStep.set(index + 1);
        this.gotoStep(index + 1);
      } else if (index > 0) {
        // Or try previous
        this.currentStep.set(index - 1);
        this.gotoStep(index - 1);
      } else {
        this.onClose();
      }
      return;
    }

    this.targetElement = el;

    // Scroll element into view
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Wait for scroll to finish, then calculate positions
    if (this.positionTimer) clearTimeout(this.positionTimer);
    this.positionTimer = setTimeout(() => {
      this.recalcPositions();
      this.isActive.set(true);
      this.isTransitioning.set(false);
    }, 450);
  }

  private recalcPositions(): void {
    if (!this.targetElement) return;

    const rect = this.targetElement.getBoundingClientRect();
    const padding = 10;
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    // Spotlight
    this.spotTop.set(rect.top - padding);
    this.spotLeft.set(rect.left - padding);
    this.spotWidth.set(rect.width + padding * 2);
    this.spotHeight.set(rect.height + padding * 2);

    // Determine tooltip position (above or below)
    const spaceBelow = viewportH - (rect.bottom + padding);
    const tooltipEstimatedH = 190;
    const position: 'top' | 'bottom' = spaceBelow > tooltipEstimatedH + 16 ? 'bottom' : 'top';
    this.tipPosition.set(position);

    // Tooltip horizontal centering
    const tooltipW = Math.min(360, viewportW - 24);
    const centerX = rect.left + rect.width / 2;
    let left = centerX - tooltipW / 2;
    left = Math.max(12, Math.min(left, viewportW - tooltipW - 12));
    this.tipLeft.set(left);

    // Tooltip vertical
    if (position === 'bottom') {
      this.tipTop.set(rect.bottom + padding + 14);
    } else {
      this.tipTop.set(rect.top - padding - tooltipEstimatedH - 14);
    }
  }
}
