import { Component, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../pipes/translate.pipe';
import { STORAGE_SERVICE } from '../services/storage.service';
import { FileStorageService } from '../services/file-storage.service';
import { LucideAngularModule, ArrowLeft } from 'lucide-angular';

Chart.register(...registerables);

interface HeatingRecord {
    date: Date;
    livingRoom: number;
    bedroom: number;
    kitchen: number;
    bathroom: number;
}

type ChartView = 'total' | 'by-room' | 'detailed';

@Component({
    selector: 'app-heating',
    standalone: true,
    imports: [FormsModule, DatePipe, BaseChartDirective, RouterLink, TranslatePipe, LucideAngularModule],
    templateUrl: './heating.component.html',
    styleUrl: './heating.component.scss'
})
export class HeatingComponent {
    private storage = inject(STORAGE_SERVICE);
    private fileStorage = inject(FileStorageService);

    protected readonly ArrowLeftIcon = ArrowLeft;

    protected records = signal<HeatingRecord[]>([]);
    protected nextSunday = signal<Date>(this.calculateNextSunday());
    protected chartView = signal<ChartView>('total');

    protected livingRoom = signal<number | null>(null);
    protected bedroom = signal<number | null>(null);
    protected kitchen = signal<number | null>(null);
    protected bathroom = signal<number | null>(null);

    protected allFieldsFilled = computed(() =>
        this.livingRoom() !== null &&
        this.bedroom() !== null &&
        this.kitchen() !== null &&
        this.bathroom() !== null
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
                        borderColor: '#f57c00',
                        backgroundColor: 'rgba(245, 124, 0, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                };
            case 'by-room':
                return {
                    labels,
                    datasets: [
                        {
                            label: 'Living Room',
                            data: recs.map(r => r.livingRoom),
                            borderColor: '#e65100',
                            backgroundColor: 'rgba(230, 81, 0, 0.1)',
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Bedroom',
                            data: recs.map(r => r.bedroom),
                            borderColor: '#fb8c00',
                            backgroundColor: 'rgba(251, 140, 0, 0.1)',
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Kitchen',
                            data: recs.map(r => r.kitchen),
                            borderColor: '#ffa726',
                            backgroundColor: 'rgba(255, 167, 38, 0.1)',
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Bathroom',
                            data: recs.map(r => r.bathroom),
                            borderColor: '#ffb74d',
                            backgroundColor: 'rgba(255, 183, 77, 0.1)',
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
                            label: 'Living Room',
                            data: recs.map(r => r.livingRoom),
                            borderColor: '#e65100',
                            backgroundColor: 'rgba(230, 81, 0, 0.1)',
                            fill: false,
                            tension: 0.4
                        },
                        {
                            label: 'Bedroom',
                            data: recs.map(r => r.bedroom),
                            borderColor: '#fb8c00',
                            backgroundColor: 'rgba(251, 140, 0, 0.1)',
                            fill: false,
                            tension: 0.4
                        },
                        {
                            label: 'Kitchen',
                            data: recs.map(r => r.kitchen),
                            borderColor: '#ffa726',
                            backgroundColor: 'rgba(255, 167, 38, 0.1)',
                            fill: false,
                            tension: 0.4
                        },
                        {
                            label: 'Bathroom',
                            data: recs.map(r => r.bathroom),
                            borderColor: '#ffb74d',
                            backgroundColor: 'rgba(255, 183, 77, 0.1)',
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
                    label: (context) => `${context.dataset.label}: ${context.parsed.y} kWh`
                }
            }
        },
        scales: {
            y: { beginAtZero: true, title: { display: true, text: 'kWh' } },
            x: { title: { display: true, text: 'Date' } }
        }
    };

    constructor() {
        this.loadData();
    }

    private async loadData() {
        const records = await this.storage.load<HeatingRecord[]>('heating_consumption_records');
        if (records) {
            const parsedRecords = records.map(r => ({ ...r, date: new Date(r.date) }));
            this.records.set(parsedRecords);
        }
    }

    async exportData() {
        const allData = await this.storage.exportAll();
        this.fileStorage.exportToFile(allData, `heating-consumption-${new Date().toISOString().split('T')[0]}.json`);
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

    protected calculateTotal(record: HeatingRecord): number {
        return record.livingRoom + record.bedroom + record.kitchen + record.bathroom;
    }

    protected saveRecord() {
        if (this.allFieldsFilled()) {
            this.records.update((records: HeatingRecord[]) => [
                ...records,
                {
                    date: this.nextSunday(),
                    livingRoom: this.livingRoom()!,
                    bedroom: this.bedroom()!,
                    kitchen: this.kitchen()!,
                    bathroom: this.bathroom()!
                }
            ]);

            void this.storage.save('heating_consumption_records', this.records());

            const currentSunday = this.nextSunday();
            const nextDate = new Date(currentSunday);
            nextDate.setDate(currentSunday.getDate() + 7);
            this.nextSunday.set(nextDate);

            this.livingRoom.set(null);
            this.bedroom.set(null);
            this.kitchen.set(null);
            this.bathroom.set(null);
        }
    }
}
