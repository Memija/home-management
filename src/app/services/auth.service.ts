import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Auth, User as FirebaseUser } from 'firebase/auth';
import { environment } from '../../environments/environment';

const AUTH_SESSION_HINT_KEY = 'hm_has_auth_session';
const STORAGE_MODE_KEY = 'hm_storage_mode';

function hasPersistedAuthSessionHint(): boolean {
  try {
    if (
      localStorage.getItem(AUTH_SESSION_HINT_KEY) === 'true' ||
      localStorage.getItem(STORAGE_MODE_KEY) === 'cloud'
    ) {
      return true;
    }
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i)?.startsWith('firebase:authUser:')) {
        return true;
      }
    }
  } catch {
    // Ignore storage access errors in restricted contexts
  }
  return false;
}

function setPersistedAuthSessionHint(active: boolean): void {
  try {
    if (active) {
      localStorage.setItem(AUTH_SESSION_HINT_KEY, 'true');
    } else {
      localStorage.removeItem(AUTH_SESSION_HINT_KEY);
    }
  } catch {
    // Ignore storage write errors
  }
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private authInstance: Auth | null = null;
  private authInitPromise: Promise<Auth> | null = null;
  private listenerInitialized = false;

  /** Current authenticated user */
  readonly user = signal<AuthUser | null>(null);

  /** Whether authentication is still loading */
  readonly isLoading = signal<boolean>(true);

  /** Whether user is currently authenticated */
  readonly isAuthenticated = computed(() => this.user() !== null);

  /** Whether authentication is supported on the current domain */
  readonly isAuthSupported = signal<boolean>(true);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const hostname = window.location.hostname;
      // Define authorized domains (matching Firebase Console settings)
      const isAuthorized =
        hostname === 'home-management.dev' ||
        hostname.endsWith('.firebaseapp.com') ||
        hostname.endsWith('.web.app') ||
        (hostname === 'localhost' && environment.allowLocalAuth);

      this.isAuthSupported.set(isAuthorized);
      const isDemoActive =
        typeof window !== 'undefined' && localStorage.getItem('hm_demo_mode_is_active') === 'true';

      if (isDemoActive || !hasPersistedAuthSessionHint()) {
        this.isLoading.set(false);
      } else {
        queueMicrotask(() => {
          void this.initAuthListener();
        });
      }
    } else {
      this.isLoading.set(false);
    }
  }

  private async getAuth(): Promise<Auth> {
    if (this.authInstance) return this.authInstance;
    this.authInitPromise ??= (async () => {
      const { getOrCreateFirebaseApp } = await import('./firebase-app.helper');
      const { getAuth } = await import('firebase/auth');
      const app = await getOrCreateFirebaseApp(isPlatformBrowser(this.platformId));
      this.authInstance = getAuth(app);
      return this.authInstance;
    })();
    return this.authInitPromise;
  }

  private async initAuthListener(): Promise<void> {
    if (this.listenerInitialized) return;
    this.listenerInitialized = true;

    const auth = await this.getAuth();
    const { onAuthStateChanged } = await import('firebase/auth');

    onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };
        setPersistedAuthSessionHint(true);
        this.user.set(authUser);
      } else {
        setPersistedAuthSessionHint(false);
        this.user.set(null);
      }
      this.isLoading.set(false);
    });
  }

  /**
   * Sign in with Google popup
   * @returns Promise resolving to the authenticated user
   */
  async signInWithGoogle(): Promise<AuthUser> {
    try {
      await this.initAuthListener();
      const auth = await this.getAuth();
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const authUser: AuthUser = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      };
      setPersistedAuthSessionHint(true);
      this.user.set(authUser);
      this.isLoading.set(false);

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
      setPersistedAuthSessionHint(false);
      this.user.set(null);
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
