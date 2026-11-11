import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Baby,
  LucideAngularModule,
  Mars,
  Plus,
  TriangleAlert,
  Upload,
  User,
  Venus,
  X,
} from 'lucide-angular';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-family-add-member-modal',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, TranslatePipe],
  templateUrl: './family-add-member-modal.component.html',
  styleUrl: './family-add-member-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilyAddMemberModalComponent {
  protected readonly AddIcon = Plus;
  protected readonly CancelIcon = X;
  protected readonly ImportIcon = Upload;
  protected readonly AdultIcon = User;
  protected readonly KidIcon = Baby;
  protected readonly MaleIcon = Mars;
  protected readonly FemaleIcon = Venus;
  protected readonly TriangleAlertIcon = TriangleAlert;

  readonly show = input<boolean>(false);
  readonly name = input<string>('');
  readonly surname = input<string>('');
  readonly nameError = input<string>('');
  readonly surnameError = input<string>('');
  readonly memberType = input<'adult' | 'kid' | 'other' | undefined>(undefined);
  readonly memberGender = input<'male' | 'female' | 'other' | undefined>(undefined);
  readonly picturePreview = input<string | null>(null);
  readonly selectedAvatar = input<string | undefined>(undefined);
  readonly avatars = input<string[]>([]);
  readonly isAtMaxMembers = input<boolean>(false);

  readonly nameChange = output<string>();
  readonly surnameChange = output<string>();
  readonly typeChange = output<'adult' | 'kid'>();
  readonly genderChange = output<'male' | 'female'>();
  readonly fileUpload = output<Event>();
  readonly avatarSelect = output<string>();
  readonly submitMember = output<void>();
  readonly closeModal = output<void>();

  private readonly submitDisabledState = computed(() =>
    Boolean(
      !this.name() ||
      !this.surname() ||
      this.isAtMaxMembers() ||
      this.nameError() ||
      this.surnameError(),
    ),
  );

  protected get isSubmitDisabled(): boolean {
    return this.submitDisabledState();
  }
}
