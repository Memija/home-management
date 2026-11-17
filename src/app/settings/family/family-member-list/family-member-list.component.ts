import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { Baby, LucideAngularModule, Mars, Pencil, Trash2, User, Venus } from 'lucide-angular';
import { HouseholdMember } from '../../../services/household.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';

const MEMBER_TYPE_KEYS: Record<string, string> = {
  adult: 'SETTINGS.TYPES.ADULT',
  kid: 'SETTINGS.TYPES.KID',
};

const MEMBER_GENDER_KEYS: Record<string, string> = {
  male: 'SETTINGS.GENDERS.MALE',
  female: 'SETTINGS.GENDERS.FEMALE',
};

@Component({
  selector: 'app-family-member-list',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './family-member-list.component.html',
  styleUrl: './family-member-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilyMemberListComponent {
  protected readonly EditIcon = Pencil;
  protected readonly DeleteIcon = Trash2;
  protected readonly AdultIcon = User;
  protected readonly KidIcon = Baby;
  protected readonly MaleIcon = Mars;
  protected readonly FemaleIcon = Venus;

  protected readonly typeKeys = MEMBER_TYPE_KEYS;
  protected readonly genderKeys = MEMBER_GENDER_KEYS;

  readonly members = input<HouseholdMember[]>([]);
  readonly isEditing = input<boolean>(false);

  readonly editMember = output<HouseholdMember>();
  readonly removeMember = output<string>();
}
