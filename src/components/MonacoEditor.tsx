import { useRef, useEffect, forwardRef, useImperativeHandle, useState, useCallback } from 'react'
import Editor, { loader } from '@monaco-editor/react'
import type { FileSystem, MonacoEditorInstance } from '../types'
import { getFileLanguage, getFileIconType } from '../utils/helpers'

// 配置 Monaco Editor 从 CDN 加载
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'
  }
})

interface MonacoEditorProps {
  files: FileSystem
  openTabs: string[]
  activeTab: string | null
  dirtyTabs: string[]  // 有未保存更改的标签
  onTabChange: (path: string) => void
  onTabClose: (path: string) => void
  onSaveCurrent: () => void
  onSaveAll: () => void
  onContentChange: (path: string, content: string) => void
}

// 文件图标组件
function FileIcon({ filename, size = 16 }: { filename: string; size?: number }) {
  const iconType = getFileIconType(filename)
  
  const getIconSvg = () => {
    switch (iconType) {
      case 'javascript':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="4" fill="#F7DF1E"/>
            <path d="M6 18.5c.5.8 1.2 1.4 2.2 1.4 1.4 0 1.8-.8 1.8-2v-7h2v7c0 2.2-1.2 3.6-3.8 3.6-1.8 0-3-.8-3.6-2l1.4-1zm7.6.2c.6.8 1.4 1.4 2.6 1.4 1.6 0 2.4-.8 2.4-1.8 0-1.2-.8-1.6-2.4-2.2-1.8-.6-3-1.4-3-3.2 0-1.8 1.4-3.2 3.8-3.2 1.6 0 2.8.6 3.6 1.6l-1.4 1.2c-.6-.8-1.2-1.2-2.2-1.2-1.2 0-1.8.6-1.8 1.4 0 1 .6 1.4 2.2 2 1.8.6 3.2 1.4 3.2 3.4 0 2-1.6 3.4-4 3.4-1.8 0-3.2-.6-4.2-1.8l1.2-1z" fill="#323330"/>
          </svg>
        )
      case 'typescript':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="4" fill="#3178C6"/>
            <path d="M4 12V9h8v3H4zm0 3h5v3H4v-3zm13.5 3c.8 0 1.5-.2 2-.6l1 1.2c-.8.7-1.8 1-3 1-2.3 0-4-1.3-4-3.5 0-2 1.5-3.5 3.8-3.5 2 0 3.2 1.4 3.2 3.4v.8h-5c.2 1 .8 1.6 2 1.6.8 0 1.4-.3 1.8-.8l1 1c-.6.8-1.6 1.2-2.8 1.2-2.2 0-4-1.3-4-3.5 0-2 1.6-3.5 3.8-3.5 1.8 0 3.2 1.2 3.2 3.2H17c0 1.2.6 1.8 1.5 1.8z" fill="white"/>
          </svg>
        )
      case 'vue':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 19h20L12 2z" fill="#41B883"/>
            <path d="M12 6L6 16h12L12 6z" fill="#34495E"/>
          </svg>
        )
      case 'css':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 2l2 18 6 2 6-2 2-18H4z" fill="#264DE4"/>
            <path d="M12 20l4.5-1.2L18 4H6l.5 4.5h9L15 10H7l.5 4.5h8L15 17.5 12 18.5V20z" fill="white"/>
          </svg>
        )
      case 'html':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 2l2 18 6 2 6-2 2-18H4z" fill="#E34F26"/>
            <path d="M12 20l4.5-1.2L18 4H6l.5 4.5h9L15 10H7l.5 4.5h8L15 17.5 12 18.5V20z" fill="white"/>
          </svg>
        )
      case 'json':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="4" fill="#F1C40F"/>
            <path d="M6 8c0-1 .5-1.5 1.5-1.5S9 7 9 8v8c0 1-.5 1.5-1.5 1.5S6 17 6 16V8zm12 0c0-1-.5-1.5-1.5-1.5S15 7 15 8v8c0 1 .5 1.5 1.5 1.5S18 17 18 16V8z" fill="#333"/>
          </svg>
        )
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4c0-1 1-2 2-2h8l6 6v12c0 1-1 2-2 2H6c-1 0-2-1-2-2V4z" fill="#9CA3AF"/>
            <path d="M14 2v6h6" fill="#D1D5DB"/>
          </svg>
        )
    }
  }
  
  return (
    <span style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {getIconSvg()}
    </span>
  )
}

