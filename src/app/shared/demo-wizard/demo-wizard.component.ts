import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  type LucideIconData,
} from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';

export interface DemoWizardStep {
  titleKey: string;
  descriptionKey: string;
  icon?: LucideIconData;
}

export type DemoWizardTheme = 'water' | 'heating' | 'electricity' | 'settings';

@Component({
  selector: 'app-demo-wizard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe],
  templateUrl: './demo-wizard.component.html',
  styleUrl: './demo-wizard.component.scss',
})
export class DemoWizardComponent {
  show = input.required<boolean>();
  steps = input.required<DemoWizardStep[]>();
  theme = input<DemoWizardTheme>('water');
  titleKey = input<string>('DEMO.WIZARD_TITLE');

  close = output<void>();

  // Icons
  protected readonly CloseIcon = X;
  protected readonly PrevIcon = ChevronLeft;
  protected readonly NextIcon = ChevronRight;
  protected readonly SparklesIcon = Sparkles;

  // Current step index
  protected currentStep = signal(0);

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

  protected progress = computed(() => {
    const total = this.totalSteps();
    if (total <= 1) return 100;
    return ((this.currentStep() + 1) / total) * 100;
  });

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

  goToStep(index: number): void {
    if (index >= 0 && index < this.totalSteps()) {
      this.currentStep.set(index);
    }
  }

  onClose(): void {
    this.currentStep.set(0);
    this.close.emit();
  }
}
