import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    // The DevTools launcher floats over the pinned dock and takes the e2e suite's clicks.
    ...(process.env.ELV_E2E ? [] : [vueDevTools()]),
  ],
  // The engine runs in a module Worker chunk. Built-in function names become frame labels in the
  // Trace, so the chunk must keep them.
  worker: {
    format: 'es',
    rolldownOptions: { output: { keepNames: true } },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
