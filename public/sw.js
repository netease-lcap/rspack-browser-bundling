const BaseREG = new RegExp(`^(\/rspack-browser-bundling\/|\/)?preview/`)

const MIME_TYPES = {
  js: 'application/javascript',
  mjs: 'application/javascript',
  ts: 'application/typescript',
  vue: 'text/x-vue',
  json: 'application/json',
  css: 'text/css',
  html: 'text/html',
  htm: 'text/html',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  eot: 'application/vnd.ms-fontobject',
  otf: 'font/otf',
}

function getMimeType(path) {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  return MIME_TYPES[ext] || 'text/plain'
}

function mapPreviewToDist(path) {
  if (BaseREG.test(path)) {
    // 没有指定具体文件类型时，默认返回 index.html
    if (!path.includes('.')) {
      return '/dist/index.html'
    }

    return '/dist/' + path.replace(BaseREG, '')
  }

  return path
}

const CORS_HEADERS = {
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

const pendingRequests = new Map()
let requestIdCounter = 0
let messagePort = null

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {}

  if (type === 'INIT_MESSAGE_PORT') {
    console.log('[SW] Initializing MessagePort')
    messagePort = event.ports[0]
    messagePort.onmessage = (e) => {
      const { type: msgType, payload: msgPayload } = e.data
      if (msgType === 'BUILD_FILE_RESPONSE') {
        const { requestId, content } = msgPayload
        const resolve = pendingRequests.get(requestId)
        if (resolve) {
          pendingRequests.delete(requestId)
          resolve(content)
        }
      }
    }
    console.log('[SW] MessagePort initialized')
  }
})

self.addEventListener('install', (event) => {
  self.skipWaiting()
  console.log('[SW] Installed')
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('[SW] Activated and claimed all clients')
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SW_ACTIVATED' }))
      })
    })
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  const pathname = url.pathname

  console.log('[SW] Fetch event for:', pathname)

  if (!BaseREG.test(pathname)) {
    if (event.request.url.startsWith('http://minio-api.codewave-test.163yun.com/lowcode-static/packages') 
      || event.request.url.startsWith('https://minio-api.codewave-test.163yun.com/lowcode-static/packages')
    ) {
      event.respondWith(
        fetch(event.request, { mode: 'cors', credentials: 'omit'  }).then(response => {
          const newHeaders = new Headers(response.headers)
          newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin')
          newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp')
          newHeaders.set('Access-Control-Allow-Origin', '*')
          
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          })
        }).catch(() => fetch(event.request, { mode: 'cors', credentials: 'omit' }))
      );

      return;
    }


    event.respondWith(fetch(event.request))
    return
  }

  event.respondWith(
    (async () => {
      const distPath = mapPreviewToDist(pathname)

      const content = await fetchFromMainThread(distPath)
      if (content !== null) {
        return new Response(content, {
          headers: {
            'Content-Type': getMimeType(distPath),
            'Cache-Control': 'no-cache',
            ...CORS_HEADERS,
          },
        })
      }

      console.error('[SW] File not found:', pathname)
      return new Response('File not found: ' + pathname, {
        status: 404,
        headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS },
      })
    })()
  )
})

async function fetchFromMainThread(distPath) {
  if (!messagePort) {
    console.log('[SW] MessagePort not available')
    return null
  }

  const requestId = ++requestIdCounter

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId)
      resolve(null)
    }, 5000)

    pendingRequests.set(requestId, (content) => {
      clearTimeout(timeout)
      resolve(content)
    })

    messagePort.postMessage({
      type: 'GET_BUILD_FILE',
      payload: { path: distPath, requestId }
    })
  })
}