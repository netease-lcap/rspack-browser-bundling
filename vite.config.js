import { defineConfig } from 'vite'
import nodePath from 'path'
import { fileURLToPath } from 'url'

const __dirname = nodePath.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/rspack-browser-bundling/' : '/',
  define: {
    // global: 'globalThis',
    // 'process.env': {}
  },
  resolve: {
    alias: {
      // path: nodePath.resolve(__dirname, 'src/path-shim.js'),
      // crypto: 'crypto-browserify',
      // stream: 'stream-browserify',
      // querystring: nodePath.resolve(__dirname, 'src/querystring-shim.js')
    }
  },
  server: {
    port: 3000,
    open: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  },
  optimizeDeps: {
    exclude: ['@rspack/browser']
  },
  build: {
    target: 'esnext',
    minify: false
  }
})
