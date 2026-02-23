import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthButtonComponent } from './auth-button.component';
import { AuthService, AuthUser } from '../../services/auth.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { signal, computed, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Pipe, PipeTransform } from '@angular/core';
import { LucideAngularModule, LogIn, LogOut, User } from 'lucide-angular';

@Pipe({
  name: 'translate',
  standalone: true
})
class MockTranslatePipe implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

describe('AuthButtonComponent', () => {
  let component: AuthButtonComponent;
  let fixture: ComponentFixture<AuthButtonComponent>;
  let mockAuthService: any;
  let userSignal: WritableSignal<AuthUser | null>;
  let isLoadingSignal: WritableSignal<boolean>;

  beforeEach(async () => {
    userSignal = signal<AuthUser | null>(null);
    isLoadingSignal = signal<boolean>(true);

    mockAuthService = {
      user: userSignal,
      isLoading: isLoadingSignal,
      isAuthenticated: computed(() => userSignal() !== null),
      signInWithGoogle: vi.fn().mockResolvedValue(undefined),
      signOut: vi.fn().mockResolvedValue(undefined)
    };

    await TestBed.configureTestingModule({
      imports: [
        AuthButtonComponent,
        LucideAngularModule.pick({ LogIn, LogOut, User }),
        MockTranslatePipe
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService }
      ]
    })
      .overrideComponent(AuthButtonComponent, {
        remove: { imports: [TranslatePipe] },
        add: { imports: [MockTranslatePipe] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(AuthButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('when loading', () => {
    it('should display spinner and not show login/user UI', () => {
      isLoadingSignal.set(true);
      fixture.detectChanges();

      const loadingDiv = fixture.debugElement.query(By.css('.auth-button.loading'));
      expect(loadingDiv).toBeTruthy();
      expect(loadingDiv.query(By.css('.spinner'))).toBeTruthy();

      const authDiv = fixture.debugElement.query(By.css('.auth-button.authenticated'));
      expect(authDiv).toBeFalsy();

      const signInBtn = fixture.debugElement.query(By.css('.auth-button.sign-in'));
      expect(signInBtn).toBeFalsy();
    });
  });

  describe('when not authenticated', () => {
    beforeEach(() => {
      isLoadingSignal.set(false);
      userSignal.set(null);
      fixture.detectChanges();
    });

    it('should display sign in button', () => {
      const signInBtn = fixture.debugElement.query(By.css('.auth-button.sign-in'));
      expect(signInBtn).toBeTruthy();
      expect(signInBtn.nativeElement.textContent.trim()).toBe('AUTH.SIGN_IN');

      const icon = signInBtn.query(By.css('lucide-icon'));
      expect(icon).toBeTruthy();

      // Ensure no spinner
      expect(signInBtn.query(By.css('.spinner'))).toBeFalsy();
    });

    it('should call signInWithGoogle when sign in is clicked', async () => {
      const signInBtn = fixture.debugElement.query(By.css('.auth-button.sign-in'));
      signInBtn.triggerEventHandler('click', null);

      expect(component.isSigningIn).toBe(true);
      fixture.detectChanges();

      // Check spinner is rendered during sign in
      expect(signInBtn.query(By.css('.spinner'))).toBeTruthy();
      expect(signInBtn.query(By.css('lucide-icon'))).toBeFalsy();

      expect(mockAuthService.signInWithGoogle).toHaveBeenCalled();

      await fixture.whenStable(); // wait for promise to resolve
      expect(component.isSigningIn).toBe(false);
    });

    it('should handle sign in error and reset isSigningIn', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
      mockAuthService.signInWithGoogle.mockRejectedValue('Auth Error');

      const signInBtn = fixture.debugElement.query(By.css('.auth-button.sign-in'));
      signInBtn.triggerEventHandler('click', null);

      expect(component.isSigningIn).toBe(true);

      await fixture.whenStable(); // Wait for promise to reject

      expect(consoleSpy).toHaveBeenCalledWith('Sign in failed:', 'Auth Error');
      expect(component.isSigningIn).toBe(false);
    });
  });

  describe('when authenticated', () => {
    const mockUser: AuthUser = {
      uid: '123',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: 'http://example.com/photo.jpg'
    };

    beforeEach(() => {
      isLoadingSignal.set(false);
      userSignal.set(mockUser);
      fixture.detectChanges();
    });

    it('should display user info and logout button', () => {
      const authDiv = fixture.debugElement.query(By.css('.auth-button.authenticated'));
      expect(authDiv).toBeTruthy();

      const img = authDiv.query(By.css('.user-avatar'));
      expect(img).toBeTruthy();
      expect(img.nativeElement.src).toContain(mockUser.photoURL);
      expect(img.nativeElement.alt).toBe(mockUser.displayName);

      const nameSpan = authDiv.query(By.css('.user-name'));
      expect(nameSpan.nativeElement.textContent.trim()).toBe(mockUser.displayName);

      const logoutBtn = authDiv.query(By.css('.btn-logout'));
      expect(logoutBtn).toBeTruthy();
    });

    it('should use email as fallback if displayName is missing', () => {
      userSignal.set({ ...mockUser, displayName: null });
      fixture.detectChanges();

      const authDiv = fixture.debugElement.query(By.css('.auth-button.authenticated'));
      const nameSpan = authDiv.query(By.css('.user-name'));
      expect(nameSpan.nativeElement.textContent.trim()).toBe(mockUser.email);
    });

    it('should use "User" as alt and fallback icon if photoURL is missing', () => {
      userSignal.set({ ...mockUser, photoURL: null, displayName: null });
      fixture.detectChanges();

      const authDiv = fixture.debugElement.query(By.css('.auth-button.authenticated'));

      // Avatar should not be present
      const img = authDiv.query(By.css('.user-avatar'));
      expect(img).toBeFalsy();

      // Icon should be present
      const icon = authDiv.query(By.css('.user-icon'));
      expect(icon).toBeTruthy();
    });

    it('should call signOut when logout button is clicked', async () => {
      const logoutBtn = fixture.debugElement.query(By.css('.btn-logout'));
      logoutBtn.triggerEventHandler('click', null);

      expect(mockAuthService.signOut).toHaveBeenCalled();
      await fixture.whenStable();
    });

    it('should handle signOut error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
      mockAuthService.signOut.mockRejectedValue('Signout Error');

      const logoutBtn = fixture.debugElement.query(By.css('.btn-logout'));
      logoutBtn.triggerEventHandler('click', null);

      await fixture.whenStable();

      expect(consoleSpy).toHaveBeenCalledWith('Sign out failed:', 'Signout Error');
    });
  });
});
