import { Injectable, inject, Injector, PLATFORM_ID, runInInjectionContext } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Firestore } from 'firebase/firestore';
import { firebaseConfig } from '../config/firebase.config';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';

/**
 * Firebase Firestore storage service
 * Stores data under users/{uid}/data/{key}
 *
 * All Firestore API calls are wrapped in runInInjectionContext() to ensure
 * they stay within Angular's injection context even after async/await boundaries.
 */
@Injectable({
  providedIn: 'root'
})
export class FirebaseStorageService extends StorageService {
  private firestoreInstance: Firestore | null = null;
  private firestoreInitPromise: Promise<Firestore> | null = null;
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private injector = inject(Injector);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private get uid(): string | null {
    return this.authService.getCurrentUid();
  }

  private getDocPath(key: string): string {
    return `users/${this.uid}/data/${key}`;
  }

  private async getFirestore(): Promise<Firestore> {
    if (this.firestoreInstance) return this.firestoreInstance;
    if (!this.firestoreInitPromise) {
      this.firestoreInitPromise = (async () => {
        const { initializeApp, getApps, getApp } = await import('firebase/app');
        const { getFirestore } = await import('firebase/firestore');
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        this.firestoreInstance = getFirestore(app);
        return this.firestoreInstance;
      })();
    }
    return this.firestoreInitPromise;
  }

  async save<T>(key: string, data: T): Promise<void> {
    if (!this.isBrowser || !this.uid) {
      console.warn(`[Firestore] Skipping save for key "${key}" — uid: ${this.uid}, isBrowser: ${this.isBrowser}`);
      return;
    }

    try {
      const path = this.getDocPath(key);
      const fs = await this.getFirestore();
      const { doc, setDoc } = await import('firebase/firestore');
      const docRef = doc(fs, path);
      await setDoc(docRef, { value: data, updatedAt: new Date().toISOString() });
      console.info(`[Firestore] Saved key "${key}" to ${path}`);
    } catch (error) {
      console.error(`Error saving to Firestore with key ${key}:`, error);
      throw error;
    }
  }

  async load<T>(key: string): Promise<T | null> {
    if (!this.isBrowser || !this.uid) return null;

    try {
      const fs = await this.getFirestore();
      const { doc, getDoc } = await import('firebase/firestore');
      const docRef = doc(fs, this.getDocPath(key));
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const docData = docSnap.data();
        return docData['value'] as T;
      }
      return null;
    } catch (error) {
      console.error(`Error loading from Firestore with key ${key}:`, error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isBrowser || !this.uid) return;

    try {
      const fs = await this.getFirestore();
      const { doc, deleteDoc } = await import('firebase/firestore');
      const docRef = doc(fs, this.getDocPath(key));
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting from Firestore with key ${key}:`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isBrowser || !this.uid) return false;

    try {
      const fs = await this.getFirestore();
      const { doc, getDoc } = await import('firebase/firestore');
      const docRef = doc(fs, this.getDocPath(key));
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error(`Error checking existence in Firestore with key ${key}:`, error);
      return false;
    }
  }

  async exportAll(): Promise<Record<string, unknown>> {
    if (!this.isBrowser || !this.uid) return {};

    try {
      const fs = await this.getFirestore();
      const { collection, getDocs } = await import('firebase/firestore');
      const colRef = collection(fs, `users/${this.uid}/data`);
      const querySnapshot = await getDocs(colRef);

      const data: Record<string, unknown> = {};
      querySnapshot.forEach((docSnap: any) => {
        const docData = docSnap.data();
        if (docSnap.id === 'user_settings') {
          // Settings are stored as direct fields, not wrapped in 'value'
          data[docSnap.id] = docData;
        } else {
          // Records are wrapped in { value: ..., updatedAt: ... }
          data[docSnap.id] = docData['value'];
        }
      });

      return data;
    } catch (error) {
      console.error('Error exporting all from Firestore:', error);
      return {};
    }
  }

  async importAll(data: Record<string, unknown>): Promise<void> {
    if (!this.isBrowser || !this.uid) return;

    for (const [key, value] of Object.entries(data)) {
      await this.save(key, value);
    }
  }

  async exportRecords(recordKey: string): Promise<unknown[]> {
    const data = await this.load<unknown[]>(recordKey);
    return data || [];
  }

  async importRecords(recordKey: string, records: unknown[]): Promise<void> {
    await this.save(recordKey, records);
  }

  async updateSettings(partialSettings: Record<string, unknown>): Promise<void> {
    if (!this.isBrowser || !this.uid) return;

    try {
      const fs = await this.getFirestore();
      const { doc, setDoc } = await import('firebase/firestore');
      const docRef = doc(fs, this.getDocPath('user_settings'));
      // Use merge: true to update only provided fields
      await setDoc(docRef, partialSettings, { merge: true });
      console.info(`[Firestore] Updated settings:`, Object.keys(partialSettings));
    } catch (error) {
      console.error('Error updating settings in Firestore:', error);
      throw error;
    }
  }

  async getSettings(): Promise<Record<string, unknown>> {
    if (!this.isBrowser || !this.uid) return {};

    try {
      const fs = await this.getFirestore();
      const { doc, getDoc } = await import('firebase/firestore');
      const docRef = doc(fs, this.getDocPath('user_settings'));
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as Record<string, unknown>;
      }
      return {};
    } catch (error) {
      console.error('Error loading settings from Firestore:', error);
      return {};
    }
  }

  async deleteSetting(key: string): Promise<void> {
    if (!this.isBrowser || !this.uid) return;

    try {
      const fs = await this.getFirestore();
      const { doc, setDoc, deleteField } = await import('firebase/firestore');
      const docRef = doc(fs, this.getDocPath('user_settings'));
      await setDoc(docRef, { [key]: deleteField() }, { merge: true });
    } catch (error) {
      console.error(`Error deleting setting ${key} from Firestore:`, error);
      throw error;
    }
  }

  async deleteAllUserData(): Promise<void> {
    if (!this.isBrowser || !this.uid) return;

    try {
      const fs = await this.getFirestore();
      const { collection, getDocs, deleteDoc } = await import('firebase/firestore');
      const colRef = collection(fs, `users/${this.uid}/data`);
      const querySnapshot = await getDocs(colRef);

      const deletePromises: Promise<void>[] = [];
      querySnapshot.forEach((docSnap: any) => {
        deletePromises.push(deleteDoc(docSnap.ref));
      });

      await Promise.all(deletePromises);
      console.info(`[Firestore] Deleted ${deletePromises.length} documents for user ${this.uid}`);
    } catch (error) {
      console.error('Error deleting all user data from Firestore:', error);
      throw error;
    }
  }
}
