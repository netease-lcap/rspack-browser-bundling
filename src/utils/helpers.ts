import type { FileTreeNode, FileSystem } from '../types'

/**
 * 格式化字节大小
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * 构建文件树数据结构
 */
export function buildFileTree(files: FileSystem): FileTreeNode {
  const tree: FileTreeNode = {}

  Object.keys(files)
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
}

/**
 * 获取文件语言类型
 */
export function getFileLanguage(filename: string): string {
  if (filename.endsWith('.js')) return 'javascript'
  if (filename.endsWith('.ts')) return 'typescript'
  if (filename.endsWith('.vue')) return 'html'
  if (filename.endsWith('.css')) return 'css'
  if (filename.endsWith('.html')) return 'html'
  if (filename.endsWith('.json')) return 'json'
  if (filename.endsWith('.md')) return 'markdown'
  return 'plaintext'
}

/**
 * 获取文件图标
 */
export function getFileIcon(filename: string): string {
  if (filename.endsWith('.js')) return '📜'
  if (filename.endsWith('.ts')) return '📘'
  if (filename.endsWith('.vue')) return '🖼️'
  if (filename.endsWith('.css')) return '🎨'
  if (filename.endsWith('.html')) return '📄'
  if (filename.endsWith('.json')) return '📋'
  return '📁'
}

/**
 * 下载文件
 */
export function downloadFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
