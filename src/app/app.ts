import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageSwitcherComponent } from './components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LanguageSwitcherComponent],
  template: `
    <div class="global-language-switcher">
      <app-language-switcher></app-language-switcher>
    </div>
    <router-outlet></router-outlet>
  `,
  styles: [`
    .global-language-switcher {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
    }
  `]
})
export class App { }
