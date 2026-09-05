import {
  ConsumptionRecord,
  ElectricityRecord,
  DynamicHeatingRecord,
} from '../../app/models/records.model';

export function createMockWaterRecords(count = 3): ConsumptionRecord[] {
  const baseYear = 2026;
  const records: ConsumptionRecord[] = [];

  for (let i = 0; i < count; i++) {
    const month = (i % 12) + 1;
    const year = baseYear + Math.floor(i / 12);
    records.push({
      date: new Date(year, month - 1, 15),
      kitchenWarm: 10 + i * 2,
      kitchenCold: 20 + i * 3,
      bathroomWarm: 15 + i * 2,
      bathroomCold: 25 + i * 4,
    });
  }

  return records;
}

export function createMockElectricityRecords(count = 3): ElectricityRecord[] {
  const baseYear = 2026;
  const records: ElectricityRecord[] = [];

  for (let i = 0; i < count; i++) {
    const month = (i % 12) + 1;
    const year = baseYear + Math.floor(i / 12);
    records.push({
      date: new Date(year, month - 1, 15),
      value: 120 + i * 15,
    });
  }

  return records;
}

export function createMockHeatingRecords(count = 3): DynamicHeatingRecord[] {
  const baseYear = 2026;
  const records: DynamicHeatingRecord[] = [];

  for (let i = 0; i < count; i++) {
    const month = (i % 12) + 1;
    const year = baseYear + Math.floor(i / 12);
    records.push({
      date: new Date(year, month - 1, 15),
      rooms: {
        living_room: 50 + i * 5,
        bedroom: 30 + i * 3,
        kitchen: 20 + i * 2,
        bathroom: 15 + i,
      },
    });
  }

  return records;
}

export function createMockAddress() {
  return {
    streetName: 'Musterstrasse',
    streetNumber: '42',
    city: 'Berlin',
    zipCode: '10115',
    country: 'DE',
  };
}
