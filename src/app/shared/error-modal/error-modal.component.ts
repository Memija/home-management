import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { LucideAngularModule, CircleAlert, TriangleAlert, CircleCheck, X } from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';

export interface ErrorInstruction {
  key: string;
  params?: Record<string, string | number>;
}

export type ErrorModalType = 'error' | 'warning' | 'success';

@Component({
  selector: 'app-error-modal',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './error-modal.component.html',
  styleUrl: './error-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorModalComponent {
  readonly show = input<boolean>(false);
  readonly title = input<string>('ERROR.TITLE');
  readonly message = input<string>('');
  readonly details = input<string, string | null | undefined>('', {
    transform: (val) => val || '',
  });
  readonly instructions = input<
    (string | ErrorInstruction)[],
    (string | ErrorInstruction)[] | null | undefined
  >([], {
    transform: (val) => val || [],
  });
  readonly type = input<ErrorModalType>('error');

  readonly cancelModal = output<void>();

  // Split details into lines for better display
  readonly detailLines = computed(() => {
    const d = this.details();
    if (!d) return [];
    return d.split('\n').filter((line) => line.trim() !== '');
  });

  protected readonly AlertCircleIcon = CircleAlert;
  protected readonly AlertTriangleIcon = TriangleAlert;
  protected readonly CheckCircleIcon = CircleCheck;
  protected readonly XIcon = X;

  isString(val: unknown): val is string {
    return typeof val === 'string';
  }
}
