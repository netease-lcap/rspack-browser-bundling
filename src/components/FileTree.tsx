import { useState, useCallback, useMemo } from 'react'
import type { FileTreeNode, FileMetadata, FileSystem, FileIconType, FolderIconType } from '../types'
import { getFileIconType, getFolderIconType } from '../utils/helpers'

interface FileTreeProps {
  files: FileSystem
  currentFile: string | null
  onFileSelect: (path: string) => void
}

interface TreeItem {
  name: string
  path: string
  isFile: boolean
  fileData?: FileMetadata
  children?: TreeItem[]
  iconType?: FileIconType | FolderIconType
}

interface RenderTreeProps {
  items: TreeItem[]
  level: number
  collapsedFolders: Set<string>
  onToggleFolder: (path: string) => void
  onFileSelect: (path: string) => void
  currentFile: string | null
}

// VSCode 风格的排序：文件夹优先，然后按不区分大小写的字母顺序排序，数字在字母之后
function sortTreeItems(items: TreeItem[]): TreeItem[] {
  return items.sort((a, b) => {
    // 文件夹优先
    if (a.isFile !== b.isFile) {
      return a.isFile ? 1 : -1
    }
    
    // VSCode 排序规则：
    // 1. 不区分大小写
    // 2. 数字在字母之后
    // 3. 特殊字符优先于字母
    const nameA = a.name.toLowerCase()
    const nameB = b.name.toLowerCase()
    
    // 使用 localeCompare 进行自然排序
    return nameA.localeCompare(nameB, undefined, {
      numeric: false,
      sensitivity: 'base',
      caseFirst: 'false'
    })
  })
}

// 获取文件/文件夹的排序键（用于更精确的排序）
function getSortKey(name: string, isFile: boolean): string {
  const lowerName = name.toLowerCase()
  // 文件夹前缀确保文件夹排在前面
  const typePrefix = isFile ? '1' : '0'
  // 处理数字：在 VSCode 中，纯数字开头的文件名会排在字母之后
  // 这里我们使用一个简单的策略：保持原有顺序但统一大小写
  return typePrefix + lowerName
}

// 将 FileTreeNode 转换为 TreeItem 数组并排序
function buildSortedTreeItems(tree: FileTreeNode, parentPath: string = ''): TreeItem[] {
  const items: TreeItem[] = []

  Object.keys(tree).forEach(key => {
    if (key.startsWith('__')) return

    const item = tree[key]
    const isFile = (item as FileMetadata).__isFile
    const currentPath = parentPath ? `${parentPath}/${key}` : key

    if (isFile) {
      items.push({
        name: key,
        path: currentPath,
        isFile: true,
        iconType: getFileIconType(key),
        fileData: item as FileMetadata
      })
    } else {
      const children = buildSortedTreeItems(item as FileTreeNode, currentPath)
      items.push({
        name: key,
        path: currentPath,
        isFile: false,
        iconType: getFolderIconType(key),
        children: sortTreeItems(children)
      })
    }
  })

  return sortTreeItems(items)
}

