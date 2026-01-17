import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, AlertCircle, AlertTriangle, CheckCircle, X } from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';

export interface ErrorInstruction {
  key: string;
  params?: Record<string, string | number>;
}

@Component({
  selector: 'app-error-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe],
  templateUrl: './error-modal.component.html',
  styleUrl: './error-modal.component.scss'
})
export class ErrorModalComponent {
  show = input.required<boolean>();
  title = input<string>('ERROR.TITLE');
  message = input.required<string>();
  details = input<string>('');
  instructions = input<(string | ErrorInstruction)[]>([]); // Allow string or object
  type = input<'error' | 'warning' | 'success'>('error');

  // Split details into lines for better display
  protected detailLines = computed(() => {
    const d = this.details();
    return d ? d.split('\n').filter(line => line.trim() !== '') : [];
  });

  cancel = output<void>();

  protected readonly AlertCircleIcon = AlertCircle;
  protected readonly AlertTriangleIcon = AlertTriangle;
  protected readonly CheckCircleIcon = CheckCircle;
  protected readonly XIcon = X;

  protected isString(val: unknown): val is string {
    return typeof val === 'string';
  }
}
