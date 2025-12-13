import { Component, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../pipes/translate.pipe';
import { LanguageSwitcherComponent } from '../components/language-switcher/language-switcher.component';
import { STORAGE_SERVICE } from '../services/storage.service';
import { FileStorageService } from '../services/file-storage.service';
import { LanguageService } from '../services/language.service';
import { LucideAngularModule, ArrowLeft, Download, Upload, CheckCircle, Trash2 } from 'lucide-angular';
import { ConsumptionInputComponent, type ConsumptionGroup, type ConsumptionData } from '../shared/consumption-input/consumption-input.component';
import { DeleteConfirmationModalComponent } from '../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { DetailedRecordsComponent, type ConsumptionRecord } from '../shared/detailed-records/detailed-records.component';
import { ConsumptionChartComponent, type ChartView } from '../shared/consumption-chart/consumption-chart.component';

@Component({
  selector: 'app-water',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, LucideAngularModule, ConsumptionInputComponent, DeleteConfirmationModalComponent, DetailedRecordsComponent, ConsumptionChartComponent],
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
  protected readonly CheckCircleIcon = CheckCircle;
  protected readonly TrashIcon = Trash2;

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

  protected editingRecord = signal<ConsumptionRecord | null>(null);

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

  protected onChartViewChange = (view: ChartView): void => {
    this.chartView.set(view);
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
