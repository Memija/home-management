import { Component, ChangeDetectionStrategy, input, output, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X, Clipboard, ArrowRight } from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { SmartImportService, ParsedRecord } from '../../services/smart-import.service';

@Component({
  selector: 'app-smart-import-modal',
  standalone: true,
  imports: [DatePipe, FormsModule, LucideAngularModule, TranslatePipe],
  templateUrl: './smart-import-modal.component.html',
  styleUrl: './smart-import-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmartImportModalComponent {
  private readonly smartImportService = inject(SmartImportService);

  readonly show = input<boolean>(false);

  readonly closeModal = output<void>();
  readonly import = output<ParsedRecord[]>();

  protected readonly ClipboardIcon = Clipboard;
  protected readonly XIcon = X;
  protected readonly ArrowRightIcon = ArrowRight;

  protected readonly step = signal<'input' | 'preview'>('input');
  protected readonly rawText = signal('');
  protected readonly parsedRecords = signal<ParsedRecord[]>([]);

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
