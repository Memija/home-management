import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HouseholdService } from '../services/household.service';
import { LanguageService } from '../services/language.service';
import { TitleCasePipe } from '@angular/common';
import { TranslatePipe } from '../pipes/translate.pipe';
import { AddressComponent } from './address/address.component';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [FormsModule, RouterLink, TitleCasePipe, TranslatePipe, CommonModule, AddressComponent],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.scss'
})
export class SettingsComponent {
    protected languageService = inject(LanguageService);
    protected householdService = inject(HouseholdService);

    // Member Form Signals
    protected newMemberName = signal('');
    protected newMemberSurname = signal('');
    protected newMemberType = signal<'adult' | 'kid'>('adult');
    protected newMemberGender = signal<'male' | 'female'>('male');
    protected selectedAvatar = signal<string | undefined>(undefined);

    addMember() {
        if (this.newMemberName() && this.newMemberSurname()) {
            this.householdService.addMember(
                this.newMemberName(),
                this.newMemberSurname(),
                this.newMemberType(),
                this.newMemberGender(),
                this.selectedAvatar()
            );
            // Reset form
            this.newMemberName.set('');
            this.newMemberSurname.set('');
            this.selectedAvatar.set(undefined);
        }
    }

    selectAvatar(avatar: string) {
        this.selectedAvatar.set(avatar);
    }
}
