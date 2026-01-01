import { Component, signal, inject, effect, computed, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Pencil, Save, X, Trash2, Plus, Download, Upload, User, Baby, Mars, Venus, AlertTriangle, HelpCircle, TriangleAlert } from 'lucide-angular';
import { HouseholdService, HouseholdMember } from '../../services/household.service';
import { LanguageService } from '../../services/language.service';
import { FormValidationService } from '../../services/form-validation.service';
import { FamilyImportService } from '../../services/family-import.service';
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
  styleUrl: './family.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FamilyComponent {
  // Maximum number of family members allowed
  protected readonly MAX_FAMILY_MEMBERS = 9;

  protected languageService = inject(LanguageService);
  protected householdService = inject(HouseholdService);
  protected fileStorage = inject(FileStorageService);
  private validationService = inject(FormValidationService);
  private familyImportService = inject(FamilyImportService);

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
  protected readonly TriangleAlertIcon = TriangleAlert;

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

  // Individual member edit state
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

  // Validation Signals
  protected newMemberNameError = signal('');
  protected newMemberSurnameError = signal('');

  // Duplicate member error state
  protected showDuplicateMemberError = signal(false);
  protected duplicateMemberName = signal('');

  // Max members limit check
  protected isAtMaxMembers = computed(() => this.draftMembers().length >= this.MAX_FAMILY_MEMBERS);
  protected showMaxMembersError = signal(false);

  constructor() {
    effect(() => {
      const currentMembers = this.householdService.members();
      if (!this.isEditing()) {
        this.draftMembers.set(Array.isArray(currentMembers) ? [...currentMembers] : []);
      }
    });
  }

  // Helper to show save confirmation temporarily
  private showTemporarySaveConfirmation(): void {
    this.showSaveConfirmation.set(true);
    setTimeout(() => this.showSaveConfirmation.set(false), 3000);
  }

  // Computed property to check if there are unsaved changes
  public hasUnsavedChanges = computed(() => {
    if (!this.isEditing()) return false;

    // Check if adding a new member and fields are populated
    if (this.showAddMemberForm() && (this.newMemberName() || this.newMemberSurname())) {
      return true;
    }

    // Check if inline editing is active
    if (this.editingMemberId()) {
      return true;
    }

    const savedMembers = this.householdService.members();
    const draft = this.draftMembers();
    if (!Array.isArray(savedMembers) || !Array.isArray(draft)) return false;
    if (savedMembers.length !== draft.length) return true;
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

  confirmLeaveWithoutSaving() {
    const navigation = this.pendingNavigation();
    if (navigation) navigation();
    this.showUnsavedChangesModal.set(false);
    this.pendingNavigation.set(null);
  }

  stayAndSave() {
    this.showUnsavedChangesModal.set(false);
    this.pendingNavigation.set(null);
  }

  public triggerNavigationWarning(onLeave: () => void): boolean {
    if (this.hasUnsavedChanges()) {
      this.pendingNavigation.set(onLeave);
      this.showUnsavedChangesModal.set(true);
      return true;
    }
    return false;
  }

  saveFamily() {
    this.householdService.updateMembers(this.draftMembers());
    this.isEditing.set(false);
    this.showTemporarySaveConfirmation();
    this.resetForm();
  }

  addMember() {
    // Use validation service
    const nameError = this.validationService.getNameError(this.newMemberName());
    const surnameError = this.validationService.getSurnameError(this.newMemberSurname());
    this.newMemberNameError.set(nameError);
    this.newMemberSurnameError.set(surnameError);

    if (nameError || surnameError) return;

    if (this.newMemberName() && this.newMemberSurname()) {
      // Check for duplicate
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

  onNameChange(value: string) {
    this.newMemberName.set(value);
    this.newMemberNameError.set(this.validationService.getNameError(value));
  }

  onSurnameChange(value: string) {
    this.newMemberSurname.set(value);
    this.newMemberSurnameError.set(this.validationService.getSurnameError(value));
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

  startEditMember(member: HouseholdMember) {
    this.editingMemberId.set(member.id);
  }

  cancelEditMember() {
    this.editingMemberId.set(null);
  }

  onMemberEditorSave(data: MemberEditData) {
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
        this.newMemberPicturePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  toggleAddMemberForm() {
    this.showAddMemberForm.set(!this.showAddMemberForm());
  }

  async exportFamily() {
    await this.familyImportService.exportMembers(this.householdService.members());
  }

  async importFamily() {
    this.showImportConfirmModal.set(true);
  }

  async confirmImportFamily() {
    const result = await this.familyImportService.importFromFile();

    if (!result.success) {
      if (result.errorMessage) {
        this.importErrorMessage.set(result.errorMessage);
        this.importErrorInstructions.set(result.errorInstructions || []);
        this.showImportErrorModal.set(true);
      }
      this.showImportConfirmModal.set(false);
      return;
    }

    if (result.members) {
      this.householdService.updateMembers(result.members);
      this.showTemporarySaveConfirmation();
    }
    this.showImportConfirmModal.set(false);
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
    this.newMemberNameError.set('');
    this.newMemberSurname.set('');
    this.newMemberSurnameError.set('');
    this.newMemberType.set(undefined);
    this.newMemberGender.set(undefined);
    this.selectedAvatar.set(undefined);
    this.newMemberPicturePreview.set(null);
    this.showAddMemberForm.set(false);
  }



  showHelp() {
    this.showHelpModal.set(true);
  }

  closeHelp() {
    this.showHelpModal.set(false);
  }
}
