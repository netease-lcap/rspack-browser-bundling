import React, { useState, useCallback, useRef, useEffect } from 'react'

import FileTree from './FileTree'
import MonacoEditor from './MonacoEditor'
import OperationPanel from './OperationPanel'

import filesData from '../files'
import { useHMR } from '../hooks/useHMR'
import { HmrServer, HmrClient } from '../hmr/HmrServer'
import type { FileSystem, BuildStats, MonacoEditorInstance } from '../types'
import type { BuildEndPayload, HMRUpdatePayload } from '../types/hmr'

const App: React.FC = () => {
  const [files, setFiles] = useState<FileSystem>({ ...filesData })
  const [currentFile, setCurrentFile] = useState<string | null>(null)
  const [distFiles, setDistFiles] = useState<Record<string, string> | null>(null)
  const [buildStats, setBuildStats] = useState<BuildStats | null>(null)
  const [runOutput, setRunOutput] = useState<string>('')
  const [isRunOutputVisible, setIsRunOutputVisible] = useState<boolean>(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const editorRef = useRef<MonacoEditorInstance | null>(null)
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null)
  const hmrServerRef = useRef<HmrServer | null>(null)
  const hmrClientRef = useRef<HmrClient | null>(null)

  const [isPreviewVisible, setIsPreviewVisible] = useState<boolean>(false)
  const [previewKey, setPreviewKey] = useState<number>(0)
  const [isSwReady, setIsSwReady] = useState<boolean>(false)
  const [isHmrConnected, setIsHmrConnected] = useState<boolean>(false)
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null)

  const handleBuildEnd = useCallback((result: BuildEndPayload) => {
    console.log('[App] Build end, files:', Object.keys(result.distFiles))
    setDistFiles(result.distFiles)

    if (hmrServerRef.current && isHmrConnected) {
      hmrServerRef.current.notifyBuilt(result.hash)
    }
  }, [isHmrConnected])

  const handleHMRUpdate = useCallback((update: HMRUpdatePayload) => {
    console.log('[App] HMR update:', update)
    
    if (hmrServerRef.current && isHmrConnected) {
      hmrServerRef.current.sendUpdate(update)
    }
  }, [isHmrConnected])

  const {
    status: hmrStatus,
    isWatchMode,
    isCompiling,
    startWatch,
    stopWatch,
    updateFile,
  } = useHMR({
    initialFiles: files,
    autoStart: false,
    config: {
      mode: 'development',
      enableHMR: true,
      enableReactRefresh: true,
    },
    onBuildEnd: handleBuildEnd,
    onHMRUpdate: handleHMRUpdate,
  })

  useEffect(() => {
    if (!hmrServerRef.current) {
      hmrServerRef.current = new HmrServer({
        onSubscribe: (path, client) => {
          console.log('[App] HMR client subscribed:', path, client.id)
        },
        onUnsubscribe: (path, client) => {
          console.log('[App] HMR client unsubscribed:', path, client.id)
        },
      })
    }

    return () => {
      hmrServerRef.current?.dispose()
      hmrServerRef.current = null
    }
  }, [])

  const messagePortRef = useRef<MessagePort | null>(null)
  const distFilesRef = useRef<Record<string, string> | null>(null)

  useEffect(() => {
    distFilesRef.current = distFiles
  }, [distFiles])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(async (registration) => {
          swRegistrationRef.current = registration
          
          await navigator.serviceWorker.ready
          
          if (!navigator.serviceWorker.controller) {
            console.log('[App] Waiting for SW to take control...')
            await new Promise<void>((resolve) => {
              navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })
            })
          }
          
          console.log('[App] SW is now controlling, initializing MessagePort')
          const channel = new MessageChannel()
          messagePortRef.current = channel.port1

          channel.port1.onmessage = (event) => {
            const { type, payload } = event.data
            if (type === 'GET_BUILD_FILE') {
              const filePath = payload?.path as string
              const requestId = payload?.requestId as number
              console.log('[App] Received GET_BUILD_FILE for:', filePath)
              const currentDistFiles = distFilesRef.current
              if (currentDistFiles && filePath && filePath in currentDistFiles) {
                channel.port1.postMessage({
                  type: 'BUILD_FILE_RESPONSE',
                  payload: { requestId, content: currentDistFiles[filePath] }
                })
              }
            }
          }

          navigator.serviceWorker.controller!.postMessage({ type: 'INIT_MESSAGE_PORT' }, [channel.port2])
          setIsSwReady(true)
        })
        .catch((error) => {
          console.error('[App] SW registration failed:', error)
        })
    }
  }, [])

  useEffect(() => {
    if (isSwReady && distFiles && isPreviewVisible) {
      setPreviewKey(prev => prev + 1)
    }
  }, [isSwReady, distFiles, isPreviewVisible])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type } = event.data

      if (type === 'hmr-ready') {
        if (previewIframeRef.current && hmrServerRef.current) {
          const client = hmrServerRef.current.connectIframe(previewIframeRef.current)
          if (client) {
            hmrClientRef.current = client
            setIsHmrConnected(true)
          }
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const showMessage = useCallback((text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }, [])

  const handleFileSelect = useCallback((path: string) => {
    setCurrentFile(path)
  }, [])

  const handleFileSave = useCallback((path: string, content: string) => {
    setFiles(prev => {
      const updated = { ...prev, [path]: content }
      updateFile(path, content)
      return updated
    })
    showMessage(`✅ 文件已保存: ${path}`, 'success')
  }, [updateFile, showMessage])

  const handleToggleWatch = useCallback(async () => {
    if (isWatchMode) {
      stopWatch()
      showMessage('⏹️ Watch 模式已停止', 'success')
    } else {
      try {
        await startWatch()
        showMessage('▶️ Watch 模式已启动', 'success')
      } catch (error: any) {
        showMessage('❌ 启动 Watch 失败: ' + error.message, 'error')
      }
    }
  }, [isWatchMode, startWatch, stopWatch, showMessage])

  const handleRun = useCallback(async () => {
    if (!distFiles) {
      showMessage('❌ 请先等待构建完成', 'error')
      return
    }

    setIsRunOutputVisible(true)
    setRunOutput('')

    try {
      setRunOutput('正在启动预览...\n')
      setIsPreviewVisible(true)
      showMessage('🔥 HMR 预览已启动', 'success')
    } catch (error: any) {
      console.error('Run error:', error)
      setRunOutput('[ERROR] ' + error.message)
      showMessage('❌ 启动失败: ' + error.message, 'error')
    }
  }, [distFiles, showMessage])

  const handleDownload = useCallback(async () => {
    if (!distFiles) {
      showMessage('❌ 没有可下载的产物，请先打包', 'error')
      return
    }

    try {
      const fileEntries = Object.entries(distFiles)
      const fileCount = fileEntries.length

      if (fileCount === 1) {
        const [path, content] = fileEntries[0]
        const filename = path.split('/').pop() || 'output.js'
        const blob = new Blob([content], { type: 'application/octet-stream' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        showMessage(`✅ 文件已下载: ${filename}`, 'success')
      } else {
        let downloaded = 0
        for (const [path, content] of fileEntries) {
          const filename = path.replace('/dist/', '')
          if (downloaded > 0) {
            await new Promise(resolve => setTimeout(resolve, 300))
          }
          const blob = new Blob([content], { type: 'application/octet-stream' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          downloaded++
          showMessage(`⏳ 下载中... (${downloaded}/${fileCount})`, 'success')
        }
        showMessage(
          `✅ 已触发 ${fileCount} 个文件下载。如果浏览器阻止了部分下载，请在地址栏允许多个下载。`,
          'success'
        )
      }
    } catch (error: any) {
      console.error('下载错误:', error)
      showMessage('❌ 下载失败: ' + error.message, 'error')
    }
  }, [distFiles, showMessage])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex-1" />
          <div className="flex-1 text-center">
            <h1 className="text-3xl font-bold">🚀 Rspack Browser Bundling</h1>
            <p className="text-sm opacity-90 mt-1">基于 Service Worker + MessagePort HMR 的浏览器端构建工具</p>
          </div>
          <div className="flex-1 text-right">
            {message && (
              <div
                className={`inline-block px-4 py-2 rounded-lg shadow-lg ${
                  message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                }`}
              >
                {message.text}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r border-gray-300 flex flex-col overflow-hidden bg-white">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">📁 项目文件</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <FileTree files={files} onFileSelect={handleFileSelect} currentFile={currentFile} />
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <MonacoEditor ref={editorRef} files={files} currentFile={currentFile} onSave={handleFileSave} />
        </div>

        <div className="w-96 border-l border-gray-300 flex flex-col overflow-hidden bg-gray-50">
          <OperationPanel
            onToggleWatch={handleToggleWatch}
            onRun={handleRun}
            onDownload={handleDownload}
            isWatchMode={isWatchMode}
            isCompiling={isCompiling}
            hmrStatus={hmrStatus}
            buildStats={buildStats}
            distFiles={distFiles}
            runOutput={runOutput}
            isRunOutputVisible={isRunOutputVisible}
          />

          {isPreviewVisible && (
            <div className="h-full border-t border-gray-300 flex flex-col min-h-0">
              <div className="p-2 border-b border-gray-200 bg-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">
                  🔥 HMR Preview {isHmrConnected && <span className="text-green-600">●</span>}
                </h3>
                <button
                  onClick={() => setIsPreviewVisible(false)}
                  className="text-gray-500 hover:text-gray-700 text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 bg-white">
                {distFiles ? (
                  <iframe
                    key={previewKey}
                    ref={previewIframeRef}
                    src="/preview/index.html"
                    className="w-full h-full border-0"
                    title="HMR Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    等待构建...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
