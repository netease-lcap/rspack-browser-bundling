import type { FileTreeNode, FileSystem, FileIconType } from '../types'

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
 * 获取文件扩展名
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot === -1 ? '' : filename.slice(lastDot + 1).toLowerCase()
}

/**
 * 文件图标类型映射
 */
const fileIconMap: Record<string, FileIconType> = {
  // JavaScript/TypeScript
  'js': 'javascript',
  'mjs': 'javascript',
  'cjs': 'javascript',
  'ts': 'typescript',
  'mts': 'typescript',
  'cts': 'typescript',
  'jsx': 'react',
  'tsx': 'react',
  
  // Vue
  'vue': 'vue',
  
  // Styles
  'css': 'css',
  'scss': 'scss',
  'sass': 'sass',
  'less': 'less',
  'styl': 'stylus',
  'stylus': 'stylus',
  
  // HTML/XML
  'html': 'html',
  'htm': 'html',
  'xml': 'xml',
  'svg': 'svg',
  
  // JSON/Data
  'json': 'json',
  'jsonc': 'json',
  'json5': 'json',
  'yaml': 'yaml',
  'yml': 'yaml',
  'toml': 'toml',
  
  // Markdown
  'md': 'markdown',
  'mdx': 'markdown',
  
  // Images
  'png': 'image',
  'jpg': 'image',
  'jpeg': 'image',
  'gif': 'image',
  'bmp': 'image',
  'webp': 'image',
  'ico': 'image',
  
  // Fonts
  'woff': 'font',
  'woff2': 'font',
  'ttf': 'font',
  'otf': 'font',
  'eot': 'font',
  
  // Config files
  'config': 'config',
  'conf': 'config',
  'ini': 'config',
  'env': 'config',
  
  // Database
  'sql': 'database',
  
  // Shell/Scripts
  'sh': 'shell',
  'bash': 'shell',
  'zsh': 'shell',
  'fish': 'shell',
  'ps1': 'powershell',
  
  // Python
  'py': 'python',
  'pyc': 'python',
  'pyo': 'python',
  
  // Rust
  'rs': 'rust',
  
  // Go
  'go': 'go',
  
  // Java
  'java': 'java',
  
  // C/C++
  'c': 'c',
  'cpp': 'cpp',
  'cc': 'cpp',
  'cxx': 'cpp',
  'h': 'c',
  'hpp': 'cpp',
  
  // Other
  'zip': 'archive',
  'tar': 'archive',
  'gz': 'archive',
  'rar': 'archive',
  '7z': 'archive',
  'log': 'log',
  'lock': 'lock',
}

/**
 * 特殊文件名映射（如 .gitignore, package.json 等）
 */
const specialFileMap: Record<string, FileIconType> = {
  'package.json': 'npm',
  'package-lock.json': 'npm',
  'yarn.lock': 'yarn',
  'pnpm-lock.yaml': 'pnpm',
  '.gitignore': 'git',
  '.gitattributes': 'git',
  '.gitmodules': 'git',
  'tsconfig.json': 'typescript',
  'jsconfig.json': 'javascript',
  'vite.config.ts': 'vite',
  'vite.config.js': 'vite',
  'webpack.config.js': 'webpack',
  'rollup.config.js': 'rollup',
  'rspack.config.js': 'rspack',
  'rspack.config.ts': 'rspack',
  '.babelrc': 'babel',
  'babel.config.js': 'babel',
  '.eslintrc': 'eslint',
  '.eslintrc.js': 'eslint',
  '.eslintrc.json': 'eslint',
  '.prettierrc': 'prettier',
  'prettier.config.js': 'prettier',
  'dockerfile': 'docker',
  'docker-compose.yml': 'docker',
  'readme.md': 'readme',
  'license': 'license',
  'license.md': 'license',
  'changelog.md': 'changelog',
  '.env': 'config',
  '.env.local': 'config',
  '.env.development': 'config',
  '.env.production': 'config',
}

/**
 * 获取文件图标类型
 */
