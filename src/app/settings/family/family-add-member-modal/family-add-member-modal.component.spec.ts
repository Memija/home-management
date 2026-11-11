import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { FamilyAddMemberModalComponent } from './family-add-member-modal.component';
import { LanguageService } from '../../../services/language.service';

describe('FamilyAddMemberModalComponent', () => {
  let component: FamilyAddMemberModalComponent;
  let fixture: ComponentFixture<FamilyAddMemberModalComponent>;

  beforeEach(async () => {
    const mockLanguageService = {
      currentLang: signal('en'),
      translate: vi.fn((key: string) => key),
    };

    await TestBed.configureTestingModule({
      imports: [FamilyAddMemberModalComponent],
      providers: [{ provide: LanguageService, useValue: mockLanguageService }],
    }).compileComponents();

    fixture = TestBed.createComponent(FamilyAddMemberModalComponent);
    component = fixture.componentInstance;
  });

  it('should disable submit when name or surname is missing or has errors', () => {
    fixture.componentRef.setInput('show', true);
    fixture.detectChanges();
    expect(component['isSubmitDisabled']).toBe(true);

    fixture.componentRef.setInput('name', 'John');
    fixture.componentRef.setInput('surname', 'Doe');
    expect(component['isSubmitDisabled']).toBe(false);

    fixture.componentRef.setInput('nameError', 'SETTINGS.ERRORS.TOO_SHORT');
    expect(component['isSubmitDisabled']).toBe(true);
  });

  it('should emit typeChange, genderChange, avatarSelect, and submitMember', () => {
    fixture.componentRef.setInput('show', true);
    fixture.componentRef.setInput('name', 'John');
    fixture.componentRef.setInput('surname', 'Doe');
    fixture.componentRef.setInput('avatars', ['/avatars/superman.jpg']);
    fixture.detectChanges();

    const typeSpy = vi.spyOn(component.typeChange, 'emit');
    const genderSpy = vi.spyOn(component.genderChange, 'emit');
    const avatarSpy = vi.spyOn(component.avatarSelect, 'emit');
    const submitSpy = vi.spyOn(component.submitMember, 'emit');

    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.toggle-adult') as HTMLButtonElement).click();
    (root.querySelector('.toggle-male') as HTMLButtonElement).click();
    (root.querySelector('.avatar-btn') as HTMLButtonElement).click();
    (root.querySelector('.submit-add-btn') as HTMLButtonElement).click();

    expect(typeSpy).toHaveBeenCalledWith('adult');
    expect(genderSpy).toHaveBeenCalledWith('male');
    expect(avatarSpy).toHaveBeenCalledWith('/avatars/superman.jpg');
    expect(submitSpy).toHaveBeenCalledTimes(1);
  });
});
