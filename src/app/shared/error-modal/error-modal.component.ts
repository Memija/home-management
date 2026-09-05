import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
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
  styleUrl: './error-modal.component.scss',
})
export class ErrorModalComponent {
  @Input() set show(val: boolean) {
    this.showSignal.set(val);
  }
  get show(): boolean {
    return this.showSignal();
  }
  protected showSignal = signal(false);

  @Input() set title(val: string) {
    this.titleSignal.set(val);
  }
  get title(): string {
    return this.titleSignal();
  }
  protected titleSignal = signal('ERROR.TITLE');

  @Input() set message(val: string) {
    this.messageSignal.set(val);
  }
  get message(): string {
    return this.messageSignal();
  }
  protected messageSignal = signal('');

  @Input() set details(val: string) {
    this.detailsSignal.set(val || '');
  }
  get details(): string {
    return this.detailsSignal();
  }
  protected detailsSignal = signal('');

  @Input() set instructions(val: (string | ErrorInstruction)[]) {
    this.instructionsSignal.set(val || []);
  }
  get instructions(): (string | ErrorInstruction)[] {
    return this.instructionsSignal();
  }
  protected instructionsSignal = signal<(string | ErrorInstruction)[]>([]);

  @Input() set type(val: 'error' | 'warning' | 'success') {
    this.typeSignal.set(val);
  }
  get type(): 'error' | 'warning' | 'success' {
    return this.typeSignal();
  }
  protected typeSignal = signal<'error' | 'warning' | 'success'>('error');

  @Output() cancelModal = new EventEmitter<void>();

  // Split details into lines for better display
  readonly detailLines = computed(() => {
    const d = this.detailsSignal();
    return d ? d.split('\n').filter((line) => line.trim() !== '') : [];
  });

  protected readonly AlertCircleIcon = AlertCircle;
  protected readonly AlertTriangleIcon = AlertTriangle;
  protected readonly CheckCircleIcon = CheckCircle;
  protected readonly XIcon = X;

  isString(val: unknown): val is string {
    return typeof val === 'string';
  }
}
