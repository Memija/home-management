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
    imports: [FormsModule, DatePipe, BaseChartDirective, RouterLink, TranslatePipe],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss'
})
export class HomeComponent {
    private storage = inject(STORAGE_SERVICE);
    private fileStorage = inject(FileStorageService);

    protected records = signal<ConsumptionRecord[]>([]);
    protected nextSunday = signal<Date>(this.calculateNextSunday());
    protected chartView = signal<ChartView>('total');
    protected kitchenWarm = signal<number | null>(null);
    protected kitchenCold = signal<number | null>(null);
    protected bathroomWarm = signal<number | null>(null);
    protected bathroomCold = signal<number | null>(null);

    protected allFieldsFilled = computed(() =>
        this.kitchenWarm() !== null &&
        this.kitchenCold() !== null &&
        this.bathroomWarm() !== null &&
        this.bathroomCold() !== null
    );

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

    protected saveRecord() {
        if (this.allFieldsFilled()) {
            this.records.update((records: ConsumptionRecord[]) => [
                ...records,
                {
                    date: this.nextSunday(),
                    kitchenWarm: this.kitchenWarm()!,
                    kitchenCold: this.kitchenCold()!,
                    bathroomWarm: this.bathroomWarm()!,
                    bathroomCold: this.bathroomCold()!
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
        }
    }
}
