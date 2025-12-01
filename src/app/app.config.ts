import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { WaterComponent } from './water/water.component';
import { HeatingComponent } from './heating/heating.component';
import { SettingsComponent } from './settings/settings.component';
import { STORAGE_SERVICE } from './services/storage.service';
import { LocalStorageService } from './services/local-storage.service';

const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'water', component: WaterComponent },
  { path: 'heating', component: HeatingComponent },
  { path: 'settings', component: SettingsComponent }
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideClientHydration(withEventReplay()),
    provideRouter(routes),
    { provide: STORAGE_SERVICE, useClass: LocalStorageService }
  ]
};
