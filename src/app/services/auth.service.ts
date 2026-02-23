import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Auth, User as FirebaseUser } from 'firebase/auth';
import { firebaseConfig } from '../config/firebase.config';
import { BehaviorSubject } from 'rxjs';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private authInstance: Auth | null = null;
  private authInitPromise: Promise<Auth> | null = null;

  private userSubject = new BehaviorSubject<AuthUser | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(true);

  /** Current authenticated user */
  readonly user = signal<AuthUser | null>(null);

  /** Whether authentication is still loading */
  readonly isLoading = signal<boolean>(true);

  /** Whether user is currently authenticated */
  readonly isAuthenticated = computed(() => this.user() !== null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initAuthListener();
    } else {
      this.isLoading.set(false);
    }
  }

  private async getAuth(): Promise<Auth> {
    if (this.authInstance) return this.authInstance;
    if (!this.authInitPromise) {
      this.authInitPromise = (async () => {
        const { initializeApp, getApps, getApp } = await import('firebase/app');
        const { getAuth } = await import('firebase/auth');
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        this.authInstance = getAuth(app);
        return this.authInstance;
      })();
    }
    return this.authInitPromise;
  }

  private async initAuthListener(): Promise<void> {
    const auth = await this.getAuth();
    const { onAuthStateChanged } = await import('firebase/auth');

    onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL
        };
        this.user.set(authUser);
        this.userSubject.next(authUser);
      } else {
        this.user.set(null);
        this.userSubject.next(null);
      }
      this.isLoading.set(false);
      this.loadingSubject.next(false);
    });
  }

  /**
   * Sign in with Google popup
   * @returns Promise resolving to the authenticated user
   */
  async signInWithGoogle(): Promise<AuthUser> {
    try {
      const auth = await this.getAuth();
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const authUser: AuthUser = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL
      };

      return authUser;
    } catch (error) {
      console.error('Google sign-in failed:', error);
      throw error;
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    try {
      const auth = await this.getAuth();
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }

  /**
   * Get current user's UID (for Firestore paths)
   */
  getCurrentUid(): string | null {
    return this.user()?.uid ?? null;
  }
}
