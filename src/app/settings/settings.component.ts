import { Component, inject, ViewChild, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../services/language.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { AddressComponent } from './address/address.component';
import { FamilyComponent } from './family/family.component';
import { ExcelSettingsComponent } from './excel-settings/excel-settings.component';
import { LucideAngularModule, ArrowLeft } from 'lucide-angular';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [RouterLink, TranslatePipe, CommonModule, AddressComponent, FamilyComponent, ExcelSettingsComponent, LucideAngularModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  protected languageService = inject(LanguageService);
  protected readonly ArrowLeftIcon = ArrowLeft;

  @ViewChild(FamilyComponent) familyComponent!: FamilyComponent;

  // Handle browser refresh/close
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.familyComponent?.hasUnsavedChanges()) {
      event.preventDefault();
      return '';
    }
    return;
  }

  // CanDeactivate interface for route navigation
  canDeactivate(): boolean | Promise<boolean> {
    if (this.familyComponent?.hasUnsavedChanges()) {
      // Show the family component's modal and return a promise
      return new Promise((resolve) => {
        this.familyComponent.triggerNavigationWarning(() => {
          resolve(true); // Allow navigation after user confirms
        });

        // Also need to handle if user clicks "Stay"
        const originalStayAndSave = this.familyComponent.stayAndSave.bind(this.familyComponent);
        this.familyComponent.stayAndSave = () => {
          originalStayAndSave();
          resolve(false); // Block navigation
          this.familyComponent.stayAndSave = originalStayAndSave; // Restore original
        };
      });
    }
    return true;
  }
}
