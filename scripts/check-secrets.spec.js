import { describe, it, expect } from 'vitest';
import { scanDiff } from './check-secrets';

describe('check-secrets', () => {
  it('should return no violations for benign diffs', () => {
    const cleanDiff = `
diff --git a/src/app/test.ts b/src/app/test.ts
--- a/src/app/test.ts
+++ b/src/app/test.ts
@@ -1,3 +1,3 @@
 const a = 1;
+const greeting = 'Hello World';
-const old = 2;
`;
    const violations = scanDiff(cleanDiff);
    expect(violations).toHaveLength(0);
  });

  it('should detect Google / Firebase API keys on added lines', () => {
    const diff = `
diff --git a/src/app/bad.ts b/src/app/bad.ts
--- a/src/app/bad.ts
+++ b/src/app/bad.ts
@@ -1,2 +1,3 @@
+const key = 'AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q';
`;
    const violations = scanDiff(diff);
    expect(violations).toHaveLength(1);
    expect(violations[0].patternName).toBe('Google / Firebase API Key');
    expect(violations[0].file).toBe('src/app/bad.ts');
    expect(violations[0].snippet).toBe('AIza...5P6Q');
  });

  it('should detect GitHub tokens (PAT, fine-grained, OAuth, etc.)', () => {
    const diff = `
+++ b/src/token.ts
+const pat = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";
+const oauth = "gho_1234567890abcdefghijklmnopqrstuvwxyz";
+const fineGrained = "github_pat_11AAAAAAA0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789012";
`;
    const violations = scanDiff(diff);
    expect(violations).toHaveLength(3);
    expect(violations.every((v) => v.patternName === 'GitHub Token')).toBe(true);
  });

  it('should detect various Private Key blocks (RSA, Encrypted, PGP)', () => {
    const diff = `
+++ b/secrets/key.pem
+-----BEGIN RSA PRIVATE KEY-----
+-----BEGIN ENCRYPTED PRIVATE KEY-----
+-----BEGIN PGP PRIVATE KEY BLOCK-----
`;
    const violations = scanDiff(diff);
    expect(violations).toHaveLength(3);
    expect(violations.every((v) => v.patternName === 'Private Key Block')).toBe(true);
  });

  it('should detect Google OAuth Access Tokens', () => {
    const diff = `
+++ b/src/auth.ts
+const token = 'ya29.a0ARrdaM8123456789012345678901234567890';
`;
    const violations = scanDiff(diff);
    expect(violations).toHaveLength(1);
    expect(violations[0].patternName).toBe('Google OAuth Access Token');
  });

  it('should detect NPM Access Tokens', () => {
    const diff = `
+++ b/src/npm.ts
+const npmToken = 'npm_1234567890abcdefghijklmnopqrstuv';
`;
    const violations = scanDiff(diff);
    expect(violations).toHaveLength(1);
    expect(violations[0].patternName).toBe('NPM Access Token');
  });

  it('should detect JSON Web Tokens (JWT)', () => {
    const diff = `
+++ b/src/jwt.ts
+const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
`;
    const violations = scanDiff(diff);
    expect(violations).toHaveLength(1);
    expect(violations[0].patternName).toBe('JSON Web Token (JWT)');
  });

  it('should ignore secrets on deleted lines (-)', () => {
    const diff = `
+++ b/src/app/cleanup.ts
-const removedKey = 'AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q';
+const newKey = process.env.API_KEY;
`;
    const violations = scanDiff(diff);
    expect(violations).toHaveLength(0);
  });

  it('should skip allowlisted template files', () => {
    const diff = `
+++ b/src/app/config/firebase.config.template.ts
+apiKey: 'YOUR_API_KEY',
`;
    const violations = scanDiff(diff);
    expect(violations).toHaveLength(0);
  });

  it('should skip allowlisted values like reCAPTCHA site key placeholder', () => {
    const diff = `
+++ b/src/app/config/firebase.config.ts
+recaptchaSiteKey: 'YOUR_RECAPTCHA_V3_SITE_KEY',
`;
    const violations = scanDiff(diff);
    expect(violations).toHaveLength(0);
  });
});
