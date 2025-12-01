import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageSwitcherComponent } from '../../components/language-switcher/language-switcher.component';
import { LucideAngularModule, Settings } from 'lucide-angular';
import { map } from 'rxjs/operators';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [TranslatePipe, LanguageSwitcherComponent, RouterLink, LucideAngularModule],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss'
})
export class HeaderComponent {
    protected readonly SettingsIcon = Settings;

    private router = inject(Router);

    // Check if current route is the settings page
    protected isSettingsPage = toSignal(
        this.router.events.pipe(
            map(() => this.router.url === '/settings')
        ),
        { initialValue: this.router.url === '/settings' }
    );
}
