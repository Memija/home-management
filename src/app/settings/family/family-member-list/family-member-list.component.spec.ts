import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { FamilyMemberListComponent } from './family-member-list.component';
import { LanguageService } from '../../../services/language.service';
import { HouseholdMember } from '../../../services/household.service';

describe('FamilyMemberListComponent', () => {
  let component: FamilyMemberListComponent;
  let fixture: ComponentFixture<FamilyMemberListComponent>;

  const sampleMember: HouseholdMember = {
    id: 'm1',
    name: 'Jane',
    surname: 'Doe',
    type: 'adult',
    gender: 'female',
    avatar: '/avatars/wonder-woman.jpg',
  };

  beforeEach(async () => {
    const mockLanguageService = {
      currentLang: signal('en'),
      translate: vi.fn((key: string) => key),
    };

    await TestBed.configureTestingModule({
      imports: [FamilyMemberListComponent],
      providers: [{ provide: LanguageService, useValue: mockLanguageService }],
    }).compileComponents();

    fixture = TestBed.createComponent(FamilyMemberListComponent);
    component = fixture.componentInstance;
  });

  it('should render empty state when members array is empty', () => {
    fixture.componentRef.setInput('members', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.empty-state')).not.toBeNull();
  });

  it('should render member card and emit editMember / removeMember', () => {
    fixture.componentRef.setInput('members', [sampleMember]);
    fixture.componentRef.setInput('isEditing', true);
    fixture.detectChanges();

    const editSpy = vi.spyOn(component.editMember, 'emit');
    const removeSpy = vi.spyOn(component.removeMember, 'emit');

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.list-header')).not.toBeNull();
    expect(root.querySelector('.member-card')).not.toBeNull();

    (root.querySelector('.edit-action-btn') as HTMLButtonElement).click();
    (root.querySelector('.remove-action-btn') as HTMLButtonElement).click();

    expect(editSpy).toHaveBeenCalledWith(sampleMember);
    expect(removeSpy).toHaveBeenCalledWith('m1');
  });
});
