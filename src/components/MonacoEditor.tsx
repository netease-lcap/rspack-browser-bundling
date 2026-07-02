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
  currentFile: string | null
  files: FileSystem
  onSave: (path: string, content: string) => void
}

// 文件图标组件
function FileIcon({ filename }: { filename: string }) {
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
    <span style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {getIconSvg()}
    </span>
  )
}

// 保存按钮组件 - 与 OperationPanel 风格统一
function SaveButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
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
        padding: '8px 14px',
        borderRadius: '8px',
        border: 'none',
        fontSize: '13px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        color: 'white',
        boxShadow: isHovered && !disabled
          ? '0 6px 20px rgba(16, 185, 129, 0.45)'
          : '0 4px 14px rgba(16, 185, 129, 0.35)',
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
      <span>保存</span>
    </button>
  )
}

const MonacoEditor = forwardRef<MonacoEditorInstance | null, MonacoEditorProps>(
  ({ currentFile, files, onSave }, ref) => {
  const editorRef = useRef<any>(null)
  const [hasChanges, setHasChanges] = useState(false)
  
  // 使用 ref 保存最新的 currentFile，避免闭包问题
  const currentFileRef = useRef(currentFile)
  currentFileRef.current = currentFile

  useImperativeHandle(ref, () => editorRef.current)

  // 保存操作 - 使用 ref 获取最新值
  const performSave = useCallback(() => {
    const file = currentFileRef.current
    const editor = editorRef.current
    if (file && editor) {
      const content = editor.getValue()
      onSave(file, content)
      setHasChanges(false)
    }
  }, [onSave])

  // 编辑器挂载处理
  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor

    // 监听内容变化
    editor.onDidChangeModelContent(() => {
      setHasChanges(true)
    })

    // 添加保存快捷键 - 使用 ref 避免闭包问题
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      performSave()
    })
  }, [performSave])

  useEffect(() => {
    if (editorRef.current && currentFile) {
      const content = files[currentFile] || ''
      const editor = editorRef.current
      
      // 设置内容
      const model = editor.getModel()
      if (model) {
        model.setValue(content)
        setHasChanges(false)
      }
    }
  }, [currentFile, files])

  const handleSave = useCallback(() => {
    performSave()
  }, [performSave])

  const language = currentFile ? getFileLanguage(currentFile) : 'javascript'
  const value = currentFile ? files[currentFile] || '' : '// 点击左侧文件进行编辑...'
  const filename = currentFile ? currentFile.split('/').pop() || currentFile : null

  return (
    <div className="h-full flex flex-col">
      {/* 编辑器头部 - 美化版 */}
      <div 
        className="editor-header"
        style={{
          flexShrink: 0,
          padding: '12px 16px',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* 左侧：文件信息 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          {currentFile ? (
            <>
              <FileIcon filename={currentFile} />
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span 
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#111827',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  title={currentFile}
                >
                  {filename}
                </span>
                <span style={{ fontSize: '11px', color: '#6B7280' }}>
                  {language.toUpperCase()}
                </span>
              </div>
              {hasChanges && (
                <span 
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#F59E0B',
                    marginLeft: '4px'
                  }}
                  title="有未保存的更改"
                />
              )}
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                代码编辑器
              </span>
            </div>
          )}
        </div>

        {/* 右侧：保存按钮 */}
        {currentFile && (
          <SaveButton 
            onClick={handleSave} 
            disabled={!hasChanges}
          />
        )}
      </div>

      {/* 编辑器区域 */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          language={language}
          value={value}
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
      </div>
    </div>
  )
})

MonacoEditor.displayName = 'MonacoEditor'

export default MonacoEditor
