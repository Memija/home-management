import { Component, signal, inject, effect, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Pencil, Save, X, Trash2, Plus, Download, Upload, User, Baby, Mars, Venus, AlertTriangle } from 'lucide-angular';
import { HouseholdService, HouseholdMember } from '../../services/household.service';
import { LanguageService } from '../../services/language.service';
import { FileStorageService } from '../../services/file-storage.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { DeleteConfirmationModalComponent } from '../../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { ErrorModalComponent } from '../../shared/error-modal/error-modal.component';

@Component({
    selector: 'app-family',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe, DeleteConfirmationModalComponent, ConfirmationModalComponent, ErrorModalComponent],
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

    // State
    protected isEditing = signal(false);
    protected showSaveConfirmation = signal(false);
    protected showAddMemberForm = signal(false);
    protected showDeleteModal = signal(false);
    protected memberToDelete = signal<string | null>(null);
    public showUnsavedChangesModal = signal(false);
    public pendingNavigation = signal<(() => void) | null>(null);
    protected showImportConfirmModal = signal(false);

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
    protected editMemberName = signal('');
    protected editMemberSurname = signal('');
    protected editMemberType = signal<'adult' | 'kid'>('adult');
    protected editMemberGender = signal<'male' | 'female'>('male');
    protected editMemberAvatar = signal<string>('');
    protected customPicturePreview = signal<string | null>(null);

    // Draft state for editing
    protected draftMembers = signal<HouseholdMember[]>([]);

    // New Member Form Signals
    protected newMemberName = signal('');
    protected newMemberSurname = signal('');
    protected newMemberType = signal<'adult' | 'kid'>('adult');
    protected newMemberGender = signal<'male' | 'female'>('male');
    protected selectedAvatar = signal<string | undefined>(undefined);
    protected newMemberPicturePreview = signal<string | null>(null);

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
            const avatar = this.newMemberPicturePreview() || this.selectedAvatar() || this.householdService.avatars[Math.floor(Math.random() * this.householdService.avatars.length)];

            const newMember: HouseholdMember = {
                id: crypto.randomUUID(),
                name: this.newMemberName(),
                surname: this.newMemberSurname(),
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
        this.editMemberName.set(member.name);
        this.editMemberSurname.set(member.surname);
        this.editMemberType.set(member.type);
        this.editMemberGender.set(member.gender);
        this.editMemberAvatar.set(member.avatar);
        this.customPicturePreview.set(null);
    }

    cancelEditMember() {
        this.editingMemberId.set(null);
        this.customPicturePreview.set(null);
    }

    saveMemberEdit() {
        const memberId = this.editingMemberId();
        if (memberId) {
            const avatar = this.customPicturePreview() || this.editMemberAvatar();

            this.householdService.updateMember(memberId, {
                name: this.editMemberName(),
                surname: this.editMemberSurname(),
                type: this.editMemberType(),
                gender: this.editMemberGender(),
                avatar: avatar
            });

            this.editingMemberId.set(null);
            this.customPicturePreview.set(null);
            this.showTemporarySaveConfirmation();
        }
    }

    saveMemberEditInBulk() {
        const memberId = this.editingMemberId();
        if (memberId) {
            const avatar = this.customPicturePreview() || this.editMemberAvatar();

            // Update in draft members list
            this.draftMembers.update(members =>
                members.map(m => m.id === memberId ? {
                    ...m,
                    name: this.editMemberName(),
                    surname: this.editMemberSurname(),
                    type: this.editMemberType(),
                    gender: this.editMemberGender(),
                    avatar: avatar
                } : m)
            );

            this.editingMemberId.set(null);
            this.customPicturePreview.set(null);
        }
    }

    selectEditAvatar(avatar: string) {
        this.editMemberAvatar.set(avatar);
        this.customPicturePreview.set(null);
    }

    handleFileUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                this.customPicturePreview.set(result);
            };
            reader.readAsDataURL(file);
        }
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
        await this.fileStorage.exportData(members, 'family.json');
    }

    async importFamily() {
        this.showImportConfirmModal.set(true);
    }

    async confirmImportFamily() {
        const imported = await this.fileStorage.importData<HouseholdMember[]>();
        if (imported && Array.isArray(imported)) {
            this.householdService.updateMembers(imported);
            this.showTemporarySaveConfirmation();
        } else if (imported !== null) {
            // User selected a file but it was invalid
            this.importErrorMessage.set(this.languageService.translate('HOME.IMPORT_INVALID_DATA'));
            this.importErrorInstructions.set([
                'HOME.IMPORT_ERROR_INSTRUCTION_1',
                'HOME.IMPORT_ERROR_INSTRUCTION_2',
                'HOME.IMPORT_ERROR_INSTRUCTION_3'
            ]);
            this.showImportErrorModal.set(true);
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

    private resetForm() {
        this.newMemberName.set('');
        this.newMemberSurname.set('');
        this.newMemberType.set('adult');
        this.newMemberGender.set('male');
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
}
