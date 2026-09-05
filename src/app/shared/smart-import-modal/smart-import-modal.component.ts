import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X, Clipboard, ArrowRight } from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { SmartImportService, ParsedRecord } from '../../services/smart-import.service';

@Component({
  selector: 'app-smart-import-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe],
  templateUrl: './smart-import-modal.component.html',
  styleUrl: './smart-import-modal.component.scss',
})
export class SmartImportModalComponent {
  private smartImportService = inject(SmartImportService);

  @Input() set show(val: boolean) {
    this.showSignal.set(val);
  }
  get show(): boolean {
    return this.showSignal();
  }
  protected showSignal = signal<boolean>(false);

  @Output() closeModal = new EventEmitter<void>();
  @Output() import = new EventEmitter<ParsedRecord[]>();

  protected ClipboardIcon = Clipboard;
  protected XIcon = X;
  protected ArrowRightIcon = ArrowRight;

  protected step = signal<'input' | 'preview'>('input');
  protected rawText = signal('');
  protected parsedRecords = signal<ParsedRecord[]>([]);

  protected analyzeText() {
    if (!this.rawText()) return;

    const records = this.smartImportService.parseRawText(this.rawText());
    this.parsedRecords.set(records);
    this.step.set('preview');
  }

  protected confirmImport() {
    this.import.emit(this.parsedRecords());
    this.reset();
    this.closeModal.emit();
  }

  private reset() {
    this.step.set('input');
    this.rawText.set('');
    this.parsedRecords.set([]);
  }
}
