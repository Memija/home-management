import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FamilyComponent } from './family.component';
import { HouseholdService, HouseholdMember } from '../../services/household.service';
import { LanguageService } from '../../services/language.service';
import { FormValidationService } from '../../services/form-validation.service';
import { FamilyImportService } from '../../services/family-import.service';
import { FileStorageService } from '../../services/file-storage.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { DeleteConfirmationModalComponent } from '../../shared/delete-confirmation-modal/delete-confirmation-modal.component';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { ErrorModalComponent } from '../../shared/error-modal/error-modal.component';
import { HelpModalComponent } from '../../shared/help-modal/help-modal.component';
import { MemberEditorComponent } from '../../shared/member-editor/member-editor.component';
import { Pipe, PipeTransform, Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { vi, afterEach } from 'vitest';

@Pipe({ name: 'translate', standalone: true })
class MockTranslatePipe implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

@Component({ selector: 'app-delete-confirmation-modal', standalone: true, template: '' })
class MockDeleteConfirmationModalComponent {
  @Input() show = false;
  @Input() titleKey = '';
  @Input() messageKey = '';
  @Input() cancelKey = '';
  @Input() deleteKey = '';
  @Input() icon?: unknown;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancelModal = new EventEmitter<void>();
}

@Component({ selector: 'app-confirmation-modal', standalone: true, template: '' })
class MockConfirmationModalComponent {
  @Input() show = false;
  @Input() titleKey = '';
  @Input() messageKey = '';
  @Input() cancelKey = '';
  @Input() confirmKey = '';
  @Input() icon?: unknown;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancelModal = new EventEmitter<void>();
}

@Component({ selector: 'app-error-modal', standalone: true, template: '' })
class MockErrorModalComponent {
  @Input() show = false;
  @Input() title = '';
  @Input() message = '';
  @Input() instructions: string[] = [];
  @Output() cancelModal = new EventEmitter<void>();
}

@Component({ selector: 'app-help-modal', standalone: true, template: '' })
class MockHelpModalComponent {
  @Input() show = false;
  @Input() titleKey = '';
  @Input() steps: unknown[] = [];
  @Output() closeModal = new EventEmitter<void>();
}

@Component({ selector: 'app-member-editor', standalone: true, template: '' })
class MockMemberEditorComponent {
  @Input() member?: unknown;
  @Input() avatars: string[] = [];
  @Output() save = new EventEmitter<unknown>();
  @Output() cancelModal = new EventEmitter<void>();
}

const makeMember = (overrides: Partial<HouseholdMember> = {}): HouseholdMember => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'John',
  surname: overrides.surname ?? 'Doe',
  type: overrides.type ?? 'adult',
  gender: overrides.gender ?? 'male',
  avatar: overrides.avatar ?? '/avatars/batman.jpg',
});

