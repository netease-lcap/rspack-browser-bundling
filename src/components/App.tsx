import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'

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
  
  // 多标签页状态
  const [openTabs, setOpenTabs] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)
  // 记录每个标签页的未保存内容
  const [tabContents, setTabContents] = useState<Record<string, string>>({})

  const [distFiles, setDistFiles] = useState<Record<string, string> | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const [isPreviewVisible, setIsPreviewVisible] = useState<boolean>(false)
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null)

  const [isHmrConnected, setIsHmrConnected] = useState<boolean>(false)
  const hmrServerRef = useRef<HmrServer | null>(null)
  const hmrClientRef = useRef<HmrClient | null>(null)

  // 计算哪些标签有未保存的更改
  const dirtyTabs = useMemo(() => {
    return openTabs.filter(path => {
      const editedContent = tabContents[path]
      if (editedContent === undefined) return false
      const originalContent = files[path] || ''
      return editedContent !== originalContent
    })
  }, [openTabs, tabContents, files])

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

    const initMessagePort = (sw: ServiceWorker) => {
      console.log('[App] Initializing MessagePort with SW:', sw.scriptURL)
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

      sw.postMessage({ type: 'INIT_MESSAGE_PORT' }, [channel.port2])
    }

    // @ts-ignore
    navigator.serviceWorker.register(`${__APP_BASE__}sw.js`, { scope: `${__APP_BASE__}preview/` })
      .then(async (registration) => {
        // 等待 SW 激活
        await navigator.serviceWorker.ready

        // 获取 active 状态的 SW，不依赖 controller（因为当前页面可能不在 SW scope 内）
        const activeSw = registration.active
        if (activeSw) {
          console.log('[App] SW is active, initializing MessagePort directly')
          initMessagePort(activeSw)
        }

        // 监听 SW 更新
        registration.addEventListener('updatefound', () => {
          const newSw = registration.installing
          if (newSw) {
            console.log('[App] New SW found, waiting for activation...')
            newSw.addEventListener('statechange', () => {
              if (newSw.state === 'activated') {
                console.log('[App] New SW activated, re-initializing MessagePort')
                initMessagePort(newSw)
              }
            })
          }
        })
      })
      .catch((error) => {
        console.error('[App] SW registration failed:', error)
      })
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

  // 处理文件选择 - 打开或切换到标签页
  const handleFileSelect = useCallback((path: string) => {
    setOpenTabs(prev => {
      if (!prev.includes(path)) {
        return [...prev, path]
      }
      return prev
    })
    setActiveTab(path)
  }, [])

  // 处理标签页切换
  const handleTabChange = useCallback((path: string) => {
    setActiveTab(path)
  }, [])

  // 处理标签页关闭
  const handleTabClose = useCallback((path: string) => {
    setOpenTabs(prev => {
      const newTabs = prev.filter(p => p !== path)
      // 如果关闭的是当前活动标签，切换到其他标签
      if (activeTab === path) {
        const index = prev.indexOf(path)
        const newActive = newTabs.length > 0 
          ? newTabs[Math.min(index, newTabs.length - 1)] 
          : null
        setActiveTab(newActive)
      }
      return newTabs
    })
    // 清除该标签的临时内容
    setTabContents(prev => {
      const newContents = { ...prev }
      delete newContents[path]
      return newContents
    })
  }, [activeTab])

  // 处理内容变化
  const handleContentChange = useCallback((path: string, content: string) => {
    setTabContents(prev => ({
      ...prev,
      [path]: content
    }))
  }, [])

  // 保存单个文件
  const saveFile = useCallback((path: string, content: string) => {
    setFiles(prev => {
      const updated = { ...prev, [path]: content }
      updateFile(path, content)
      return updated
    })
    // 清除该标签的临时内容
    setTabContents(prev => {
      const newContents = { ...prev }
      delete newContents[path]
      return newContents
    })
  }, [updateFile])

  // 保存当前文件（Cmd+S）
  const handleSaveCurrent = useCallback(() => {
    if (activeTab) {
      const editedContent = tabContents[activeTab]
      if (editedContent !== undefined) {
        saveFile(activeTab, editedContent)
        showMessage(`✅ 已保存: ${activeTab.split('/').pop()}`, 'success')
      }
    }
  }, [activeTab, tabContents, saveFile, showMessage])

  // 保存所有文件
  const handleSaveAll = useCallback(() => {
    if (dirtyTabs.length === 0) {
      showMessage('没有需要保存的文件', 'info')
      return
    }
    
    dirtyTabs.forEach(path => {
      const content = tabContents[path]
      if (content !== undefined) {
        saveFile(path, content)
      }
    })
    
    showMessage(`✅ 已保存 ${dirtyTabs.length} 个文件`, 'success')
  }, [dirtyTabs, tabContents, saveFile, showMessage])

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

  // Toast 消息组件
  const Toast = ({ message }: { message: { text: string; type: 'success' | 'error' } | null }) => {
    if (!message) return null
    
    const isSuccess = message.type === 'success'
    
    return (
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          animation: 'slideIn 0.3s ease-out'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 18px',
            borderRadius: '10px',
            background: isSuccess 
              ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
              : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: isSuccess
              ? '0 10px 25px rgba(16, 185, 129, 0.35)'
              : '0 10px 25px rgba(239, 68, 68, 0.35)',
            minWidth: '200px'
          }}
        >
          <span style={{ fontSize: '18px' }}>
            {isSuccess ? '✓' : '✕'}
          </span>
          <span>{message.text}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      {/* Toast 消息 */}
      <Toast message={message} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧文件树 */}
        <div className="w-80 border-r border-gray-300 flex flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-hidden">
            <FileTree 
              files={files} 
              onFileSelect={handleFileSelect} 
              currentFile={activeTab} 
            />
          </div>
        </div>

        {/* 中间编辑器 */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <MonacoEditor 
            files={{ ...files, ...tabContents }}
            openTabs={openTabs}
            activeTab={activeTab}
            dirtyTabs={dirtyTabs}
            onTabChange={handleTabChange}
            onTabClose={handleTabClose}
            onSaveCurrent={handleSaveCurrent}
            onSaveAll={handleSaveAll}
            onContentChange={handleContentChange}
          />
        </div>

        {/* 右侧操作面板 */}
        <div className="w-96 border-l border-gray-300 flex flex-col overflow-hidden">
          <OperationPanel
            onToggleWatch={handleToggleWatch}
            onRun={handleRun}
            isWatchMode={isWatchMode}
            isCompiling={isCompiling}
            bundlerStatus={bundlerStatus}
            distFiles={distFiles}
          />

          {/* 预览区域 */}
          {isPreviewVisible && (
            <div 
              className="preview-container"
              style={{
                height: '50%',
                minHeight: '300px',
                borderTop: '1px solid #E5E7EB',
                display: 'flex',
                flexDirection: 'column',
                background: '#F9FAFB',
                animation: 'slideUp 0.3s ease-out'
              }}
            >
              {/* 预览工具栏 */}
              <div 
                className="preview-toolbar"
                style={{
                  padding: '12px 16px',
                  background: 'white',
                  borderBottom: '1px solid #E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div 
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px'
                    }}
                  >
                    🔥
                  </div>
                  <div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#111827'
                    }}>
                      HMR 预览
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: isHmrConnected ? '#10B981' : '#9CA3AF',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: isHmrConnected ? '#10B981' : '#9CA3AF',
                        animation: isHmrConnected ? 'pulse 2s infinite' : 'none'
                      }} />
                      {isHmrConnected ? '已连接' : '连接中...'}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      if (previewIframeRef.current) {
                        previewIframeRef.current.src = previewIframeRef.current.src
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #E5E7EB',
                      background: 'white',
                      fontSize: '12px',
                      color: '#374151',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F9FAFB'
                      e.currentTarget.style.borderColor = '#D1D5DB'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white'
                      e.currentTarget.style.borderColor = '#E5E7EB'
                    }}
                  >
                    <span>↻</span>
                    <span>刷新</span>
                  </button>
                  
                  <button
                    onClick={() => setIsPreviewVisible(false)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#F3F4F6',
                      fontSize: '14px',
                      color: '#6B7280',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#E5E7EB'
                      e.currentTarget.style.color = '#374151'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#F3F4F6'
                      e.currentTarget.style.color = '#6B7280'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              {/* iframe 容器 */}
              <div 
                className="preview-frame-container"
                style={{
                  flex: 1,
                  padding: '16px',
                  background: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* 装饰背景 */}
                <div 
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: `
                      radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.03) 0%, transparent 50%),
                      radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.03) 0%, transparent 50%)
                    `,
                    pointerEvents: 'none'
                  }}
                />
                
                {/* iframe 包装器 */}
                <div 
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
                    background: 'white',
                    position: 'relative'
                  }}
                >
                  {distFiles ? (
                    <iframe
                      ref={previewIframeRef}
                      src={`${__APP_BASE__}preview/`}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        background: 'white'
                      }}
                      title="HMR Preview"
                    />
                  ) : (
                    <div 
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: '#9CA3AF',
                        gap: '12px'
                      }}
                    >
                      <div style={{ fontSize: '32px' }}>⏳</div>
                      <div style={{ fontSize: '14px' }}>等待构建完成...</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 全局动画样式 */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  )
}

export default App
