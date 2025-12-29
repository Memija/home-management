import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Save, X, Upload, User, Baby, Mars, Venus } from 'lucide-angular';
import { HouseholdMember } from '../../services/household.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

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
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe],
  templateUrl: './member-editor.component.html',
  styleUrl: './member-editor.component.scss'
})
export class MemberEditorComponent {
  /** The member being edited */
  member = input.required<HouseholdMember>();

  /** Available avatar options */
  avatars = input.required<string[]>();


  /** Emits the updated member data on save */
  save = output<MemberEditData>();

  /** Emits when editing is cancelled */
  cancel = output<void>();

  // Icons
  protected readonly SaveIcon = Save;
  protected readonly CancelIcon = X;
  protected readonly ImportIcon = Upload;
  protected readonly AdultIcon = User;
  protected readonly KidIcon = Baby;
  protected readonly MaleIcon = Mars;
  protected readonly FemaleIcon = Venus;

  // Edit state (initialized from member input)
  protected editName = signal('');
  protected editSurname = signal('');
  protected editType = signal<'adult' | 'kid' | 'other' | undefined>(undefined);
  protected editGender = signal<'male' | 'female' | 'other' | undefined>(undefined);
  protected editAvatar = signal('');
  protected customPicturePreview = signal<string | null>(null);

  private initialized = false;

  constructor() {
    // Initialize edit state when member input changes
    // Using a getter pattern since we need to react to input changes
  }

  ngOnInit() {
    this.initializeFromMember();
  }

  ngOnChanges() {
    if (this.initialized) {
      this.initializeFromMember();
    }
  }

  private initializeFromMember() {
    const m = this.member();
    this.editName.set(m.name);
    this.editSurname.set(m.surname);
    this.editType.set(m.type);
    this.editGender.set(m.gender);
    this.editAvatar.set(m.avatar);
    this.customPicturePreview.set(null);
    this.initialized = true;
  }

  selectAvatar(avatar: string) {
    this.editAvatar.set(avatar);
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

  onSave() {
    const avatar = this.customPicturePreview() || this.editAvatar();

    this.save.emit({
      id: this.member().id,
      name: this.editName(),
      surname: this.editSurname(),
      type: this.editType(),
      gender: this.editGender(),
      avatar: avatar
    });
  }

  onCancel() {
    this.cancel.emit();
  }
}
