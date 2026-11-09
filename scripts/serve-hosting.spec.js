import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  stripJsonComments,
  toUrlGlob,
  loadHostingConfig,
  startHostingServer,
} from './serve-hosting.js';

describe('serve-hosting', () => {
  describe('toUrlGlob', () => {
    it('should prefix relative globs with a forward slash on every platform', () => {
      expect(toUrlGlob('**')).toBe('/**');
      expect(toUrlGlob('**/*.@(js|css)')).toBe('/**/*.@(js|css)');
      expect(toUrlGlob('/.well-known/**')).toBe('/.well-known/**');
    });

    it('should keep negation in front of the slashed glob', () => {
      expect(toUrlGlob('!**/*.html')).toBe('!/**/*.html');
    });
  });

  describe('stripJsonComments', () => {
    it('should remove line and block comments', () => {
      const input = '{\n  // line comment\n  "a": 1, /* block\n comment */ "b": 2\n}';
      expect(JSON.parse(stripJsonComments(input))).toEqual({ a: 1, b: 2 });
    });

    it('should keep comment-like sequences inside strings', () => {
      const input = '{ "url": "https://example.com/*path*/", "glob": "**/.*" }';
      expect(JSON.parse(stripJsonComments(input))).toEqual({
        url: 'https://example.com/*path*/',
        glob: '**/.*',
      });
    });

    it('should handle escaped quotes inside strings', () => {
      const input = '{ "text": "say \\"hi\\" // not a comment" } // trailing';
      expect(JSON.parse(stripJsonComments(input))).toEqual({ text: 'say "hi" // not a comment' });
    });
  });

  describe('loadHostingConfig', () => {
    it("should parse the project's firebase.json including comments", () => {
      const hosting = loadHostingConfig(path.resolve(process.cwd(), 'firebase.json'));
      expect(hosting.public).toBe('dist/home-management/browser');
      expect(hosting.trailingSlash).toBe(false);
    });

    it('should throw when no hosting section is defined', () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-config-'));
      const configPath = path.join(dir, 'firebase.json');
      fs.writeFileSync(configPath, '{ "firestore": {} }');
      expect(() => loadHostingConfig(configPath)).toThrow(/hosting/);
      fs.rmSync(dir, { recursive: true, force: true });
    });
  });

  describe('startHostingServer', () => {
    let projectDir;
    let configPath;
    let server;
    let baseUrl;

    beforeAll(async () => {
      projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-server-'));
      const publicDir = path.join(projectDir, 'public');
      fs.mkdirSync(path.join(publicDir, 'about'), { recursive: true });
      fs.writeFileSync(path.join(publicDir, 'index.html'), 'PRERENDERED HOME');
      fs.writeFileSync(path.join(publicDir, 'index.csr.html'), 'CSR SHELL');
      fs.writeFileSync(path.join(publicDir, 'about', 'index.html'), 'PRERENDERED ABOUT');
      fs.writeFileSync(path.join(publicDir, 'main.js'), 'console.info(1);');

      configPath = path.join(projectDir, 'firebase.json');
      fs.writeFileSync(
        configPath,
        `{
          "hosting": {
            // Mirrors the production setup
            "public": "public",
            "headers": [
              { "source": "**", "headers": [{ "key": "X-Test", "value": "yes" }] },
              { "source": "**/*.@(js|css)", "headers": [{ "key": "Cache-Control", "value": "immutable" }] },
              { "source": "/about", "headers": [{ "key": "Content-Type", "value": "text/plain; charset=utf-8" }] }
            ],
            "rewrites": [
              { "source": "**/*.{env,json,yml}", "destination": "/404.html" },
              { "source": "**", "destination": "/index.csr.html" }
            ],
            "cleanUrls": true,
            "trailingSlash": false
          }
        }`,
      );

      server = await startHostingServer({ port: 0, configPath, cwd: projectDir });
      baseUrl = `http://localhost:${server.address().port}`;
    });

    afterAll(async () => {
      await new Promise((resolve) => server?.close(resolve));
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    it('should serve the prerendered index.html at the root', async () => {
      const response = await fetch(`${baseUrl}/`);
      expect(await response.text()).toBe('PRERENDERED HOME');
    });

    it('should serve prerendered directory pages without a trailing slash', async () => {
      const response = await fetch(`${baseUrl}/about`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('PRERENDERED ABOUT');
    });

    it('should redirect trailing-slash URLs to their slash-less form', async () => {
      const response = await fetch(`${baseUrl}/about/`, { redirect: 'manual' });
      expect(response.status).toBe(301);
      expect(response.headers.get('location')).toBe('/about');
    });

    it('should fall back to the CSR shell for client-rendered routes', async () => {
      const response = await fetch(`${baseUrl}/dashboard/water`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('CSR SHELL');
    });

    it('should apply headers from the hosting configuration', async () => {
      const response = await fetch(`${baseUrl}/about`);
      expect(response.headers.get('x-test')).toBe('yes');
    });

    it('should only apply extglob header rules to matching files', async () => {
      const script = await fetch(`${baseUrl}/main.js`);
      const page = await fetch(`${baseUrl}/about`);
      expect(script.headers.get('cache-control')).toBe('immutable');
      expect(page.headers.get('cache-control')).not.toBe('immutable');
    });

    it('should let configured headers override default response headers', async () => {
      const response = await fetch(`${baseUrl}/about`);
      expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    });

    it('should reject when the build output is missing', async () => {
      await expect(
        startHostingServer({ port: 0, configPath, cwd: path.join(projectDir, 'missing') }),
      ).rejects.toThrow(/npm run build/);
    });
  });
});
