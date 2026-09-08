import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { Auth } from '@angular/fire/auth';
import { PLATFORM_ID } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const waitFor = async (fn: () => boolean, timeout = 1000) => {
  const start = Date.now();
  while (!fn() && Date.now() - start < timeout) {
    await new Promise((r) => setTimeout(r, 5));
  }
};

const {
  mockSignInWithPopup,
  mockSignOut,
  mockOnAuthStateChanged,
  mockInitializeApp,
  mockGetApps,
  mockGetApp,
} = vi.hoisted(() => ({
  mockSignInWithPopup: vi.fn(),
  mockSignOut: vi.fn(),
  mockOnAuthStateChanged: vi.fn(),
  mockInitializeApp: vi.fn(),
  mockGetApps: vi.fn().mockReturnValue([]),
  mockGetApp: vi.fn(),
}));

let globalAuthMock: unknown = {};

vi.mock('firebase/auth', () => ({
  Auth: class {},
  GoogleAuthProvider: class {},
  getAuth: () => globalAuthMock,
  signInWithPopup: (...args: unknown[]) => {
    if (typeof mockSignInWithPopup === 'function') {
      return mockSignInWithPopup(...args);
    }
  },
  signOut: (...args: unknown[]) => {
    if (typeof mockSignOut === 'function') {
      return mockSignOut(...args);
    }
  },
  onAuthStateChanged: (...args: unknown[]) => {
    if (typeof mockOnAuthStateChanged === 'function') {
      return mockOnAuthStateChanged(...args);
    }
  },
}));

vi.mock('@firebase/auth', () => ({
  Auth: class {},
  GoogleAuthProvider: class {},
  getAuth: () => globalAuthMock,
  signInWithPopup: (...args: unknown[]) => {
    if (typeof mockSignInWithPopup === 'function') {
      return mockSignInWithPopup(...args);
    }
  },
  signOut: (...args: unknown[]) => {
    if (typeof mockSignOut === 'function') {
      return mockSignOut(...args);
    }
  },
  onAuthStateChanged: (...args: unknown[]) => {
    if (typeof mockOnAuthStateChanged === 'function') {
      return mockOnAuthStateChanged(...args);
    }
  },
}));

vi.mock('firebase/app', () => ({
  initializeApp: (...args: unknown[]) => mockInitializeApp(...args),
  getApps: () => mockGetApps(),
  getApp: () => mockGetApp(),
}));

vi.mock('@firebase/app', () => ({
  initializeApp: (...args: unknown[]) => mockInitializeApp(...args),
  getApps: () => mockGetApps(),
  getApp: () => mockGetApp(),
}));

vi.mock('firebase/app-check', () => ({
  initializeAppCheck: vi.fn(),
  ReCaptchaV3Provider: class {},
}));

vi.mock('@firebase/app-check', () => ({
  initializeAppCheck: vi.fn(),
  ReCaptchaV3Provider: class {},
}));

