# AGENTS.md - AI Coding Agent Guidelines

This document provides comprehensive guidelines for AI coding agents working in the **rspack-browser-bundling** repository. This is a proof-of-concept project demonstrating Rspack bundling entirely in the browser using `@rspack/browser`.

---

## 🏗️ Build, Dev & Test Commands

```bash
# Start development server (Vite on port 3000, auto-opens browser)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

**Note**: This project has **no linting or testing scripts**. It's a demo project focused on showcasing browser-based bundling capabilities. TypeScript is configured for type checking only (`noEmit: true`).

---

## 📦 Project Structure

```
rspack-browser-bundling/
├── index.html              # Main HTML entry point
├── vite.config.ts          # Vite build configuration (TypeScript)
├── tsconfig.json           # TypeScript compiler options
├── uno.config.ts           # UnoCSS styling configuration
├── package.json            # Dependencies and scripts
└── src/
    ├── main.tsx            # React app entry point
    ├── types.ts            # TypeScript type definitions
    ├── files.ts            # Virtual file system data
    ├── utils/
    │   └── helpers.ts      # Utility functions
    ├── components/         # React components (TypeScript + JSX)
    │   ├── App.tsx         # Main application (493 lines)
    │   ├── MonacoEditor.tsx
    │   ├── FileTree.tsx
    │   ├── OperationPanel.tsx
    │   └── ...
    └── rspack/             # Custom loaders/plugins (JavaScript)
        ├── loaders/vue/
        └── plugins/
            ├── lcap/
            ├── missing-css-fallback/
            └── missing-file-fallback/
```

---

## 🎯 Project Context

### Purpose
- **Browser-based bundling**: Runs Rspack compiler entirely in browser using WebAssembly
- **Virtual file system**: All files stored in memory using `builtinMemFs` from `@rspack/browser`
- **React + TypeScript UI**: Professional code editor interface with Monaco Editor
- **Custom loaders/plugins**: Demonstrates extensibility of Rspack browser API
- **Vue SFC compilation**: Compiles Vue components in browser (demo feature, not for the UI)

### Key Technologies
- **Framework**: React 18 with TypeScript 5.3.3
- **Build Tool**: Vite 5.0 (dev server) + `@rspack/browser` (in-browser bundling)
- **Styling**: UnoCSS with atomic CSS utilities
- **Editor**: Monaco Editor (VS Code editor engine)
- **Package Manager**: pnpm (required)
- **Module System**: ES Modules exclusively (`"type": "module"`)
- **Bundler**: `@rspack/browser` 1.0.0 (browser-compatible Rspack via WASM)

---

## 📝 Code Style Guidelines

### TypeScript & Type Safety

**Always use explicit types** for function parameters and return values:
```typescript
// ✅ Good - Explicit types
export function formatBytes(bytes: number): string { ... }
function handleFileSelect(path: string): void { ... }

// ✅ Use type imports
import type { FileSystem, BuildStats, MonacoEditorInstance } from '../types'

// ✅ Define interfaces for complex objects
interface MonacoEditorProps {
  currentFile: string | null
  files: FileSystem
  onSave: (path: string, content: string) => void
}

// ❌ Avoid 'any' unless absolutely necessary
const data: any = {} // Bad
```

### React Component Patterns

```typescript
// ✅ Functional components with TypeScript
const MonacoEditor: React.FC<MonacoEditorProps> = ({ currentFile, files, onSave }) => {
  // Component logic
}

// ✅ Use forwardRef for component refs
const MonacoEditor = forwardRef<MonacoEditorInstance, MonacoEditorProps>(
  ({ currentFile, files, onSave }, ref) => {
    // ...
  }
)

// ✅ useCallback for event handlers to prevent re-renders
const handleFileSelect = useCallback((path: string) => {
  setCurrentFile(path)
}, [])

// ✅ useState with explicit types
const [files, setFiles] = useState<FileSystem>({ ...filesData })
const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
```

### Import Conventions

```typescript
// ✅ React imports first
import React, { useState, useCallback, useRef } from 'react'
import { createRoot } from 'react-dom/client'

// ✅ Third-party imports
import { rspack, builtinMemFs } from '@rspack/browser'
import Editor from '@monaco-editor/react'

// ✅ Local component imports
import FileTree from './FileTree'
import MonacoEditor from './MonacoEditor'

// ✅ Type imports (separate or inline)
import type { FileSystem, BuildStats } from '../types'

// ✅ Asset imports last
import './styles.css'
```

### Naming Conventions

```typescript
// ✅ PascalCase for components, types, interfaces
interface FileTreeNode { ... }
type MessageType = 'success' | 'error'
const App: React.FC = () => { ... }

// ✅ camelCase for variables, functions, props
const [currentFile, setCurrentFile] = useState<string | null>(null)
function formatBytes(bytes: number): string { ... }

// ✅ UPPER_CASE for constants
const MAX_FILE_SIZE = 1024 * 1024

// ✅ kebab-case for CSS classes (UnoCSS)
<div className="flex h-screen w-screen flex-col overflow-hidden">
```

### Error Handling

**Use try-catch-finally** with proper typing:
```typescript
try {
  const stats = await compiler.run()
  // Process results
} catch (error: any) {  // or (error: unknown) with type narrowing
  console.error('打包错误:', error)
  setBuildOutput('打包失败\n\n' + error.message)
  showMessage('❌ 打包失败: ' + error.message, 'error')
} finally {
  setIsBundling(false)
}
```

### UnoCSS Styling

**Use atomic utility classes** instead of custom CSS:
```typescript
// ✅ Good - UnoCSS utilities
<div className="flex flex-col h-full overflow-hidden">
<button className="btn-primary px-4 py-2 rounded">

