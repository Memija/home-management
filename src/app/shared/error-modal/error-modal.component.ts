import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, AlertCircle, AlertTriangle, X } from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';

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
  instructions = input<any[]>([]); // Allow string or object
  type = input<'error' | 'warning'>('error');

  cancel = output<void>();

  protected readonly AlertCircleIcon = AlertCircle;
  protected readonly AlertTriangleIcon = AlertTriangle;
  protected readonly XIcon = X;

  protected isString(val: any): boolean {
    return typeof val === 'string';
  }
}
