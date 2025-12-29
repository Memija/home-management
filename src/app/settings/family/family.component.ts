import { Component, signal, inject, effect, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Pencil, Save, X, Trash2, Plus, Download, Upload, User, Baby, Mars, Venus, AlertTriangle, HelpCircle } from 'lucide-angular';
import { HouseholdService, HouseholdMember } from '../../services/household.service';
import { LanguageService } from '../../services/language.service';
import { FileStorageService } from '../../services/file-storage.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { DeleteConfirmationModalComponent } from '../../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { ErrorModalComponent } from '../../shared/error-modal/error-modal.component';
import { HelpModalComponent, HelpStep } from '../../shared/help-modal/help-modal.component';
import { MemberEditorComponent, MemberEditData } from '../../shared/member-editor/member-editor.component';

@Component({
  selector: 'app-family',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe, DeleteConfirmationModalComponent, ConfirmationModalComponent, ErrorModalComponent, HelpModalComponent, MemberEditorComponent],
  templateUrl: './family.component.html',
  styleUrl: './family.component.scss'
})
export class FamilyComponent {
  protected languageService = inject(LanguageService);
  protected householdService = inject(HouseholdService);
  protected fileStorage = inject(FileStorageService);

  // Icons
  protected readonly EditIcon = Pencil;
  protected readonly SaveIcon = Save;
  protected readonly CancelIcon = X;
  protected readonly DeleteIcon = Trash2;
  protected readonly AddIcon = Plus;
  protected readonly ExportIcon = Download;
  protected readonly ImportIcon = Upload;
  protected readonly AdultIcon = User;
  protected readonly KidIcon = Baby;
  protected readonly MaleIcon = Mars;
  protected readonly FemaleIcon = Venus;
  protected readonly WarningIcon = AlertTriangle;
  protected readonly HelpIcon = HelpCircle;

  // State
  protected isEditing = signal(false);
  protected showSaveConfirmation = signal(false);
  protected showAddMemberForm = signal(false);
  protected showDeleteModal = signal(false);
  protected memberToDelete = signal<string | null>(null);
  public showUnsavedChangesModal = signal(false);
  public pendingNavigation = signal<(() => void) | null>(null);
  protected showImportConfirmModal = signal(false);
  protected showHelpModal = signal(false);

  protected readonly helpSteps: HelpStep[] = [
    { titleKey: 'SETTINGS.FAMILY_HELP_STEP_1_TITLE', descriptionKey: 'SETTINGS.FAMILY_HELP_STEP_1_DESC' },
    { titleKey: 'SETTINGS.FAMILY_HELP_STEP_2_TITLE', descriptionKey: 'SETTINGS.FAMILY_HELP_STEP_2_DESC' },
    { titleKey: 'SETTINGS.FAMILY_HELP_STEP_3_TITLE', descriptionKey: 'SETTINGS.FAMILY_HELP_STEP_3_DESC' },
    { titleKey: 'SETTINGS.FAMILY_HELP_STEP_4_TITLE', descriptionKey: 'SETTINGS.FAMILY_HELP_STEP_4_DESC' },
    { titleKey: 'SETTINGS.FAMILY_HELP_STEP_5_TITLE', descriptionKey: 'SETTINGS.FAMILY_HELP_STEP_5_DESC' },
    { titleKey: 'SETTINGS.FAMILY_HELP_STEP_6_TITLE', descriptionKey: 'SETTINGS.FAMILY_HELP_STEP_6_DESC' },
    { titleKey: 'SETTINGS.FAMILY_HELP_STEP_7_TITLE', descriptionKey: 'SETTINGS.FAMILY_HELP_STEP_7_DESC' }
  ];

  // Error modal state
  protected showImportErrorModal = signal(false);
  protected importErrorMessage = signal('');
  protected importErrorInstructions = signal<string[]>([]);

  // Safe computed for template - ensures array for NgFor
  protected safeMembers = computed(() => {
    const members = this.householdService.members();
    return Array.isArray(members) ? members : [];
  });

  // Individual member edit state - only editingMemberId needed (rest in MemberEditorComponent)
  protected editingMemberId = signal<string | null>(null);

  // Draft state for editing
  protected draftMembers = signal<HouseholdMember[]>([]);

