# Rspack Browser Demo

🚀 一个在浏览器中使用 @rspack/core 进行实时打包的演示项目

## 📖 项目简介

这个项目展示了如何在浏览器环境中使用 Rspack 进行 JavaScript 代码的实时打包和运行。通过可视化的界面，你可以：

- ✍️ 在浏览器中编写 JavaScript 代码
- 📦 实时打包代码模块
- ▶️ 直接运行打包后的代码
- 📊 查看打包统计信息（打包时间、输出大小、模块数量）

## ✨ 特性

- **实时打包**: 在浏览器中即时编译和打包 JavaScript 代码
- **模块化支持**: 支持 ES6 模块导入导出
- **内置内存文件系统**: 使用 `builtinMemFs.volume` 在内存中管理文件
- **可视化界面**: 美观的 UI，实时显示打包结果和统计信息
- **代码运行**: 直接在浏览器中运行打包后的代码并查看输出
- **真实打包**: 使用官方 @rspack/browser API 进行真实的打包操作

## 🛠️ 技术栈

- **@rspack/browser**: 适用于浏览器的 Rspack 打包工具
- **Vite**: 现代化的前端构建工具
- **原生 JavaScript**: 无框架依赖，纯 JS 实现

## 📦 安装

```bash
# 安装依赖
pnpm install
```

## 🚀 使用

```bash
# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览生产版本
pnpm preview
```

## 📝 使用说明

1. **启动项目**: 运行 `pnpm dev` 启动开发服务器
2. **项目文件管理**: 所有项目文件从 `files.js` 中定义并读取
3. **编写代码**: 在"输入代码"区域编写你的 JavaScript 代码
4. **添加依赖**: 在"依赖模块"区域以 JSON 格式添加模块依赖（可选）
5. **打包代码**: 点击"🔨 打包代码"按钮进行打包
6. **运行代码**: 打包成功后，点击"▶️ 运行打包结果"按钮运行代码
7. **查看结果**: 在输出区域查看打包结果和运行输出

## 💡 示例代码

### 入口文件 (entry.js)

```javascript
import { add } from './math.js';
import { greet } from './utils.js';

console.log('Hello from Rspack!');
console.log('2 + 3 =', add(2, 3));
console.log(greet('开发者'));

export default function main() {
  return 'Module bundled successfully!';
}
```

### 依赖模块 (JSON 格式)

```json
{
  "./math.js": "export function add(a, b) { return a + b; }",
  "./utils.js": "export function greet(name) { return `你好, ${name}!`; }"
}
```

## 📁 项目文件系统 (files.js)

本项目使用 `src/files.js` 统一管理所有项目文件。该文件导出一个对象，包含所有需要在虚拟文件系统中创建的文件及其内容。

### 文件配置结构

```javascript
export default {
  "/.editorconfig": "...",           // 编辑器配置
  "/.prettierrc.js": "...",         // 代码格式化配置
  "/src/main.ts": "...",            // 源代码文件
  // ... 其他文件
}
```

### 添加新文件

在 `files.js` 中添加新的文件映射：

```javascript
"/src/utils/helpers.js": "export function helper() { ... }"
```

## 🎯 项目结构

```
rspack-browser-demo/
├── index.html          # 主 HTML 文件
├── package.json        # 项目配置
├── vite.config.js      # Vite 配置
├── README.md           # 项目说明
└── src/
    ├── main.js         # 主要逻辑文件（打包和运行的核心代码）
    └── files.js        # 虚拟文件系统配置（所有项目文件定义处）
```

## ⚠️ 注意事项

1. **浏览器兼容性**: 此项目使用 @rspack/browser 专为浏览器环境设计
2. **虚拟文件系统**: 使用 `builtinMemFs.volume` 提供的内置内存文件系统，所有文件定义在 `src/files.js`
3. **文件管理**: 修改或添加项目文件时，直接编辑 `files.js` 中的映射配置
4. **模块解析**: 依赖模块需要以正确的路径格式提供（如 `./math.js`）
5. **内存限制**: 虚拟文件系统运行在浏览器内存中，因此文件大小受浏览器内存限制
6. **Vue 组件处理**: ⚠️ **vue-loader 无法在浏览器环境中运行**，请查看 [VUE_BROWSER_GUIDE.md](VUE_BROWSER_GUIDE.md) 了解如何处理 Vue 组件

### Vue 组件使用建议

由于 vue-loader 依赖 Node.js API，在浏览器环境中**不能使用 .vue 单文件组件**。推荐使用以下方式：

```javascript
// 在 files.js 中定义 Vue 组件
export default {
  '/src/App.js': `
    import { defineComponent, ref } from 'vue';
    
    export default defineComponent({
      name: 'App',
      template: '<div>{{ message }}</div>',
      setup() {
        const message = ref('Hello Vue!');
        return { message };
      }
    });
  `
}
```

详细说明请参考：[Vue 浏览器环境使用指南](VUE_BROWSER_GUIDE.md)
4. **性能**: 首次加载需要下载 Rspack 的 WASM/JS 编译器，可能需要一些时间

## 🔨 扩展功能

你可以基于这个 demo 添加以下功能：

- [ ] 支持更多的模块格式（CommonJS、AMD 等）
- [ ] 集成代码编辑器（Monaco Editor、CodeMirror）
- [ ] 支持 TypeScript 编译
- [ ] 添加代码高亮和错误提示
- [ ] 支持文件上传和导出
- [ ] 添加预设模板和示例

## 📚 相关资源

- [Rspack 官方文档](https://www.rspack.dev/)
- [Vite 官方文档](https://vitejs.dev/)
- [ES6 模块规范](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Modules)

## 📄 许可证

ISC

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**Happy Coding! 🎉**
