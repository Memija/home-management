import { Component, ChangeDetectionStrategy, input, output, computed, inject } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-delete-confirmation-modal',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './delete-confirmation-modal.component.html',
  styleUrl: './delete-confirmation-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteConfirmationModalComponent {
  private readonly languageService = inject(LanguageService);

  readonly show = input<boolean>(false);
  readonly titleKey = input<string>('');
  readonly messageKey = input<string, string | null | undefined>('', {
    transform: (val) => val || '',
  });
  readonly messageParams = input<Record<string, string>, Record<string, string> | null | undefined>(
    {},
    {
      transform: (val) => val || {},
    },
  );
  readonly cancelKey = input<string>('');
  readonly deleteKey = input<string>('');
  readonly icon = input<LucideIconData>(undefined as unknown as LucideIconData);

  protected translatedMessage = computed(() => {
    const key = this.messageKey();
    if (!key) return '';
    // Create dependency on current language and loaded dictionary version
    this.languageService.currentLang();
    this.languageService.translationVersion?.();
    let msg = this.languageService.translate(key);
    const params = this.messageParams();
    if (msg.includes('{{')) {
      for (const [param, value] of Object.entries(params)) {
        msg = msg.replaceAll(`{{${param}}}`, value);
      }
    }
    return msg;
  });

  readonly confirm = output<void>();
  readonly cancelModal = output<void>();

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancelModal.emit();
  }
}
