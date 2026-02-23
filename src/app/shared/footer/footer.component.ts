import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LucideAngularModule, Heart, Rocket, Github } from 'lucide-angular';

import { SupportModalComponent } from '../support-modal/support-modal.component';
import { APP_VERSION } from '../../app.constants';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [TranslatePipe, LucideAngularModule, RouterLink, SupportModalComponent],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  readonly HeartIcon = Heart;
  readonly RocketIcon = Rocket;
  readonly GithubIcon = Github;
  readonly appVersion = APP_VERSION;

  showSupportModal = false;
}
