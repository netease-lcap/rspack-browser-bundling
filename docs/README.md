# 📚 项目文档索引

本目录包含 rspack-browser-bundling 项目的所有技术文档。

## 📂 文档结构

```
docs/
├── README.md                          # 本文件（文档索引）
├── guides/                            # 指南和说明文档
│   ├── MATCH_RESOURCE_EXPLAINED.md   # Match Resource 机制详解
│   ├── VUE_BROWSER_GUIDE.md          # Vue 浏览器环境使用指南
│   └── REFACTOR_LOG.md               # 重构日志（2026-03-04）
├── api/                               # API 文档
│   └── RSPACK_BUNDLER.md             # Rspack 打包工具 API
├── loaders/                           # Loader 文档
│   ├── vue-loader.md                 # Vue Loader 实现文档
│   └── vue-style-handling.md         # Vue 样式处理说明
└── plugins/                           # Plugin 文档
    └── missing-css-fallback.md       # CSS 降级插件文档
```

## 📖 快速导航

### 🎯 核心概念

- **[Match Resource 机制详解](./guides/MATCH_RESOURCE_EXPLAINED.md)**  
  深入理解 Rspack/Webpack 的 Match Resource 机制，理解 loader 链如何工作

- **[Vue 浏览器环境使用指南](./guides/VUE_BROWSER_GUIDE.md)**  
  在浏览器中编译 Vue 单文件组件的完整指南

### 🔧 工具和 API

- **[Rspack 打包工具](./api/RSPACK_BUNDLER.md)**  
  `src/utils/rspack-bundler.ts` 的详细 API 文档和使用示例
  - `bundleWithRspack()` - 主打包函数
  - 配置生成、文件处理、错误处理等

### 🎨 Loaders

- **[Vue Loader](./loaders/vue-loader.md)**  
  自定义 Vue SFC loader 的实现细节
  - 如何解析 `.vue` 文件
  - Template、Script、Style 的处理流程
  - Match Resource 的应用

- **[Vue 样式处理](./loaders/vue-style-handling.md)**  
  Vue 组件样式的特殊处理
  - Scoped CSS 实现
  - CSS Modules 支持
  - 样式提取和注入

### 🔌 Plugins

- **[Missing CSS Fallback Plugin](./plugins/missing-css-fallback.md)**  
  处理缺失 CSS 文件的降级插件
  - 使用场景
  - 配置选项
  - 工作原理

### 📝 开发日志

- **[重构日志 2026-03-04](./guides/REFACTOR_LOG.md)**  
  Rspack 打包功能提取重构记录
  - 重构目标和动机
  - 代码结构变化
  - API 设计改进

## 🚀 主要文档（根目录）

项目根目录还包含以下重要文档：

- **[README.md](../README.md)** - 项目主文档，包含功能介绍、使用说明、部署指南
- **[AGENTS.md](../AGENTS.md)** - AI Coding Agent 开发指南（⚠️ 描述旧版纯 JS 架构）

## 📌 文档编写规范

### Markdown 格式
- 使用标准 Markdown 语法
- 代码块指定语言高亮
- 适当使用 emoji 提升可读性

### 文档分类
- **guides/** - 概念解释、使用指南、最佳实践
- **api/** - API 参考、函数签名、使用示例
- **loaders/** - Loader 实现文档
- **plugins/** - Plugin 实现文档

### 命名规范
- 使用描述性的文件名
- 统一使用 kebab-case（小写加连字符）
- 避免使用简写和缩写

## 🔄 文档更新

### 最近更新
- **2026-03-04**: 创建文档索引，整理文档结构
- **2026-03-04**: 添加 Rspack Bundler API 文档
- **2026-03-04**: 记录重构日志

### 如何贡献文档
1. 在对应目录创建新文档
2. 更新本索引文件
3. 确保文档格式统一
4. 提交 PR 或直接提交

## 🔗 相关资源

### 官方文档
- [Rspack 官方文档](https://www.rspack.dev/)
- [@rspack/browser API](https://www.rspack.dev/api/browser)
- [Vue 3 文档](https://cn.vuejs.org/)
- [Vite 官方文档](https://vitejs.dev/)

### 社区资源
- [GitHub Issues](https://github.com/web-infra-dev/rspack/issues)
- [Rspack Discord](https://discord.gg/rspack)

---

**📅 最后更新**: 2026年3月4日  
