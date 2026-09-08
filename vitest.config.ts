import { defineConfig } from 'vitest/config';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';

// A simple Vite plugin to inline Angular templates and styles for testing in jsdom
function inlineAngularTemplates() {
  return {
    name: 'inline-angular-templates',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (id.endsWith('.ts') && !id.endsWith('.spec.ts') && code.includes('@Component')) {
        let newCode = code;

        // Inline templateUrl
        newCode = newCode.replace(/templateUrl:\s*['"`](.*?)['"`]/g, (match, url) => {
          try {
            const absPath = resolve(dirname(id), url);
            // eslint-disable-next-line security/detect-non-literal-fs-filename -- inlining templates dynamically in tests
            const html = readFileSync(absPath, 'utf-8');
            return `template: ${JSON.stringify(html)}`;
          } catch {
            return match;
          }
        });

        // Inline styleUrl / styleUrls
        newCode = newCode.replace(
          /styleUrl(?:s)?:\s*(?:['"`](.*?)['"`]|\[(.*?)\])/g,
          (match, singleUrl, arrayUrls) => {
            try {
              const urls = singleUrl
                ? [singleUrl]
                : arrayUrls.split(',').map((u: string) => u.trim().replace(/['"`]/g, ''));
              const cssContents = urls.map((url: string) => {
                if (!url) return '';
                const absPath = resolve(dirname(id), url);
                // eslint-disable-next-line security/detect-non-literal-fs-filename -- inlining styles dynamically in tests
                return readFileSync(absPath, 'utf-8');
              });
              return `styles: [${JSON.stringify(cssContents.join(''))}]`;
            } catch {
              return match;
            }
          },
        );

        return { code: newCode, map: null };
      }
    },
  };
}

export default defineConfig({
  plugins: [inlineAngularTemplates()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup-vitest.ts'],
    include: ['src/**/*.spec.ts', 'scripts/**/*.spec.js'],
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text-summary'],
      reportsDirectory: './coverage/home-management',
    },
    reporters: ['default', 'vitest-sonar-reporter'],
    outputFile: {
      'vitest-sonar-reporter': './coverage/home-management/sonar-report.xml',
    },
  },
  resolve: {
    alias: {
      '@angular/animations': './node_modules/@angular/animations/fesm2022/animations.mjs',
    },
  },
});
