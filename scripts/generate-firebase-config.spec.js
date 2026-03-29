import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';

describe('generate-firebase-config', () => {
  let originalEnv;
  let exitSpy;
  let consoleInfoSpy;
  let consoleErrorSpy;
  let existsSyncSpy;
  let mkdirSyncSpy;
  let writeFileSyncSpy;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };

    // Reset module registry to ensure script runs fresh
    vi.resetModules();
    vi.clearAllMocks();

    // Setup spies
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    existsSyncSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    mkdirSyncSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
    writeFileSyncSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore env and spies
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  const loadModule = async () => {
    // vi.resetModules() will clear the cache for this import
    await import('./generate-firebase-config.js');
  };

  it('should skip generation if config already exists', async () => {
    existsSyncSpy.mockReturnValue(true);

    await loadModule();

    expect(existsSyncSpy).toHaveBeenCalled();
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      '[config] firebase.config.ts already exists — skipping generation',
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(writeFileSyncSpy).not.toHaveBeenCalled();
  });

  it('should exit with error if required environment variables are missing', async () => {
    existsSyncSpy.mockReturnValue(false);

    // Clear env vars to simulate missing
    delete process.env.FIREBASE_API_KEY;

    await loadModule();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[config] Missing environment variables:'),
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[config] Set these in your CI/CD secrets or create firebase.config.ts manually.',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(writeFileSyncSpy).not.toHaveBeenCalled();
  });

  it('should generate config file when required variables are present and file does not exist', async () => {
    existsSyncSpy.mockReturnValue(false);

    // Setup required env vars
    process.env.FIREBASE_API_KEY = 'test-api-key';
    process.env.FIREBASE_AUTH_DOMAIN = 'test-domain';
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_STORAGE_BUCKET = 'test-bucket';
    process.env.FIREBASE_MESSAGING_SENDER_ID = 'test-sender';
    process.env.FIREBASE_APP_ID = 'test-app-id';

    await loadModule();

    expect(mkdirSyncSpy).toHaveBeenCalledWith(expect.any(String), { recursive: true });

    expect(writeFileSyncSpy).toHaveBeenCalled();
    const [writtenPath, content] = writeFileSyncSpy.mock.calls[0];

    expect(writtenPath).toMatch(/firebase\.config\.ts$/);
    expect(content).toContain("apiKey: 'test-api-key'");
    expect(content).toContain("authDomain: 'test-domain'");
    expect(content).toContain("projectId: 'test-project'");
    expect(content).toContain("storageBucket: 'test-bucket'");
    expect(content).toContain("messagingSenderId: 'test-sender'");
    expect(content).toContain("appId: 'test-app-id'");

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      '[config] Generated firebase.config.ts from environment variables',
    );
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
