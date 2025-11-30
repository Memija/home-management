import { Component } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageSwitcherComponent } from '../../components/language-switcher/language-switcher.component';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [TranslatePipe, LanguageSwitcherComponent],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss'
})
export class HeaderComponent {
}
