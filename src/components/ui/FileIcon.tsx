import { getFileIconType } from '../../utils/helpers'

interface FileIconProps {
  filename: string
  size?: number
}

export function FileIcon({ filename, size = 16 }: FileIconProps) {
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
    <span 
      className="file-icon" 
      style={{ width: size, height: size }}
    >
      {getIconSvg()}
    </span>
  )
}