// 标签页组件
function TabItem({ 
  path, 
  isActive, 
  isDirty,
  onClick, 
  onClose 
}: { 
  path: string
  isActive: boolean
  isDirty: boolean
  onClick: () => void
  onClose: (e: React.MouseEvent) => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  const filename = path.split('/').pop() || path
  
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        minWidth: '120px',
        maxWidth: '200px',
        height: '36px',
        background: isActive 
          ? 'linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)'
          : 'transparent',
        borderBottom: isActive ? '2px solid #3B82F6' : '2px solid transparent',
        borderRight: '1px solid #E5E7EB',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        position: 'relative',
        userSelect: 'none'
      }}
    >
      <FileIcon filename={path} size={14} />
      
      <span 
        style={{
          flex: 1,
          fontSize: '12px',
          fontWeight: isActive ? 600 : 400,
          color: isActive ? '#111827' : '#6B7280',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {filename}
      </span>
      
      {isDirty && (
        <span 
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#F59E0B',
            flexShrink: 0
          }}
        />
      )}
      
      <button
        onClick={onClose}
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '4px',
          border: 'none',
          background: isHovered ? '#E5E7EB' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          color: '#6B7280',
          cursor: 'pointer',
          opacity: isHovered || isDirty ? 1 : 0.6,
          transition: 'all 0.15s ease',
          flexShrink: 0,
          padding: 0
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#DC2626'
          e.currentTarget.style.color = 'white'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isHovered ? '#E5E7EB' : 'transparent'
          e.currentTarget.style.color = '#6B7280'
        }}
      >
        {isDirty && !isHovered ? '●' : '×'}
      </button>
    </div>
  )
}

// 保存所有按钮组件
function SaveAllButton({ onClick, disabled, count }: { onClick: () => void; disabled?: boolean; count: number }) {
  const [isHovered, setIsHovered] = useState(false)
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '6px',
        border: 'none',
        fontSize: '12px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        background: disabled 
          ? '#F3F4F6' 
          : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        color: disabled ? '#9CA3AF' : 'white',
        boxShadow: isHovered && !disabled
          ? '0 4px 12px rgba(16, 185, 129, 0.4)'
          : disabled ? 'none' : '0 2px 8px rgba(16, 185, 129, 0.3)',
        opacity: disabled ? 0.6 : 1,
        transform: isHovered && !disabled ? 'translateY(-1px)' : 'translateY(0)'
      }}
    >
      <svg 
        width="14" 
        height="14" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
      <span>保存全部</span>
      {count > 0 && (
        <span style={{
          background: 'rgba(255,255,255,0.3)',
          borderRadius: '10px',
          padding: '1px 6px',
          fontSize: '11px',
          fontWeight: 700
        }}>
          {count}
        </span>
      )}
    </button>
  )
}

