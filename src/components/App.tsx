import React, { useState, useCallback, useRef, useEffect } from 'react'

import FileTree from './FileTree'
import MonacoEditor from './MonacoEditor'
import OperationPanel from './OperationPanel'

import filesData from '../files.json'
import { useBundler } from '../hooks/useBundler'
import { HmrServer, HmrClient } from '../hmr/HmrServer'
import type { FileSystem } from '../types'
import type { BuildEndPayload } from '../types/hmr'

const App: React.FC = () => {
  const [files, setFiles] = useState<FileSystem>({ ...filesData })
  const [currentFile, setCurrentFile] = useState<string | null>(null)

  const [distFiles, setDistFiles] = useState<Record<string, string> | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const [isPreviewVisible, setIsPreviewVisible] = useState<boolean>(false)
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null)

  const [isHmrConnected, setIsHmrConnected] = useState<boolean>(false)
  const hmrServerRef = useRef<HmrServer | null>(null)
  const hmrClientRef = useRef<HmrClient | null>(null)

  const handleBuildEnd = useCallback((result: BuildEndPayload) => {
    const { distFiles, stats } = result;
    const { hash, isHmrUpdate } = stats

    distFilesRef.current = distFiles
    setDistFiles(distFiles)

    if (hmrServerRef.current && isHmrConnected) {
      

      if (isHmrUpdate) {
        hmrServerRef.current.sendUpdate({
          hash,
        })
      } else {
        hmrServerRef.current.notifyBuilt({
          hash,
        })
      }

    }
  }, [isHmrConnected])

  const {
    status: bundlerStatus,
    isWatchMode,
    isCompiling,
    startWatch,
    stopWatch,
    updateFile,
  } = useBundler({
    initialFiles: files,
    onBuildEnd: handleBuildEnd,
  })

  useEffect(() => {
    if (!hmrServerRef.current) {
      hmrServerRef.current = new HmrServer()
    }

    return () => {
      hmrServerRef.current?.dispose()
      hmrServerRef.current = null
    }
  }, [])

  const messagePortRef = useRef<MessagePort | null>(null)
  const distFilesRef = useRef<Record<string, string> | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const initMessagePort = () => {
      if (!navigator.serviceWorker.controller) return
      console.log('[App] Initializing MessagePort with SW controller')
      const channel = new MessageChannel()
      messagePortRef.current = channel.port1

      channel.port1.onmessage = (event) => {
        const { type, payload } = event.data
        if (type === 'GET_BUILD_FILE') {
          const filePath = payload?.path as string
          const requestId = payload?.requestId as number
          const currentDistFiles = distFilesRef.current
          if (currentDistFiles && filePath && filePath in currentDistFiles) {
            channel.port1.postMessage({
              type: 'BUILD_FILE_RESPONSE',
              payload: { requestId, content: currentDistFiles[filePath] }
            })
          }
        }
      }

      navigator.serviceWorker.controller.postMessage({ type: 'INIT_MESSAGE_PORT' }, [channel.port2])
    }

    // @ts-ignore
    navigator.serviceWorker.register(`${__APP_BASE__}sw.js`, { scope: `${__APP_BASE__}` })
      .then(async (registration) => {
        await navigator.serviceWorker.ready

        if (!navigator.serviceWorker.controller) {
          console.log('[App] Waiting for SW to take control...')
          await new Promise<void>((resolve) => {
            navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })
          })
        }

        initMessagePort()

        // SW 更新后（skipWaiting + clients.claim）会再次触发 controllerchange，
        // 此时需要向新 SW 重新发送 INIT_MESSAGE_PORT，否则新 SW 没有 messagePort 无法服务文件。
        navigator.serviceWorker.addEventListener('controllerchange', initMessagePort)
      })
      .catch((error) => {
        console.error('[App] SW registration failed:', error)
      })

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', initMessagePort)
    }
  }, [])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type } = event.data

      if (type === 'hmr-ready') {
        if (previewIframeRef.current && hmrServerRef.current) {
          // Close the previous client before creating a new one so stale
          // connections don't accumulate in HmrServer's client set.
          if (hmrClientRef.current) {
            hmrClientRef.current.close()
            hmrClientRef.current = null
          }
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

    try {
      setIsPreviewVisible(true)
      showMessage('🔥 HMR 预览已启动', 'success')
    } catch (error: any) {
      console.error('Run error:', error)
      showMessage('❌ 启动失败: ' + error.message, 'error')
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
          <MonacoEditor files={files} currentFile={currentFile} onSave={handleFileSave} />
        </div>

        <div className="w-96 border-l border-gray-300 flex flex-col overflow-hidden bg-gray-50">
          <OperationPanel
            onToggleWatch={handleToggleWatch}
            onRun={handleRun}
            isWatchMode={isWatchMode}
            isCompiling={isCompiling}
            bundlerStatus={bundlerStatus}
            distFiles={distFiles}
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
                    ref={previewIframeRef}
                    src={`${__APP_BASE__}preview/`}
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
