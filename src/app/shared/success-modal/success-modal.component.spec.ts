import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { SuccessModalComponent } from './success-modal.component';
import { LanguageService } from '../../services/language.service';

describe('SuccessModalComponent', () => {
  let component: SuccessModalComponent;
  let fixture: ComponentFixture<SuccessModalComponent>;

  beforeEach(async () => {
    const mockLanguageService = {
      currentLang: signal('en'),
      translate: vi.fn((key: string) => key),
    };

    await TestBed.configureTestingModule({
      imports: [SuccessModalComponent],
      providers: [{ provide: LanguageService, useValue: mockLanguageService }],
    }).compileComponents();

    fixture = TestBed.createComponent(SuccessModalComponent);
    component = fixture.componentInstance;
  });

  it('should create and stay hidden when show is false', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.modal-overlay')).toBeNull();
  });

  it('should render title and message when show is true', () => {
    fixture.componentRef.setInput('show', true);
    fixture.componentRef.setInput('titleKey', 'SUCCESS.TITLE');
    fixture.componentRef.setInput('messageKey', 'SUCCESS.MESSAGE');
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.modal-overlay') as HTMLElement;
    expect(overlay).not.toBeNull();
    expect(overlay.textContent).toContain('SUCCESS.TITLE');
    expect(overlay.textContent).toContain('SUCCESS.MESSAGE');
  });

  it('should emit closeModal when close or OK button is clicked', () => {
    fixture.componentRef.setInput('show', true);
    fixture.detectChanges();
    const emitSpy = vi.spyOn(component.closeModal, 'emit');

    const closeBtn = fixture.nativeElement.querySelector('.close-btn') as HTMLButtonElement;
    closeBtn.click();
    expect(emitSpy).toHaveBeenCalledTimes(1);

    const okBtn = fixture.nativeElement.querySelector('.btn-primary') as HTMLButtonElement;
    okBtn.click();
    expect(emitSpy).toHaveBeenCalledTimes(2);
  });
});
