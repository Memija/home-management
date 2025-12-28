import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService extends StorageService {
  private readonly prefix = 'water-consumption-';
  private platformId = inject(PLATFORM_ID);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  async save<T>(key: string, data: T): Promise<void> {
    if (!this.isBrowser) return;

    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(this.prefix + key, serialized);
    } catch (error) {
      console.error(`Error saving to localStorage with key ${key}:`, error);
    }
  }

  async load<T>(key: string): Promise<T | null> {
    if (!this.isBrowser) return null;

    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error loading from localStorage with key ${key}:`, error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isBrowser) return;

    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.error(`Error deleting from localStorage with key ${key}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isBrowser) return false;
    return localStorage.getItem(this.prefix + key) !== null;
  }

  async exportAll(): Promise<Record<string, any>> {
    if (!this.isBrowser) return {};

    const data: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        const cleanKey = key.substring(this.prefix.length);
        const value = await this.load(cleanKey);
        if (value !== null) {
          data[cleanKey] = value;
        }
      }
    }
    return data;
  }

  async importAll(data: Record<string, any>): Promise<void> {
    if (!this.isBrowser) return;

    for (const [key, value] of Object.entries(data)) {
      await this.save(key, value);
    }
  }

  // Export only specific record keys
  async exportRecords(recordKey: string): Promise<any[]> {
    if (!this.isBrowser) return [];

    const data = await this.load<any[]>(recordKey);
    return data || [];
  }

  // Import records with validation
  async importRecords(recordKey: string, records: any[]): Promise<void> {
    if (!this.isBrowser) return;

    await this.save(recordKey, records);
  }

  // Sync methods for simple preference storage (no prefix, for UI state)
  getPreference(key: string): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(key);
  }

  setPreference(key: string, value: string): void {
    if (!this.isBrowser) return;
    localStorage.setItem(key, value);
  }

  removePreference(key: string): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(key);
  }
}