// 文件图标组件
function FileIcon({ type, filename }: { type: FileIconType; filename?: string }) {
  // 使用 SVG 图标替代 emoji，更接近 VSCode 风格
  const getIconSvg = () => {
    switch (type) {
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
      case 'react':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="2" fill="#61DAFB"/>
            <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61DAFB" strokeWidth="1" fill="none" transform="rotate(0 12 12)"/>
            <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61DAFB" strokeWidth="1" fill="none" transform="rotate(60 12 12)"/>
            <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61DAFB" strokeWidth="1" fill="none" transform="rotate(120 12 12)"/>
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
      case 'scss':
      case 'sass':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" fill="#CC6699"/>
            <path d="M18.5 14.5c-.5-.3-1-.4-1.5-.2-.2.1-.4.3-.5.5-.3.5-.2 1 .2 1.4.4.4 1 .5 1.5.3.3-.1.5-.3.6-.6.2-.5 0-1-.3-1.4zM8 10c-1.5.5-2.5 1.5-3 3-.3 1-.2 2 .5 2.8.5.5 1.2.8 2 .7 1-.1 1.8-.8 2.2-1.7.3-.8.2-1.7-.3-2.4-.5-.7-1.3-1.1-2.2-1.1-.4 0-.8.1-1.2.2z" fill="white"/>
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
            <text x="12" y="16" textAnchor="middle" fill="#333" fontSize="8" fontWeight="bold">{}</text>
          </svg>
        )
      case 'markdown':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="4" fill="#083FA1"/>
            <path d="M6 7v10h2v-5l2 3 2-3v5h2V7h-2l-2 3-2-3H6zm10 0v6h-2v2h6v-2h-2V7h-2z" fill="white"/>
          </svg>
        )
      case 'npm':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="4" fill="#CB3837"/>
            <path d="M4 8h16v8h-8v-4H8v4H4V8z" fill="white"/>
          </svg>
        )
      case 'git':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#F05032"/>
            <path d="M15.5 11.5c-.8 0-1.5.3-2 .8l-2.3-1.5c.1-.3.2-.6.2-1 0-.2 0-.3-.1-.5l2.4-2c.5.4 1.1.7 1.8.7 1.4 0 2.5-1.1 2.5-2.5S16.9 3 15.5 3 13 4.1 13 5.5c0 .2 0 .3.1.5l-2.4 2c-.5-.4-1.1-.7-1.8-.7-1.4 0-2.5 1.1-2.5 2.5s1.1 2.5 2.5 2.5c.8 0 1.5-.4 2-.8l2.3 1.5c-.1.3-.1.6-.1 1 0 .2 0 .4.1.5l-2.4 2c-.5-.4-1.1-.7-1.8-.7-1.4 0-2.5 1.1-2.5 2.5s1.1 2.5 2.5 2.5 2.5-1.1 2.5-2.5c0-.2 0-.4-.1-.5l2.4-2c.5.4 1.1.7 1.8.7 1.4 0 2.5-1.1 2.5-2.5s-1.1-2.5-2.5-2.5z" fill="white"/>
          </svg>
        )
      case 'config':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3" fill="#6B7280"/>
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )
      case 'image':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="2" fill="#8B5CF6"/>
            <circle cx="8" cy="8" r="2" fill="white"/>
            <path d="M3 15l5-5 4 4 5-5 4 4v4c0 1-1 2-2 2H5c-1 0-2-1-2-2v-2z" fill="white"/>
          </svg>
        )
      case 'archive':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="2" width="18" height="20" rx="2" fill="#F59E0B"/>
            <path d="M8 2v4M16 2v4M8 10h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )
      case 'log':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="2" width="18" height="20" rx="2" fill="#6B7280"/>
            <path d="M7 7h10M7 12h10M7 17h6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
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
    <span className="file-icon-svg">
      {getIconSvg()}
    </span>
  )
}

// 文件夹图标组件
function FolderIcon({ type, isOpen }: { type: FolderIconType; isOpen: boolean }) {
  const getIconSvg = () => {
    const folderColor = isOpen ? '#FCD34D' : '#F59E0B'
    
    switch (type) {
      case 'folder-src':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 6c0-1 1-2 2-2h5l2 2h9c1 0 2 1 2 2v10c0 1-1 2-2 2H4c-1 0-2-1-2-2V6z" fill="#60A5FA"/>
            <path d="M9 11l3 3 3-3M12 14V8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )
      case 'folder-components':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 6c0-1 1-2 2-2h5l2 2h9c1 0 2 1 2 2v10c0 1-1 2-2 2H4c-1 0-2-1-2-2V6z" fill="#A78BFA"/>
            <rect x="8" y="10" width="8" height="6" rx="1" stroke="white" strokeWidth="1.5" fill="none"/>
            <path d="M8 13h8" stroke="white" strokeWidth="1.5"/>
          </svg>
        )
      case 'folder-assets':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 6c0-1 1-2 2-2h5l2 2h9c1 0 2 1 2 2v10c0 1-1 2-2 2H4c-1 0-2-1-2-2V6z" fill="#34D399"/>
            <circle cx="9" cy="11" r="1.5" fill="white"/>
            <path d="M8 16l3-3 2 2 3-3 2 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )
      case 'folder-dist':
      case 'folder-build':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 6c0-1 1-2 2-2h5l2 2h9c1 0 2 1 2 2v10c0 1-1 2-2 2H4c-1 0-2-1-2-2V6z" fill="#F87171"/>
            <path d="M8 12l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )
      case 'folder-node':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 6c0-1 1-2 2-2h5l2 2h9c1 0 2 1 2 2v10c0 1-1 2-2 2H4c-1 0-2-1-2-2V6z" fill="#10B981"/>
            <text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">npm</text>
          </svg>
        )
      case 'folder-test':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 6c0-1 1-2 2-2h5l2 2h9c1 0 2 1 2 2v10c0 1-1 2-2 2H4c-1 0-2-1-2-2V6z" fill="#FBBF24"/>
            <path d="M12 9v6M9 12h6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )
      case 'folder-config':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 6c0-1 1-2 2-2h5l2 2h9c1 0 2 1 2 2v10c0 1-1 2-2 2H4c-1 0-2-1-2-2V6z" fill="#9CA3AF"/>
            <circle cx="12" cy="12" r="2" fill="white"/>
            <path d="M12 6v2M12 16v2M6 12h2M16 12h2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )
      case 'folder-public':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 6c0-1 1-2 2-2h5l2 2h9c1 0 2 1 2 2v10c0 1-1 2-2 2H4c-1 0-2-1-2-2V6z" fill="#3B82F6"/>
            <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="1.5" fill="none"/>
            <path d="M12 9V6M12 15v3M9 12H6M15 12h3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 6c0-1 1-2 2-2h5l2 2h9c1 0 2 1 2 2v10c0 1-1 2-2 2H4c-1 0-2-1-2-2V6z" fill={folderColor}/>
          </svg>
        )
    }
  }
  
  return (
    <span className="folder-icon-svg">
      {getIconSvg()}
    </span>
  )
}