  // New Member Form Signals
  protected newMemberName = signal('');
  protected newMemberSurname = signal('');
  protected newMemberType = signal<'adult' | 'kid' | 'other' | undefined>(undefined);
  protected newMemberGender = signal<'male' | 'female' | 'other' | undefined>(undefined);
  protected selectedAvatar = signal<string | undefined>(undefined);
  protected newMemberPicturePreview = signal<string | null>(null);

  // Duplicate member error state
  protected showDuplicateMemberError = signal(false);
  protected duplicateMemberName = signal('');

  constructor() {
    // Initialize draft members when entering edit mode or when members change while not editing
    effect(() => {
      const currentMembers = this.householdService.members();
      if (!this.isEditing()) {
        // Ensure currentMembers is an array before spreading
        this.draftMembers.set(Array.isArray(currentMembers) ? [...currentMembers] : []);
      }
    });
  }

  // Helper to show save confirmation temporarily
  private showTemporarySaveConfirmation(): void {
    this.showSaveConfirmation.set(true);
    setTimeout(() => this.showSaveConfirmation.set(false), 3000);
  }

  // Computed property to check if there are unsaved changes (public for parent access)
  public hasUnsavedChanges = computed(() => {
    if (!this.isEditing()) return false;

    const savedMembers = this.householdService.members();
    const draft = this.draftMembers();

    // Ensure both are arrays
    if (!Array.isArray(savedMembers) || !Array.isArray(draft)) return false;

    // Compare lengths first
    if (savedMembers.length !== draft.length) return true;

    // Compare each member
    return !savedMembers.every((saved, index) => {
      const draftMember = draft[index];
      return saved.id === draftMember.id &&
        saved.name === draftMember.name &&
        saved.surname === draftMember.surname &&
        saved.type === draftMember.type &&
        saved.gender === draftMember.gender &&
        saved.avatar === draftMember.avatar;
    });
  });

