import { inject, InjectionToken } from '@angular/core';
import { StorageService } from './storage-base';
import { HybridStorageService } from './hybrid-storage.service';

export { StorageService };

export const STORAGE_SERVICE = new InjectionToken<StorageService>('StorageService', {
  providedIn: 'root',
  factory: () => inject(HybridStorageService),
});
