import { Component, output } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LucideAngularModule, X, Heart } from 'lucide-angular';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-support-modal',
  standalone: true,
  imports: [TranslatePipe, LucideAngularModule],
  templateUrl: './support-modal.component.html',
  styleUrl: './support-modal.component.scss'
})
export class SupportModalComponent {
  readonly XIcon = X;
  readonly HeartIcon = Heart;

  close = output<void>();

  kofiUrl: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer) {
    this.kofiUrl = this.sanitizer.bypassSecurityTrustResourceUrl('https://ko-fi.com/memija/?hidefeed=true&widget=true&embed=true&preview=true');
  }

  onClose() {
    this.close.emit();
  }
}
