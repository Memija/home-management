import { Component } from '@angular/core';
import { LucideAngularModule, Shield, Database, Lock, Cookie } from 'lucide-angular';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss'
})
export class PrivacyComponent {
  readonly ShieldIcon = Shield;
  readonly DatabaseIcon = Database;
  readonly LockIcon = Lock;
  readonly CookieIcon = Cookie;
}
