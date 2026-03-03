import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import UnoCSS from 'unocss/vite'
import nodePath from 'path'
import { fileURLToPath } from 'url'
import vitePluginCOI from './vite-plugin-coi.js'

const __dirname = nodePath.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/rspack-browser-bundling/' : '/',
  plugins: [
    UnoCSS(),
    react(),
    vitePluginCOI()
  ],
  resolve: {
    alias: {
      '@': nodePath.resolve(__dirname, './src')
    }
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
  build: {
    target: 'esnext',
    minify: true
  }
})
