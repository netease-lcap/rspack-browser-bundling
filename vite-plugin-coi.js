import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Vite 插件：自动注入 COI Service Worker
 * 用于在 GitHub Pages 等环境中启用 SharedArrayBuffer
 */
export default function vitePluginCOI() {
  let config
  const coiScriptPath = path.resolve(__dirname, 'public/coi-serviceworker.js')
  
  return {
    name: 'vite-plugin-coi',
    
    configResolved(resolvedConfig) {
      config = resolvedConfig
    },
    
    // 在 HTML 中注入 Service Worker 脚本
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: {
            src: './coi-serviceworker.js'
          },
          injectTo: 'head-prepend'
        }
      ]
    },
    
    // 开发模式：配置服务器 headers
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
        next()
      })
    },
    
    // 生产构建：复制 Service Worker 文件到 dist
    closeBundle() {
      if (config.command === 'build') {
        const outDir = config.build.outDir || 'dist'
        const destPath = path.resolve(__dirname, outDir, 'coi-serviceworker.js')
        
        if (fs.existsSync(coiScriptPath)) {
          fs.copyFileSync(coiScriptPath, destPath)
          console.log('✓ COI Service Worker copied to', destPath)
        } else {
          console.warn('⚠ COI Service Worker not found at', coiScriptPath)
        }
      }
    }
  }
}
