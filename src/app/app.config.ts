import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, Routes, CanDeactivateFn } from '@angular/router';
import { STORAGE_SERVICE } from './services/storage.service';
import { LocalStorageService } from './services/local-storage.service';

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
    { provide: STORAGE_SERVICE, useClass: LocalStorageService }
  ]
};
