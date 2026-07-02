import { useState } from 'react'
import { FileIcon } from './FileIcon'

interface TabItemProps {
  path: string
  isActive: boolean
  isDirty: boolean
  onClick: () => void
  onClose: (e: React.MouseEvent) => void
}

export function TabItem({ path, isActive, isDirty, onClick, onClose }: TabItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const filename = path.split('/').pop() || path
  
  return (
    <div
      className={`tab-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <FileIcon filename={path} size={14} />
      
      <span className="tab-item-filename">
        {filename}
      </span>
      
      {isDirty && <span className="tab-item-dirty-indicator" />}
      
      <button
        className={`tab-item-close ${isHovered ? 'hovered' : ''}`}
        onClick={onClose}
      >
        {isDirty && !isHovered ? '●' : '×'}
      </button>
    </div>
  )
}
