# Rspack Browser Demo

🚀 一个完全在浏览器中运行 Rspack 打包的演示项目

## 📖 项目简介

这是一个概念验证项目，展示了如何使用 `@rspack/browser` 在浏览器环境中进行完整的模块打包。通过可视化的界面，你可以：

- ✍️ 在浏览器中编写代码（支持 JavaScript/Vue 组件）
- 📦 完全在浏览器中进行 Rspack 打包（无需后端）
- 🎨 支持 Vue 3 单文件组件（.vue）编译
- ▶️ 直接运行打包后的代码
- 💾 下载打包产物为 ZIP 文件
- 📊 查看详细的打包统计信息（时间、大小、模块数量）

## ✨ 特性

- **浏览器端打包**: 使用 `@rspack/browser` 完全在浏览器中进行编译和打包
- **Vue 3 支持**: 自定义 Vue loader 实现 .vue 单文件组件的浏览器端编译
- **内存文件系统**: 使用 `builtinMemFs` 在内存中管理虚拟文件系统
- **自定义插件系统**: 
  - `LcapPlugin`: 生成 chunk map 并处理懒加载
  - `MissingCssFallbackPlugin`: CSS 文件缺失时的降级处理
  - `MissingFileFallbackPlugin`: 通用文件缺失降级
- **模块化支持**: ES6 模块、动态导入、代码分割
- **可视化界面**: 美观的 UI 实时显示打包进度和结果
- **产物下载**: 支持将打包结果下载为 ZIP 文件
- **GitHub Pages 部署**: 内置 COI Service Worker 支持跨域隔离

## 🛠️ 技术栈

- **@rspack/browser**: 浏览器环境的 Rspack 打包工具（基于 WASM）
- **Vue 3.5.13**: 用于演示 Vue 组件编译
- **Vite**: 开发服务器和构建工具
- **原生 JavaScript**: 主要逻辑使用纯 JS 实现（无框架依赖）

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
2. **查看文件**: 所有虚拟项目文件在 `src/files.js` 中定义
3. **点击打包**: 点击"🔨 打包代码"按钮，Rspack 将在浏览器中编译所有文件
4. **查看结果**: 
   - 查看打包统计（时间、大小、模块数量）
   - 查看生成的文件列表
   - 下载打包产物为 ZIP
5. **运行代码**: 点击"▶️ 运行打包结果"直接执行打包后的代码

## 💡 示例代码

### JavaScript 模块示例

在 `src/files.js` 中定义文件：

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
├── vite.config.js               # Vite 配置
├── vite-plugin-coi.js           # COI Service Worker 插件（用于 GitHub Pages）
├── package.json                 # 项目配置
├── README.md                    # 项目说明
├── AGENTS.md                    # AI Agent 开发指南
├── MATCH_RESOURCE_EXPLAINED.md  # Match Resource 机制详解
├── VUE_BROWSER_GUIDE.md         # Vue 浏览器环境使用指南
├── public/
│   └── coi-serviceworker.js    # Service Worker（支持 SharedArrayBuffer）
└── src/
    ├── main.js                  # 主逻辑（打包和运行）
    ├── files.js                 # 虚拟文件系统配置
    └── rspack/
        ├── loaders/
        │   └── vue/
        │       ├── index.js         # 自定义 Vue loader
        │       ├── README.md        # Vue loader 文档
        │       └── STYLE_HANDLING.md # 样式处理说明
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

- 所有文件定义在 `src/files.js`
- 使用 `builtinMemFs.volume.fromJSON()` 加载到内存
- 文件路径必须使用绝对路径（如 `/src/index.js`）
- 修改文件需要编辑 `files.js` 并重新打包

### Vue 组件支持

✅ **本项目已实现浏览器端 Vue loader！**

- 支持 `<template>`、`<script>`、`<script setup>`、`<style scoped>`
- 使用 `vue/compiler-sfc` 进行编译
- 通过 match resource 机制实现正确的 loader 链
- 详见 [VUE_BROWSER_GUIDE.md](VUE_BROWSER_GUIDE.md) 和 [MATCH_RESOURCE_EXPLAINED.md](MATCH_RESOURCE_EXPLAINED.md)

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

- **完全离线**: 打包过程不依赖任何服务器
- **WASM 驱动**: 使用 Rspack 的 WASM 编译器
- **内存文件系统**: 所有 I/O 操作在内存中完成
- **Match Resource**: 实现了 Webpack/Rspack 的高级 loader 机制

## 🔨 扩展功能建议

- [ ] 集成 Monaco Editor 代码编辑器
- [ ] 支持 TypeScript 编译
- [ ] 添加 React/Solid.js 等其他框架支持
- [ ] 实现代码模板和示例库
- [ ] 添加打包优化选项（minify、tree-shaking 等）
- [ ] 支持从 URL/GitHub 导入项目
- [ ] 实现协作编辑功能
- [ ] 添加性能分析面板

## 📚 相关文档

### 项目文档
- [AGENTS.md](AGENTS.md) - AI 开发助手指南
- [VUE_BROWSER_GUIDE.md](VUE_BROWSER_GUIDE.md) - Vue 浏览器环境使用指南
- [MATCH_RESOURCE_EXPLAINED.md](MATCH_RESOURCE_EXPLAINED.md) - Match Resource 机制详解
- [src/rspack/loaders/vue/README.md](src/rspack/loaders/vue/README.md) - Vue Loader 实现细节
- [src/rspack/loaders/vue/STYLE_HANDLING.md](src/rspack/loaders/vue/STYLE_HANDLING.md) - 样式处理说明

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

1. 阅读 [AGENTS.md](AGENTS.md) 了解项目架构和编码规范
2. 遵循现有的代码风格（ES Modules、箭头函数等）
3. 为新功能添加文档和示例
4. 测试在不同浏览器中的兼容性

## 📄 许可证

ISC

---

**Built with ❤️ using Rspack Browser API | 完全在浏览器中打包 🚀**
