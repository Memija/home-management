import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageService } from '../../services/language.service';
import { MenuBarComponent } from './menu-bar.component';

describe('MenuBarComponent', () => {
  let component: MenuBarComponent;

  beforeEach(() => {
    const mockLanguageService = {
      currentLang: signal('en'),
      translate: vi.fn((key: string) => key),
    };

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: LanguageService, useValue: mockLanguageService }],
    });

    component = TestBed.runInInjectionContext(() => new MenuBarComponent());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create with contact and success modals hidden by default', () => {
    expect(component).toBeTruthy();
    expect(component['showContactModal']()).toBe(false);
    expect(component['showContactSuccessModal']()).toBe(false);
    expect(component['exactRouteOptions']).toEqual({ exact: true });
  });

  it('should open and close the contact modal', () => {
    component['contactUs']();
    expect(component['showContactModal']()).toBe(true);

    component['onCloseModal']();
    expect(component['showContactModal']()).toBe(false);
  });

  it('should transition from contact modal to success modal on submission and close success modal', () => {
    component['showContactModal'].set(true);

    component['onContactSubmitted']();
    expect(component['showContactModal']()).toBe(false);
    expect(component['showContactSuccessModal']()).toBe(true);

    component['onCloseSuccessModal']();
    expect(component['showContactSuccessModal']()).toBe(false);
  });
});
