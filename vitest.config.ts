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

        // Strip styleUrl / styleUrls (JSDOM does not render styles or parse raw SCSS)
        newCode = newCode.replace(/styleUrl(?:s)?:\s*(?:['"`](.*?)['"`]|\[(.*?)\])/g, 'styles: []');

        // Support Angular signal input() and output() in JIT mode when running vitest directly
        if (/\b(?:input|output)\s*(?:\.required)?\s*[<(]/.test(newCode)) {
          const validModifiers = new Set(['public', 'protected', 'private', 'readonly']);
          newCode = `import { Input as __NgJitInput, Output as __NgJitOutput } from '@angular/core';\n${newCode}`;
          newCode = newCode.replace(
            /^([ \t]*)(\w[^\r\n=;]*)(=[ \t]*(input(?:\.required)?|output)[ \t]*[<(])/gm,
            (match, indent: string, lhs: string, rhs: string, fn: string) => {
              const [declPart] = lhs.split(':');
              const tokens = declPart.trim().split(/\s+/);
              const propName = tokens.pop();
              if (!propName || !/^\w+$/.test(propName) || !tokens.every((t) => validModifiers.has(t))) {
                return match;
              }
              const decorator = fn.startsWith('input')
                ? '@__NgJitInput({ isSignal: true } as unknown as string)'
                : '@__NgJitOutput()';
              return `${indent}${decorator} ${lhs}${rhs}`;
            },
          );
        }

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
