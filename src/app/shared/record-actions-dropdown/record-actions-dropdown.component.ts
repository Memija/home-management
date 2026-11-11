import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';
import {
  ChevronDown,
  ClipboardPaste,
  Download,
  FileInput,
  FileOutput,
  FileText,
  LucideAngularModule,
  Upload,
} from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-record-actions-dropdown',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './record-actions-dropdown.component.html',
  styleUrl: './record-actions-dropdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordActionsDropdownComponent {
  protected readonly DownloadIcon = Download;
  protected readonly UploadIcon = Upload;
  protected readonly ChevronDownIcon = ChevronDown;
  protected readonly FileOutputIcon = FileOutput;
  protected readonly FileInputIcon = FileInput;
  protected readonly FileTextIcon = FileText;
  protected readonly ClipboardIcon = ClipboardPaste;

  readonly exportDisabled = input<boolean>(false);
  readonly isExporting = input<boolean>(false);
  readonly isImporting = input<boolean>(false);
  readonly excelEnabled = input<boolean>(false);
  readonly isExportMenuOpen = input<boolean>(false);
  readonly isImportMenuOpen = input<boolean>(false);
  readonly translationPrefix = input<'WATER' | 'HEATING'>('WATER');
  readonly idSuffix = input<string>('');
  readonly showSmartImport = input<boolean>(false);

  readonly toggleExport = output<MouseEvent>();
  readonly toggleImport = output<MouseEvent>();
  readonly exportJson = output<void>();
  readonly exportExcel = output<void>();
  readonly exportPdf = output<void>();
  readonly importJson = output<Event>();
  readonly importExcel = output<Event>();
  readonly smartImport = output<void>();

  protected readonly jsonInputIdSignal = computed(() =>
    this.idSuffix() ? `import-file-${this.idSuffix()}` : 'import-file',
  );

  protected readonly excelInputIdSignal = computed(() =>
    this.idSuffix() ? `import-excel-file-${this.idSuffix()}` : 'import-excel-file',
  );

  protected readonly keys = computed(() => {
    const prefix = this.translationPrefix();
    return {
      export: `${prefix}.EXPORT`,
      exportDisabledTooltip: `${prefix}.EXPORT_DISABLED_TOOLTIP`,
      exportExcel: `${prefix}.EXPORT_EXCEL`,
      exportPdf: `${prefix}.EXPORT_PDF`,
      import: `${prefix}.IMPORT`,
      importExcel: `${prefix}.IMPORT_EXCEL`,
    };
  });

  protected get jsonInputId(): string {
    return this.jsonInputIdSignal();
  }

  protected get excelInputId(): string {
    return this.excelInputIdSignal();
  }

  protected key(suffix: string): string {
    return `${this.translationPrefix()}.${suffix}`;
  }
}
