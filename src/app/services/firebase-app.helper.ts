import type { FirebaseApp } from 'firebase/app';
import { firebaseConfig } from '../config/firebase.config';

let appCheckInitialized = false;

/**
 * Initializes Firebase App Check with reCAPTCHA v3 provider
 * only in browser environments when a site key is configured.
 */
export async function initAppCheck(
  app: FirebaseApp,
  isBrowser: boolean,
  forceTest = false,
): Promise<void> {
  if (!isBrowser || appCheckInitialized || !app) {
    return;
  }

  if (typeof process !== 'undefined' && process.env?.['NODE_ENV'] === 'test' && !forceTest) {
    return;
  }

  const siteKey = (firebaseConfig as { recaptchaSiteKey?: string }).recaptchaSiteKey;
  if (!siteKey) {
    return;
  }

  try {
    const { initializeAppCheck, ReCaptchaV3Provider } = await import('firebase/app-check');

    if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
      // In local development, enable debug token to print in DevTools console
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    appCheckInitialized = true;
  } catch (error) {
    console.warn('[AppCheck] Failed to initialize Firebase App Check:', error);
  }
}

/**
 * Shared helper to get or initialize the FirebaseApp instance.
 * Ensures App Check is initialized before other Firebase services are consumed.
 */
export async function getOrCreateFirebaseApp(isBrowser = true): Promise<FirebaseApp> {
  const { initializeApp, getApps, getApp } = await import('firebase/app');
  const existingApps = getApps();
  if (existingApps.length > 0) {
    const app = getApp();
    await initAppCheck(app, isBrowser);
    return app;
  }

  const app = initializeApp(firebaseConfig);
  await initAppCheck(app, isBrowser);
  return app;
}

/**
 * Helper to reset App Check initialization state for unit testing
 */
export function _resetAppCheckStateForTesting(): void {
  appCheckInitialized = false;
}
