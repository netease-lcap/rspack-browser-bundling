import React, { useState, useEffect, useRef, useCallback } from 'react'
import { WebContainer } from '@webcontainer/api'
import { Link } from 'react-router-dom'
import filesData from '../files.json'

// WebContainer FileSystemTree 类型
type FileNode = { file: { contents: string } }
type DirNode = { directory: FileSystemTree }
type FileSystemTree = Record<string, FileNode | DirNode>

// 跳过的二进制扩展名
const BINARY_EXTS = /\.(ico|png|jpg|jpeg|gif|webp|woff2?|ttf|eot|otf|tgz|tar\.gz|zip|br|gz)$/i

/**
 * 将 files.json 的扁平路径结构 { '/src/main.ts': 'content' }
 * 转换为 WebContainer 需要的嵌套 FileSystemTree
 */
function toFileSystemTree(files: Record<string, string | null>): FileSystemTree {
  const tree: FileSystemTree = {}

  for (const [fullPath, content] of Object.entries(files)) {
    if (content === null) continue

    // 去掉开头的 /
    const relative = fullPath.replace(/^\//, '')
    const parts = relative.split('/')
    if (parts.length === 0 || parts[0] === '') continue

    let node = tree
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!node[part]) {
        node[part] = { directory: {} }
      }
      node = (node[part] as DirNode).directory
    }

    const filename = parts[parts.length - 1]
    if (!filename) continue
    if (BINARY_EXTS.test(filename)) continue

    node[filename] = { file: { contents: content } }
  }

  return tree
}

const WebContainerPage: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'booting' | 'installing' | 'starting' | 'running' | 'error'>('idle')
  const [logs, setLogs] = useState<string[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const containerRef = useRef<WebContainer | null>(null)
  const logsEndRef = useRef<HTMLDivElement | null>(null)
  const startedRef = useRef(false)

  const appendLog = useCallback((text: string) => {
    setLogs(prev => [...prev, text])
  }, [])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    let instance: WebContainer | null = null

    async function start() {
      try {
        setStatus('booting')
        appendLog('▶ Booting WebContainer...')

        instance = await WebContainer.boot()
        containerRef.current = instance

        appendLog('▶ Mounting project files...')
        const tree = toFileSystemTree(filesData as Record<string, string | null>)
        await instance.mount(tree)
        appendLog(`✓ Mounted ${Object.keys(filesData).length} entries`)

        setStatus('installing')
        appendLog('\n▶ Running: pnpm install\n')

        const installProc = await instance.spawn('pnpm', ['install'])
        installProc.output.pipeTo(
          new WritableStream({ write(data) { appendLog(data) } })
        )
        const installCode = await installProc.exit
        if (installCode !== 0) {
          throw new Error(`pnpm install exited with code ${installCode}`)
        }

        setStatus('starting')
        appendLog('\n▶ Running: pnpm dev\n')

        const devProc = await instance.spawn('pnpm', ['dev'])
        devProc.output.pipeTo(
          new WritableStream({ write(data) { appendLog(data) } })
        )

        instance.on('server-ready', (_port, url) => {
          appendLog(`\n✓ Dev server ready → ${url}\n`)
          setPreviewUrl(url)
          setStatus('running')
        })
      } catch (err: any) {
        appendLog(`\n✗ Error: ${err.message}`)
        setStatus('error')
      }
    }

    start()

    return () => {
      instance?.teardown()
    }
  }, [appendLog])

  const statusColor = {
    idle: 'bg-gray-500',
    booting: 'bg-yellow-500',
    installing: 'bg-blue-500',
    starting: 'bg-blue-500',
    running: 'bg-green-500',
    error: 'bg-red-500',
  }[status]

  const statusLabel = {
    idle: 'Idle',
    booting: 'Booting…',
    installing: 'Installing…',
    starting: 'Starting…',
    running: 'Running',
    error: 'Error',
  }[status]

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-4 bg-gray-900 border-b border-gray-700 px-5 py-3">
        <Link to="/" className="text-gray-400 hover:text-white text-sm">
          ← Back
        </Link>
        <h1 className="text-white font-semibold text-base">WebContainer Preview</h1>
        <span className={`text-xs text-white px-2 py-0.5 rounded-full ${statusColor}`}>
          {statusLabel}
        </span>
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-blue-400 hover:underline"
          >
            {previewUrl} ↗
          </a>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Terminal */}
        <div className="w-1/2 flex flex-col border-r border-gray-700">
          <div className="flex-shrink-0 bg-gray-800 text-gray-400 text-xs px-4 py-1.5 border-b border-gray-700">
            Terminal
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-950 p-4 font-mono text-xs text-green-300 leading-relaxed">
            {logs.map((line, i) => (
              <span key={i} className="whitespace-pre-wrap break-all block">{line}</span>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Preview */}
        <div className="w-1/2 flex flex-col">
          <div className="flex-shrink-0 bg-gray-800 text-gray-400 text-xs px-4 py-1.5 border-b border-gray-700">
            Preview {previewUrl && <span className="text-gray-500 ml-2">{previewUrl}</span>}
          </div>
          <div className="flex-1 bg-white">
            {previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title="WebContainer Preview"
                allow="cross-origin-isolated"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <div className="text-4xl">
                  {status === 'error' ? '✗' : '⏳'}
                </div>
                <div className="text-sm">
                  {status === 'error'
                    ? '启动失败，请查看终端日志'
                    : '等待开发服务器启动…'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WebContainerPage
