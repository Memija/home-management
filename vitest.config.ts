import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup-vitest.ts'],
    include: ['src/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '@angular/animations': './node_modules/@angular/animations/fesm2022/animations.mjs',
    },
  },
});
