import { Component, computed, inject, input, output, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Info } from 'lucide-angular';
import { ConsumptionRecord } from '../../models/records.model';
import { HouseholdService } from '../../services/household.service';
import { WaterAveragesService } from '../../services/water-averages.service';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
    selector: 'app-comparison-note',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe],
    templateUrl: './comparison-note.component.html'
})
export class ComparisonNoteComponent {
    private householdService = inject(HouseholdService);
    private waterAveragesService = inject(WaterAveragesService);
    private languageService = inject(LanguageService);

    // Inputs
    records = input.required<ConsumptionRecord[]>();

    // Outputs
    countryCodeChange = output<string>();

    // Internal State
    protected readonly InfoIcon = Info;
    protected comparisonCountry = signal<string | null>(null);

    protected familySize = computed(() => this.householdService.members().length);
    protected hasSufficientDataForComparison = computed(() => this.records().length >= 3);

    protected countryName = computed(() => this.householdService.address()?.country || '');

    protected availableCountries = computed(() => {
        return this.waterAveragesService.getAvailableCountries();
    });

    protected effectiveComparisonCountryCode = computed(() => {
        return this.comparisonCountry() || this.countryName() || 'DE';
    });

    protected effectiveComparisonCountryName = computed(() => {
        const code = this.effectiveComparisonCountryCode();
        return this.languageService.translate(`COUNTRIES.${code.toUpperCase()}`);
    });

    protected countryAverage = computed(() => {
        const code = this.effectiveComparisonCountryCode();
        const countries = this.availableCountries();
        const country = countries.find(c => c.code.toLowerCase() === code.toLowerCase());
        return country?.average || 150;
    });

    constructor() {
        // Emit effective country code whenever it changes
        effect(() => {
            this.countryCodeChange.emit(this.effectiveComparisonCountryCode());
        });
    }

    protected onComparisonCountryChange(countryCode: string) {
        this.comparisonCountry.set(countryCode);
    }

    protected getSelectedCountryFlag(): string {
        const code = this.effectiveComparisonCountryCode();
        return this.waterAveragesService.getFlagUrl(code);
    }
}