describe('FamilyComponent', () => {
  let component: FamilyComponent;
  let fixture: ComponentFixture<FamilyComponent>;
  let householdServiceMock: {
    members: import('@angular/core').WritableSignal<HouseholdMember[]>;
    updateMembers: ReturnType<typeof vi.fn>;
    avatars: string[];
  };
  let languageServiceMock: {
    currentLang: import('@angular/core').WritableSignal<string>;
    translate: ReturnType<typeof vi.fn>;
  };
  let validationServiceMock: {
    getNameError: ReturnType<typeof vi.fn>;
    getSurnameError: ReturnType<typeof vi.fn>;
  };
  let familyImportServiceMock: {
    importFromFile: ReturnType<typeof vi.fn>;
    exportMembers: ReturnType<typeof vi.fn>;
  };
  let fileStorageServiceMock: {
    importData: ReturnType<typeof vi.fn>;
    exportData: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const membersSignal = signal<HouseholdMember[]>([]);

    householdServiceMock = {
      members: membersSignal,
      updateMembers: vi.fn().mockImplementation((m: HouseholdMember[]) => membersSignal.set(m)),
      avatars: ['/avatars/batman.jpg', '/avatars/superman.jpg', '/avatars/wonder-woman.jpg'],
    };

    languageServiceMock = {
      currentLang: signal('en'),
      translate: vi.fn().mockImplementation((key: string) => key),
    };

    validationServiceMock = {
      getNameError: vi.fn().mockReturnValue(''),
      getSurnameError: vi.fn().mockReturnValue(''),
    };

    familyImportServiceMock = {
      importFromFile: vi.fn().mockResolvedValue({ success: false }),
      exportMembers: vi.fn().mockResolvedValue(undefined),
    };

    fileStorageServiceMock = {
      importData: vi.fn(),
      exportData: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [FamilyComponent],
    })
      .overrideComponent(FamilyComponent, {
        remove: {
          imports: [
            TranslatePipe,
            DeleteConfirmationModalComponent,
            ConfirmationModalComponent,
            ErrorModalComponent,
            HelpModalComponent,
            MemberEditorComponent,
          ],
        },
        add: {
          imports: [
            MockTranslatePipe,
            MockDeleteConfirmationModalComponent,
            MockConfirmationModalComponent,
            MockErrorModalComponent,
            MockHelpModalComponent,
            MockMemberEditorComponent,
          ],
        },
      })
      .overrideProvider(HouseholdService, { useValue: householdServiceMock })
      .overrideProvider(LanguageService, { useValue: languageServiceMock })
      .overrideProvider(FormValidationService, { useValue: validationServiceMock })
      .overrideProvider(FamilyImportService, { useValue: familyImportServiceMock })
      .overrideProvider(FileStorageService, { useValue: fileStorageServiceMock })
      .compileComponents();

    fixture = TestBed.createComponent(FamilyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Creation and Defaults', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should not be in editing mode by default', () => {
      expect(component['isEditing']()).toBe(false);
    });

    it('should not show save confirmation by default', () => {
      expect(component['showSaveConfirmation']()).toBe(false);
    });

    it('should not show add member form by default', () => {
      expect(component['showAddMemberForm']()).toBe(false);
    });

    it('should not show delete modal by default', () => {
      expect(component['showDeleteModal']()).toBe(false);
    });

    it('should have null memberToDelete by default', () => {
      expect(component['memberToDelete']()).toBeNull();
    });

    it('should not show unsaved changes modal by default', () => {
      expect(component.showUnsavedChangesModal()).toBe(false);
    });

    it('should have null pendingNavigation by default', () => {
      expect(component.pendingNavigation()).toBeNull();
    });

    it('should not show import confirm modal by default', () => {
      expect(component['showImportConfirmModal']()).toBe(false);
    });

    it('should not show help modal by default', () => {
      expect(component['showHelpModal']()).toBe(false);
    });

    it('should have 7 help steps', () => {
      expect(component['helpSteps'].length).toBe(7);
    });

    it('should have MAX_FAMILY_MEMBERS set to 9', () => {
      expect(component['MAX_FAMILY_MEMBERS']).toBe(9);
    });

    it('should have empty new member form fields', () => {
      expect(component['newMemberName']()).toBe('');
      expect(component['newMemberSurname']()).toBe('');
      expect(component['newMemberType']()).toBeUndefined();
      expect(component['newMemberGender']()).toBeUndefined();
      expect(component['selectedAvatar']()).toBeUndefined();
      expect(component['newMemberPicturePreview']()).toBeNull();
    });

    it('should have no validation errors by default', () => {
      expect(component['newMemberNameError']()).toBe('');
      expect(component['newMemberSurnameError']()).toBe('');
    });

    it('should not show import error modal by default', () => {
      expect(component['showImportErrorModal']()).toBe(false);
    });

    it('should not show duplicate member error by default', () => {
      expect(component['showDuplicateMemberError']()).toBe(false);
    });
  });

  describe('safeMembers', () => {
    it('should return empty array when no members', () => {
      expect(component['safeMembers']()).toEqual([]);
    });

    it('should return members when they exist', () => {
      const members = [makeMember()];
      householdServiceMock.members.set(members);
      expect(component['safeMembers']()).toEqual(members);
    });

    it('should handle non-array members gracefully', () => {
      householdServiceMock.members.set(null as unknown as HouseholdMember[]);
      expect(component['safeMembers']()).toEqual([]);
    });
  });

  describe('isAtMaxMembers', () => {
    it('should return false when under max', () => {
      component['draftMembers'].set([makeMember()]);
      expect(component['isAtMaxMembers']()).toBe(false);
    });

    it('should return true when at max', () => {
      const members = Array.from({ length: 9 }, () => makeMember());
      component['draftMembers'].set(members);
      expect(component['isAtMaxMembers']()).toBe(true);
    });
  });

  describe('editFamily', () => {
    it('should set editing mode to true', () => {
      component.editFamily();
      expect(component['isEditing']()).toBe(true);
    });

    it('should copy current members to draft', () => {
      const members = [makeMember({ name: 'Jane' })];
      householdServiceMock.members.set(members);
      component.editFamily();
      expect(component['draftMembers']().length).toBe(1);
      expect(component['draftMembers']()[0].name).toBe('Jane');
    });

    it('should hide save confirmation', () => {
      component['showSaveConfirmation'].set(true);
      component.editFamily();
      expect(component['showSaveConfirmation']()).toBe(false);
    });
  });

  describe('cancelEdit', () => {
    it('should exit edit mode when no unsaved changes', () => {
      component.editFamily();
      component.cancelEdit();
      expect(component['isEditing']()).toBe(false);
    });

    it('should show unsaved changes modal when there are unsaved changes', () => {
      component.editFamily();
      // Add a draft member to create unsaved changes
      component['draftMembers'].update((m: HouseholdMember[]) => [...m, makeMember()]);
      component.cancelEdit();
      expect(component.showUnsavedChangesModal()).toBe(true);
    });

    it('should reset form when no unsaved changes', () => {
      component.editFamily();
      component['newMemberName'].set('Test');
      // No actual unsaved changes in draft vs saved
      component.cancelEdit();
      expect(component['newMemberName']()).toBe('');
    });
  });

  describe('saveFamily', () => {
    it('should call householdService.updateMembers with draft', () => {
      component.editFamily();
      const members = [makeMember()];
      component['draftMembers'].set(members);
      component.saveFamily();
      expect(householdServiceMock.updateMembers).toHaveBeenCalledWith(members);
    });

    it('should exit editing mode', () => {
      component.editFamily();
      component.saveFamily();
      expect(component['isEditing']()).toBe(false);
    });

    it('should show save confirmation temporarily', () => {
      component.editFamily();
      component.saveFamily();
      expect(component['showSaveConfirmation']()).toBe(true);
    });

    it('should reset form after saving', () => {
      component.editFamily();
      component['newMemberName'].set('Test');
      component.saveFamily();
      expect(component['newMemberName']()).toBe('');
    });
  });

  describe('addMember', () => {
    beforeEach(() => {
      component.editFamily();
    });

    it('should not add when name validation fails', () => {
      validationServiceMock.getNameError.mockReturnValue('SETTINGS.ERRORS.TOO_SHORT');
      component['newMemberName'].set('J');
      component['newMemberSurname'].set('Doe');
      component.addMember();
      expect(component['draftMembers']().length).toBe(0);
    });

    it('should not add when surname validation fails', () => {
      validationServiceMock.getSurnameError.mockReturnValue('SETTINGS.ERRORS.TOO_SHORT');
      component['newMemberName'].set('John');
      component['newMemberSurname'].set('D');
      component.addMember();
      expect(component['draftMembers']().length).toBe(0);
    });

    it('should set name error signal on validation failure', () => {
      validationServiceMock.getNameError.mockReturnValue('SETTINGS.ERRORS.TOO_SHORT');
      component['newMemberName'].set('J');
      component['newMemberSurname'].set('Doe');
      component.addMember();
      expect(component['newMemberNameError']()).toBe('SETTINGS.ERRORS.TOO_SHORT');
    });

    it('should set surname error signal on validation failure', () => {
      validationServiceMock.getSurnameError.mockReturnValue('SETTINGS.ERRORS.TOO_SHORT');
      component['newMemberName'].set('John');
      component['newMemberSurname'].set('D');
      component.addMember();
      expect(component['newMemberSurnameError']()).toBe('SETTINGS.ERRORS.TOO_SHORT');
    });

    it('should add member when valid', () => {
      component['newMemberName'].set('John');
      component['newMemberSurname'].set('Doe');
      component.addMember();
      expect(component['draftMembers']().length).toBe(1);
      expect(component['draftMembers']()[0].name).toBe('John');
      expect(component['draftMembers']()[0].surname).toBe('Doe');
    });

    it('should reset form after adding member', () => {
      component['newMemberName'].set('John');
      component['newMemberSurname'].set('Doe');
      component.addMember();
      expect(component['newMemberName']()).toBe('');
      expect(component['newMemberSurname']()).toBe('');
    });

    it('should not add when name is empty', () => {
      component['newMemberName'].set('');
      component['newMemberSurname'].set('Doe');
      component.addMember();
      expect(component['draftMembers']().length).toBe(0);
    });

    it('should not add when surname is empty', () => {
      component['newMemberName'].set('John');
      component['newMemberSurname'].set('');
      component.addMember();
      expect(component['draftMembers']().length).toBe(0);
    });

    it('should set type and gender from signals', () => {
      component['newMemberName'].set('John');
      component['newMemberSurname'].set('Doe');
      component['newMemberType'].set('kid');
      component['newMemberGender'].set('female');
      component.addMember();
      expect(component['draftMembers']()[0].type).toBe('kid');
      expect(component['draftMembers']()[0].gender).toBe('female');
    });

    it('should detect duplicate member', () => {
      const existingMember = makeMember({ name: 'John', surname: 'Doe' });
      component['draftMembers'].set([existingMember]);

      component['newMemberName'].set('John');
      component['newMemberSurname'].set('Doe');
      component.addMember();

      expect(component['showDuplicateMemberError']()).toBe(true);
      expect(component['duplicateMemberName']()).toBe('John Doe');
    });

    it('should detect duplicate case-insensitively', () => {
      const existingMember = makeMember({ name: 'John', surname: 'Doe' });
      component['draftMembers'].set([existingMember]);

      component['newMemberName'].set('john');
      component['newMemberSurname'].set('doe');
      component.addMember();

      expect(component['showDuplicateMemberError']()).toBe(true);
    });

    it('should use picture preview as avatar if set', () => {
      component['newMemberName'].set('John');
      component['newMemberSurname'].set('Doe');
      component['newMemberPicturePreview'].set('data:image/png;base64,abc');
      component.addMember();
      expect(component['draftMembers']()[0].avatar).toBe('data:image/png;base64,abc');
    });

    it('should use selected avatar if no picture preview', () => {
      component['newMemberName'].set('John');
      component['newMemberSurname'].set('Doe');
      component['selectedAvatar'].set('/avatars/superman.jpg');
      component.addMember();
      expect(component['draftMembers']()[0].avatar).toBe('/avatars/superman.jpg');
    });
  });

  describe('onNameChange', () => {
    it('should update name signal', () => {
      component.onNameChange('Jane');
      expect(component['newMemberName']()).toBe('Jane');
    });

    it('should call validation service', () => {
      component.onNameChange('Jane');
      expect(validationServiceMock.getNameError).toHaveBeenCalledWith('Jane');
    });

    it('should set error from validation service', () => {
      validationServiceMock.getNameError.mockReturnValue('SETTINGS.ERRORS.TOO_SHORT');
      component.onNameChange('J');
      expect(component['newMemberNameError']()).toBe('SETTINGS.ERRORS.TOO_SHORT');
    });
  });

  describe('onSurnameChange', () => {
    it('should update surname signal', () => {
      component.onSurnameChange('Smith');
      expect(component['newMemberSurname']()).toBe('Smith');
    });

    it('should call validation service', () => {
      component.onSurnameChange('Smith');
      expect(validationServiceMock.getSurnameError).toHaveBeenCalledWith('Smith');
    });

    it('should set error from validation service', () => {
      validationServiceMock.getSurnameError.mockReturnValue('SETTINGS.ERRORS.TOO_SHORT');
      component.onSurnameChange('S');
      expect(component['newMemberSurnameError']()).toBe('SETTINGS.ERRORS.TOO_SHORT');
    });
  });

  describe('removeMember', () => {
    it('should set memberToDelete', () => {
      component.removeMember('member-1');
      expect(component['memberToDelete']()).toBe('member-1');
    });

    it('should show delete modal', () => {
      component.removeMember('member-1');
      expect(component['showDeleteModal']()).toBe(true);
    });
  });

  describe('confirmDelete', () => {
    it('should remove member from draft', () => {
      const member = makeMember({ id: 'member-1' });
      component['draftMembers'].set([member]);
      component['memberToDelete'].set('member-1');

      component.confirmDelete();
      expect(component['draftMembers']().length).toBe(0);
    });

    it('should hide delete modal', () => {
      component['showDeleteModal'].set(true);
      component.confirmDelete();
      expect(component['showDeleteModal']()).toBe(false);
    });

    it('should clear memberToDelete', () => {
      component['memberToDelete'].set('member-1');
      component.confirmDelete();
      expect(component['memberToDelete']()).toBeNull();
    });

    it('should not remove when memberToDelete is null', () => {
      const member = makeMember();
      component['draftMembers'].set([member]);
      component['memberToDelete'].set(null);

      component.confirmDelete();
      expect(component['draftMembers']().length).toBe(1);
    });
  });

  describe('cancelDelete', () => {
    it('should hide delete modal', () => {
      component['showDeleteModal'].set(true);
      component.cancelDelete();
      expect(component['showDeleteModal']()).toBe(false);
    });

    it('should clear memberToDelete', () => {
      component['memberToDelete'].set('member-1');
      component.cancelDelete();
      expect(component['memberToDelete']()).toBeNull();
    });
  });

  describe('selectAvatar', () => {
    it('should set selected avatar', () => {
      component.selectAvatar('/avatars/superman.jpg');
      expect(component['selectedAvatar']()).toBe('/avatars/superman.jpg');
    });
  });

  describe('startEditMember', () => {
    it('should set editing member id', () => {
      const member = makeMember({ id: 'member-1' });
      component.startEditMember(member);
      expect(component['editingMemberId']()).toBe('member-1');
    });
  });

  describe('cancelEditMember', () => {
    it('should clear editing member id', () => {
      component['editingMemberId'].set('member-1');
      component.cancelEditMember();
      expect(component['editingMemberId']()).toBeNull();
    });
  });

  describe('onMemberEditorSave', () => {
    it('should update draft member', () => {
      const member = makeMember({ id: 'member-1', name: 'John' });
      component['draftMembers'].set([member]);

      component.onMemberEditorSave({
        id: 'member-1',
        name: 'Jane',
        surname: 'Smith',
        type: 'kid',
        gender: 'female',
        avatar: '/avatars/wonder-woman.jpg',
      });

      const updated = component['draftMembers']()[0];
      expect(updated.name).toBe('Jane');
      expect(updated.surname).toBe('Smith');
      expect(updated.type).toBe('kid');
      expect(updated.gender).toBe('female');
      expect(updated.avatar).toBe('/avatars/wonder-woman.jpg');
    });

    it('should clear editing member id', () => {
      const member = makeMember({ id: 'member-1' });
      component['draftMembers'].set([member]);
      component['editingMemberId'].set('member-1');

      component.onMemberEditorSave({
        id: 'member-1',
        name: 'Jane',
        surname: 'Smith',
        type: 'adult',
        gender: 'female',
        avatar: '/avatars/wonder-woman.jpg',
      });

      expect(component['editingMemberId']()).toBeNull();
    });

    it('should not modify other members', () => {
      const member1 = makeMember({ id: 'member-1', name: 'John' });
      const member2 = makeMember({ id: 'member-2', name: 'Bob' });
      component['draftMembers'].set([member1, member2]);

      component.onMemberEditorSave({
        id: 'member-1',
        name: 'Jane',
        surname: 'Smith',
        type: 'adult',
        gender: 'female',
        avatar: '/avatars/wonder-woman.jpg',
      });

      expect(component['draftMembers']()[1].name).toBe('Bob');
    });
  });

  describe('toggleAddMemberForm', () => {
    it('should toggle add member form visibility', () => {
      expect(component['showAddMemberForm']()).toBe(false);
      component.toggleAddMemberForm();
      expect(component['showAddMemberForm']()).toBe(true);
      component.toggleAddMemberForm();
      expect(component['showAddMemberForm']()).toBe(false);
    });
  });

  describe('hasUnsavedChanges', () => {
    it('should return false when not editing', () => {
      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('should return false when editing with no changes', () => {
      component.editFamily();
      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('should return true when member count differs', () => {
      component.editFamily();
      component['draftMembers'].set([makeMember()]);
      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('should return true when add form is open with populated name', () => {
      component.editFamily();
      component['showAddMemberForm'].set(true);
      component['newMemberName'].set('John');
      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('should return true when add form is open with populated surname', () => {
      component.editFamily();
      component['showAddMemberForm'].set(true);
      component['newMemberSurname'].set('Doe');
      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('should return true when inline editing is active', () => {
      component.editFamily();
      component['editingMemberId'].set('member-1');
      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('should return true when member data has changed', () => {
      const member = makeMember({ id: 'member-1', name: 'John' });
      householdServiceMock.members.set([member]);
      component.editFamily();
      component['draftMembers'].set([{ ...member, name: 'Jane' }]);
      expect(component.hasUnsavedChanges()).toBe(true);
    });
  });

  describe('confirmLeaveWithoutSaving', () => {
    it('should execute pending navigation', () => {
      const navFn = vi.fn();
      component.pendingNavigation.set(navFn);
      component.confirmLeaveWithoutSaving();
      expect(navFn).toHaveBeenCalledTimes(1);
    });

    it('should hide unsaved changes modal', () => {
      component.showUnsavedChangesModal.set(true);
      component.confirmLeaveWithoutSaving();
      expect(component.showUnsavedChangesModal()).toBe(false);
    });

    it('should clear pending navigation', () => {
      component.pendingNavigation.set(vi.fn());
      component.confirmLeaveWithoutSaving();
      expect(component.pendingNavigation()).toBeNull();
    });
  });

  describe('stayAndSave', () => {
    it('should hide unsaved changes modal', () => {
      component.showUnsavedChangesModal.set(true);
      component.stayAndSave();
      expect(component.showUnsavedChangesModal()).toBe(false);
    });

    it('should clear pending navigation', () => {
      component.pendingNavigation.set(vi.fn());
      component.stayAndSave();
      expect(component.pendingNavigation()).toBeNull();
    });
  });

  describe('triggerNavigationWarning', () => {
    it('should return true and show modal when there are unsaved changes', () => {
      component.editFamily();
      component['draftMembers'].set([makeMember()]);

      const onLeave = vi.fn();
      const result = component.triggerNavigationWarning(onLeave);

      expect(result).toBe(true);
      expect(component.showUnsavedChangesModal()).toBe(true);
      expect(component.pendingNavigation()).toBe(onLeave);
    });

    it('should return false when no unsaved changes', () => {
      const onLeave = vi.fn();
      const result = component.triggerNavigationWarning(onLeave);

      expect(result).toBe(false);
      expect(component.showUnsavedChangesModal()).toBe(false);
    });
  });

  describe('exportFamily', () => {
    it('should call familyImportService.exportMembers', async () => {
      const members = [makeMember()];
      householdServiceMock.members.set(members);

      await component.exportFamily();
      expect(familyImportServiceMock.exportMembers).toHaveBeenCalledWith(members);
    });
  });

  describe('importFamily', () => {
    it('should show import confirmation modal', async () => {
      await component.importFamily();
      expect(component['showImportConfirmModal']()).toBe(true);
    });
  });

  describe('confirmImportFamily', () => {
    it('should call importFromFile', async () => {
      await component.confirmImportFamily();
      expect(familyImportServiceMock.importFromFile).toHaveBeenCalled();
    });

    it('should show error modal on import failure with message', async () => {
      familyImportServiceMock.importFromFile.mockResolvedValue({
        success: false,
        errorMessage: 'Invalid file',
        errorInstructions: ['Instruction 1'],
      });

      await component.confirmImportFamily();

      expect(component['showImportErrorModal']()).toBe(true);
      expect(component['importErrorMessage']()).toBe('Invalid file');
      expect(component['importErrorInstructions']()).toEqual(['Instruction 1']);
    });

    it('should not show error modal when no error message', async () => {
      familyImportServiceMock.importFromFile.mockResolvedValue({
        success: false,
      });

      await component.confirmImportFamily();

      expect(component['showImportErrorModal']()).toBe(false);
    });

    it('should update members on success', async () => {
      const members = [makeMember()];
      familyImportServiceMock.importFromFile.mockResolvedValue({
        success: true,
        members,
      });

      await component.confirmImportFamily();

      expect(householdServiceMock.updateMembers).toHaveBeenCalledWith(members);
    });

    it('should show save confirmation on success', async () => {
      familyImportServiceMock.importFromFile.mockResolvedValue({
        success: true,
        members: [makeMember()],
      });

      await component.confirmImportFamily();

      expect(component['showSaveConfirmation']()).toBe(true);
    });

    it('should hide import confirm modal after operation', async () => {
      component['showImportConfirmModal'].set(true);
      await component.confirmImportFamily();
      expect(component['showImportConfirmModal']()).toBe(false);
    });
  });

  describe('cancelImportFamily', () => {
    it('should hide import confirmation modal', () => {
      component['showImportConfirmModal'].set(true);
      component.cancelImportFamily();
      expect(component['showImportConfirmModal']()).toBe(false);
    });
  });

  describe('closeImportErrorModal', () => {
    it('should hide import error modal', () => {
      component['showImportErrorModal'].set(true);
      component.closeImportErrorModal();
      expect(component['showImportErrorModal']()).toBe(false);
    });

    it('should clear error message', () => {
      component['importErrorMessage'].set('Some error');
      component.closeImportErrorModal();
      expect(component['importErrorMessage']()).toBe('');
    });

    it('should clear error instructions', () => {
      component['importErrorInstructions'].set(['Instruction']);
      component.closeImportErrorModal();
      expect(component['importErrorInstructions']()).toEqual([]);
    });
  });

  describe('closeDuplicateMemberError', () => {
    it('should hide duplicate member error', () => {
      component['showDuplicateMemberError'].set(true);
      component.closeDuplicateMemberError();
      expect(component['showDuplicateMemberError']()).toBe(false);
    });

    it('should clear duplicate member name', () => {
      component['duplicateMemberName'].set('John Doe');
      component.closeDuplicateMemberError();
      expect(component['duplicateMemberName']()).toBe('');
    });
  });

  describe('Help Modal', () => {
    it('should show help modal', () => {
      component.showHelp();
      expect(component['showHelpModal']()).toBe(true);
    });

    it('should hide help modal', () => {
      component.showHelp();
      component.closeHelp();
      expect(component['showHelpModal']()).toBe(false);
    });

    it('should have correct help step keys', () => {
      const steps = component['helpSteps'];
      expect(steps[0].titleKey).toBe('SETTINGS.FAMILY_HELP_STEP_1_TITLE');
      expect(steps[0].descriptionKey).toBe('SETTINGS.FAMILY_HELP_STEP_1_DESC');
      expect(steps[6].titleKey).toBe('SETTINGS.FAMILY_HELP_STEP_7_TITLE');
      expect(steps[6].descriptionKey).toBe('SETTINGS.FAMILY_HELP_STEP_7_DESC');
    });
  });

  describe('onBeforeUnload', () => {
    it('should prevent unload when unsaved changes exist', () => {
      component.editFamily();
      component['draftMembers'].set([makeMember()]);

      const event = new Event('beforeunload') as BeforeUnloadEvent;
      const preventSpy = vi.spyOn(event, 'preventDefault');

      component.onBeforeUnload(event);
      expect(preventSpy).toHaveBeenCalled();
    });

    it('should not prevent unload when no changes', () => {
      const event = new Event('beforeunload') as BeforeUnloadEvent;
      const preventSpy = vi.spyOn(event, 'preventDefault');

      component.onBeforeUnload(event);
      expect(preventSpy).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle adding multiple members sequentially', () => {
      component.editFamily();

      component['newMemberName'].set('Jane');
      component['newMemberSurname'].set('Smith');
      component.addMember();

      component['newMemberName'].set('Bob');
      component['newMemberSurname'].set('Johnson');
      component.addMember();

      expect(component['draftMembers']().length).toBe(2);
    });

    it('should handle delete followed by save', () => {
      const member = makeMember({ id: 'member-1' });
      householdServiceMock.members.set([member]);
      component.editFamily();

      component['memberToDelete'].set('member-1');
      component.confirmDelete();
      component.saveFamily();

      expect(householdServiceMock.updateMembers).toHaveBeenCalledWith([]);
    });

    it('should handle editing then cancelling member edit', () => {
      const member = makeMember({ id: 'member-1' });
      component['draftMembers'].set([member]);

      component.startEditMember(member);
      expect(component['editingMemberId']()).toBe('member-1');

      component.cancelEditMember();
      expect(component['editingMemberId']()).toBeNull();
    });

    it('should handle import failure followed by retry', async () => {
      familyImportServiceMock.importFromFile.mockResolvedValueOnce({
        success: false,
        errorMessage: 'Error',
      });
      await component.confirmImportFamily();
      expect(component['showImportErrorModal']()).toBe(true);

      component.closeImportErrorModal();

      familyImportServiceMock.importFromFile.mockResolvedValueOnce({
        success: true,
        members: [makeMember()],
      });
      component['showImportConfirmModal'].set(true);
      await component.confirmImportFamily();
      expect(householdServiceMock.updateMembers).toHaveBeenCalled();
    });

    it('should trim name and surname when adding member', () => {
      component.editFamily();
      component['newMemberName'].set('  John  ');
      component['newMemberSurname'].set('  Doe  ');
      component.addMember();

      expect(component['draftMembers']()[0].name).toBe('John');
      expect(component['draftMembers']()[0].surname).toBe('Doe');
    });
  });
});
