import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { LucideAngularModule, LogIn, LogOut, User } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-auth-button',
  standalone: true,
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './auth-button.component.html',
  styleUrl: './auth-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthButtonComponent {
  private readonly authService = inject(AuthService);
  private readonly _isSigningIn = signal(false);

  readonly LogInIcon = LogIn;
  readonly LogOutIcon = LogOut;
  readonly UserIcon = User;

  readonly user = this.authService.user;
  readonly isLoading = this.authService.isLoading;
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly isAuthSupported = this.authService.isAuthSupported;

  get isSigningIn(): boolean {
    return this._isSigningIn();
  }

  set isSigningIn(value: boolean) {
    this._isSigningIn.set(value);
  }

  async signIn(): Promise<void> {
    this.isSigningIn = true;
    try {
      await this.authService.signInWithGoogle();
    } catch (error) {
      console.error('Sign in failed:', error);
    } finally {
      this.isSigningIn = false;
    }
  }

  async signOut(): Promise<void> {
    try {
      await this.authService.signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }
}