export function getFileIconType(filename: string): FileIconType {
  // 首先检查特殊文件名（不区分大小写）
  const lowerFilename = filename.toLowerCase()
  if (specialFileMap[lowerFilename]) {
    return specialFileMap[lowerFilename]
  }
  
  // 然后检查扩展名
  const ext = getFileExtension(filename)
  return fileIconMap[ext] || 'default'
}

/**
 * 获取文件夹图标类型
 */
export function getFolderIconType(folderName: string): 'folder' | 'folder-open' | 'folder-src' | 'folder-components' | 'folder-assets' | 'folder-dist' | 'folder-node' | 'folder-test' | 'folder-config' | 'folder-public' {
  const lowerName = folderName.toLowerCase()
  
  switch (lowerName) {
    case 'src':
    case 'source':
    case 'sources':
      return 'folder-src'
    case 'components':
    case 'component':
    case 'comps':
      return 'folder-components'
    case 'assets':
    case 'asset':
    case 'images':
    case 'img':
    case 'imgs':
    case 'fonts':
    case 'styles':
    case 'css':
    case 'scss':
    case 'sass':
      return 'folder-assets'
    case 'dist':
    case 'build':
    case 'out':
    case 'output':
    case 'release':
      return 'folder-dist'
    case 'node_modules':
    case 'vendor':
    case 'vendors':
      return 'folder-node'
    case 'test':
    case 'tests':
    case '__tests__':
    case 'spec':
    case 'specs':
    case 'e2e':
    case 'unit':
      return 'folder-test'
    case 'config':
    case 'configs':
    case 'configuration':
    case 'settings':
    case '.config':
      return 'folder-config'
    case 'public':
    case 'static':
    case 'www':
    case 'web':
      return 'folder-public'
    default:
      return 'folder'
  }
}

/**
 * 获取文件图标（emoji 版本，用于兼容）
 */
export function getFileIcon(filename: string): string {
  const iconType = getFileIconType(filename)
  
  const emojiMap: Record<FileIconType, string> = {
    'default': '📄',
    'javascript': '📜',
    'typescript': '📘',
    'react': '⚛️',
    'vue': '🖼️',
    'css': '🎨',
    'scss': '🎨',
    'sass': '🎨',
    'less': '🎨',
    'stylus': '🎨',
    'html': '🌐',
    'xml': '📋',
    'svg': '🎨',
    'json': '📋',
    'yaml': '📋',
    'toml': '📋',
    'markdown': '📝',
    'image': '🖼️',
    'font': '🔤',
    'config': '⚙️',
    'database': '🗄️',
    'shell': '🐚',
    'powershell': '💻',
    'python': '🐍',
    'rust': '🦀',
    'go': '🐹',
    'java': '☕',
    'c': '🔧',
    'cpp': '🔧',
    'archive': '📦',
    'log': '📜',
    'lock': '🔒',
    'npm': '📦',
    'yarn': '🧶',
    'pnpm': '📦',
    'git': '🔀',
    'vite': '⚡',
    'webpack': '📦',
    'rollup': '📦',
    'rspack': '📦',
    'babel': '🔄',
    'eslint': '✅',
    'prettier': '✨',
    'docker': '🐳',
    'readme': '📖',
    'license': '⚖️',
    'changelog': '📋',
  }
  
  return emojiMap[iconType] || '📄'
}

/**
 * 获取文件夹图标（emoji 版本）
 */
export function getFolderIcon(folderName: string, isOpen: boolean): string {
  const iconType = getFolderIconType(folderName)
  
  if (isOpen) {
    switch (iconType) {
      case 'folder-src': return '📂'
      case 'folder-components': return '📂'
      case 'folder-assets': return '📂'
      case 'folder-dist': return '📂'
      case 'folder-node': return '📂'
      case 'folder-test': return '📂'
      case 'folder-config': return '📂'
      case 'folder-public': return '📂'
      default: return '📂'
    }
  }
  
  switch (iconType) {
    case 'folder-src': return '📁'
    case 'folder-components': return '📁'
    case 'folder-assets': return '📁'
    case 'folder-dist': return '📁'
    case 'folder-node': return '📁'
    case 'folder-test': return '📁'
    case 'folder-config': return '📁'
    case 'folder-public': return '📁'
    default: return '📁'
  }
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
