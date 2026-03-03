import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import Editor, { loader } from '@monaco-editor/react'
import type { FileSystem, MonacoEditorInstance } from '../types'
import { getFileLanguage } from '../utils/helpers'

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

const MonacoEditor = forwardRef<MonacoEditorInstance | null, MonacoEditorProps>(
  ({ currentFile, files, onSave }, ref) => {
  const editorRef = useRef<any>(null)

  useImperativeHandle(ref, () => editorRef.current)

  function handleEditorDidMount(editor: any, monaco: any) {
    editorRef.current = editor

    // 添加保存快捷键
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (currentFile) {
        const content = editor.getValue()
        onSave(currentFile, content)
      }
    })
  }

  useEffect(() => {
    if (editorRef.current && currentFile) {
      const content = files[currentFile] || ''
      const editor = editorRef.current
      
      // 设置内容
      const model = editor.getModel()
      if (model) {
        model.setValue(content)
      }
    }
  }, [currentFile, files])

  const language = currentFile ? getFileLanguage(currentFile) : 'javascript'
  const value = currentFile ? files[currentFile] || '' : '// 点击左侧文件进行编辑...'

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 px-4 py-2 bg-white border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          💻 {currentFile || '代码编辑器'}
        </h2>
        {currentFile && (
          <button
            className="btn-secondary text-xs"
            onClick={() => {
              if (editorRef.current && currentFile) {
                const content = editorRef.current.getValue()
                onSave(currentFile, content)
              }
            }}
          >
            💾 保存
          </button>
        )}
      </div>
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
