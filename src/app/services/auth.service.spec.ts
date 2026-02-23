import { TestBed } from '@angular/core/testing';
import { AuthService, AuthUser } from './auth.service';
import { Auth } from '@angular/fire/auth';
import { PLATFORM_ID } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const mockSignInWithPopup = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChanged = vi.fn();

vi.mock('@angular/fire/auth', () => ({
  Auth: class { },
  GoogleAuthProvider: class { },
  signInWithPopup: (...args: any[]) => mockSignInWithPopup(...args),
  signOut: (...args: any[]) => mockSignOut(...args),
  onAuthStateChanged: (...args: any[]) => mockOnAuthStateChanged(...args),
}));

describe('AuthService', () => {
  let service: AuthService;
  let authMock: any;

  beforeEach(() => {
    authMock = {};

    // Clear mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const setupTestBed = (platformId: string = 'browser') => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Auth, useValue: authMock },
        { provide: PLATFORM_ID, useValue: platformId }
      ]
    });
    service = TestBed.inject(AuthService);
  };

  describe('constructor and initAuthListener', () => {
    it('should initialize auth listener and be loading in browser platform', () => {
      // Don't call the callback immediately
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        // Just register it
      });

      setupTestBed('browser');

      expect(mockOnAuthStateChanged).toHaveBeenCalledWith(authMock, expect.any(Function));
      expect(service.isLoading()).toBe(true);
    });

    it('should skip auth listener and not be loading in server platform', () => {
      setupTestBed('server');

      expect(mockOnAuthStateChanged).not.toHaveBeenCalled();
      expect(service.isLoading()).toBe(false);
    });

    it('should set authenticated user when firebase user is provided', () => {
      const mockFirebaseUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'mock-photo-url.jpg'
      };

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockFirebaseUser);
      });

      setupTestBed('browser');

      expect(service.user()).toEqual({
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'mock-photo-url.jpg'
      });
      expect(service.isAuthenticated()).toBe(true);
      expect(service.isLoading()).toBe(false);
      expect(service.getCurrentUid()).toBe('test-uid');
    });

    it('should clear user when firebase user is null', () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
      });

      setupTestBed('browser');

      expect(service.user()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.isLoading()).toBe(false);
      expect(service.getCurrentUid()).toBeNull();
    });
  });

  describe('signInWithGoogle', () => {
    beforeEach(() => {
      setupTestBed('browser');
    });

    it('should returning user data on successful sign in', async () => {
      mockSignInWithPopup.mockResolvedValue({
        user: {
          uid: 'new-uid',
          email: 'new@example.com',
          displayName: 'New User',
          photoURL: 'mock-new-photo-url.jpg'
        }
      });

      const result = await service.signInWithGoogle();

      expect(mockSignInWithPopup).toHaveBeenCalled();
      expect(result).toEqual({
        uid: 'new-uid',
        email: 'new@example.com',
        displayName: 'New User',
        photoURL: 'mock-new-photo-url.jpg'
      });
    });

    it('should throw and console.error on sign in failure', async () => {
      const error = new Error('Sign in failed');
      mockSignInWithPopup.mockRejectedValue(error);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      await expect(service.signInWithGoogle()).rejects.toThrow('Sign in failed');
      expect(consoleSpy).toHaveBeenCalledWith('Google sign-in failed:', error);
    });
  });

  describe('signOut', () => {
    beforeEach(() => {
      setupTestBed('browser');
    });

    it('should sign out successfully', async () => {
      mockSignOut.mockResolvedValue(undefined);

      await service.signOut();

      expect(mockSignOut).toHaveBeenCalledWith(authMock);
    });

    it('should throw and console.error on sign out failure', async () => {
      const error = new Error('Sign out failed');
      mockSignOut.mockRejectedValue(error);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      await expect(service.signOut()).rejects.toThrow('Sign out failed');
      expect(consoleSpy).toHaveBeenCalledWith('Sign out failed:', error);
    });
  });

  describe('getCurrentUid', () => {
    it('should return null when not authenticated', () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(null);
      });
      setupTestBed('browser');

      expect(service.getCurrentUid()).toBeNull();
    });

    it('should return uid when authenticated', () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback({ uid: 'my-uid' });
      });
      setupTestBed('browser');

      expect(service.getCurrentUid()).toBe('my-uid');
    });
  });
});
