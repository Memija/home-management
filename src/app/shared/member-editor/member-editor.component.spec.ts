import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MemberEditorComponent } from './member-editor.component';
import { Pipe, PipeTransform } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { HouseholdMember } from '../../services/household.service';
import { vi } from 'vitest';

@Pipe({
  name: 'translate',
  standalone: true,
})
class MockTranslatePipe implements PipeTransform {
  transform(key: string, ...args: any[]): string {
    return key;
  }
}

describe('MemberEditorComponent', () => {
  let component: MemberEditorComponent;
  let fixture: ComponentFixture<MemberEditorComponent>;

  const mockMember: HouseholdMember = {
    id: '123',
    name: 'John',
    surname: 'Doe',
    type: 'adult',
    gender: 'male',
    avatar: 'avatar1.png',
  };

  const mockAvatars = ['avatar1.png', 'avatar2.png', 'avatar3.png'];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberEditorComponent],
    })
      .overrideComponent(MemberEditorComponent, {
        remove: { imports: [TranslatePipe] },
        add: { imports: [MockTranslatePipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MemberEditorComponent);
    component = fixture.componentInstance;

    // Set required input signals
    fixture.componentRef.setInput('member', mockMember);
    fixture.componentRef.setInput('avatars', mockAvatars);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize form fields from member input on check', () => {
      // Accessing protected signals for testing state
      expect((component as any).editName()).toBe('John');
      expect((component as any).editSurname()).toBe('Doe');
      expect((component as any).editType()).toBe('adult');
      expect((component as any).editGender()).toBe('male');
      expect((component as any).editAvatar()).toBe('avatar1.png');
      expect((component as any).customPicturePreview()).toBeNull();
      expect((component as any).editNameError()).toBe('');
      expect((component as any).editSurnameError()).toBe('');
    });

    it('should re-initialize and reset form when inputs change', () => {
      // Modify some state internally to simulate user edits
      (component as any).editName.set('Jane');
      (component as any).editNameError.set('Some Error');

      const updatedMember: HouseholdMember = {
        ...mockMember,
        name: 'Alice',
        type: 'kid',
      };

      fixture.componentRef.setInput('member', updatedMember);
      fixture.detectChanges();

      // Form values should update based on the new input, and clear out errors.
      expect((component as any).editName()).toBe('Alice');
      expect((component as any).editType()).toBe('kid');
      expect((component as any).editNameError()).toBe('');
    });
  });

  describe('Avatar Selection', () => {
    it('should select an avatar and clear custom picture preview', () => {
      // First assume we had a custom preview
      (component as any).customPicturePreview.set('data:image/png;base64,12345');

      component.selectAvatar('avatar3.png');

      expect((component as any).editAvatar()).toBe('avatar3.png');
      expect((component as any).customPicturePreview()).toBeNull();
    });
  });

  describe('File Upload', () => {
    it('should set custom picture preview on valid image upload', async () => {
      const originalFileReader = globalThis.FileReader;
      globalThis.FileReader = class {
        onload: any;
        readAsDataURL() {
          if (this.onload) {
            this.onload({ target: { result: 'data:image/png;base64,dummy' } });
          }
        }
      } as any;

      const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
      const event = {
        target: { files: [file] },
      } as unknown as Event;

      component.handleFileUpload(event);

      const preview = (component as any).customPicturePreview();
      expect(preview).toContain('data:image/png');

      globalThis.FileReader = originalFileReader;
    });

    it('should ignore file upload if no file is selected', () => {
      const event = {
        target: { files: [] },
      } as unknown as Event;

      component.handleFileUpload(event);

      expect((component as any).customPicturePreview()).toBeNull();
    });

    it('should ignore non-image file uploads', () => {
      const file = new File(['dummy text'], 'test.txt', { type: 'text/plain' });
      const event = {
        target: { files: [file] },
      } as unknown as Event;

      component.handleFileUpload(event);

      expect((component as any).customPicturePreview()).toBeNull();
    });
  });

  describe('Validation', () => {
    // Tests for validation using directly triggered value changes

    it('should validate name correctly', () => {
      // Expected empty / too short
      component.onNameChange('');
      expect((component as any).editNameError()).toBe('SETTINGS.ERRORS.TOO_SHORT');

      component.onNameChange('A');
      expect((component as any).editNameError()).toBe('SETTINGS.ERRORS.TOO_SHORT');

      // Expected tool long (> 50)
      component.onNameChange('A'.repeat(51));
      expect((component as any).editNameError()).toBe('SETTINGS.ERRORS.TOO_LONG');

      // Expected letters only logic (at least one letter must exist)
      // Original regex: /[a-zA-Z]/.test(value) -> fails if no letters
      component.onNameChange('12345');
      expect((component as any).editNameError()).toBe('SETTINGS.ERRORS.MUST_CONTAIN_LETTERS');

      component.onNameChange('   ');
      expect((component as any).editNameError()).toBe('SETTINGS.ERRORS.TOO_SHORT');

      // Expected valid
      component.onNameChange('John');
      expect((component as any).editNameError()).toBe('');
    });

    it('should validate surname correctly', () => {
      // Expected empty / too short
      component.onSurnameChange('');
      expect((component as any).editSurnameError()).toBe('SETTINGS.ERRORS.TOO_SHORT');

      component.onSurnameChange('B');
      expect((component as any).editSurnameError()).toBe('SETTINGS.ERRORS.TOO_SHORT');

      // Expected too long
      component.onSurnameChange('A'.repeat(51));
      expect((component as any).editSurnameError()).toBe('SETTINGS.ERRORS.TOO_LONG');

      // Expected letters checking
      component.onSurnameChange('4444');
      expect((component as any).editSurnameError()).toBe('SETTINGS.ERRORS.MUST_CONTAIN_LETTERS');

      // Expected valid
      component.onSurnameChange('Doe');
      expect((component as any).editSurnameError()).toBe('');
    });
  });

  describe('Saving and Cancelling', () => {
    it('should emit cancel event when onCancel is called', () => {
      vi.spyOn(component.cancel, 'emit');
      component.onCancel();
      expect(component.cancel.emit).toHaveBeenCalledTimes(1);
    });

    it('should emit save event with updated member info if valid', () => {
      vi.spyOn(component.save, 'emit');

      component.onNameChange('Bob');
      component.onSurnameChange('Smith');
      (component as any).editType.set('other');
      (component as any).editGender.set('other');
      component.selectAvatar('avatar2.png');

      component.onSave();

      expect(component.save.emit).toHaveBeenCalledWith({
        id: '123',
        name: 'Bob',
        surname: 'Smith',
        type: 'other',
        gender: 'other',
        avatar: 'avatar2.png',
      });
    });

    it('should prevent saving and not emit save event if name or surname is invalid', () => {
      vi.spyOn(component.save, 'emit');

      // Setup invalid name
      component.onNameChange('X'); // X is length 1 = TOO_SHORT
      component.onSave();

      expect(component.save.emit).not.toHaveBeenCalled();

      // Fix name, break surname
      component.onNameChange('Valid Name');
      component.onSurnameChange(''); // TOO_SHORT
      component.onSave();

      expect(component.save.emit).not.toHaveBeenCalled();
    });

    it('should use customPicturePreview for avatar if it exists', () => {
      vi.spyOn(component.save, 'emit');

      // Mock valid inputs and custom picture preview
      component.onNameChange('Bob');
      component.onSurnameChange('Smith');
      (component as any).customPicturePreview.set('data:image/png;base64,...');

      component.onSave();

      expect(component.save.emit).toHaveBeenCalledWith({
        id: '123',
        name: 'Bob',
        surname: 'Smith',
        type: 'adult',
        gender: 'male',
        avatar: 'data:image/png;base64,...',
      });
    });
  });
});
