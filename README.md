# Rspack Browser Demo

🚀 一个完全在浏览器中运行 Rspack 打包的演示项目

## 📖 项目简介

这是一个概念验证项目，展示了如何使用 `@rspack/browser` 在浏览器环境中进行完整的模块打包。

**主要能力：**
- ✍️ **在线代码编辑**: 使用 Monaco Editor 编辑虚拟项目文件（支持语法高亮、代码提示）
- 📦 **浏览器端打包**: 完全在浏览器中进行 Rspack 打包（无需后端服务器）
- 🎨 **Vue 3 组件支持**: 自定义 Vue loader 实现 .vue 单文件组件的浏览器端编译
- ▶️ **即时运行**: 直接在页面中运行打包后的代码
- 💾 **产物下载**: 支持将打包结果下载为 ZIP 文件
- 📊 **详细统计**: 实时显示打包时间、产物大小、模块数量等信息
- 📁 **文件树视图**: 可视化展示虚拟项目的文件结构
- 🔍 **文件列表**: 查看所有打包生成的文件及其大小

> **⚠️ 架构变更说明**: 
> 
> 本项目已从纯 JavaScript 架构升级到 **React + TypeScript** 架构。如果您看到 [AGENTS.md](AGENTS.md) 中提到"纯 JavaScript"、"原生 DOM"等描述，请注意这些是旧版本的说明，当前项目使用 React 18 + TypeScript 5 + UnoCSS 构建。

## ✨ 特性

- **浏览器端打包**: 使用 `@rspack/browser` 完全在浏览器中进行编译和打包
- **专业代码编辑器**: 集成 Monaco Editor，提供类似 VS Code 的编辑体验
- **React + TypeScript**: 使用现代化技术栈构建 UI
- **UnoCSS 样式**: 原子化 CSS 框架，即时编译样式
- **Vue 3 支持**: 自定义 Vue loader 实现 .vue 单文件组件的浏览器端编译
- **内存文件系统**: 使用 `builtinMemFs` 在内存中管理虚拟文件系统
- **自定义插件系统**: 
  - `LcapPlugin`: 生成 chunk map 并处理懒加载
  - `MissingCssFallbackPlugin`: CSS 文件缺失时的降级处理
  - `MissingFileFallbackPlugin`: 通用文件缺失降级
- **模块化支持**: ES6 模块、动态导入、代码分割
- **可视化界面**: React 组件化的 UI，实时显示打包进度和结果
- **产物下载**: 支持将打包结果下载为 ZIP 文件
- **GitHub Pages 部署**: 内置 COI Service Worker 支持跨域隔离
- **文件树视图**: 层级显示虚拟项目文件结构
- **实时编辑**: Monaco Editor 支持语法高亮、代码提示等功能

## 🛠️ 技术栈

- **@rspack/browser**: 浏览器环境的 Rspack 打包工具（基于 WASM）
- **React 18**: UI 框架
- **TypeScript 5.3.3**: 类型安全的开发体验
- **Vite 5.0**: 开发服务器和构建工具
- **UnoCSS**: 原子化 CSS 框架
- **Monaco Editor**: 专业代码编辑器
- **Vue 3.5.13**: 虚拟项目使用（用于演示 Vue 组件编译）

## 📦 安装

```bash
# 安装依赖
pnpm install
```

## 🚀 使用

```bash
# 启动开发服务器（带 COOP/COEP headers）
pnpm dev

# 构建生产版本
pnpm build

# 预览生产版本
pnpm preview
```

## 📝 使用说明

1. **启动项目**: 运行 `pnpm dev` 启动开发服务器（默认端口 3000）
2. **编辑代码**: 使用集成的 Monaco Editor 编辑虚拟项目文件
3. **查看文件**: 所有虚拟项目文件在 `src/files.ts` 中定义
4. **点击打包**: 点击"🔨 打包代码"按钮，Rspack 将在浏览器中编译所有文件
5. **查看结果**: 
   - 查看打包统计（时间、大小、模块数量）
   - 查看生成的文件列表
   - 下载打包产物为 ZIP
6. **运行代码**: 点击"▶️ 运行打包结果"直接执行打包后的代码

## 💡 示例代码

### JavaScript 模块示例

在 `src/files.ts` 中定义虚拟项目文件：

