import type { DistFile, BuildStats as TBuildStats } from '../types'
import type { HMRStatus } from '../types/hmr'
import BuildStats from './BuildStats'
import FileList from './FileList'

interface OperationPanelProps {
  onToggleWatch: () => void
  onRun: () => void
  onDownload: () => void
  isWatchMode: boolean
  isCompiling: boolean
  hmrStatus: HMRStatus
  buildStats: TBuildStats | null
  distFiles: Record<string, string> | null
  runOutput: string
  isRunOutputVisible: boolean
}

export default function OperationPanel({
  onToggleWatch,
  onRun,
  onDownload,
  isWatchMode,
  isCompiling,
  hmrStatus,
  buildStats,
  distFiles,
  runOutput,
  isRunOutputVisible,
}: OperationPanelProps) {
  const canRun = !!distFiles
  const canDownload = !!distFiles

  const getStatusText = () => {
    switch (hmrStatus) {
      case 'idle':
        return isWatchMode ? '就绪' : '未启动'
      case 'building':
        return '编译中...'
      case 'hmr-updating':
        return '热更新中...'
      case 'hmr-applied':
        return '已更新'
      case 'error':
        return '错误'
      default:
        return '未知'
    }
  }

  const getStatusColor = () => {
    switch (hmrStatus) {
      case 'idle':
        return isWatchMode ? 'text-green-600' : 'text-gray-500'
      case 'building':
        return 'text-blue-600'
      case 'hmr-updating':
        return 'text-yellow-600'
      case 'hmr-applied':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-500'
    }
  }

  const distFilesList: DistFile[] = distFiles
    ? Object.entries(distFiles).map(([path, content]) => ({
        path,
        content,
        size: new Blob([content]).size,
      }))
    : []

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 标题栏 */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-800">⚙️ 操作面板</h2>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-3">
          {/* Watch 状态 */}
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">👁️ Watch 状态</h3>
              <span className={`text-xs font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
            <button
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                isWatchMode
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              onClick={onToggleWatch}
              disabled={isCompiling}
            >
              {isCompiling
                ? '⏳ 编译中...'
                : isWatchMode
                ? '⏹️ 停止 Watch'
                : '▶️ 启动 Watch'}
            </button>
          </div>

          {/* 操作按钮 */}
          <div className="space-y-2">
            <button
              className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onRun}
              disabled={!canRun}
            >
              ▶️ 运行预览
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
