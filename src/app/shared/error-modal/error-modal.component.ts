import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, AlertCircle, X } from 'lucide-angular';
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
  instructions = input<string[]>([]);

  cancel = output<void>();

  protected readonly AlertCircleIcon = AlertCircle;
  protected readonly XIcon = X;
}
