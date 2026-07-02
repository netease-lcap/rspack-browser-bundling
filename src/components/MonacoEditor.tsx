import { useRef, useEffect, forwardRef, useImperativeHandle, useState, useCallback } from 'react'
import Editor, { loader } from '@monaco-editor/react'
import type { FileSystem, MonacoEditorInstance } from '../types'
import { getFileLanguage } from '../utils/helpers'
import { TabItem, SaveAllButton } from './ui'

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
  dirtyTabs: string[]
  onTabChange: (path: string) => void
  onTabClose: (path: string) => void
  onSaveCurrent: () => void
  onSaveAll: () => void
  onContentChange: (path: string, content: string) => void
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
  
  // 使用 ref 保存最新的值，避免闭包问题
  const activeTabRef = useRef(activeTab)
  const filesRef = useRef(files)
  const onSaveCurrentRef = useRef(onSaveCurrent)
  const onContentChangeRef = useRef(onContentChange)
  
  activeTabRef.current = activeTab
  filesRef.current = files
  onSaveCurrentRef.current = onSaveCurrent
  onContentChangeRef.current = onContentChange

  useImperativeHandle(ref, () => editorRef.current)

  // 编辑器挂载处理 - 只执行一次
  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor

    editor.onDidChangeModelContent(() => {
      const content = editor.getValue()
      setEditorContent(content)
      const currentTab = activeTabRef.current
      if (currentTab) {
        onContentChangeRef.current(currentTab, content)
      }
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSaveCurrentRef.current()
    })
  }, [])

  // 当活动标签变化时，更新编辑器内容
  useEffect(() => {
    if (editorRef.current && activeTab) {
      const content = filesRef.current[activeTab] || ''
      const editor = editorRef.current
      const model = editor.getModel()
      if (model) {
        model.setValue(content)
        setEditorContent(content)
      }
    }
  }, [activeTab])

  const language = activeTab ? getFileLanguage(activeTab) : 'javascript'
  const dirtyCount = dirtyTabs.length
  const hasDirtyTabs = dirtyCount > 0
  const hasOpenTabs = openTabs.length > 0

  return (
    <div className="monaco-editor-container">
      {hasOpenTabs && (
        <div className="tabs-bar">
          <div className="tabs-list">
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
          
          <div className="tabs-actions">
            <SaveAllButton 
              onClick={onSaveAll}
              disabled={!hasDirtyTabs}
              count={dirtyCount}
            />
          </div>
        </div>
      )}
      
      {!hasOpenTabs && (
        <div className="editor-header-empty">
          <div className="editor-header-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <span className="editor-header-text">代码编辑器 - 点击左侧文件打开</span>
        </div>
      )}

      <div className="editor-content">
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
          <div className="editor-empty-state">
            <div className="editor-empty-icon">📄</div>
            <div className="editor-empty-title">点击左侧文件树中的文件以打开</div>
            <div className="editor-empty-subtitle">支持多文件标签页编辑</div>
          </div>
        )}
      </div>
    </div>
  )
})

MonacoEditor.displayName = 'MonacoEditor'

export default MonacoEditor
