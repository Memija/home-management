import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import {
  LucideAngularModule,
  Cloud,
  CloudOff,
  RefreshCw,
  Upload,
  Download,
  Check,
  AlertTriangle,
  HelpCircle,
} from 'lucide-angular';
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
  imports: [
    CommonModule,
    TranslatePipe,
    LucideAngularModule,
    DeleteConfirmationModalComponent,
    ConfirmationModalComponent,
    HelpModalComponent,
  ],
  templateUrl: './storage-settings.component.html',
  styleUrl: './storage-settings.component.scss',
})
export class StorageSettingsComponent implements OnInit {
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
  readonly isUploading = this.storage.isUploading;
  readonly isDownloading = this.storage.isDownloading;
  readonly hasUserContent = this.storage.hasUserContent;

  // Local state
  readonly actionStatus = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  readonly isDeleteModalOpen = signal(false);
  readonly isDownloadModalOpen = signal(false);
  readonly isClearLocalModalOpen = signal(false);
  readonly isHelpModalOpen = signal(false);

  // Help steps
  readonly helpSteps: HelpStep[] = [
    { titleKey: 'STORAGE.HELP_STEP1_TITLE', descriptionKey: 'STORAGE.HELP_STEP1_DESC' },
    { titleKey: 'STORAGE.HELP_STEP2_TITLE', descriptionKey: 'STORAGE.HELP_STEP2_DESC' },
    { titleKey: 'STORAGE.HELP_STEP3_TITLE', descriptionKey: 'STORAGE.HELP_STEP3_DESC' },
  ];

  ngOnInit(): void {
    this.storage.refreshLocalContentStatus();
  }

  get isToggleDisabled(): boolean {
    return !this.isAuthenticated() || this.isDemoMode();
  }

  showHelp(): void {
    this.isHelpModalOpen.set(true);
  }

  closeHelp(): void {
    this.isHelpModalOpen.set(false);
  }

  async toggleMode(): Promise<void> {
    if (!this.isAuthenticated()) return;

    const currentMode = this.mode();
    if (currentMode === 'cloud') {
      // Disabling cloud sync - switch to local mode immediately
      this.storage.setMode('local');
      // Then offer to clear local data
      this.isClearLocalModalOpen.set(true);
    } else {
      // Enabling cloud sync
      this.storage.setMode('cloud');

      // Initial automatic sync
      try {
        if (this.hasUserContent()) {
          // If we have local data, do a full sync so everything is merged
          await this.storage.fullSync();
        } else {
          // If no local data, just pull everything for the fresh device
          await this.storage.pullFromCloud();
        }
        // Force reload to apply synced data across all services
        window.location.reload();
      } catch (error) {
        console.error('Initial sync failed:', error);
        this.showStatus('error', 'STORAGE.SYNC_ERROR');
      }
    }
  }

  closeClearLocalModal(): void {
    this.isClearLocalModalOpen.set(false);
  }

  async onConfirmClearLocal(): Promise<void> {
    this.isClearLocalModalOpen.set(false);
    await this.storage.clearLocalData();
    window.location.reload();
  }

  onCancelClearLocal(): void {
    this.isClearLocalModalOpen.set(false);
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
