import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';

export interface HelpStep {
  titleKey: string;
  descriptionKey: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-help-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe],
  templateUrl: './help-modal.component.html',
  styleUrl: './help-modal.component.scss',
})
export class HelpModalComponent {
  @Input() show = false;
  @Input() titleKey = '';

  @Input() set steps(val: HelpStep[]) {
    this._steps.set(val || []);
  }
  get steps(): HelpStep[] {
    return this._steps();
  }
  private _steps = signal<HelpStep[]>([]);

  @Output() closeModal = new EventEmitter<void>();

  // Icons
  protected readonly CloseIcon = X;
  protected readonly PrevIcon = ChevronLeft;
  protected readonly NextIcon = ChevronRight;
  protected readonly HelpIcon = HelpCircle;

  // Current step index
  protected currentStep = signal(0);

  protected totalSteps = computed(() => this._steps().length);

  protected currentStepData = computed(() => {
    const stepsArray = this._steps();
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
