import { Injectable, signal, computed } from '@angular/core';
import { ElectricityRecord } from '../models/records.model';

@Injectable({
    providedIn: 'root'
})
export class ElectricityFormService {
    // defaults to empty string so "Select Date" placeholder shows
    readonly selectedDate = signal<string>('');
    readonly value = signal<number | null>(null);
    readonly editingRecord = signal<ElectricityRecord | null>(null);

    readonly hasValidInput = computed(() => {
        return this.value() !== null && this.value()! >= 0;
    });

    isDateDuplicate(currentRecords: ElectricityRecord[]): boolean {
        if (this.editingRecord()) return false;
        if (!this.selectedDate()) return false;

        // Check if a record already exists for the selected date
        return currentRecords.some(r => {
            const recordDate = new Date(r.date).toISOString().split('T')[0];
            return recordDate === this.selectedDate();
        });
    }

    startEdit(record: ElectricityRecord) {
        this.editingRecord.set(record);
        this.selectedDate.set(new Date(record.date).toISOString().split('T')[0]);
        this.value.set(record.value);
    }

    cancelEdit() {
        this.editingRecord.set(null);
        this.resetForm();
    }

    updateDate(date: string) {
        this.selectedDate.set(date);
    }

    updateValue(val: number | null) {
        this.value.set(val);
    }

    createRecordFromState(): ElectricityRecord | null {
        if (!this.hasValidInput() || !this.selectedDate()) return null;

        return {
            date: new Date(this.selectedDate()),
            value: this.value()!
        };
    }

    private resetForm() {
        this.selectedDate.set('');
        this.value.set(null);
    }
}