function RenderTree({
  items,
  level,
  collapsedFolders,
  onToggleFolder,
  onFileSelect,
  currentFile
}: RenderTreeProps) {
  return (
    <>
      {items.map(item => {
        const isCollapsed = collapsedFolders.has(item.path)
        const isActive = item.isFile && item.fileData?.__path === currentFile

        if (item.isFile) {
          return (
            <li
              key={item.path}
              className={`file-tree-item ${isActive ? 'active' : ''}`}
              style={{ paddingLeft: `${level * 16 + 8}px` }}
              onClick={() => onFileSelect(item.fileData!.__path)}
              title={item.name}
            >
              <FileIcon type={(item.iconType as FileIconType) || 'default'} filename={item.name} />
              <span className="file-name">{item.name}</span>
            </li>
          )
        }

        return (
          <li key={item.path}>
            <div
              className="folder-tree-item"
              style={{ paddingLeft: `${level * 16 + 8}px` }}
              onClick={() => onToggleFolder(item.path)}
              title={item.name}
            >
              <span className="collapse-icon">
                <svg 
                  width="10" 
                  height="10" 
                  viewBox="0 0 10 10" 
                  fill="none"
                  style={{ 
                    transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <path
                    d="M3 2L6 5L3 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <FolderIcon type={(item.iconType as FolderIconType) || 'folder'} isOpen={!isCollapsed} />
              <span className="folder-name">{item.name}</span>
            </div>
            {!isCollapsed && item.children && (
              <ul className="folder-children">
                <RenderTree
                  items={item.children}
                  level={level + 1}
                  collapsedFolders={collapsedFolders}
                  onToggleFolder={onToggleFolder}
                  onFileSelect={onFileSelect}
                  currentFile={currentFile}
                />
              </ul>
            )}
          </li>
        )
      })}
    </>
  )
}

export default function FileTree({ files, currentFile, onFileSelect }: FileTreeProps) {
  // 构建文件树
  const buildTree = useCallback((fileSystem: FileSystem): FileTreeNode => {
    const tree: FileTreeNode = {}
    Object.keys(fileSystem)
      .filter(path => !path.includes('node_modules') && !path.includes('lcap_modules'))
      .forEach(path => {
        const parts = path.split('/').filter(p => p)
        let current: any = tree
        parts.forEach((part, index) => {
          if (!current[part]) {
            current[part] = index === parts.length - 1
              ? { __isFile: true, __path: path }
              : {}
          }
          if (!current[part].__isFile) {
            current = current[part]
          }
        })
      })
    return tree
  }, [])

  // 收集所有文件夹路径
  const getAllFolderPaths = useCallback((tree: FileTreeNode, parentPath = ''): string[] => {
    const folders: string[] = []
    Object.keys(tree).forEach(key => {
      if (key.startsWith('__')) return
      const item = tree[key]
      const isFile = (item as FileMetadata).__isFile
      if (!isFile) {
        const currentPath = parentPath ? `${parentPath}/${key}` : key
        folders.push(currentPath)
        folders.push(...getAllFolderPaths(item as FileTreeNode, currentPath))
      }
    })
    return folders
  }, [])

  const tree = useMemo(() => buildTree(files), [files, buildTree])
  const sortedItems = useMemo(() => buildSortedTreeItems(tree), [tree])

  // 默认收起所有文件夹
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => {
    const allFolders = getAllFolderPaths(tree)
    return new Set(allFolders)
  })

  const toggleFolder = useCallback((path: string) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  return (
    <div className="file-tree-container">
      <div className="file-tree-header">
        <span className="file-tree-title">EXPLORER</span>
      </div>
      <ul className="file-tree-list">
        <RenderTree
          items={sortedItems}
          level={0}
          collapsedFolders={collapsedFolders}
          onToggleFolder={toggleFolder}
          onFileSelect={onFileSelect}
          currentFile={currentFile}
        />
      </ul>
    </div>
  )
}