```javascript
export default {
  '/src/index.js': `
    import { add } from './math.js';
    import { greet } from './utils.js';
    
    console.log('Hello from Rspack Browser!');
    console.log('2 + 3 =', add(2, 3));
    console.log(greet('开发者'));
  `,
  
  '/src/math.js': `
    export function add(a, b) { return a + b; }
  `,
  
  '/src/utils.js': `
    export function greet(name) { return \`你好, \${name}!\`; }
  `
}
```

### Vue 组件示例

**是的，你可以在浏览器中使用 .vue 文件！** 项目已实现自定义 Vue loader：

```javascript
export default {
  '/src/App.vue': `
    <template>
      <div class="app">
        <h1>{{ message }}</h1>
        <button @click="count++">点击次数: {{ count }}</button>
      </div>
    </template>
    
    <script setup>
    import { ref } from 'vue';
    
    const message = ref('Hello Vue in Browser!');
    const count = ref(0);
    </script>
    
    <style scoped>
    .app { padding: 20px; }
    button { margin-top: 10px; }
    </style>
  `,
  
  '/src/index.js': `
    import { createApp } from 'vue';
    import App from './App.vue';
    
    createApp(App).mount('#app');
  `
}
```

## 🎯 项目结构

```
rspack-browser-bundling/
├── index.html                    # 主 HTML 文件
├── vite.config.ts               # Vite 配置（TypeScript）
├── vite-plugin-coi.js           # COI Service Worker 插件（用于 GitHub Pages）
├── tsconfig.json                # TypeScript 配置
├── uno.config.ts                # UnoCSS 配置
├── package.json                 # 项目配置
├── README.md                    # 项目说明
├── AGENTS.md                    # AI Agent 开发指南
├── docs/                        # 📚 文档中心
│   ├── README.md                # 文档索引
│   ├── guides/                  # 指南文档
│   ├── api/                     # API 文档
│   ├── loaders/                 # Loader 文档
│   └── plugins/                 # Plugin 文档
├── public/
│   └── coi-serviceworker.js    # Service Worker（支持 SharedArrayBuffer）
└── src/
    ├── main.tsx                 # 主入口（React + TypeScript）
    ├── files.ts                 # 虚拟文件系统配置
    ├── types.ts                 # TypeScript 类型定义
    ├── styles.css               # 全局样式
    ├── components/              # React 组件
    │   ├── App.tsx              # 主应用组件
    │   ├── BuildStats.tsx       # 打包统计组件
    │   ├── FileList.tsx         # 文件列表组件
    │   ├── FileTree.tsx         # 文件树组件
    │   ├── MonacoEditor.tsx     # Monaco 编辑器组件
    │   └── OperationPanel.tsx   # 操作面板组件
    ├── utils/
    │   └── helpers.ts           # 工具函数
    └── rspack/
        ├── loaders/
        │   └── vue/
        │       └── index.js         # 自定义 Vue loader
        └── plugins/
            ├── lcap/
            │   ├── index.js         # LCAP 插件（chunk map 和懒加载）
            │   └── constant.js      # 常量定义
            ├── missing-css-fallback/
            │   ├── index.js         # CSS 降级插件
            │   └── README.md
            └── missing-file-fallback/
                ├── index.js         # 文件降级插件
                └── README.md
```

## ⚠️ 注意事项

### 浏览器环境限制

1. **HTTPS/Localhost 要求**: Service Worker 和 SharedArrayBuffer 需要安全上下文
2. **跨域隔离**: 需要 COOP/COEP headers 才能使用 SharedArrayBuffer
   - 开发环境：Vite 插件自动配置
   - GitHub Pages：使用 COI Service Worker 自动处理
3. **首次加载**: 下载 Rspack WASM 编译器需要时间（约 26MB）
4. **内存限制**: 虚拟文件系统运行在浏览器内存中

### 虚拟文件系统

- 所有虚拟项目文件定义在 `src/files.ts`（TypeScript 格式）
- 使用 `builtinMemFs.volume.fromJSON()` 加载到内存
- 文件路径必须使用绝对路径（如 `/src/index.js`）
- 支持通过 Monaco Editor 在线编辑文件内容
- 编辑后重新打包即可看到效果

### Vue 组件支持

✅ **本项目已实现浏览器端 Vue loader！**

- 支持 `<template>`、`<script>`、`<script setup>`、`<style scoped>`
- 使用 `vue/compiler-sfc` 进行编译
- 通过 match resource 机制实现正确的 loader 链
- 详见 [Vue 浏览器环境使用指南](docs/guides/VUE_BROWSER_GUIDE.md) 和 [Match Resource 机制详解](docs/guides/MATCH_RESOURCE_EXPLAINED.md)

## 🌐 GitHub Pages 部署

### 自动化部署配置

项目已内置 GitHub Pages 支持（通过 `vite-plugin-coi.js`）：

1. **构建**: `pnpm build`
2. **部署 dist 目录**到 GitHub Pages
3. **自动处理**: COI Service Worker 会自动注入并配置跨域隔离
4. **首次访问**: 页面会自动刷新一次以激活 Service Worker

### 手动部署步骤

```bash
# 1. 构建
pnpm build

