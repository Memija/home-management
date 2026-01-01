import { Injectable, signal, computed } from '@angular/core';
import { ConsumptionRecord } from '../models/records.model';

@Injectable({
    providedIn: 'root'
})
export class ConsumptionFormService {
    // Form State
    readonly selectedDate = signal<string>('');
    readonly kitchenWarm = signal<number | null>(null);
    readonly kitchenCold = signal<number | null>(null);
    readonly bathroomWarm = signal<number | null>(null);
    readonly bathroomCold = signal<number | null>(null);
    readonly editingRecord = signal<ConsumptionRecord | null>(null);

    // Validation
    readonly hasValidInput = computed(() =>
        this.kitchenWarm() !== null ||
        this.kitchenCold() !== null ||
        this.bathroomWarm() !== null ||
        this.bathroomCold() !== null
    );

    isDateDuplicate(records: ConsumptionRecord[]): boolean {
        if (this.editingRecord()) return false;
        const selected = this.selectedDate();
        if (!selected) return false;
        return records.some(r => {
            const rDate = new Date(r.date);
            return rDate.toISOString().split('T')[0] === selected;
        });
    }

    // Actions
    startEdit(record: ConsumptionRecord) {
        this.editingRecord.set(record);
        this.selectedDate.set(new Date(record.date).toISOString().split('T')[0]);
        this.kitchenWarm.set(record.kitchenWarm);
        this.kitchenCold.set(record.kitchenCold);
        this.bathroomWarm.set(record.bathroomWarm);
        this.bathroomCold.set(record.bathroomCold);
    }

    cancelEdit() {
        this.editingRecord.set(null);
        this.selectedDate.set('');
        this.kitchenWarm.set(null);
        this.kitchenCold.set(null);
        this.bathroomWarm.set(null);
        this.bathroomCold.set(null);
    }

    updateField(key: string, value: number | null) {
        switch (key) {
            case 'kitchenWarm': this.kitchenWarm.set(value); break;
            case 'kitchenCold': this.kitchenCold.set(value); break;
            case 'bathroomWarm': this.bathroomWarm.set(value); break;
            case 'bathroomCold': this.bathroomCold.set(value); break;
        }
    }

    updateDate(date: string) {
        this.selectedDate.set(date);
    }

    createRecordFromState(): ConsumptionRecord | null {
        if (!this.selectedDate()) return null;

        return {
            date: new Date(this.selectedDate()),
            kitchenWarm: this.kitchenWarm() || 0,
            kitchenCold: this.kitchenCold() || 0,
            bathroomWarm: this.bathroomWarm() || 0,
            bathroomCold: this.bathroomCold() || 0
        };
    }
}
