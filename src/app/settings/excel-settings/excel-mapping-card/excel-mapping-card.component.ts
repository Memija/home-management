import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { LucideAngularModule, TriangleAlert } from 'lucide-angular';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-excel-mapping-card',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './excel-mapping-card.component.html',
  styleUrl: './excel-mapping-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExcelMappingCardComponent {
  protected readonly TriangleAlertIcon = TriangleAlert;

  readonly fieldId = input<string>('');
  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly value = input<string>('');
  readonly validationError = input<string>('');
  readonly isDuplicate = input<boolean>(false);

  readonly valueChange = output<string>();

  protected onInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.valueChange.emit(input?.value ?? '');
  }
}
