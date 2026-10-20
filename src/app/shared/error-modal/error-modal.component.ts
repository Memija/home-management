import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, LucideAngularModule, TranslatePipe],
  templateUrl: './error-modal.component.html',
  styleUrl: './error-modal.component.scss',
})
export class ErrorModalComponent {
  @Input() set show(val: boolean) {
    this.showSignal.set(val);
  }
  get show(): boolean {
    return this.showSignal();
  }
  protected readonly showSignal = signal(false);

  @Input() set title(val: string) {
    this.titleSignal.set(val);
  }
  get title(): string {
    return this.titleSignal();
  }
  protected readonly titleSignal = signal('ERROR.TITLE');

  @Input() set message(val: string) {
    this.messageSignal.set(val);
  }
  get message(): string {
    return this.messageSignal();
  }
  protected readonly messageSignal = signal('');

  @Input() set details(val: string) {
    this.detailsSignal.set(val || '');
  }
  get details(): string {
    return this.detailsSignal();
  }
  protected readonly detailsSignal = signal('');

  @Input() set instructions(val: (string | ErrorInstruction)[]) {
    this.instructionsSignal.set(val || []);
  }
  get instructions(): (string | ErrorInstruction)[] {
    return this.instructionsSignal();
  }
  protected readonly instructionsSignal = signal<(string | ErrorInstruction)[]>([]);

  @Input() set type(val: ErrorModalType) {
    this.typeSignal.set(val);
  }
  get type(): ErrorModalType {
    return this.typeSignal();
  }
  protected readonly typeSignal = signal<ErrorModalType>('error');

  @Output() cancelModal = new EventEmitter<void>();

  // Split details into lines for better display
  readonly detailLines = computed(() => {
    const d = this.detailsSignal();
    return d ? d.split('\n').filter((line) => line.trim() !== '') : [];
  });

  protected readonly AlertCircleIcon = CircleAlert;
  protected readonly AlertTriangleIcon = TriangleAlert;
  protected readonly CheckCircleIcon = CircleCheck;
  protected readonly XIcon = X;

  isString(val: unknown): val is string {
    return typeof val === 'string';
  }
}
