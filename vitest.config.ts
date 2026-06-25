import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environmentMatchGlobs: [
      ['src/renderer/**', 'happy-dom'],
      ['src/builder/**',  'happy-dom'],
      ['src/app/**',      'happy-dom'],
    ],
  },
});
