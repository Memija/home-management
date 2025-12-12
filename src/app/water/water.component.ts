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
import { LucideAngularModule, ArrowLeft, Download, Upload, Edit, Trash2, Calendar, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, Info } from 'lucide-angular';
import { ConsumptionInputComponent, type ConsumptionGroup, type ConsumptionData } from '../shared/consumption-input/consumption-input.component';
import { DatePickerComponent } from '../shared/date-picker/date-picker.component';
import { DeleteConfirmationModalComponent } from '../shared/delete-confirmation-modal/delete-confirmation-modal.component';

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
  selector: 'app-water',
  standalone: true,
  imports: [FormsModule, DatePipe, BaseChartDirective, RouterLink, TranslatePipe, LucideAngularModule, ConsumptionInputComponent, DatePickerComponent, DeleteConfirmationModalComponent],
  templateUrl: './water.component.html',
  styleUrl: './water.component.scss'
})
export class WaterComponent {
  private storage = inject(STORAGE_SERVICE);
  private fileStorage = inject(FileStorageService);
  private languageService = inject(LanguageService);

  protected readonly ArrowLeftIcon = ArrowLeft;
  protected readonly DownloadIcon = Download;
  protected readonly UploadIcon = Upload;
  protected readonly EditIcon = Edit;
  protected readonly TrashIcon = Trash2;
  protected readonly SearchIcon = Calendar;
  protected readonly CheckCircleIcon = CheckCircle;
  protected readonly ChevronDownIcon = ChevronDown;
  protected readonly ChevronLeftIcon = ChevronLeft;
  protected readonly ChevronRightIcon = ChevronRight;
  protected readonly InfoIcon = Info;

  protected readonly maxDate = new Date().toISOString().split('T')[0];

  protected records = signal<ConsumptionRecord[]>([]);
  protected selectedDate = signal<string>('');
  protected showSuccessModal = signal(false);
  protected showDeleteModal = signal(false);
  protected recordToDelete = signal<ConsumptionRecord | null>(null);

  protected chartView = signal<ChartView>('total');
  protected kitchenWarm = signal<number | null>(null);
  protected kitchenCold = signal<number | null>(null);
  protected bathroomWarm = signal<number | null>(null);
  protected bathroomCold = signal<number | null>(null);

  protected searchDate = signal<string | null>(null);
  protected searchYear = signal<number | null>(null);
  protected searchMonth = signal<number | null>(null);
  protected editingRecord = signal<ConsumptionRecord | null>(null);

  // Pagination
  protected currentPage = signal<number>(1);
  protected paginationSize = signal<number>(5);
  protected sortOption = signal<'date-desc' | 'date-asc' | 'total-desc' | 'total-asc' | 'kitchen-desc' | 'kitchen-asc' | 'bathroom-desc' | 'bathroom-asc'>('date-desc');

