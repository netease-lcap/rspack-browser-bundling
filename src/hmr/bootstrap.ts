/**
 * HMR Client Bootstrap for preview iframe
 * 
 * This script is injected into the preview iframe to enable HMR.
 * It connects to the parent window via MessagePort and handles HMR updates.
 */

import { connectHMR, addMessageListener } from './client-messageport'

function initHMR() {
  console.log('[HMR Bootstrap] Initializing...')

  addMessageListener((event) => {
    if (event.type === 'turbopack-connected') {
      console.log('[HMR Bootstrap] Connected to HMR server')
    }

    if (event.type === 'turbopack-message') {
      const data = event.data
      console.log('[HMR Bootstrap] Received message:', data)

      if (data.action === 'building') {
        console.log('[HMR] Build started...')
      }

      if (data.action === 'built') {
        console.log('[HMR] Build completed, hash:', data.hash)
      }

      if (data.action === 'partial') {
        console.log('[HMR] Partial update received:', data.updates)
        applyHMRUpdate(data.updates)
      }

      if (data.action === 'reload') {
        console.log('[HMR] Reload requested')
        window.location.reload()
      }
    }
  })

  connectHMR()
}

function applyHMRUpdate(updates: any) {
  if (!updates || !updates.updatedModules) {
    console.log('[HMR] No modules to update')
    return
  }

  console.log('[HMR] Applying update to modules:', updates.updatedModules)

  for (const update of updates.updates || []) {
    const { moduleId, code } = update
    
    if (window.__webpack_modules__ && window.__webpack_modules__[moduleId]) {
      console.log('[HMR] Hot reloading module:', moduleId)
      
      const hotApi = window.__webpack_require__.hmr
      if (hotApi && hotApi.applyUpdate) {
        hotApi.applyUpdate(moduleId, code)
      } else {
        console.log('[HMR] Hot API not available, reloading page')
        window.location.reload()
        return
      }
    }
  }

  console.log('[HMR] Update applied successfully')
}

declare global {
  interface Window {
    __webpack_modules__: Record<string, any>
    __webpack_require__: any
  }
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHMR)
  } else {
    initHMR()
  }
}