const MonacoEditor = forwardRef<MonacoEditorInstance | null, MonacoEditorProps>(
  ({ 
    files, 
    openTabs, 
    activeTab,
    dirtyTabs,
    onTabChange, 
    onTabClose, 
    onSaveCurrent, 
    onSaveAll,
    onContentChange 
  }, ref) => {
  const editorRef = useRef<any>(null)
  const [editorContent, setEditorContent] = useState<string>('')
  
  // 使用 ref 保存最新的 activeTab、files 和回调函数，避免闭包问题
  const activeTabRef = useRef(activeTab)
  const filesRef = useRef(files)
  const onSaveCurrentRef = useRef(onSaveCurrent)
  const onContentChangeRef = useRef(onContentChange)
  
  // 同步 ref 值
  activeTabRef.current = activeTab
  filesRef.current = files
  onSaveCurrentRef.current = onSaveCurrent
  onContentChangeRef.current = onContentChange

  useImperativeHandle(ref, () => editorRef.current)

  // 编辑器挂载处理 - 只执行一次
  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor

    // 监听内容变化 - 使用 ref 获取最新回调
    editor.onDidChangeModelContent(() => {
      const content = editor.getValue()
      setEditorContent(content)
      const currentTab = activeTabRef.current
      if (currentTab) {
        onContentChangeRef.current(currentTab, content)
      }
    })

    // 添加保存快捷键 - 使用 ref 获取最新回调
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSaveCurrentRef.current()
    })
  }, []) // 空依赖数组，只在挂载时执行

  // 当活动标签变化时，更新编辑器内容
  // 关键修复：只监听 activeTab，不监听 files，避免 files 变化导致编辑器重置
  useEffect(() => {
    if (editorRef.current && activeTab) {
      // 使用 ref 获取最新的 files 内容
      const content = filesRef.current[activeTab] || ''
      const editor = editorRef.current
      
      // 设置内容
      const model = editor.getModel()
      if (model) {
        model.setValue(content)
        setEditorContent(content)
      }
    }
  }, [activeTab]) // 注意：这里只依赖 activeTab，不依赖 files

  const language = activeTab ? getFileLanguage(activeTab) : 'javascript'
  
  // 计算未保存的文件数量
  const dirtyCount = dirtyTabs.length
  const hasDirtyTabs = dirtyCount > 0
  const hasOpenTabs = openTabs.length > 0

  return (
    <div className="h-full flex flex-col">
      {/* 标签栏 */}
      {hasOpenTabs && (
        <div 
          className="tabs-bar"
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            background: 'linear-gradient(180deg, #F9FAFB 0%, #F3F4F6 100%)',
            borderBottom: '1px solid #E5E7EB',
            overflowX: 'auto',
            overflowY: 'hidden'
          }}
        >
          <div style={{ display: 'flex', flex: 1, minWidth: 0 }}>
            {openTabs.map(path => (
              <TabItem
                key={path}
                path={path}
                isActive={path === activeTab}
                isDirty={dirtyTabs.includes(path)}
                onClick={() => onTabChange(path)}
                onClose={(e) => {
                  e.stopPropagation()
                  onTabClose(path)
                }}
              />
            ))}
          </div>
          
          {/* 保存全部按钮 */}
          <div style={{ 
            padding: '0 12px', 
            borderLeft: '1px solid #E5E7EB',
            background: 'linear-gradient(180deg, #F9FAFB 0%, #F3F4F6 100%)'
          }}>
            <SaveAllButton 
              onClick={onSaveAll}
              disabled={!hasDirtyTabs}
              count={dirtyCount}
            />
          </div>
        </div>
      )}
      
      {/* 编辑器头部（当没有标签页时显示） */}
      {!hasOpenTabs && (
        <div 
          className="editor-header"
          style={{
            flexShrink: 0,
            padding: '12px 16px',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <div 
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#6B7280' }}>
            代码编辑器 - 点击左侧文件打开
          </span>
        </div>
      )}

      {/* 编辑器区域 */}
      <div className="flex-1 overflow-hidden">
        {activeTab ? (
          <Editor
            height="100%"
            defaultLanguage="javascript"
            language={language}
            value={files[activeTab] || ''}
            theme="vs-dark"
            onMount={handleEditorDidMount}
            options={{
              fontSize: 14,
              minimap: { enabled: true },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              renderWhitespace: 'selection',
              tabSize: 2,
              insertSpaces: true,
              formatOnPaste: true,
              formatOnType: true,
            }}
          />
        ) : (
          <div 
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              background: '#1E1E1E',
              color: '#6B7280',
              gap: '16px'
            }}
          >
            <div style={{ fontSize: '48px', opacity: 0.5 }}>📄</div>
            <div style={{ fontSize: '14px' }}>点击左侧文件树中的文件以打开</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>支持多文件标签页编辑</div>
          </div>
        )}
      </div>
    </div>
  )
})

MonacoEditor.displayName = 'MonacoEditor'

export default MonacoEditor
