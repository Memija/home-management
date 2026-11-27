import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ContactModalComponent } from '../contact-modal/contact-modal.component';
import { SuccessModalComponent } from '../success-modal/success-modal.component';

const EXACT_ROUTE_OPTIONS = { exact: true };

@Component({
  selector: 'app-menu-bar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    ContactModalComponent,
    SuccessModalComponent,
  ],
  templateUrl: './menu-bar.component.html',
  styleUrl: './menu-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuBarComponent {
  protected get exactRouteOptions(): { exact: boolean } {
    return EXACT_ROUTE_OPTIONS;
  }

  protected readonly showContactModal = signal(false);
  protected readonly showContactSuccessModal = signal(false);

  protected contactUs(): void {
    this.showContactModal.set(true);
  }

  protected onCloseModal(): void {
    this.showContactModal.set(false);
  }

  protected onContactSubmitted(): void {
    this.showContactModal.set(false);
    this.showContactSuccessModal.set(true);
  }

  protected onCloseSuccessModal(): void {
    this.showContactSuccessModal.set(false);
  }
}
