import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-delete-confirmation-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe],
  templateUrl: './delete-confirmation-modal.component.html',
  styleUrl: './delete-confirmation-modal.component.scss'
})
export class DeleteConfirmationModalComponent {
  private languageService = inject(LanguageService);

  @Input() show = false;
  @Input() titleKey = '';
  @Input() messageKey = '';
  @Input() messageParams: Record<string, string> = {};
  @Input() cancelKey = '';
  @Input() deleteKey = '';
  @Input() icon!: LucideIconData;

  protected translatedMessage = computed(() => {
    // Create dependency on current language
    this.languageService.currentLang();
    let message = this.languageService.translate(this.messageKey);
    // Replace placeholders with params
    Object.keys(this.messageParams).forEach(key => {
      message = message.replace(`{${key}}`, this.messageParams[key]);
    });
    return message;
  });

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }
}
