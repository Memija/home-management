import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/header/header.component';
import { FooterComponent } from './shared/footer/footer.component';
import { MenuBarComponent } from './shared/menu-bar/menu-bar.component';
import { ThemeService } from './services/theme.service';
import { NatureTreeComponent } from './shared/nature-tree/nature-tree.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, MenuBarComponent, NatureTreeComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  // Inject ThemeService to ensure it initializes on app startup
  private readonly themeService = inject(ThemeService);
}
