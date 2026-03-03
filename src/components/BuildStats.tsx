import type { BuildStats as BuildStatsType } from '../types'
import { formatBytes } from '../utils/helpers'

interface BuildStatsProps {
  stats: BuildStatsType | null
}

export default function BuildStats({ stats }: BuildStatsProps) {
  if (!stats) return null

  return (
    <div className="space-y-2">
      <div className="stat-card">
        <div className="stat-label">⏱️ 构建时间</div>
        <div className="stat-value">{stats.buildTime} ms</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">📦 产物大小</div>
        <div className="stat-value">{formatBytes(stats.outputSize)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">📄 模块数量</div>
        <div className="stat-value">{stats.moduleCount}</div>
      </div>
    </div>
  )
}
