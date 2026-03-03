# AGENTS.md - AI Coding Agent Guidelines

This document provides comprehensive guidelines for AI coding agents working in the **rspack-browser-demo** repository. This is a proof-of-concept project demonstrating Rspack bundling entirely in the browser using `@rspack/browser`.

---

## 🏗️ Build, Dev & Preview Commands

```bash
# Start development server (Vite on port 3000)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

**Note**: This project has **no linting, testing, or TypeScript compilation scripts**. It's a minimal demo focused on browser-based bundling capabilities.

---

## 📦 Project Structure

```
rspack-browser-demo/
├── index.html              # Main HTML entry point
├── vite.config.js          # Vite build configuration
├── package.json            # Dependencies and scripts
└── src/
    ├── main.js             # Main application logic (551 lines)
    ├── files.js            # Virtual file system definitions
    └── rspack/
        ├── loaders/vue/    # Custom Vue loader for browser
        └── plugins/        # Custom Rspack plugins
            ├── lcap/
            ├── missing-css-fallback/
            └── missing-file-fallback/
```

---

## 🎯 Project Context

### Purpose
- **Browser-based bundling**: Runs Rspack compiler entirely in browser environment
- **Virtual file system**: All files stored in memory using `builtinMemFs`
- **Custom loaders/plugins**: Demonstrates extensibility of Rspack browser API
- **Vue SFC compilation**: Compiles Vue components in browser without build step

### Key Technologies
- **Build Tool**: Vite (for demo development) + `@rspack/browser` (for in-browser bundling)
- **Package Manager**: pnpm
- **Module System**: ES Modules exclusively (`"type": "module"`)
- **Language**: Pure JavaScript (no TypeScript)
- **Framework**: Vue 3.5.13

---

## 📝 Code Style Guidelines

### Import Conventions

**Always use ES Modules** - No CommonJS in source files:
```javascript
// ✅ Good - Named imports from external packages
import { rspack, builtinMemFs, BrowserRequirePlugin } from '@rspack/browser';

// ✅ Good - Default imports for custom modules
import LcapPlugin from './rspack/plugins/lcap';
import files from './files';

// ❌ Bad - No CommonJS
const rspack = require('@rspack/browser');
```

**Prefer named imports** for external libraries, **default exports** for custom classes/plugins.

### Naming Conventions

```javascript
// ✅ camelCase for variables and functions
let bundledCode = null;
function formatBytes(bytes) { ... }

// ✅ PascalCase for classes and plugin names
class MissingFileFallbackPlugin { ... }
export default class CustomVueLoader { ... }

// ✅ Double-underscore prefix for private/internal methods
__getOrCreateDataSource() { ... }

// ✅ kebab-case for DOM element IDs
const bundleBtn = document.getElementById('bundle-btn');
```

### Function Style

```javascript
// ✅ Arrow functions for callbacks and utilities
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  // ...
};

// ✅ Traditional functions for main logic
function showMessage(message, type = 'success') {
  messageEl.innerHTML = `<div class="${type}">${message}</div>`;
}

// ✅ Async/await for asynchronous operations
async function bundleCode() {
  try {
    await compiler.run();
  } catch (error) {
    console.error('打包错误:', error);
  }
}

// ✅ Default parameters
constructor(options = {}) {
  this.options = { files: [], ...options };
}
```

### Error Handling

**Use try-catch-finally** for critical operations:
```javascript
try {
  const stats = await compiler.run();
  // Process results
} catch (error) {
  console.error('打包错误:', error);
  outputEl.textContent = '打包失败\n\n' + error.message;
  showMessage('❌ 打包失败', 'error');
} finally {
  bundleBtn.disabled = false;
}
```

**Graceful degradation** - log errors but don't crash:
```javascript
try {
  const resolvedPath = resolver.resolveSync(null, context, request);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error('File not found');
  }
} catch (e) {
  console.log(`[Plugin] file not found: ${request}, using fallback`);
  resource.request = fallbackFilesFn(request);
}
```

### Comments & Documentation

```javascript
/**
 * JSDoc-style for functions (Chinese is acceptable)
 */
async function bundleCode() { ... }

// Inline comments for business logic
// 从内存文件系统读取打包结果
const distFiles = builtinMemFs.volume.toJSON('/dist');

/* Block comments for major sections */
/* Vue Component compiled by browser vue-loader */
```

**Language**: Both Chinese and English comments are acceptable. This codebase uses Chinese extensively.

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
- Test files (`.test.js`, `.spec.js`)
- Test configuration (Jest, Vitest)
- Test utilities or mocks

### Don't Add TypeScript
This project uses **pure JavaScript**:
- No `.ts` files in src/
- No `tsconfig.json`
- No TypeScript compilation

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
- **MATCH_RESOURCE_EXPLAINED.md**: Technical deep-dive into loader mechanisms
- **VUE_BROWSER_GUIDE.md**: Guide for Vue in browser environment
- **Plugin READMEs**: Each plugin has detailed documentation

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
- **Vue loader**: `src/rspack/loaders/vue/README.md`
- **Match resource**: `MATCH_RESOURCE_EXPLAINED.md`
- **LCAP plugin**: `src/rspack/plugins/lcap/README.md` (if exists)
- **Browser Vue guide**: `VUE_BROWSER_GUIDE.md`

---

**Last Updated**: March 2026  
**Target Audience**: AI coding agents (Claude, GPT-4, Copilot, etc.)
