import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getOrCreateFirebaseApp,
  initAppCheck,
  _resetAppCheckStateForTesting,
} from './firebase-app.helper';
import type { FirebaseApp } from 'firebase/app';

const mockInitializeApp = vi.fn();
const mockGetApps = vi.fn();
const mockGetApp = vi.fn();
const mockInitializeAppCheck = vi.fn();
const mockReCaptchaV3Provider = vi.fn();

vi.mock('firebase/app', () => ({
  initializeApp: (...args: unknown[]) => mockInitializeApp(...args),
  getApps: () => mockGetApps(),
  getApp: () => mockGetApp(),
}));

vi.mock('firebase/app-check', () => ({
  initializeAppCheck: (...args: unknown[]) => mockInitializeAppCheck(...args),
  ReCaptchaV3Provider: class {
    constructor(...args: unknown[]) {
      mockReCaptchaV3Provider(...args);
    }
  },
}));

vi.mock('../config/firebase.config', () => ({
  firebaseConfig: {
    apiKey: 'test-api-key',
    authDomain: 'test.firebaseapp.com',
    projectId: 'test-project',
    storageBucket: 'test.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:test',
    recaptchaSiteKey: 'YOUR_RECAPTCHA_V3_SITE_KEY',
  },
}));

describe('firebase-app.helper', () => {
  const fakeApp = { name: '[DEFAULT]' } as FirebaseApp;

  beforeEach(() => {
    vi.clearAllMocks();
    _resetAppCheckStateForTesting();
    mockGetApps.mockReturnValue([]);
    mockInitializeApp.mockReturnValue(fakeApp);
    mockGetApp.mockReturnValue(fakeApp);
  });

  it('should initialize a new Firebase app when no apps exist', async () => {
    const app = await getOrCreateFirebaseApp(false);

    expect(mockGetApps).toHaveBeenCalled();
    expect(mockInitializeApp).toHaveBeenCalled();
    expect(app).toBe(fakeApp);
  });

  it('should reuse existing Firebase app if already initialized', async () => {
    mockGetApps.mockReturnValue([fakeApp]);

    const app = await getOrCreateFirebaseApp(false);

    expect(mockGetApp).toHaveBeenCalled();
    expect(mockInitializeApp).not.toHaveBeenCalled();
    expect(app).toBe(fakeApp);
  });

  it('should initialize App Check in browser environment', async () => {
    await initAppCheck(fakeApp, true, true);

    expect(mockInitializeAppCheck).toHaveBeenCalledWith(
      fakeApp,
      expect.objectContaining({
        isTokenAutoRefreshEnabled: true,
      }),
    );
    expect(mockReCaptchaV3Provider).toHaveBeenCalledWith('YOUR_RECAPTCHA_V3_SITE_KEY');
  });

  it('should not initialize App Check if not browser', async () => {
    await initAppCheck(fakeApp, false, true);

    expect(mockInitializeAppCheck).not.toHaveBeenCalled();
  });

  it('should not initialize App Check twice', async () => {
    await initAppCheck(fakeApp, true, true);
    expect(mockInitializeAppCheck).toHaveBeenCalledTimes(1);

    await initAppCheck(fakeApp, true, true);
    expect(mockInitializeAppCheck).toHaveBeenCalledTimes(1);
  });

  it('should handle App Check initialization errors gracefully', async () => {
    mockInitializeAppCheck.mockImplementationOnce(() => {
      throw new Error('App Check failed');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(initAppCheck(fakeApp, true, true)).resolves.not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[AppCheck] Failed to initialize Firebase App Check:'),
      expect.any(Error),
    );

    warnSpy.mockRestore();
  });
});
