import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, LogIn, LogOut, User } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-auth-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe],
  templateUrl: './auth-button.component.html',
  styleUrl: './auth-button.component.scss'
})
export class AuthButtonComponent {
  private authService = inject(AuthService);

  readonly LogInIcon = LogIn;
  readonly LogOutIcon = LogOut;
  readonly UserIcon = User;

  readonly user = this.authService.user;
  readonly isLoading = this.authService.isLoading;
  readonly isAuthenticated = this.authService.isAuthenticated;

  isSigningIn = false;

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
