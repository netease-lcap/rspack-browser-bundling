import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import nodePath from 'path'
import { fileURLToPath } from 'url'
import vitePluginCOI from './vite-plugin-coi.js'

const __dirname = nodePath.dirname(fileURLToPath(import.meta.url))

const base = '/rspack-browser-bundling/'

export default defineConfig({
  base,
  plugins: [
    react(),
    // vitePluginCOI()
  ],
  resolve: {
    alias: {
      '@': nodePath.resolve(__dirname, './src')
    }
  },
  define: {
    __APP_BASE__: JSON.stringify(base),
  },
  server: {
    port: 3000,
    open: true
  },
  optimizeDeps: {
    exclude: ['@rspack/browser', '@monaco-editor/react'],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  worker: {
    format: 'es',
    plugins: () => [react()],
  },
  build: {
    target: 'esnext',
    minify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'files': ['./src/files.json'],
        }
      }
    }
  }
})