// ✅ Use shortcuts defined in uno.config.ts
<button className="btn-primary">  // Expands to predefined classes

// ❌ Avoid inline styles
<div style={{ display: 'flex' }}>
```

### Comments

```typescript
/**
 * JSDoc for exported functions (Chinese/English both OK)
 */
export function formatBytes(bytes: number): string { ... }

// Inline comments for complex logic
// 从内存文件系统读取打包结果
const distFiles = builtinMemFs.volume.toJSON('/dist')

// Component section comments
{/* 顶部标题栏 */}
{/* 左侧文件树 */}
```

---

## 🏛️ Architecture Patterns

### Plugin Structure

Custom Rspack plugins follow this pattern:
```javascript
export default class MyPlugin {
  constructor(options = {}) {
    this.options = { /* defaults */, ...options };
  }

  apply(compiler) {
    compiler.hooks.someHook.tap('MyPlugin', (compilation) => {
      // Plugin logic
    });
  }
}
```

### Loader Structure

Custom loaders implement a `pitch` method:
```javascript
export default class MyLoader {
  pitch(remainingRequest, precedingRequest, data) {
    // Return transformed code
    return {
      code: transformedCode,
      map: sourceMap // optional
    };
  }
}
```

### Virtual File System

**Always use `builtinMemFs`** for file operations:
```javascript
import { builtinMemFs } from '@rspack/browser';

// Write files to memory
builtinMemFs.volume.fromJSON(files);

// Read compiled output
const distFiles = builtinMemFs.volume.toJSON('/dist');

// Check file existence
if (builtinMemFs.fs.existsSync(path)) { ... }
```

---

## ⚙️ Configuration Guidelines

### Vite Configuration

Key settings in `vite.config.js`:
- **Port**: 3000 with auto-open
- **Headers**: COOP/COEP for SharedArrayBuffer support
- **Exclude from optimization**: `@rspack/browser`
- **Build target**: `esnext`, minify disabled

### Rspack Configuration (Browser)

When creating in-browser Rspack config:
```javascript
const config = {
  context: '/project',
  entry: './src/index.js',
  output: {
    path: '/dist',
    filename: '[name].[contenthash:8].js',
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        use: [{
          loader: CustomVueLoader,
        }],
      },
    ],
  },
  plugins: [
    new LcapPlugin(),
    new MissingCssFallbackPlugin(),
  ],
};
```

---

## 🚫 What NOT to Do

### Don't Add Testing Infrastructure
This is a demo project with **no tests**. Don't add:
- Test files (`.test.ts`, `.spec.tsx`)
- Test configuration (Jest, Vitest)
- Test utilities or mocks

### Don't Add Linting/Formatting Configs
No ESLint or Prettier:
- No `.eslintrc*` files
- No `.prettierrc*` files
- Follow existing code style by example

### Don't Use Node.js APIs
Code runs in **browser environment only**:
```javascript
// ❌ Bad - Node.js APIs not available
const fs = require('fs');
const path = require('path');

// ✅ Good - Use browser-compatible alternatives
import { builtinMemFs } from '@rspack/browser';
const fs = builtinMemFs.fs;
```

---

## 🎨 UI & User Feedback Patterns

### Show User-Facing Messages
```javascript
showMessage('✅ 打包成功', 'success');
showMessage('❌ 打包失败', 'error');
```

### Update Statistics Display
```javascript
buildTimeEl.textContent = `${duration}ms`;
outputSizeEl.textContent = formatBytes(totalSize);
moduleCountEl.textContent = moduleCount;
```

### Disable Buttons During Operations
```javascript
bundleBtn.disabled = true;
try {
  // Perform operation
} finally {
  bundleBtn.disabled = false;
}
```

---

## 📚 Documentation Standards

This repository has **excellent documentation**:
- **README.md**: Chinese documentation with usage examples
- **docs/**: Complete documentation center
  - **guides/MATCH_RESOURCE_EXPLAINED.md**: Technical deep-dive into loader mechanisms
  - **guides/VUE_BROWSER_GUIDE.md**: Guide for Vue in browser environment
  - **loaders/**: Loader implementation docs
  - **plugins/**: Plugin implementation docs

**When adding features**: Include README.md in the plugin/loader directory explaining:
- Purpose and use case
- Implementation details
- Example usage

---

## 🔑 Key Implementation Details

### Browser Bundling Workflow
1. User clicks "打包代码" (Bundle Code) button
2. Files written to virtual file system via `builtinMemFs.volume.fromJSON(files)`
3. Rspack compiler created with config
4. Compilation runs in browser: `await compiler.run()`
5. Results read from `/dist` in virtual file system
6. Output displayed in UI or downloadable as ZIP

### Custom Vue Loader
- Uses `vue/compiler-sfc` for SFC parsing
- Implements match resource mechanism for proper loader chaining
- Handles `<script setup>`, templates, and scoped styles
- Outputs browser-compatible compiled code

### LCAP Plugin
- Generates chunk map JSON
- Overrides Rspack runtime methods
- Emits client.js for lazy loading
- Critical for proper chunk loading in browser environment

---

## 🎓 Learning Resources

Refer to these docs when working on specific features:
- **Vue loader**: `docs/loaders/vue-loader.md`
- **Match resource**: `docs/guides/MATCH_RESOURCE_EXPLAINED.md`
- **Browser Vue guide**: `docs/guides/VUE_BROWSER_GUIDE.md`
- **Rspack bundler**: `docs/api/RSPACK_BUNDLER.md`

---

**Last Updated**: March 2026  
**Target Audience**: AI coding agents (Claude, GPT-4, Copilot, etc.)
