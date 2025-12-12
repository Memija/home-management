import { Component, signal, inject, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Pencil, Save, X, Trash2, Plus, Download, Upload, User, Baby, Mars, Venus } from 'lucide-angular';
import { HouseholdService, HouseholdMember } from '../../services/household.service';
import { LanguageService } from '../../services/language.service';
import { FileStorageService } from '../../services/file-storage.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { DeleteConfirmationModalComponent } from '../../shared/delete-confirmation-modal/delete-confirmation-modal.component';

@Component({
    selector: 'app-family',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe, DeleteConfirmationModalComponent],
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

    // State
    protected isEditing = signal(false);
    protected showSaveConfirmation = signal(false);
    protected showAddMemberForm = signal(false);
    protected showDeleteModal = signal(false);
    protected memberToDelete = signal<string | null>(null);

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
                this.draftMembers.set([...currentMembers]);
            }
        });
    }

    editFamily() {
        this.draftMembers.set([...this.householdService.members()]);
        this.isEditing.set(true);
        this.showSaveConfirmation.set(false);
    }

    cancelEdit() {
        this.isEditing.set(false);
        this.resetForm();
    }

    saveFamily() {
        this.householdService.updateMembers(this.draftMembers());
        this.isEditing.set(false);
        this.showSaveConfirmation.set(true);
        setTimeout(() => this.showSaveConfirmation.set(false), 3000);
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
            this.showSaveConfirmation.set(true);
            setTimeout(() => this.showSaveConfirmation.set(false), 3000);
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
        const imported = await this.fileStorage.importData<HouseholdMember[]>();
        if (imported) {
            this.householdService.updateMembers(imported);
            this.showSaveConfirmation.set(true);
            setTimeout(() => this.showSaveConfirmation.set(false), 3000);
        }
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
}
