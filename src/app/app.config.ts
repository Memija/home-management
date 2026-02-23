import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, Routes, CanDeactivateFn } from '@angular/router';

import { STORAGE_SERVICE } from './services/storage.service';
import { HybridStorageService } from './services/hybrid-storage.service';

// CanDeactivate guard for settings - lazy loaded component
const canDeactivateSettings: CanDeactivateFn<any> = (component) => {
  return component.canDeactivate ? component.canDeactivate() : true;
};

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'water',
    loadComponent: () => import('./water/water.component').then(m => m.WaterComponent)
  },
  {
    path: 'heating',
    loadComponent: () => import('./heating/heating.component').then(m => m.HeatingComponent)
  },
  {
    path: 'electricity',
    loadComponent: () => import('./electricity/electricity.component').then(m => m.ElectricityComponent)
  },
  {
    path: 'release-plan',
    loadComponent: () => import('./release-plan/release-plan.component').then(m => m.ReleasePlanComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent),
    canDeactivate: [canDeactivateSettings]
  }
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideClientHydration(withEventReplay()),
    provideRouter(routes),
    // Firebase SDK will be lazy-loaded on demand
    // Use hybrid storage (cache-first with optional cloud sync)
    { provide: STORAGE_SERVICE, useClass: HybridStorageService }
  ]
};
