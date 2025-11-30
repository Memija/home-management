import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../services/language.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { AddressComponent } from './address/address.component';
import { FamilyComponent } from './family/family.component';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [RouterLink, TranslatePipe, CommonModule, AddressComponent, FamilyComponent],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.scss'
})
export class SettingsComponent {
    protected languageService = inject(LanguageService);
}