  // Handle browser refresh/close
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
      return '';
    }
    return;
  }

  editFamily() {
    this.draftMembers.set([...this.householdService.members()]);
    this.isEditing.set(true);
    this.showSaveConfirmation.set(false);
  }

  cancelEdit() {
    if (this.hasUnsavedChanges()) {
      this.pendingNavigation.set(() => {
        this.isEditing.set(false);
        this.resetForm();
      });
      this.showUnsavedChangesModal.set(true);
    } else {
      this.isEditing.set(false);
      this.resetForm();
    }
  }

  // Unsaved changes modal handlers
  confirmLeaveWithoutSaving() {
    const navigation = this.pendingNavigation();
    if (navigation) {
      navigation();
    }
    this.showUnsavedChangesModal.set(false);
    this.pendingNavigation.set(null);
  }

  stayAndSave() {
    this.showUnsavedChangesModal.set(false);
    this.pendingNavigation.set(null);
    // User chose to stay, they can save manually
  }

  // Method for parent component to trigger navigation warning
  public triggerNavigationWarning(onLeave: () => void): boolean {
    if (this.hasUnsavedChanges()) {
      this.pendingNavigation.set(onLeave);
      this.showUnsavedChangesModal.set(true);
      return true; // Navigation blocked
    }
    return false; // Navigation allowed
  }

  saveFamily() {
    this.householdService.updateMembers(this.draftMembers());
    this.isEditing.set(false);
    this.showTemporarySaveConfirmation();
    this.resetForm();
  }

  addMember() {
    if (this.newMemberName() && this.newMemberSurname()) {
      // Check for duplicate member (same name and surname, case-insensitive)
      const newName = this.newMemberName().trim().toLowerCase();
      const newSurname = this.newMemberSurname().trim().toLowerCase();
      const existingMember = this.draftMembers().find(
        m => m.name.toLowerCase() === newName && m.surname.toLowerCase() === newSurname
      );

      if (existingMember) {
        this.duplicateMemberName.set(`${existingMember.name} ${existingMember.surname}`);
        this.showDuplicateMemberError.set(true);
        return;
      }

      const avatar = this.newMemberPicturePreview() || this.selectedAvatar() || this.householdService.avatars[Math.floor(Math.random() * this.householdService.avatars.length)];

      const newMember: HouseholdMember = {
        id: crypto.randomUUID(),
        name: this.newMemberName().trim(),
        surname: this.newMemberSurname().trim(),
        type: this.newMemberType(),
        gender: this.newMemberGender(),
        avatar: avatar
      };

      this.draftMembers.update(members => [...members, newMember]);
      this.resetForm();
    }
  }

  removeMember(id: string) {
    this.memberToDelete.set(id);
    this.showDeleteModal.set(true);
  }

  confirmDelete() {
    const memberId = this.memberToDelete();
    if (memberId) {
      this.draftMembers.update(members => members.filter(m => m.id !== memberId));
    }
    this.showDeleteModal.set(false);
    this.memberToDelete.set(null);
  }

  cancelDelete() {
    this.showDeleteModal.set(false);
    this.memberToDelete.set(null);
  }

  selectAvatar(avatar: string) {
    this.selectedAvatar.set(avatar);
  }

  // Individual member edit methods
  startEditMember(member: HouseholdMember) {
    this.editingMemberId.set(member.id);
  }

  cancelEditMember() {
    this.editingMemberId.set(null);
  }

  /** Handler for MemberEditorComponent save event */
  onMemberEditorSave(data: MemberEditData) {
    // Update in draft members list
    this.draftMembers.update(members =>
      members.map(m => m.id === data.id ? {
        ...m,
        name: data.name,
        surname: data.surname,
        type: data.type,
        gender: data.gender,
        avatar: data.avatar
      } : m)
    );
    this.editingMemberId.set(null);
  }


  handleNewMemberFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        this.newMemberPicturePreview.set(result);
      };
      reader.readAsDataURL(file);
    }
  }

  toggleAddMemberForm() {
    this.showAddMemberForm.set(!this.showAddMemberForm());
  }

  async exportFamily() {
    const members = this.householdService.members();
    // Ensure type and gender are always set (use 'other' as default for undefined)
    const exportMembers = members.map(m => ({
      ...m,
      type: m.type || 'other',
      gender: m.gender || 'other'
    }));
    await this.fileStorage.exportData(exportMembers, 'family.json');
  }

  async importFamily() {
    this.showImportConfirmModal.set(true);
  }

  async confirmImportFamily() {
    const result = await this.fileStorage.importData<HouseholdMember[]>(true);

    // User cancelled
    if (result === null) {
      this.showImportConfirmModal.set(false);
      return;
    }

    // Handle errors
    if ('error' in result) {
      if (result.error === 'invalid_file_type') {
        this.importErrorMessage.set(this.languageService.translate('SETTINGS.IMPORT_FAMILY_INVALID_FILE_TYPE'));
        this.importErrorInstructions.set([
          'SETTINGS.IMPORT_FAMILY_INVALID_FILE_TYPE_INSTRUCTION_1',
          'SETTINGS.IMPORT_FAMILY_INVALID_FILE_TYPE_INSTRUCTION_2'
        ]);
      } else {
        // parse_error
        this.importErrorMessage.set(this.languageService.translate('HOME.IMPORT_INVALID_FORMAT'));
        this.importErrorInstructions.set([
          'HOME.IMPORT_ERROR_INSTRUCTION_1',
          'HOME.IMPORT_ERROR_INSTRUCTION_2',
          'HOME.IMPORT_ERROR_INSTRUCTION_3'
        ]);
      }
      this.showImportErrorModal.set(true);
      this.showImportConfirmModal.set(false);
      return;
    }

    // Validate data structure
    if (!Array.isArray(result.data)) {
      this.importErrorMessage.set(this.languageService.translate('HOME.IMPORT_INVALID_DATA'));
      this.importErrorInstructions.set([
        'HOME.IMPORT_ERROR_INSTRUCTION_1',
        'HOME.IMPORT_ERROR_INSTRUCTION_2',
        'HOME.IMPORT_ERROR_INSTRUCTION_3'
      ]);
      this.showImportErrorModal.set(true);
      this.showImportConfirmModal.set(false);
      return;
    }

    // Validate each member
    const validationResult = this.validateImportedMembers(result.data);
    if (!validationResult.valid) {
      this.importErrorMessage.set(this.languageService.translate('SETTINGS.IMPORT_FAMILY_INVALID_DATA'));
      this.importErrorInstructions.set(validationResult.errors);
      this.showImportErrorModal.set(true);
      this.showImportConfirmModal.set(false);
      return;
    }

    // Success - import validated members
    this.householdService.updateMembers(validationResult.members);
    this.showTemporarySaveConfirmation();
    this.showImportConfirmModal.set(false);
  }

  /**
   * Validates imported member data and returns sanitized members or errors
   */
  private validateImportedMembers(data: any[]): { valid: true; members: HouseholdMember[]; errors?: never } | { valid: false; errors: string[]; members?: never } {
    const errors: string[] = [];
    const validatedMembers: HouseholdMember[] = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const memberNum = i + 1;
      let hasErrors = false;

      // Check if item is an object
      if (!item || typeof item !== 'object') {
        errors.push('SETTINGS.IMPORT_FAMILY_ERROR_NOT_OBJECT');
        continue;
      }

      // Validate required string fields
      if (!item.name || typeof item.name !== 'string' || item.name.trim() === '') {
        errors.push('SETTINGS.IMPORT_FAMILY_ERROR_MISSING_NAME');
        hasErrors = true;
      }
      if (!item.surname || typeof item.surname !== 'string' || item.surname.trim() === '') {
        errors.push('SETTINGS.IMPORT_FAMILY_ERROR_MISSING_SURNAME');
        hasErrors = true;
      }

      // Validate type (required - must be adult, kid, or other)
      if (!item.type || (item.type !== 'adult' && item.type !== 'kid' && item.type !== 'other')) {
        errors.push('SETTINGS.IMPORT_FAMILY_ERROR_INVALID_TYPE');
        hasErrors = true;
      }

      // Validate gender (required - must be male, female, or other)
      if (!item.gender || (item.gender !== 'male' && item.gender !== 'female' && item.gender !== 'other')) {
        errors.push('SETTINGS.IMPORT_FAMILY_ERROR_INVALID_GENDER');
        hasErrors = true;
      }

      // Skip this record if it has validation errors
      if (hasErrors) {
        continue;
      }

      // Validate and sanitize avatar - accept known avatars or data URLs, otherwise use default
      let validAvatar: string;
      if (item.avatar && typeof item.avatar === 'string') {
        const isKnownAvatar = this.householdService.avatars.includes(item.avatar);
        const isDataUrl = item.avatar.startsWith('data:image/');
        validAvatar = (isKnownAvatar || isDataUrl) ? item.avatar : this.householdService.avatars[Math.floor(Math.random() * this.householdService.avatars.length)];
      } else {
        validAvatar = this.householdService.avatars[Math.floor(Math.random() * this.householdService.avatars.length)];
      }

      // Create validated member with generated ID if missing
      validatedMembers.push({
        id: (item.id && typeof item.id === 'string') ? item.id : crypto.randomUUID(),
        name: item.name.trim(),
        surname: item.surname.trim(),
        type: item.type,
        gender: item.gender,
        avatar: validAvatar
      });
    }

    // Remove duplicate errors and keep unique ones
    const uniqueErrors = [...new Set(errors)];

    if (uniqueErrors.length > 0) {
      return { valid: false, errors: uniqueErrors };
    }

    if (validatedMembers.length === 0 && data.length > 0) {
      return { valid: false, errors: ['SETTINGS.IMPORT_FAMILY_ERROR_NO_VALID_MEMBERS'] };
    }

    return { valid: true, members: validatedMembers };
  }

  cancelImportFamily() {
    this.showImportConfirmModal.set(false);
  }

  closeImportErrorModal() {
    this.showImportErrorModal.set(false);
    this.importErrorMessage.set('');
    this.importErrorInstructions.set([]);
  }

  closeDuplicateMemberError() {
    this.showDuplicateMemberError.set(false);
    this.duplicateMemberName.set('');
  }

  private resetForm() {
    this.newMemberName.set('');
    this.newMemberSurname.set('');
    this.newMemberType.set(undefined);
    this.newMemberGender.set(undefined);
    this.selectedAvatar.set(undefined);
    this.newMemberPicturePreview.set(null);
    this.showAddMemberForm.set(false);
  }

  // TrackBy functions for *ngFor performance
  trackByMemberId(index: number, member: HouseholdMember): string {
    return member.id;
  }

  trackByAvatar(index: number, avatar: string): string {
    return avatar;
  }

  // Help modal methods
  showHelp() {
    this.showHelpModal.set(true);
  }

  closeHelp() {
    this.showHelpModal.set(false);
  }
}
