# Rspack Bundler 工具

## 概述

`rspack-bundler.ts` 是一个独立的 Rspack 打包工具模块，从 `App.tsx` 中提取出来，提供更好的代码组织和可维护性。

## 主要功能

### 1. **bundleWithRspack(options)**
主打包函数，执行完整的 Rspack 打包流程。

**参数：**
```typescript
interface BundleOptions {
  files: FileSystem;           // 虚拟文件系统
  onProgress?: (message: string) => void;  // 进度回调
}
```

**返回值：**
```typescript
interface BundleResult {
  distFiles: Record<string, string>;  // 打包产物文件
  buildStats: BuildStats;             // 构建统计信息
  bundledCode: string;                // 主输出代码
  outputFiles: Record<string, string>; // 所有输出文件
}
```

**示例：**
```typescript
const result = await bundleWithRspack({
  files: myFileSystem,
  onProgress: (msg) => console.log(msg),
});
```

### 2. **getConfigString(files)**
获取 Rspack 配置的可读字符串（用于调试）。

## 内部函数

### cleanDistFiles(files)
清理文件系统中所有 `/dist/` 开头的文件。

### prepareVirtualFiles(files)
准备必要的虚拟文件（如 loader 文件）。

### createRspackConfig(files)
生成完整的 Rspack 配置对象，包括：
- **Entry**: `/src/main.ts`
- **Output**: `/dist/` 目录
- **Loaders**: 
  - Vue SFC loader
  - TypeScript loader
  - JavaScript loader
- **Plugins**:
  - DefinePlugin
  - HtmlRspackPlugin
  - LcapPlugin
  - MissingCssFallbackPlugin
  - MissingFileFallbackPlugin
  - BrowserRequirePlugin
- **Optimization**: 代码分割、runtime chunk 等

### executeCompile(compiler)
执行 Rspack 编译过程。

### processOutputFiles(outputFiles)
处理打包输出文件，计算统计信息。

## 打包流程

1. ✅ 清理旧的 dist 文件
2. ✅ 准备虚拟文件（loader 等）
3. ✅ 写入内存文件系统
4. ✅ 生成 Rspack 配置
5. ✅ 创建编译器
6. ✅ 执行编译
7. ✅ 读取打包结果
8. ✅ 处理输出文件
9. ✅ 计算统计信息

## 使用示例

### 在组件中使用

```typescript
import { bundleWithRspack } from '../utils/rspack-bundler';

const handleBundle = async () => {
  try {
    const result = await bundleWithRspack({
      files: myFiles,
      onProgress: (message) => {
        console.log(message);
      },
    });
    
    console.log('Build Stats:', result.buildStats);
    console.log('Dist Files:', result.distFiles);
  } catch (error) {
    console.error('Bundle failed:', error);
  }
};
```

## 代码结构优势

### 重构前 (App.tsx)
- ❌ 500+ 行组件代码
- ❌ UI 逻辑和打包逻辑混在一起
- ❌ 难以测试和维护
- ❌ 配置对象嵌套在组件中

### 重构后
- ✅ App.tsx 减少到 ~150 行
- ✅ 打包逻辑独立可测试
- ✅ 配置管理集中化
- ✅ 更好的关注点分离
- ✅ 便于添加新功能（如配置导出、多入口打包等）

## 扩展性

通过这次重构，未来可以轻松添加：

1. **配置定制化**
   ```typescript
   bundleWithRspack({
     files,
     config: {
       minimize: true,
       entry: '/src/index.ts',
     },
   });
   ```

2. **多入口打包**
   ```typescript
   bundleMultipleEntries([
     { name: 'app', entry: '/src/main.ts' },
     { name: 'admin', entry: '/src/admin.ts' },
   ]);
   ```

3. **打包缓存**
4. **增量编译**
5. **自定义插件管理**

## 注意事项

- 所有文件操作都在内存中进行（使用 `builtinMemFs`）
- 配置中的 externals 需要在运行环境中提供（如 Vue、VueRouter）
- 打包过程是异步的，需要使用 async/await
- 错误会以 Error 对象形式抛出，需要适当处理

## 相关文件

- `src/utils/rspack-bundler.ts` - 打包工具主文件
- `src/components/App.tsx` - 使用打包工具的主组件
- `src/types.ts` - TypeScript 类型定义
- `src/rspack/loaders/vue/index.js` - Vue loader 实现
- `src/rspack/plugins/` - 自定义插件目录
