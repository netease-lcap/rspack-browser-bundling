import type { DistFile } from '../types'
import { getFileIcon, formatBytes } from '../utils/helpers'

interface FileListProps {
  files: DistFile[]
  onView: (path: string) => void
  onDownload: (path: string) => void
}

export default function FileList({ files, onView, onDownload }: FileListProps) {
  if (files.length === 0) return null

  return (
    <div className="bg-white rounded max-h-60 overflow-y-auto">
      {files.map(file => {
        const filename = file.path.replace('/dist/', '')
        return (
          <div
            key={file.path}
            className="flex items-center justify-between p-2 border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm">{getFileIcon(filename)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono truncate text-gray-800">{filename}</div>
                <div className="text-2xs text-gray-500">{formatBytes(file.size)}</div>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button
                className="px-2 py-1 text-2xs bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                onClick={() => onView(file.path)}
              >
                👁️ 查看
              </button>
              <button
                className="px-2 py-1 text-2xs bg-purple-500 hover:bg-purple-600 text-white rounded transition-colors"
                onClick={() => onDownload(file.path)}
              >
                💾 下载
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
