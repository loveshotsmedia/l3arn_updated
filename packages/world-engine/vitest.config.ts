import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node', // pure simulation-logic tests only; rendering is verified live (Playwright), not unit-tested
    include: ['src/**/*.test.ts'],
  },
});
