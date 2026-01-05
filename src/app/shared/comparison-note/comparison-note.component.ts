import { Component, computed, inject, input, output, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Info, Lightbulb } from 'lucide-angular';
import { ConsumptionRecord } from '../../models/records.model';
import { HouseholdService } from '../../services/household.service';
import { WaterAveragesService } from '../../services/water-averages.service';
import { LanguageService } from '../../services/language.service';
import { CountryFactsService } from '../../services/country-facts.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

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

    // Inputs
    records = input.required<ConsumptionRecord[]>();
    chartView = input<string>('total'); // Add chart view input with default

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

    protected availableCountries = computed(() => {
        const countries = this.waterAveragesService.getAvailableCountries();
        // Sort alphabetically by translated name
        return countries.sort((a, b) => {
            const nameA = this.languageService.translate(a.translationKey);
            const nameB = this.languageService.translate(b.translationKey);
            return nameA.localeCompare(nameB);
        });
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
        const countries = this.availableCountries();
        const country = countries.find(c => c.code.toLowerCase() === code.toLowerCase());
        return country?.average || 150;
    });

    // Country fact - changes when country, chart view, or seed changes
    protected countryFact = computed(() => {
        const code = this.effectiveComparisonCountryCode();
        const seed = this.factSeed();
        const view = this.chartView(); // Include chart view in calculation
        // Create a hash from seed and view to get consistent but varied index
        const viewHash = view.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const index = (seed % 100) + this.records().length + viewHash;
        return this.countryFactsService.getFactByIndex(code, index);
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