# 2. 推送到 gh-pages 分支
git subtree push --prefix dist origin gh-pages

# 或使用 GitHub Actions 自动部署
```

### 验证部署

在浏览器控制台检查：
```javascript
console.log('Cross-Origin Isolated:', window.crossOriginIsolated);
// 应该返回 true
```

如果返回 `false`，尝试：
- 清除浏览器缓存
- 注销旧的 Service Worker（DevTools → Application → Service Workers）
- 硬刷新页面（Ctrl+Shift+R 或 Cmd+Shift+R）

## � 架构亮点

### 自定义 Loader

- **Vue Loader**: 实现了完整的 Vue SFC 编译流程
  - 使用 `vue/compiler-sfc` 解析 .vue 文件
  - 通过 match resource 机制处理不同的 block
  - 支持 scoped styles 和 CSS modules

### 自定义 Plugin

- **LCAP Plugin**: 
  - 生成 chunk 映射表
  - 重写 Rspack runtime 方法
  - 支持动态 import 和懒加载
  
- **Missing File Fallback**:
  - 处理模块解析失败的情况
  - 提供友好的错误提示或降级方案

- **COI Plugin**:
  - Vite 插件自动注入 Service Worker
  - 开发环境自动配置 headers
  - 生产环境自动复制 SW 文件

### 技术特色

- **现代化 UI 架构**: 使用 React 18 + TypeScript + UnoCSS 构建
- **完全离线**: 打包过程不依赖任何服务器
- **WASM 驱动**: 使用 Rspack 的 WASM 编译器
- **内存文件系统**: 所有 I/O 操作在内存中完成
- **Match Resource**: 实现了 Webpack/Rspack 的高级 loader 机制
- **Monaco Editor 集成**: 专业代码编辑体验
- **类型安全**: TypeScript 提供完整的类型定义和检查
- **组件化开发**: React 组件化架构，代码结构清晰

## 🔨 扩展功能建议

- [x] 集成 Monaco Editor 代码编辑器 ✅
- [x] TypeScript 支持 ✅
- [x] React + TypeScript 架构 ✅
- [ ] 支持更多文件类型（JSON、CSS、HTML 等）在线编辑
- [ ] 添加 Solid.js/Svelte 等其他框架支持
- [ ] 实现代码模板和示例库
- [ ] 添加打包优化选项配置界面
- [ ] 支持从 URL/GitHub 导入项目
- [ ] 实现协作编辑功能
- [ ] 添加性能分析面板
- [ ] 支持多文件下载/上传

## 📚 相关文档

### 项目文档
- **[📖 文档中心](docs/README.md)** - 完整的文档索引和导航
- [AGENTS.md](AGENTS.md) - AI 开发助手指南（⚠️ 注意：文档中描述的是旧版纯 JS 架构，当前已升级为 React + TypeScript）

### 核心指南
- [Match Resource 机制详解](docs/guides/MATCH_RESOURCE_EXPLAINED.md) - 深入理解 loader 工作原理
- [Vue 浏览器环境使用指南](docs/guides/VUE_BROWSER_GUIDE.md) - 浏览器端 Vue 编译指南
- [重构日志](docs/guides/REFACTOR_LOG.md) - 项目重构记录

### API 和工具
- [Rspack 打包工具](docs/api/RSPACK_BUNDLER.md) - 打包工具 API 文档

### Loaders 和 Plugins
- [Vue Loader 实现](docs/loaders/vue-loader.md) - 自定义 Vue loader 详解
- [Vue 样式处理](docs/loaders/vue-style-handling.md) - 样式处理说明
- [Missing CSS Fallback Plugin](docs/plugins/missing-css-fallback.md) - CSS 降级插件

### 外部资源
- [Rspack 官方文档](https://www.rspack.dev/)
- [@rspack/browser API](https://www.rspack.dev/api/browser)
- [Vite 官方文档](https://vitejs.dev/)
- [Vue 3 文档](https://cn.vuejs.org/)
- [COI Service Worker](https://github.com/gzuidhof/coi-serviceworker)

## 📄 许可证

ISC

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发建议

1. 阅读 [AGENTS.md](AGENTS.md) 了解项目架构（⚠️ 注意：文档描述的是旧版纯 JS 架构）
2. 实际项目使用 **React + TypeScript + UnoCSS** 技术栈
3. 主要组件位于 `src/components/` 目录
4. 遵循 TypeScript 类型安全实践
5. 为新功能添加文档和示例
6. 测试在不同浏览器中的兼容性

## 📄 许可证

ISC

---

**Built with ❤️ using Rspack Browser API | 完全在浏览器中打包 🚀**
