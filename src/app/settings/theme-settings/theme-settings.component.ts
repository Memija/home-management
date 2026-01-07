import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Sun, Moon, Monitor } from 'lucide-angular';
import { ThemeService, Theme } from '../../services/theme.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-theme-settings',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe],
  templateUrl: './theme-settings.component.html',
  styleUrl: './theme-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThemeSettingsComponent {
  protected readonly themeService = inject(ThemeService);

  // Icons
  protected readonly SunIcon = Sun;
  protected readonly MoonIcon = Moon;
  protected readonly MonitorIcon = Monitor;

  // Theme options
  protected readonly themeOptions: { value: Theme; labelKey: string; icon: typeof Sun }[] = [
    { value: 'light', labelKey: 'SETTINGS.THEME_LIGHT', icon: Sun },
    { value: 'dark', labelKey: 'SETTINGS.THEME_DARK', icon: Moon },
    { value: 'system', labelKey: 'SETTINGS.THEME_SYSTEM', icon: Monitor }
  ];

  setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
  }
}
