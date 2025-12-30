import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/header/header.component';
import { FooterComponent } from './shared/footer/footer.component';
import { MenuBarComponent } from './shared/menu-bar/menu-bar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, MenuBarComponent],
  template: `
    <app-header></app-header>
    <app-menu-bar></app-menu-bar>
    <router-outlet></router-outlet>
    <app-footer></app-footer>
  `,
  styles: []
})
export class App { }