  protected availableYears = computed(() => {
    const years = new Set(this.records().map(r => new Date(r.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  });

  protected filteredRecords = computed(() => {
    const searchDate = this.searchDate();
    const searchYear = this.searchYear();
    const searchMonth = this.searchMonth();
    let records = this.records();

    if (searchDate) {
      records = records.filter(r => {
        const recordDate = new Date(r.date).toISOString().split('T')[0];
        return recordDate === searchDate;
      });
    }

    if (searchYear) {
      records = records.filter(r => new Date(r.date).getFullYear() === searchYear);
    }

    if (searchMonth !== null) {
      records = records.filter(r => new Date(r.date).getMonth() === searchMonth);
    }

    return records;
  });

  protected displayedRecords = computed(() => {
    const records = [...this.filteredRecords()];
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
    return Math.ceil(this.filteredRecords().length / this.paginationSize());
  });

  protected pageOfText = computed(() => {
    const key = 'HOME.PAGE_OF';
    const template = this.languageService.translate(key);
    return template
      .replace('{current}', this.currentPage().toString())
      .replace('{total}', this.totalPages().toString());
  });

  protected dateExists = computed(() => {
    if (this.editingRecord()) return false; // Don't warn when editing
    const selected = this.selectedDate();
    if (!selected) return false;
    return this.records().some(r => {
      const rDate = new Date(r.date);
      const year = rDate.getFullYear();
      const month = String(rDate.getMonth() + 1).padStart(2, '0');
      const day = String(rDate.getDate()).padStart(2, '0');
      const localDate = `${year}-${month}-${day}`;
      return localDate === selected;
    });
  });

  protected hasValidInput = computed(() =>
    this.kitchenWarm() !== null ||
    this.kitchenCold() !== null ||
    this.bathroomWarm() !== null ||
    this.bathroomCold() !== null
  );

  protected currentLang = computed(() => this.languageService.currentLang());

  protected showingRecordsText = computed(() => {
    const key = 'HOME.SHOWING_RECORDS';
    const template = this.languageService.translate(key);
    return template
      .replace('{current}', this.displayedRecords().length.toString())
      .replace('{total}', this.filteredRecords().length.toString());
  });

  protected consumptionGroups = computed<ConsumptionGroup[]>(() => [
    {
      title: 'HOME.KITCHEN',
      fields: [
        { key: 'kitchenWarm', label: 'HOME.WARM_WATER', value: this.kitchenWarm() },
        { key: 'kitchenCold', label: 'HOME.COLD_WATER', value: this.kitchenCold() }
      ]
    },
    {
      title: 'HOME.BATHROOM',
      fields: [
        { key: 'bathroomWarm', label: 'HOME.WARM_WATER', value: this.bathroomWarm() },
        { key: 'bathroomCold', label: 'HOME.COLD_WATER', value: this.bathroomCold() }
      ]
    }
  ]);

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
    const records = await this.storage.load<ConsumptionRecord[]>('water_consumption_records');
    if (records) {
      const parsedRecords = records.map(r => ({ ...r, date: new Date(r.date) }));
      this.records.set(parsedRecords);
    }
  }

  async exportData() {
    const allData = await this.storage.exportAll();
    const dateStr = new Date().toISOString().split('T')[0];
    this.fileStorage.exportToFile(allData, 'water-consumption-' + dateStr + '.json');
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

  protected editRecord(record: ConsumptionRecord) {
    this.editingRecord.set(record);
    this.selectedDate.set(new Date(record.date).toISOString().split('T')[0]);
    this.kitchenWarm.set(record.kitchenWarm);
    this.kitchenCold.set(record.kitchenCold);
    this.bathroomWarm.set(record.bathroomWarm);
    this.bathroomCold.set(record.bathroomCold);

    // Scroll to input section
    document.querySelector('.input-section')?.scrollIntoView({ behavior: 'smooth' });
  }

  protected deleteRecord(record: ConsumptionRecord) {
    this.recordToDelete.set(record);
    this.showDeleteModal.set(true);
  }

  protected confirmDelete() {
    const record = this.recordToDelete();
    if (record) {
      this.records.update(records => records.filter(r => r.date.getTime() !== record.date.getTime()));
      void this.storage.save('water_consumption_records', this.records());

      // If we deleted the record currently being edited, clear the form
      if (this.editingRecord()?.date.getTime() === record.date.getTime()) {
        this.cancelEdit();
      }
    }
    this.showDeleteModal.set(false);
    this.recordToDelete.set(null);
  }

  protected cancelDelete() {
    this.showDeleteModal.set(false);
    this.recordToDelete.set(null);
  }

  protected cancelEdit() {
    this.editingRecord.set(null);
    this.selectedDate.set('');
    this.kitchenWarm.set(null);
    this.kitchenCold.set(null);
    this.bathroomWarm.set(null);
    this.bathroomCold.set(null);
  }

  protected saveRecord() {
    if (this.hasValidInput() && !this.dateExists()) {
      const date = new Date(this.selectedDate());
      const newRecord: ConsumptionRecord = {
        date: date,
        kitchenWarm: this.kitchenWarm() || 0,
        kitchenCold: this.kitchenCold() || 0,
        bathroomWarm: this.bathroomWarm() || 0,
        bathroomCold: this.bathroomCold() || 0
      };

      const existingRecordIndex = this.records().findIndex(r =>
        new Date(r.date).toISOString().split('T')[0] === this.selectedDate()
      );

      if (existingRecordIndex !== -1) {
        // Update existing
        this.records.update(records => {
          const updated = [...records];
          updated[existingRecordIndex] = newRecord;
          return updated.sort((a, b) => a.date.getTime() - b.date.getTime());
        });
      } else {
        // New record
        this.records.update(records =>
          [...records, newRecord].sort((a, b) => a.date.getTime() - b.date.getTime())
        );
      }

      void this.storage.save('water_consumption_records', this.records());
      this.showSuccessModal.set(true);
      this.cancelEdit(); // Reset form and state
    }
  }

  protected onFieldChange(event: { key: string; value: number | null }) {
    switch (event.key) {
      case 'kitchenWarm':
        this.kitchenWarm.set(event.value);
        break;
      case 'kitchenCold':
        this.kitchenCold.set(event.value);
        break;
      case 'bathroomWarm':
        this.bathroomWarm.set(event.value);
        break;
      case 'bathroomCold':
        this.bathroomCold.set(event.value);
        break;
    }
  }

  protected onConsumptionSave(data: ConsumptionData) {
    const date = new Date(data.date);
    const newRecord: ConsumptionRecord = {
      date: date,
      kitchenWarm: data.fields['kitchenWarm'] || 0,
      kitchenCold: data.fields['kitchenCold'] || 0,
      bathroomWarm: data.fields['bathroomWarm'] || 0,
      bathroomCold: data.fields['bathroomCold'] || 0
    };

    const existingRecordIndex = this.records().findIndex(r =>
      new Date(r.date).toISOString().split('T')[0] === data.date
    );

    if (existingRecordIndex !== -1) {
      // Update existing
      this.records.update(records => {
        const updated = [...records];
        updated[existingRecordIndex] = newRecord;
        return updated.sort((a, b) => a.date.getTime() - b.date.getTime());
      });
    } else {
      // New record
      this.records.update(records =>
        [...records, newRecord].sort((a, b) => a.date.getTime() - b.date.getTime())
      );
    }

    void this.storage.save('water_consumption_records', this.records());
    this.showSuccessModal.set(true);
    this.cancelEdit();
  }

  protected closeSuccessModal() {
    this.showSuccessModal.set(false);
  }
}
