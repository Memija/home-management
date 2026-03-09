import { TestBed } from '@angular/core/testing';
import { MenuBarComponent } from './menu-bar.component';
import { provideRouter } from '@angular/router';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LanguageService } from '../../services/language.service';
import { signal } from '@angular/core';

describe('MenuBarComponent', () => {
  let component: MenuBarComponent;

  beforeEach(() => {
    const mockLanguageService = {
      currentLang: signal('en'),
      translate: vi.fn((key: string) => key)
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: LanguageService, useValue: mockLanguageService }
      ]
    });

    component = TestBed.runInInjectionContext(() => new MenuBarComponent());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open contact modal on contactUs()', () => {
    expect((component as any).showContactModal()).toBe(false);
    (component as any).contactUs();
    expect((component as any).showContactModal()).toBe(true);
  });

  it('should close contact modal on onCloseModal()', () => {
    (component as any).showContactModal.set(true);
    (component as any).onCloseModal();
    expect((component as any).showContactModal()).toBe(false);
  });

  describe('onComposeEmail', () => {
    let windowOpenSpy: any;
    const testData = {
      name: 'John Doe',
      email: 'john@example.com',
      subject: 'Test Subject',
      message: 'Hello, this is a test.\nNewline included.',
      client: 'default' as const
    };

    beforeEach(() => {
      windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      (component as any).showContactModal.set(true);
    });

    it('should handle "gmail" client correctly', () => {
      (component as any).onComposeEmail({ ...testData, client: 'gmail' });
      const expectedSubject = encodeURIComponent('[John Doe] Test Subject');
      const expectedBody = encodeURIComponent('From: John Doe (john@example.com)\n\nHello, this is a test.\nNewline included.');
      const expectedUrl = `https://mail.google.com/mail/?view=cm&to=support@homemanagement.app&su=${expectedSubject}&body=${expectedBody}`;
      expect(windowOpenSpy).toHaveBeenCalledWith(expectedUrl, '_blank');
      expect((component as any).showContactModal()).toBe(false);
    });

    it('should handle "outlook" client correctly', () => {
      (component as any).onComposeEmail({ ...testData, client: 'outlook' });
      const expectedSubject = encodeURIComponent('[John Doe] Test Subject');
      const expectedBody = encodeURIComponent('From: John Doe (john@example.com)\n\nHello, this is a test.\nNewline included.');
      const expectedUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=support@homemanagement.app&subject=${expectedSubject}&body=${expectedBody}`;
      expect(windowOpenSpy).toHaveBeenCalledWith(expectedUrl, '_blank');
      expect((component as any).showContactModal()).toBe(false);
    });

    it('should handle "default" client correctly', () => {
      (component as any).onComposeEmail({ ...testData, client: 'default' });
      const expectedSubject = encodeURIComponent('[John Doe] Test Subject');
      const expectedBody = encodeURIComponent('From: John Doe (john@example.com)\n\nHello, this is a test.\nNewline included.');
      const expectedUrl = `mailto:support@homemanagement.app?subject=${expectedSubject}&body=${expectedBody}`;
      expect(windowOpenSpy).toHaveBeenCalledWith(expectedUrl, '_blank');
      expect((component as any).showContactModal()).toBe(false);
    });

    it('should properly encode URI components for edge cases', () => {
      (component as any).onComposeEmail({
        name: 'A & B',
        email: 'test+1@example.com',
        subject: '100% Free?!',
        message: 'Symbols: /?#&=',
        client: 'default'
      });
      const expectedSubject = encodeURIComponent('[A & B] 100% Free?!');
      const expectedBody = encodeURIComponent('From: A & B (test+1@example.com)\n\nSymbols: /?#&=');
      const expectedUrl = `mailto:support@homemanagement.app?subject=${expectedSubject}&body=${expectedBody}`;
      expect(windowOpenSpy).toHaveBeenCalledWith(expectedUrl, '_blank');
    });
  });
});
