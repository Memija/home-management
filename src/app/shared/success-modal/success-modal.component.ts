import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { LucideAngularModule, CircleCheck } from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-success-modal',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './success-modal.component.html',
  styleUrl: './success-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuccessModalComponent {
  protected readonly CheckCircleIcon = CircleCheck;

  readonly show = input<boolean>(false);
  readonly titleKey = input<string>('');
  readonly messageKey = input<string>('');

  readonly closeModal = output<void>();

  protected onClose(): void {
    this.closeModal.emit();
  }
}
