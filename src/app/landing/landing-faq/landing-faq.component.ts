import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ChevronDown, LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { FAQ_KEYS } from '../landing.constants';

@Component({
  selector: 'app-landing-faq',
  standalone: true,
  imports: [TranslatePipe, LucideAngularModule],
  templateUrl: './landing-faq.component.html',
  styleUrl: './landing-faq.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingFaqComponent {
  protected readonly faqItems = FAQ_KEYS;
  protected readonly ChevronDownIcon = ChevronDown;
}
