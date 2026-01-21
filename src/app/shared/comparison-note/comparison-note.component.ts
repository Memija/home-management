import { Component, computed, inject, input, output, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Info, Lightbulb } from 'lucide-angular';
import { ConsumptionRecord } from '../../models/records.model';
import { HouseholdService } from '../../services/household.service';
import { WaterAveragesService } from '../../services/water-averages.service';
import { LanguageService } from '../../services/language.service';
import { CountryFactsService } from '../../services/country-facts.service';
import { HeatingFactsService } from '../../services/heating-facts.service';
import { HeatingAveragesService } from '../../services/heating-averages.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

export type ComparisonNoteType = 'water' | 'heating';

export interface HeatingCountry {
    code: string;
    nameKey: string;
}

@Component({
    selector: 'app-comparison-note',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe],
    templateUrl: './comparison-note.component.html',
    styleUrl: './comparison-note.component.scss'
})
export class ComparisonNoteComponent {
    private householdService = inject(HouseholdService);
    private waterAveragesService = inject(WaterAveragesService);
    private languageService = inject(LanguageService);
    private countryFactsService = inject(CountryFactsService);
    private heatingFactsService = inject(HeatingFactsService);
    private heatingAveragesService = inject(HeatingAveragesService);

    // Inputs
    type = input<ComparisonNoteType>('water'); // 'water' or 'heating'
    records = input.required<{ date: Date }[]>(); // Generic records with date
    chartView = input<string>('total');
    heatingCountries = input<HeatingCountry[]>([]); // Heating countries list

    // Outputs
    countryCodeChange = output<string>();

    // Internal State
    protected readonly InfoIcon = Info;
    protected readonly LightbulbIcon = Lightbulb;
    protected comparisonCountry = signal<string | null>(null);
    protected factSeed = signal(Date.now()); // Used to generate new facts

    protected familySize = computed(() => this.householdService.members().length);
    protected hasSufficientDataForComparison = computed(() => this.records().length >= 3);

    protected countryName = computed(() => this.householdService.address()?.country || '');

    // Water countries - sorted A-Z
    protected waterCountries = computed(() => {
        const countries = this.waterAveragesService.getAvailableCountries();
        return countries.sort((a, b) => {
            const nameA = this.languageService.translate(a.translationKey);
            const nameB = this.languageService.translate(b.translationKey);
            return nameA.localeCompare(nameB);
        });
    });

    // Heating countries - sorted A-Z
    protected sortedHeatingCountries = computed(() => {
        const countries = [...this.heatingCountries()];
        return countries.sort((a, b) => {
            const nameA = this.languageService.translate(a.nameKey);
            const nameB = this.languageService.translate(b.nameKey);
            return nameA.localeCompare(nameB);
        });
    });

    // Combined available countries based on type
    protected availableCountries = computed(() => {
        if (this.type() === 'heating') {
            return this.sortedHeatingCountries().map(c => ({
                translationKey: c.nameKey,
                code: c.code,
                average: this.heatingAveragesService.getAverageKwhPerYear(c.code)
            }));
        }
        return this.waterCountries();
    });

    protected effectiveComparisonCountryCode = computed(() => {
        return this.comparisonCountry() || this.countryName() || 'DE';
    });

    protected effectiveComparisonCountryName = computed(() => {
        const code = this.effectiveComparisonCountryCode();
        // Find the country in available countries and return its translated name
        const countries = this.availableCountries();
        const country = countries.find(c => c.code.toLowerCase() === code.toLowerCase());
        if (country) {
            return this.languageService.translate(country.translationKey);
        }
        return code.toUpperCase();
    });

    protected countryAverage = computed(() => {
        const code = this.effectiveComparisonCountryCode();

        if (this.type() === 'heating') {
            return this.heatingAveragesService.getAverageKwhPerYear(code);
        }

        const countries = this.availableCountries();
        const country = countries.find(c => c.code.toLowerCase() === code.toLowerCase());
        return country?.average || 150;
    });

    // Water fact - for water comparison mode
    protected waterFact = computed(() => {
        const code = this.effectiveComparisonCountryCode();
        const seed = this.factSeed();
        const view = this.chartView();
        const viewHash = view.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const index = (seed % 100) + this.records().length + viewHash;
        return this.countryFactsService.getFactByIndex(code, index);
    });

    // Heating fact - for heating comparison mode
    protected heatingFact = computed(() => {
        const code = this.effectiveComparisonCountryCode();
        const seed = this.factSeed();
        const index = Math.floor((seed % 100) + this.records().length);
        return this.heatingFactsService.getFactByIndex(0, index, 'country', code);
    });

    // Combined fact based on type
    protected countryFact = computed(() => {
        if (this.type() === 'heating') {
            return this.heatingFact()?.message || null;
        }
        return this.waterFact();
    });

    // Heating fact title
    protected heatingFactTitle = computed(() => {
        return this.heatingFact()?.title || '';
    });

    constructor() {
        // Emit effective country code whenever it changes
        effect(() => {
            this.countryCodeChange.emit(this.effectiveComparisonCountryCode());
        });

        // Change fact when country changes
        effect(() => {
            const code = this.effectiveComparisonCountryCode();
            // Update seed to show new fact when country changes
            this.factSeed.set(Date.now());
        });

        // Change fact when chart view changes
        effect(() => {
            const view = this.chartView();
            // Update seed to show new fact when view changes
            this.factSeed.set(Date.now());
        });
    }

    protected onComparisonCountryChange(countryCode: string) {
        this.comparisonCountry.set(countryCode);
    }

    protected getSelectedCountryFlag(): string {
        const code = this.effectiveComparisonCountryCode();
        return this.waterAveragesService.getFlagUrl(code);
    }

    protected refreshFact(): void {
        this.factSeed.set(Date.now());
    }
}
