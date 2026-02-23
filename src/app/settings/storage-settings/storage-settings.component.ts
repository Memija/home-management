import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LucideAngularModule, Cloud, CloudOff, RefreshCw, Upload, Download, Check, AlertTriangle, HelpCircle } from 'lucide-angular';
import { HybridStorageService } from '../../services/hybrid-storage.service';
import { AuthService } from '../../services/auth.service';
import { DemoService } from '../../services/demo.service';
import { LanguageService } from '../../services/language.service';
import { DeleteConfirmationModalComponent } from '../../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { HelpModalComponent, HelpStep } from '../../shared/help-modal/help-modal.component';

@Component({
  selector: 'app-storage-settings',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LucideAngularModule, DeleteConfirmationModalComponent, ConfirmationModalComponent, HelpModalComponent],
  templateUrl: './storage-settings.component.html',
  styleUrl: './storage-settings.component.scss'
})
export class StorageSettingsComponent {
  private storage = inject(HybridStorageService);
  private auth = inject(AuthService);
  private demo = inject(DemoService);
  private languageService = inject(LanguageService);

  // Locale for date pipe
  readonly currentLang = computed(() => this.languageService.currentLang());

  // Icons
  readonly CloudIcon = Cloud;
  readonly CloudOffIcon = CloudOff;
  readonly RefreshIcon = RefreshCw;
  readonly UploadIcon = Upload;
  readonly DownloadIcon = Download;
  readonly CheckIcon = Check;
  readonly AlertIcon = AlertTriangle;
  readonly HelpIcon = HelpCircle;

  // Signals
  readonly mode = this.storage.mode;
  readonly isCloudMode = this.storage.isCloudMode;
  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly isDemoMode = this.demo.isDemoMode;
  readonly lastSyncTime = this.storage.lastSyncTime;
  readonly isSyncing = this.storage.isSyncing;

  // Local state
  readonly actionStatus = signal<{ type: 'success' | 'error', message: string } | null>(null);
  readonly isDeleteModalOpen = signal(false);
  readonly isDownloadModalOpen = signal(false);
  readonly isHelpModalOpen = signal(false);

  // Help steps
  readonly helpSteps: HelpStep[] = [
    { titleKey: 'STORAGE.HELP_STEP1_TITLE', descriptionKey: 'STORAGE.HELP_STEP1_DESC' },
    { titleKey: 'STORAGE.HELP_STEP2_TITLE', descriptionKey: 'STORAGE.HELP_STEP2_DESC' },
    { titleKey: 'STORAGE.HELP_STEP3_TITLE', descriptionKey: 'STORAGE.HELP_STEP3_DESC' }
  ];

  get isToggleDisabled(): boolean {
    return !this.isAuthenticated() || this.isDemoMode();
  }

  showHelp(): void {
    this.isHelpModalOpen.set(true);
  }

  closeHelp(): void {
    this.isHelpModalOpen.set(false);
  }

  toggleMode(): void {
    if (!this.isAuthenticated()) return;
    this.storage.toggleMode();
  }

  async migrateToCloud(): Promise<void> {
    if (!this.isAuthenticated()) {
      this.showStatus('error', 'STORAGE.SIGN_IN_REQUIRED');
      return;
    }

    this.clearStatus();
    try {
      await this.storage.migrateLocalToCloud();
      this.showStatus('success', 'STORAGE.MIGRATE_SUCCESS');
    } catch (error) {
      console.error('Migration failed:', error);
      this.showStatus('error', 'STORAGE.MIGRATE_ERROR');
    }
  }

  async pullFromCloud(): Promise<void> {
    if (!this.isAuthenticated()) {
      this.showStatus('error', 'STORAGE.SIGN_IN_REQUIRED');
      return;
    }

    this.clearStatus();
    try {
      await this.storage.pullFromCloud();
      // Reload the page so all services pick up the new data from localStorage
      window.location.reload();
    } catch (error) {
      console.error('Pull failed:', error);
      this.showStatus('error', 'STORAGE.PULL_ERROR');
    }
  }

  openDownloadModal(): void {
    this.isDownloadModalOpen.set(true);
  }

  closeDownloadModal(): void {
    this.isDownloadModalOpen.set(false);
  }

  async onConfirmDownload(): Promise<void> {
    this.closeDownloadModal();
    await this.pullFromCloud();
  }

  openDeleteModal(): void {
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
  }

  async onConfirmDelete(): Promise<void> {
    this.closeDeleteModal();

    if (!this.isAuthenticated()) {
      this.showStatus('error', 'STORAGE.SIGN_IN_REQUIRED');
      return;
    }

    this.clearStatus();
    try {
      await this.storage.clearCloudData();
      this.showStatus('success', 'STORAGE.DELETE_SUCCESS');
    } catch (error) {
      console.error('Cloud deletion failed:', error);
      this.showStatus('error', 'STORAGE.DELETE_ERROR');
    }
  }

  private showStatus(type: 'success' | 'error', messageKey: string): void {
    this.actionStatus.set({ type, message: messageKey });
    setTimeout(() => this.clearStatus(), 8000);
  }

  private clearStatus(): void {
    this.actionStatus.set(null);
  }
}
