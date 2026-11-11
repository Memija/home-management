import {
  Component,
  ChangeDetectionStrategy,
  computed,
  input,
  output,
  signal,
  effect,
  OnInit,
  OnChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  Save,
  X,
  Upload,
  User,
  Baby,
  Mars,
  Venus,
  TriangleAlert,
} from 'lucide-angular';
import { HouseholdMember } from '../../services/household.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { FILE_SECURITY_LIMITS, validateFileSize } from '../../utils/file-security.utils';

export interface MemberEditData {
  id: string;
  name: string;
  surname: string;
  type?: 'adult' | 'kid' | 'other';
  gender?: 'male' | 'female' | 'other';
  avatar: string;
}

@Component({
  selector: 'app-member-editor',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, TranslatePipe],
  templateUrl: './member-editor.component.html',
  styleUrl: './member-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberEditorComponent implements OnInit, OnChanges {
  /** The member being edited */
  readonly member = input<HouseholdMember | undefined>(undefined);

  /** Available avatar options */
  readonly avatars = input<string[]>([]);

  /** Emits the updated member data on save */
  readonly save = output<MemberEditData>();

  /** Emits when editing is cancelled */
  readonly cancelModal = output<void>();

  // Icons
  protected readonly SaveIcon = Save;
  protected readonly CancelIcon = X;
  protected readonly ImportIcon = Upload;
  protected readonly AdultIcon = User;
  protected readonly KidIcon = Baby;
  protected readonly MaleIcon = Mars;
  protected readonly FemaleIcon = Venus;
  protected readonly TriangleAlertIcon = TriangleAlert;

  // Edit state (initialized from member input)
  protected readonly editName = signal('');
  protected readonly editNameError = signal('');
  protected readonly editSurname = signal('');
  protected readonly editSurnameError = signal('');
  protected readonly editType = signal<'adult' | 'kid' | 'other' | undefined>(undefined);
  protected readonly editGender = signal<'male' | 'female' | 'other' | undefined>(undefined);
  protected readonly editAvatar = signal('');
  protected readonly customPicturePreview = signal<string | null>(null);
  protected readonly isSaveDisabled = computed(
    () =>
      !this.editName() ||
      !this.editSurname() ||
      Boolean(this.editNameError()) ||
      Boolean(this.editSurnameError()),
  );

  private initialized = false;

  constructor() {
    effect(() => {
      this.initializeFromMember();
    });
  }

  ngOnInit(): void {
    if (!this.initialized) {
      this.initializeFromMember();
    }
  }

  ngOnChanges(): void {
    if (this.initialized) {
      this.initializeFromMember();
    }
  }

  private initializeFromMember(): void {
    const member = this.member();
    if (!member) return;
    this.editName.set(member.name);
    this.editSurname.set(member.surname);
    this.editType.set(member.type);
    this.editGender.set(member.gender);
    this.editAvatar.set(member.avatar);
    this.customPicturePreview.set(null);
    this.editNameError.set('');
    this.editSurnameError.set('');
    this.initialized = true;
  }

  selectAvatar(avatar: string) {
    this.editAvatar.set(avatar);
    this.customPicturePreview.set(null);
  }

  handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (
      file &&
      file.type.startsWith('image/') &&
      validateFileSize(file, FILE_SECURITY_LIMITS.MAX_IMAGE_FILE_SIZE_BYTES)
    ) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        this.customPicturePreview.set(result);
      };
      reader.readAsDataURL(file);
    }
  }

  onSave() {
    this.validateName(this.editName());
    this.validateSurname(this.editSurname());

    if (this.editNameError() || this.editSurnameError()) {
      return;
    }

    const avatar = this.customPicturePreview() || this.editAvatar();

    this.save.emit({
      id: this.member()?.id || '',
      name: this.editName(),
      surname: this.editSurname(),
      type: this.editType(),
      gender: this.editGender(),
      avatar: avatar,
    });
  }

  onCancel() {
    this.cancelModal.emit();
  }

  onNameChange(value: string) {
    this.editName.set(value);
    this.validateName(value);
  }

  onSurnameChange(value: string) {
    this.editSurname.set(value);
    this.validateSurname(value);
  }

  private validateName(value: string) {
    if (value.trim() === '') {
      this.editNameError.set(''); // Or required error? Usually valid members have names.
      // If required check:
      // this.editNameError.set('Required');
      // But addMember checked 'if (value.trim() === "") return'.
      // Creating empty member is bad. I should enforce required.
      // FamilyComponent addMember check: if (this.newMemberName() && ...) => Required.
      // So here I should set error if empty.
      this.editNameError.set('SETTINGS.ERRORS.TOO_SHORT'); // Empty implies too short (<2)
      return;
    }
    if (value.length < 2) {
      this.editNameError.set('SETTINGS.ERRORS.TOO_SHORT');
      return;
    }
    if (value.length > 50) {
      this.editNameError.set('SETTINGS.ERRORS.TOO_LONG');
      return;
    }
    if (!/[a-zA-Z]/.test(value)) {
      this.editNameError.set('SETTINGS.ERRORS.MUST_CONTAIN_LETTERS');
      return;
    }
    this.editNameError.set('');
  }

  private validateSurname(value: string) {
    if (value.trim() === '') {
      this.editSurnameError.set('SETTINGS.ERRORS.TOO_SHORT');
      return;
    }
    if (value.length < 2) {
      this.editSurnameError.set('SETTINGS.ERRORS.TOO_SHORT');
      return;
    }
    if (value.length > 50) {
      this.editSurnameError.set('SETTINGS.ERRORS.TOO_LONG');
      return;
    }
    if (!/[a-zA-Z]/.test(value)) {
      this.editSurnameError.set('SETTINGS.ERRORS.MUST_CONTAIN_LETTERS');
      return;
    }
    this.editSurnameError.set('');
  }
}
