import { Injectable, signal, effect, inject, untracked } from '@angular/core';
import { STORAGE_SERVICE, StorageService } from './storage.service';
import { NotificationService } from './notification.service';

export interface Address {
  streetName: string;
  streetNumber: string;
  city: string;
  zipCode: string;
  country: string;
}

export interface HouseholdMember {
  id: string;
  name: string;
  surname: string;
  type?: 'adult' | 'kid' | 'other';
  gender?: 'male' | 'female' | 'other';
  avatar: string;
}

@Injectable({
  providedIn: 'root'
})
export class HouseholdService {
  private storage = inject(STORAGE_SERVICE);
  private notificationService = inject(NotificationService);
  private isInitialized = false;

  readonly members = signal<HouseholdMember[]>([]);
  readonly address = signal<Address | null>(null);

  readonly avatars = [
    '/avatars/batman.jpg',
    '/avatars/superman.jpg',
    '/avatars/wonder-woman.jpg',
    '/avatars/flash.jpg',
    '/avatars/aquaman.jpg',
    '/avatars/cyborg.jpg',
    '/avatars/iron-man.jpg',
    '/avatars/captain-america.jpg',
    '/avatars/thor.jpg',
    '/avatars/hulk.jpg',
    '/avatars/black-widow.jpg',
    '/avatars/spider-man.jpg'
  ];

  constructor() {
    this.loadData();

    effect(() => {
      const currentMembers = this.members();
      if (this.isInitialized) {
        untracked(() => this.storage.save('household_members', currentMembers));
      }
      // Update notification service
      this.notificationService.setHouseholdMembers(currentMembers);
    });

    effect(() => {
      const currentAddress = this.address();
      if (this.isInitialized && currentAddress) {
        untracked(() => this.storage.save('household_address', currentAddress));
      }
      // Update notification service
      this.notificationService.setAddress(currentAddress);
    });
  }

  private async loadData() {
    const members = await this.storage.load<HouseholdMember[]>('household_members');
    if (members) {
      this.members.set(members);
    }

    const address = await this.storage.load<Address>('household_address');
    if (address) {
      this.address.set(address);
    }

    // Delay initialization flag to ensure initial signal updates don't trigger effects
    setTimeout(() => {
      this.isInitialized = true;
    }, 0);
  }

  addMember(name: string, surname: string, type: 'adult' | 'kid', gender: 'male' | 'female', avatar?: string) {
    const newMember: HouseholdMember = {
      id: crypto.randomUUID(),
      name,
      surname,
      type,
      gender,
      avatar: avatar || this.avatars[Math.floor(Math.random() * this.avatars.length)]
    };
    this.members.update(members => [...members, newMember]);
  }

  removeMember(id: string) {
    this.members.update(members => members.filter(m => m.id !== id));
  }

  updateAddress(address: Address) {
    this.address.set(address);
  }

  updateMembers(members: HouseholdMember[]) {
    this.members.set(members);
  }

  updateMember(id: string, updatedMember: Partial<HouseholdMember>) {
    this.members.update(members =>
      members.map(m => m.id === id ? { ...m, ...updatedMember } : m)
    );
  }
}
