import { useState } from 'react'

interface SaveAllButtonProps {
  onClick: () => void
  disabled?: boolean
  count: number
}

export function SaveAllButton({ onClick, disabled, count }: SaveAllButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  return (
    <button
      className={`save-all-button ${disabled ? 'disabled' : ''} ${isHovered ? 'hovered' : ''}`}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
      {count > 0 && <span className="save-all-count">{count}</span>}
    </button>
  )
}
