import { Component } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
    selector: 'app-footer',
    standalone: true,
    imports: [TranslatePipe],
    templateUrl: './footer.component.html',
    styleUrl: './footer.component.scss'
})
export class FooterComponent {
    currentYear = new Date().getFullYear();

    contactUs() {
        window.location.href = 'mailto:anelmemija@gmail.com';
    }
}
