import type { DistFile, BuildStats as TBuildStats } from '../types'
import BuildStats from './BuildStats'
import FileList from './FileList'

interface OperationPanelProps {
  onBundle: () => void
  onRun: () => void
  onDownload: () => void
  isBundling: boolean
  buildStats: TBuildStats | null
  distFiles: Record<string, string> | null
  buildOutput: string
  runOutput: string
  isRunOutputVisible: boolean
}

export default function OperationPanel({
  onBundle,
  onRun,
  onDownload,
  isBundling,
  buildStats,
  distFiles,
  buildOutput,
  runOutput,
  isRunOutputVisible,
}: OperationPanelProps) {
  const canRun = !!distFiles && !!buildOutput
  const canDownload = !!distFiles
  
  const distFilesList: DistFile[] = distFiles
    ? Object.entries(distFiles).map(([path, content]) => ({
        path,
        content,
        size: new Blob([content]).size,
      }))
    : []
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 标题栏 */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-800">⚙️ 操作面板</h2>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-3">
          {/* 操作按钮 */}
          <div className="space-y-2">
            <button
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onBundle}
              disabled={isBundling}
            >
              {isBundling ? '⏳ 打包中...' : '🔨 打包代码'}
            </button>
            <button
              className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onRun}
              disabled={!canRun}
            >
              ▶️ 运行打包结果
            </button>
            <button
              className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onDownload}
              disabled={!canDownload}
            >
              💾 下载产物
            </button>
          </div>

          {/* 构建统计 */}
          {buildStats && (
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">📊 打包统计</h3>
              <BuildStats stats={buildStats} />
            </div>
          )}

          {/* 文件列表 */}
          {distFilesList.length > 0 && (
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">📦 产物文件</h3>
              <FileList
                files={distFilesList}
                onView={(path) => {
                  const content = distFiles?.[path] || ''
                  console.log('查看文件:', path)
                }}
                onDownload={(path) => {
                  const content = distFiles?.[path] || ''
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
                }}
              />
            </div>
          )}

          {/* 打包输出 */}
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">📋 打包输出</h3>
            <div className="output-content" style={{ fontSize: '11px' }}>
              {buildOutput || '等待打包...'}
            </div>
          </div>

          {/* 运行输出 */}
          {isRunOutputVisible && (
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">🖥️ 运行输出</h3>
              <div className="output-content" style={{ fontSize: '11px' }}>
                {runOutput}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
