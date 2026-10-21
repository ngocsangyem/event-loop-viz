import { defineConfig } from 'vitest/config'

// Differential tests against the Chrome Oracle. Node environment: no DOM, the engine is the subject.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['oracle/**/*.test.ts'],
  },
})
