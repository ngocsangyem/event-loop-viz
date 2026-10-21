import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * Builds the design system as one IIFE (`window.ELV`) that registers every custom element on
 * load. Vue is bundled in, so the file has no runtime dependencies. `customElement: true` puts
 * every SFC in custom-element mode: its <style> is inlined into the element's shadow root.
 */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [vue({ customElement: true })],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'ELV',
      formats: ['iife'],
      fileName: () => 'elv.js',
    },
  },
})
