import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import {
  LucideAngularModule,
  X,
  ChevronLeft,
  ChevronRight,
  CircleQuestionMark,
} from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';

export interface HelpStep {
  titleKey: string;
  descriptionKey: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-help-modal',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './help-modal.component.html',
  styleUrl: './help-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpModalComponent {
  readonly show = input<boolean>(false);
  readonly titleKey = input<string>('');
  readonly steps = input<HelpStep[], HelpStep[] | null | undefined>([], {
    transform: (val) => val || [],
  });

  readonly closeModal = output<void>();

  // Icons
  protected readonly CloseIcon = X;
  protected readonly PrevIcon = ChevronLeft;
  protected readonly NextIcon = ChevronRight;
  protected readonly HelpIcon = CircleQuestionMark;

  // Current step index
  protected readonly currentStep = signal(0);

  protected totalSteps = computed(() => this.steps().length);

  protected currentStepData = computed(() => {
    const stepsArray = this.steps();
    const index = this.currentStep();
    return stepsArray[index] || null;
  });

  protected isFirstStep = computed(() => this.currentStep() === 0);
  protected isLastStep = computed(
    () => this.totalSteps() === 0 || this.currentStep() === this.totalSteps() - 1,
  );

  previousStep(): void {
    if (!this.isFirstStep()) {
      this.currentStep.update((v) => v - 1);
    }
  }

  nextStep(): void {
    if (!this.isLastStep()) {
      this.currentStep.update((v) => v + 1);
    }
  }

  onClose(): void {
    this.currentStep.set(0); // Reset to first step when closing
    this.closeModal.emit();
  }
}
