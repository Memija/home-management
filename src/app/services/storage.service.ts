import { InjectionToken } from '@angular/core';

export abstract class StorageService {
  /**
   * Save data to storage
   * @param key The storage key
   * @param data The data to save
   */
  abstract save<T>(key: string, data: T): Promise<void>;

  /**
   * Load data from storage
   * @param key The storage key
   * @returns The loaded data or null if not found
   */
  abstract load<T>(key: string): Promise<T | null>;

  /**
   * Delete data from storage
   * @param key The storage key
   */
  abstract delete(key: string): Promise<void>;

  /**
   * Check if a key exists in storage
   * @param key The storage key
   * @returns True if the key exists
   */
  abstract exists(key: string): Promise<boolean>;

  /**
   * Export all data from storage
   * @returns All stored data as a record
   */
  abstract exportAll(): Promise<Record<string, unknown>>;

  /**
   * Import all data into storage
   * @param data The data to import
   */
  abstract importAll(data: Record<string, unknown>): Promise<void>;

  /**
   * Export records only from a specific key
   * @param recordKey The key where records are stored
   * @returns The records array
   */
  abstract exportRecords(recordKey: string): Promise<unknown[]>;

  /**
   * Import records into a specific key
   * @param recordKey The key where records are stored
   * @param records The records array to import
   */
  abstract importRecords(recordKey: string, records: unknown[]): Promise<void>;
}

export const STORAGE_SERVICE = new InjectionToken<StorageService>('StorageService');