describe('AuthService', () => {
  let service: AuthService;
  let authMock: Record<string, import('vitest').Mock>;

  beforeEach(() => {
    authMock = {};
    globalAuthMock = authMock;
    mockGetApps.mockReturnValue([]);
    mockOnAuthStateChanged.mockImplementation(() => undefined);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const setupTestBed = (platformId = 'browser') => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Auth, useValue: authMock },
        { provide: PLATFORM_ID, useValue: platformId },
      ],
    });
    service = TestBed.inject(AuthService);
  };

  describe('constructor and initAuthListener', () => {
    it('should initialize auth listener and be loading in browser platform', async () => {
      mockOnAuthStateChanged.mockImplementation(() => undefined);

      setupTestBed('browser');
      await waitFor(() => mockOnAuthStateChanged.mock.calls.length > 0);

      expect(mockOnAuthStateChanged).toHaveBeenCalledWith(globalAuthMock, expect.any(Function));
      expect(service.isLoading()).toBe(true);
    });

    it('should skip auth listener and not be loading in server platform', async () => {
      setupTestBed('server');
      await flushPromises();

      expect(mockOnAuthStateChanged).not.toHaveBeenCalled();
      expect(service.isLoading()).toBe(false);
    });

    it('should set authenticated user when firebase user is provided', async () => {
      const mockFirebaseUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'mock-photo-url.jpg',
      };

      mockOnAuthStateChanged.mockImplementation(
        (_auth: unknown, callback: (user: unknown) => void) => {
          callback(mockFirebaseUser);
        },
      );

      setupTestBed('browser');
      await waitFor(() => service.isAuthenticated() === true);

      expect(service.user()).toEqual({
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'mock-photo-url.jpg',
      });
      expect(service.isAuthenticated()).toBe(true);
      expect(service.isLoading()).toBe(false);
      expect(service.getCurrentUid()).toBe('test-uid');
    });

    it('should clear user when firebase user is null', async () => {
      mockOnAuthStateChanged.mockImplementation(
        (_auth: unknown, callback: (user: unknown) => void) => {
          callback(null);
        },
      );

      setupTestBed('browser');
      await waitFor(() => service.isLoading() === false);

      expect(service.user()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.isLoading()).toBe(false);
      expect(service.getCurrentUid()).toBeNull();
    });
  });

  describe('signInWithGoogle', () => {
    beforeEach(async () => {
      setupTestBed('browser');
      await waitFor(() => mockOnAuthStateChanged.mock.calls.length > 0);
    });

    it('should return user data on successful sign in', async () => {
      mockSignInWithPopup.mockResolvedValue({
        user: {
          uid: 'new-uid',
          email: 'new@example.com',
          displayName: 'New User',
          photoURL: 'mock-new-photo-url.jpg',
        },
      });

      const result = await service.signInWithGoogle();

      expect(mockSignInWithPopup).toHaveBeenCalled();
      expect(result).toEqual({
        uid: 'new-uid',
        email: 'new@example.com',
        displayName: 'New User',
        photoURL: 'mock-new-photo-url.jpg',
      });
    });

    it('should throw and console.error on sign in failure', async () => {
      const error = new Error('Sign in failed');
      mockSignInWithPopup.mockRejectedValue(error);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      await expect(service.signInWithGoogle()).rejects.toThrow('Sign in failed');
      expect(consoleSpy).toHaveBeenCalledWith('Google sign-in failed:', error);
    });
  });

  describe('signOut', () => {
    beforeEach(async () => {
      setupTestBed('browser');
      await waitFor(() => mockOnAuthStateChanged.mock.calls.length > 0);
    });

    it('should sign out successfully', async () => {
      mockSignOut.mockResolvedValue(undefined);

      await service.signOut();

      expect(mockSignOut).toHaveBeenCalledWith(globalAuthMock);
    });

    it('should throw and console.error on sign out failure', async () => {
      const error = new Error('Sign out failed');
      mockSignOut.mockRejectedValue(error);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      await expect(service.signOut()).rejects.toThrow('Sign out failed');
      expect(consoleSpy).toHaveBeenCalledWith('Sign out failed:', error);
    });
  });

  describe('getCurrentUid', () => {
    it('should return null when not authenticated', async () => {
      mockOnAuthStateChanged.mockImplementation(
        (_auth: unknown, callback: (user: unknown) => void) => {
          callback(null);
        },
      );
      setupTestBed('browser');
      await waitFor(() => service.isLoading() === false);

      expect(service.getCurrentUid()).toBeNull();
    });

    it('should return uid when authenticated', async () => {
      mockOnAuthStateChanged.mockImplementation(
        (_auth: unknown, callback: (user: unknown) => void) => {
          callback({ uid: 'my-uid' });
        },
      );
      setupTestBed('browser');
      await waitFor(() => service.isLoading() === false);

      expect(service.getCurrentUid()).toBe('my-uid');
    });
  });
});
