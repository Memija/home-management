import { Injectable, signal, effect, inject, untracked } from '@angular/core';
import { STORAGE_SERVICE, StorageService } from './storage.service';

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
    type: 'adult' | 'kid';
    gender: 'male' | 'female';
    avatar: string;
}

@Injectable({
    providedIn: 'root'
})
export class HouseholdService {
    private storage = inject(STORAGE_SERVICE);
    private isInitialized = false;

    readonly members = signal<HouseholdMember[]>([]);
    readonly address = signal<Address | null>(null);

    readonly avatars = [
        '/avatars/spider-man.jpg',
        '/avatars/iron-man.jpg',
        '/avatars/captain-america.jpg',
        '/avatars/black-widow.jpg',
        '/avatars/hulk.jpg',
        '/avatars/black-panther.jpg',
        '/avatars/doctor-strange.jpg',
        '/avatars/scarlet-witch.jpg',
        '/avatars/captain-marvel.jpg'
    ];

    constructor() {
        this.loadData();

        effect(() => {
            const currentMembers = this.members();
            if (this.isInitialized) {
                untracked(() => this.storage.save('household_members', currentMembers));
            }
        });

        effect(() => {
            const currentAddress = this.address();
            if (this.isInitialized && currentAddress) {
                untracked(() => this.storage.save('household_address', currentAddress));
            }
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

        this.isInitialized = true;
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
}
