import { Component, inject, ViewChild, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../services/language.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { AddressComponent } from './address/address.component';
import { FamilyComponent } from './family/family.component';
import { ExcelSettingsComponent } from './excel-settings/excel-settings.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [TranslatePipe, CommonModule, AddressComponent, FamilyComponent, ExcelSettingsComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent {
  protected languageService = inject(LanguageService);

  @ViewChild(FamilyComponent) familyComponent!: FamilyComponent;
  @ViewChild(AddressComponent) addressComponent!: AddressComponent;
  @ViewChild(ExcelSettingsComponent) excelSettingsComponent!: ExcelSettingsComponent;

  // Handle browser refresh/close
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.familyComponent?.hasUnsavedChanges() ||
      this.addressComponent?.hasUnsavedChanges() ||
      this.excelSettingsComponent?.hasUnsavedChanges()) {
      event.preventDefault();
      return '';
    }
    return;
  }

  // CanDeactivate interface for route navigation
  canDeactivate(): boolean | Promise<boolean> {
    // 1. Check Family Component
    if (this.familyComponent?.hasUnsavedChanges()) {
      return this.handleComponentUnsavedChanges(this.familyComponent);
    }

    // 2. Check Excel Settings Component (accessed via ViewChild if needed, or we can use a shared service state if we had one.
    //    But here we need to access the component instance. Let's add ViewChild for it.)
    if (this.excelSettingsComponent?.hasUnsavedChanges()) {
      return this.handleComponentUnsavedChanges(this.excelSettingsComponent);
    }

    // 3. Check Address Component
    if (this.addressComponent?.hasUnsavedChanges()) {
      return this.handleComponentUnsavedChanges(this.addressComponent);
    }

    return true;
  }

  // Helper to handle the promise logic for any component having unsaved changes
  private handleComponentUnsavedChanges(component: any): Promise<boolean> {
    return new Promise((resolve) => {
      component.triggerNavigationWarning(() => {
        resolve(true); // Allow navigation after user confirms
      });

      // Also need to handle if user clicks "Stay"
      // We monkey-patch stayAndSave temporarily or rely on the component resolving/resetting state.
      // But component.stayAndSave() just closes modal. It doesn't know about our promise.
      // The previous implementation monkey-patched `stayAndSave`. Let's do that.
      const originalStayAndSave = component.stayAndSave.bind(component);
      component.stayAndSave = () => {
        originalStayAndSave();
        resolve(false); // Block navigation
        component.stayAndSave = originalStayAndSave; // Restore original
      };
    });
  }
}
