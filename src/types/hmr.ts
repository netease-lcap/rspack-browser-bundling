/**
 * HMR (Hot Module Replacement) Type Definitions
 * 
 * TypeScript types for HMR functionality using Web Workers
 */

// ============================================================================
// Status Types
// ============================================================================

/** HMR 状态类型 */
export type HMRStatus = 
  | 'idle' 
  | 'building' 
  | 'hmr-updating' 
  | 'hmr-applied' 
  | 'error'

// ============================================================================
// Worker Message Types (Worker -> Main Thread)
// ============================================================================

/** Worker 发送给主线程的消息类型 */
export enum WorkerMessageType {
  /** 初始化完成 */
  INIT = 'INIT',
  /** 文件变更 */
  FILE_CHANGE = 'FILE_CHANGE',
  /** 构建结束 */
  BUILD_END = 'BUILD_END',
  /** HMR 更新 */
  HMR_UPDATE = 'HMR_UPDATE',
  /** 错误 */
  ERROR = 'ERROR'
}

/** Worker 消息结构 */
export interface WorkerMessage {
  type: WorkerMessageType
  payload: unknown
}

// ============================================================================
// Main Thread Message Types (Main Thread -> Worker)
// ============================================================================

/** 主线程发送给 Worker 的消息类型 */
export enum MainThreadMessageType {
  /** 开始监听 */
  START_WATCH = 'START_WATCH',
  /** 停止监听 */
  STOP_WATCH = 'STOP_WATCH',
  /** 更新文件 */
  UPDATE_FILE = 'UPDATE_FILE'
}

/** 主线程消息结构 */
export interface MainThreadMessage {
  type: MainThreadMessageType
  payload: unknown
}

// ============================================================================
// Payload Types
// ============================================================================

/** 构建结束时的数据 */
export interface BuildEndPayload {
  /** 产物文件 */
  distFiles: Record<string, string>
  /** 构建统计 */
  stats: {
    hash: string
    lastHash: string | null
    buildTime: number
    moduleCount: number
    /** true 表示是 HMR 增量更新（含 hot-update 文件），false 表示首次全量构建 */
    isHmrUpdate?: boolean
  }
}

/** 构建错误数据 */
export interface BuildErrorPayload {
  /** 错误消息 */
  message: string
  /** 错误详情 */
  details?: string
  /** 堆栈信息 */
  stack?: string
}

/** 单个模块更新 */
export interface HMRModuleUpdate {
  /** 模块 ID */
  moduleId: string
  /** 文件名 */
  filename: string
  /** 更新后的代码 */
  code: string
}

/** HMR 更新补丁数据 */
export interface HMRUpdatePayload {
  /** 构建哈希 */
  hash: string
}

/** 初始化完成数据 */
export interface InitPayload {
  /** Worker 是否准备就绪 */
  ready: boolean
  /** 版本信息 */
  version?: string
}

/** 文件变更数据 */
export interface FileChangePayload {
  /** 变更的文件路径 */
  path: string
  /** 变更类型 */
  changeType: 'add' | 'change' | 'unlink'
}

/** 更新文件的数据 */
export interface UpdateFilePayload {
  /** 文件路径 */
  path: string
  /** 文件内容 */
  content: string
}

// ============================================================================
// Hook Types
// ============================================================================

/** useHMR hook 的选项 */
export interface UseHMROptions {
  /** 文件变更回调 */
  onFileChange?: (path: string, content: string) => void
  /** 构建结束回调 */
  onBuildEnd?: (payload: BuildEndPayload) => void
  /** 构建错误回调 */
  onError?: (payload: BuildErrorPayload) => void
  /** HMR 更新回调 */
  onHMRUpdate?: (payload: HMRUpdatePayload) => void
}

/** useHMR hook 的返回值 */
export interface UseHMRResult {
  /** 当前 HMR 状态 */
  status: HMRStatus
  /** 是否处于监听模式 */
  isWatchMode: boolean
  /** 是否正在编译 */
  isCompiling: boolean
  /** 开始监听 */
  startWatch: () => Promise<void>
  /** 停止监听 */
  stopWatch: () => void
  /** 更新文件 */
  updateFile: (path: string, content: string) => void
}

// ============================================================================
// Worker Instance Types
// ============================================================================

/** HMR Worker 实例 */
export interface HMRWorker {
  /** Worker 实例 */
  worker: Worker
  /** 是否就绪 */
  isReady: boolean
  /** 发送消息 */
  postMessage: (message: MainThreadMessage) => void
  /** 终止 Worker */
  terminate: () => void
}

/** HMR Worker 构造函数选项 */
export interface HMRWorkerOptions {
  /** 初始文件系统 */
  initialFiles?: Record<string, string>
  /** Worker 脚本 URL */
  workerUrl?: string
}
