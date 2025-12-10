import { Component, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../pipes/translate.pipe';
import { LanguageSwitcherComponent } from '../components/language-switcher/language-switcher.component';
import { STORAGE_SERVICE } from '../services/storage.service';
import { FileStorageService } from '../services/file-storage.service';
import { LanguageService } from '../services/language.service';
import { LucideAngularModule, Settings, TriangleAlert, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-angular';

Chart.register(...registerables);

interface ConsumptionRecord {
    date: Date;
    kitchenWarm: number;
    kitchenCold: number;
    bathroomWarm: number;
    bathroomCold: number;
}

type ChartView = 'total' | 'by-room' | 'by-type' | 'detailed';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [FormsModule, DatePipe, BaseChartDirective, RouterLink, TranslatePipe, LucideAngularModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss'
})
export class HomeComponent {
    private storage = inject(STORAGE_SERVICE);
    private fileStorage = inject(FileStorageService);
    private languageService = inject(LanguageService);

    protected readonly SettingsIcon = Settings;
    protected readonly TriangleAlertIcon = TriangleAlert;
    protected readonly ChevronDownIcon = ChevronDown;
    protected readonly ChevronLeftIcon = ChevronLeft;
    protected readonly ChevronRightIcon = ChevronRight;

    protected records = signal<ConsumptionRecord[]>([]);
    protected nextSunday = signal<Date>(this.calculateNextSunday());
    protected chartView = signal<ChartView>('total');
    protected kitchenWarm = signal<number | null>(null);
    protected kitchenCold = signal<number | null>(null);
    protected bathroomWarm = signal<number | null>(null);
    protected bathroomCold = signal<number | null>(null);
    protected errorMessage = signal<string | null>(null);

    // Pagination
    protected currentPage = signal<number>(1);
    protected paginationSize = signal<number>(5);
    protected sortOption = signal<'date-desc' | 'date-asc' | 'total-desc' | 'total-asc' | 'kitchen-desc' | 'kitchen-asc' | 'bathroom-desc' | 'bathroom-asc'>('date-desc');

    protected hasValidInput = computed(() => {
        const kw = this.kitchenWarm() !== null;
        const kc = this.kitchenCold() !== null;
        const bw = this.bathroomWarm() !== null;
        const bc = this.bathroomCold() !== null;

        const kitchenValid = kw === kc; // Both set or both null
        const bathroomValid = bw === bc; // Both set or both null
        const atLeastOneSet = (kw && kc) || (bw && bc);

        return kitchenValid && bathroomValid && atLeastOneSet;
    });

    protected displayedRecords = computed(() => {
        const records = [...this.records()];
        const sortOption = this.sortOption();

        // Sort records
        records.sort((a, b) => {
            switch (sortOption) {
                case 'date-desc':
                    return b.date.getTime() - a.date.getTime();
                case 'date-asc':
                    return a.date.getTime() - b.date.getTime();
                case 'total-desc':
                    return this.calculateTotal(b) - this.calculateTotal(a);
                case 'total-asc':
                    return this.calculateTotal(a) - this.calculateTotal(b);
                case 'kitchen-desc':
                    return this.calculateKitchenTotal(b) - this.calculateKitchenTotal(a);
                case 'kitchen-asc':
                    return this.calculateKitchenTotal(a) - this.calculateKitchenTotal(b);
                case 'bathroom-desc':
                    return this.calculateBathroomTotal(b) - this.calculateBathroomTotal(a);
                case 'bathroom-asc':
                    return this.calculateBathroomTotal(a) - this.calculateBathroomTotal(b);
                default:
                    return 0;
            }
        });

        // Limit records based on current page and pagination size
        return records.slice((this.currentPage() - 1) * this.paginationSize(), this.currentPage() * this.paginationSize());
    });

    protected totalPages = computed(() => {
        return Math.ceil(this.records().length / this.paginationSize());
    });

    protected pageOfText = computed(() => {
        const key = 'HOME.PAGE_OF';
        const template = this.languageService.translate(key);
        return template
            .replace('{current}', this.currentPage().toString())
            .replace('{total}', this.totalPages().toString());
    });

    protected showingRecordsText = computed(() => {
        const key = 'HOME.SHOWING_RECORDS';
        const template = this.languageService.translate(key);
        return template
            .replace('{current}', this.displayedRecords().length.toString())
            .replace('{total}', this.records().length.toString());
    });

    protected chartData = computed<ChartConfiguration['data']>(() => {
        const recs = this.records();
        const labels = recs.map(r => new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        const view = this.chartView();

        switch (view) {
            case 'total':
                return {
                    labels,
                    datasets: [{
                        label: 'Total Weekly Consumption',
                        data: recs.map(r => this.calculateTotal(r)),
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                };
            case 'by-room':
                return {
                    labels,
                    datasets: [
                        {
                            label: 'Kitchen Total',
                            data: recs.map(r => r.kitchenWarm + r.kitchenCold),
                            borderColor: '#28a745',
                            backgroundColor: 'rgba(40, 167, 69, 0.1)',
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Bathroom Total',
                            data: recs.map(r => r.bathroomWarm + r.bathroomCold),
                            borderColor: '#17a2b8',
                            backgroundColor: 'rgba(23, 162, 184, 0.1)',
                            fill: true,
                            tension: 0.4
                        }
                    ]
                };
            case 'by-type':
                return {
                    labels,
                    datasets: [
                        {
                            label: 'Warm Water Total',
                            data: recs.map(r => r.kitchenWarm + r.bathroomWarm),
                            borderColor: '#dc3545',
                            backgroundColor: 'rgba(220, 53, 69, 0.1)',
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Cold Water Total',
                            data: recs.map(r => r.kitchenCold + r.bathroomCold),
                            borderColor: '#6c757d',
                            backgroundColor: 'rgba(108, 117, 125, 0.1)',
                            fill: true,
                            tension: 0.4
                        }
                    ]
                };
            case 'detailed':
                return {
                    labels,
                    datasets: [
                        {
                            label: 'Kitchen Warm',
                            data: recs.map(r => r.kitchenWarm),
                            borderColor: '#ff6384',
                            backgroundColor: 'rgba(255, 99, 132, 0.1)',
                            fill: false,
                            tension: 0.4
                        },
                        {
                            label: 'Kitchen Cold',
                            data: recs.map(r => r.kitchenCold),
                            borderColor: '#36a2eb',
                            backgroundColor: 'rgba(54, 162, 235, 0.1)',
                            fill: false,
                            tension: 0.4
                        },
                        {
                            label: 'Bathroom Warm',
                            data: recs.map(r => r.bathroomWarm),
                            borderColor: '#ffcd56',
                            backgroundColor: 'rgba(255, 205, 86, 0.1)',
                            fill: false,
                            tension: 0.4
                        },
                        {
                            label: 'Bathroom Cold',
                            data: recs.map(r => r.bathroomCold),
                            borderColor: '#4bc0c0',
                            backgroundColor: 'rgba(75, 192, 192, 0.1)',
                            fill: false,
                            tension: 0.4
                        }
                    ]
                };
        }
    });

    protected chartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: 'top' },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${context.parsed.y} L`
                }
            }
        },
        scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Liters' } },
            x: { title: { display: true, text: 'Date' } }
        }
    };

    constructor() {
        this.loadData();
    }

    private async loadData() {
        const records = await this.storage.load<ConsumptionRecord[]>('consumption_records');
        if (records) {
            const parsedRecords = records.map(r => ({ ...r, date: new Date(r.date) }));
            this.records.set(parsedRecords);
        }
    }

    async exportData() {
        const allData = await this.storage.exportAll();
        this.fileStorage.exportToFile(allData, `water-consumption-${new Date().toISOString().split('T')[0]}.json`);
    }

    async importData(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) {
            try {
                const data = await this.fileStorage.importFromFile(file);
                await this.storage.importAll(data);
                await this.loadData();
                input.value = '';
            } catch (error) {
                console.error('Error importing data:', error);
                alert('Failed to import data. Please check the file format.');
            }
        }
    }

    private calculateNextSunday(): Date {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
        const nextSunday = new Date(today);
        nextSunday.setDate(today.getDate() + daysUntilSunday);
        nextSunday.setHours(0, 0, 0, 0);
        return nextSunday;
    }

    protected calculateTotal(record: ConsumptionRecord): number {
        return record.kitchenWarm + record.kitchenCold + record.bathroomWarm + record.bathroomCold;
    }

    protected calculateKitchenTotal(record: ConsumptionRecord): number {
        return record.kitchenWarm + record.kitchenCold;
    }

    protected calculateBathroomTotal(record: ConsumptionRecord): number {
        return record.bathroomWarm + record.bathroomCold;
    }

    protected nextPage() {
        if (this.currentPage() < this.totalPages()) {
            this.currentPage.update(page => page + 1);
        }
    }

    protected prevPage() {
        if (this.currentPage() > 1) {
            this.currentPage.update(page => page - 1);
        }
    }

    protected onPaginationSizeChange(size: number) {
        this.paginationSize.set(size);
        this.currentPage.set(1); // Reset to first page when changing page size
    }

    protected setSortOption(option: unknown) {
        this.sortOption.set(option as typeof this.sortOption extends () => infer T ? T : never);
    }

    protected saveRecord() {
        // Check for specific validation failures
        const kw = this.kitchenWarm() !== null;
        const kc = this.kitchenCold() !== null;
        const bw = this.bathroomWarm() !== null;
        const bc = this.bathroomCold() !== null;

        const kitchenComplete = kw && kc;
        const kitchenEmpty = !kw && !kc;
        const kitchenPartial = !kitchenComplete && !kitchenEmpty;

        const bathroomComplete = bw && bc;
        const bathroomEmpty = !bw && !bc;
        const bathroomPartial = !bathroomComplete && !bathroomEmpty;

        if (kitchenPartial || bathroomPartial) {
            this.errorMessage.set('HOME.INCOMPLETE_ROOM_ERROR');
            return;
        }

        if (!kitchenComplete && !bathroomComplete) {
            this.errorMessage.set('HOME.PARTIAL_INPUT_ERROR');
            return;
        }

        this.records.update((records: ConsumptionRecord[]) => [
            ...records,
            {
                date: this.nextSunday(),
                kitchenWarm: this.kitchenWarm() || 0,
                kitchenCold: this.kitchenCold() || 0,
                bathroomWarm: this.bathroomWarm() || 0,
                bathroomCold: this.bathroomCold() || 0
            }
        ]);

        void this.storage.save('consumption_records', this.records());

        const currentSunday = this.nextSunday();
        const nextDate = new Date(currentSunday);
        nextDate.setDate(currentSunday.getDate() + 7);
        this.nextSunday.set(nextDate);

        this.kitchenWarm.set(null);
        this.kitchenCold.set(null);
        this.bathroomWarm.set(null);
        this.bathroomCold.set(null);
        this.errorMessage.set(null);
    }
}
