import { useState, useCallback } from 'react'
import type { FileTreeNode, FileMetadata, FileSystem } from '../types'
import { getFileIcon } from '../utils/helpers'

interface FileTreeProps {
  files: FileSystem
  currentFile: string | null
  onFileSelect: (path: string) => void
}

interface RenderTreeProps {
  tree: FileTreeNode
  level: number
  parentPath: string
  collapsedFolders: Set<string>
  onToggleFolder: (path: string) => void
  onFileSelect: (path: string) => void
  currentFile: string | null
}

function RenderTree({ tree, level, parentPath, collapsedFolders, onToggleFolder, onFileSelect, currentFile }: RenderTreeProps) {
  return (
    <>
      {Object.keys(tree).map(key => {
        if (key.startsWith('__')) return null

        const item = tree[key]
        const isFile = (item as FileMetadata).__isFile
        const currentPath = parentPath ? `${parentPath}/${key}` : key
        const isCollapsed = collapsedFolders.has(currentPath)
        const isActive = isFile && (item as FileMetadata).__path === currentFile

        if (isFile) {
          const filePath = (item as FileMetadata).__path
          return (
            <li
              key={currentPath}
              className={`file-tree-item ${isActive ? 'active' : ''}`}
              style={{ paddingLeft: `${level * 15 + 26}px` }}
              onClick={() => onFileSelect(filePath)}
            >
              <span style={{ fontSize: '16px' }}>{getFileIcon(key)}</span>
              <span className="text-sm font-mono text-gray-700">{key}</span>
            </li>
          )
        }

        return (
          <li key={currentPath}>
            <div
              className="folder-tree-item"
              style={{ paddingLeft: `${level * 15 + 10}px` }}
              onClick={() => onToggleFolder(currentPath)}
            >
              <span className="collapse-icon">{isCollapsed ? '▶' : '▼'}</span>
              <span style={{ fontSize: '16px' }}>{level === 0 ? '📁' : '📂'}</span>
              <span className="text-sm font-semibold text-purple-700">{key}</span>
            </div>
            {!isCollapsed && (
              <ul className="space-y-0.5">
                <RenderTree
                  tree={item as FileTreeNode}
                  level={level + 1}
                  parentPath={currentPath}
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
      .sort()
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

  const tree = buildTree(files)
  
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
    <ul className="h-full overflow-y-auto p-2 space-y-0.5 bg-white">
      <RenderTree
        tree={tree}
        level={0}
        parentPath=""
        collapsedFolders={collapsedFolders}
        onToggleFolder={toggleFolder}
        onFileSelect={onFileSelect}
        currentFile={currentFile}
      />
    </ul>
  )
}
