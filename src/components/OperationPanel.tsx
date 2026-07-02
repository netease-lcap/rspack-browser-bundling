import type { HMRStatus } from '../types/hmr'

interface OperationPanelProps {
  onToggleWatch: () => void
  onRun: () => void
  isWatchMode: boolean
  isCompiling: boolean
  bundlerStatus: HMRStatus
  distFiles: Record<string, string> | null
}

// 状态指示器组件
function StatusIndicator({ status, isWatchMode }: { status: HMRStatus; isWatchMode: boolean }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'idle':
        return isWatchMode 
          ? { color: '#10B981', bgColor: '#D1FAE5', text: '就绪', icon: '●' }
          : { color: '#9CA3AF', bgColor: '#F3F4F6', text: '未启动', icon: '○' }
      case 'building':
        return { color: '#3B82F6', bgColor: '#DBEAFE', text: '编译中', icon: '◐' }
      case 'hmr-updating':
        return { color: '#F59E0B', bgColor: '#FEF3C7', text: '热更新', icon: '◑' }
      case 'hmr-applied':
        return { color: '#10B981', bgColor: '#D1FAE5', text: '已更新', icon: '●' }
      case 'error':
        return { color: '#EF4444', bgColor: '#FEE2E2', text: '错误', icon: '●' }
      default:
        return { color: '#9CA3AF', bgColor: '#F3F4F6', text: '未知', icon: '○' }
    }
  }

  const config = getStatusConfig()
  const isActive = status === 'building' || status === 'hmr-updating'

  return (
    <div 
      className="status-indicator"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '20px',
        backgroundColor: config.bgColor,
        fontSize: '12px',
        fontWeight: 600,
        color: config.color,
        transition: 'all 0.3s ease'
      }}
    >
      <span 
        className={isActive ? 'status-pulse' : ''}
        style={{ 
          fontSize: '10px',
          animation: isActive ? 'pulse 1.5s ease-in-out infinite' : 'none'
        }}
      >
        {config.icon}
      </span>
      <span>{config.text}</span>
    </div>
  )
}

// 主按钮组件
function ActionButton({ 
  onClick, 
  disabled, 
  isActive, 
  isLoading,
  activeText,
  inactiveText,
  activeIcon,
  inactiveIcon
}: { 
  onClick: () => void
  disabled?: boolean
  isActive: boolean
  isLoading?: boolean
  activeText: string
  inactiveText: string
  activeIcon: string
  inactiveIcon: string
}) {
  return (
    <button
      className={`action-button ${isActive ? 'active' : ''} ${isLoading ? 'loading' : ''}`}
      onClick={onClick}
      disabled={disabled || isLoading}
      style={{
        width: '100%',
        padding: '12px 16px',
        borderRadius: '10px',
        border: 'none',
        fontSize: '14px',
        fontWeight: 600,
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s ease',
        background: isActive 
          ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
          : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
        color: 'white',
        boxShadow: isActive
          ? '0 4px 14px rgba(239, 68, 68, 0.35)'
          : '0 4px 14px rgba(59, 130, 246, 0.35)',
        opacity: disabled || isLoading ? 0.6 : 1,
        transform: disabled || isLoading ? 'none' : undefined
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isLoading) {
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = isActive
            ? '0 6px 20px rgba(239, 68, 68, 0.45)'
            : '0 6px 20px rgba(59, 130, 246, 0.45)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = isActive
          ? '0 4px 14px rgba(239, 68, 68, 0.35)'
          : '0 4px 14px rgba(59, 130, 246, 0.35)'
      }}
    >
      {isLoading ? (
        <>
          <span className="spinner" style={{
            width: '16px',
            height: '16px',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: 'white',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <span>处理中...</span>
        </>
      ) : (
        <>
          <span>{isActive ? activeIcon : inactiveIcon}</span>
          <span>{isActive ? activeText : inactiveText}</span>
        </>
      )}
    </button>
  )
}

// 次要按钮组件
function SecondaryButton({ 
  onClick, 
  disabled,
  children
}: { 
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      className="secondary-button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid #E5E7EB',
        fontSize: '14px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s ease',
        background: 'white',
        color: disabled ? '#9CA3AF' : '#374151',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        opacity: disabled ? 0.6 : 1
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#F9FAFB'
          e.currentTarget.style.borderColor = '#D1D5DB'
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'white'
        e.currentTarget.style.borderColor = '#E5E7EB'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}
    >
      {children}
    </button>
  )
}

export default function OperationPanel({
  onToggleWatch,
  onRun,
  isWatchMode,
  isCompiling,
  bundlerStatus,
  distFiles,
}: OperationPanelProps) {
  const canRun = !!distFiles

  return (
    <div 
      className="operation-panel"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #FAFAFA 0%, #F3F4F6 100%)'
      }}
    >
      {/* 标题栏 */}
      <div 
        className="panel-header"
        style={{
          flexShrink: 0,
          padding: '16px 20px',
          borderBottom: '1px solid #E5E7EB',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <div 
          className="header-icon"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
          }}
        >
          ⚡
        </div>
        <div>
          <h2 style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#111827',
            margin: 0,
            lineHeight: 1.3
          }}>
            操作面板
          </h2>
          <p style={{
            fontSize: '12px',
            color: '#6B7280',
            margin: 0,
            lineHeight: 1.3
          }}>
            构建与预览控制
          </p>
        </div>
      </div>

      {/* 内容区域 */}
      <div 
        className="panel-content"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* 状态卡片 */}
          <div 
            className="status-card"
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
              border: '1px solid #E5E7EB'
            }}
          >
            <div 
              className="card-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>👁️</span>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#374151'
                }}>
                  Watch 状态
                </span>
              </div>
              <StatusIndicator status={bundlerStatus} isWatchMode={isWatchMode} />
            </div>
            
            <ActionButton
              onClick={onToggleWatch}
              disabled={isCompiling}
              isActive={isWatchMode}
              isLoading={isCompiling}
              activeText="停止 Watch"
              inactiveText="启动 Watch"
              activeIcon="⏹"
              inactiveIcon="▶"
            />
          </div>

          {/* 预览卡片 */}
          <div 
            className="preview-card"
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
              border: '1px solid #E5E7EB',
              opacity: canRun ? 1 : 0.7
            }}
          >
            <div 
              className="card-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '14px'
              }}
            >
              <span style={{ fontSize: '16px' }}>🚀</span>
              <span style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151'
              }}>
                预览
              </span>
              {!canRun && (
                <span style={{
                  fontSize: '11px',
                  color: '#9CA3AF',
                  marginLeft: 'auto'
                }}>
                  需先构建
                </span>
              )}
            </div>
            
            <SecondaryButton onClick={onRun} disabled={!canRun}>
              <span>🔥</span>
              <span>运行 HMR 预览</span>
            </SecondaryButton>
          </div>

          {/* 构建信息 */}
          {distFiles && (
            <div 
              className="build-info"
              style={{
                background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                borderRadius: '12px',
                padding: '14px 16px',
                border: '1px solid #BBF7D0'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#22C55E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px'
                }}>
                  ✓
                </div>
                <div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#166534'
                  }}>
                    构建完成
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#15803D'
                  }}>
                    {Object.keys(distFiles).length} 个文件已生成
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部提示 */}
      <div 
        className="panel-footer"
        style={{
          flexShrink: 0,
          padding: '12px 16px',
          borderTop: '1px solid #E5E7EB',
          background: 'white',
          fontSize: '11px',
          color: '#9CA3AF',
          textAlign: 'center'
        }}
      >
        Rspack Browser Bundler v1.0
      </div>

      {/* 全局动画样式 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
