// 文件树节点类型
export interface FileTreeNode {
  [key: string]: FileTreeNode | FileMetadata
}

export interface FileMetadata {
  __isFile: true
  __path: string
}

// 文件系统
export type FileSystem = Record<string, string>

// 构建统计
export interface BuildStats {
  buildTime: string
  outputSize: string
  moduleCount: number
}

// 打包产物
export interface DistFile {
  path: string
  content: string
  size: number
}

// Monaco Editor 实例类型
export interface MonacoEditorInstance {
  getValue: () => string
  setValue: (value: string) => void
  setModel: (model: any) => void
  addCommand: (keybinding: number, handler: () => void) => void
}

// 消息类型
export type MessageType = 'success' | 'error' | 'info'

export interface Message {
  text: string
  type: MessageType
}
