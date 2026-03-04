# Vue Loader 样式处理说明

## 新的样式处理方式

样式现在通过以下方式处理：

### 1. 写入 MemFS

每个 `<style>` 块会被写入内存文件系统（memfs）：

```javascript
// 对于 App.vue 的第一个 style 块
builtinMemFs.volume.writeFileSync('/src/App.vue.0.css', content);
```

文件命名规则：`原文件名.索引.扩展名`

### 2. 生成 Import 语句

在生成的代码顶部添加样式导入：

```javascript
/* Vue Component compiled by browser vue-loader */
/* Source: /src/App.vue */

import '/src/App.vue.0.css';

// 其余组件代码...
```

## 完整示例

### 输入 Vue 文件

```vue
<!-- /src/App.vue -->
<template>
  <div class="app">
    <h1>Hello Vue</h1>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<style scoped>
.app {
  color: red;
  font-size: 16px;
}
</style>

<style>
body {
  margin: 0;
}
</style>
```

### 处理过程

1. **解析出 2 个 style 块**
   - Style 0: scoped
   - Style 1: global

2. **处理 scoped 样式**
   ```css
   .app[data-v-7a7a37b1] {
     color: red;
     font-size: 16px;
   }
   ```

3. **写入 MemFS**
   - `/src/App.vue.0.css` - scoped 样式
   - `/src/App.vue.1.css` - global 样式

4. **生成的代码**
   ```javascript
   /* Vue Component compiled by browser vue-loader */
   /* Source: /src/App.vue */

   import '/src/App.vue.0.css';
   import '/src/App.vue.1.css';

   import { ref } from 'vue'
   const __default__ = {
     setup() {
       const count = ref(0)
       return { count }
     }
   }

   import { createElementVNode as _createElementVNode } from "vue"
   export function render(_ctx, _cache) {
     return _createElementVNode("div", { class: "app" }, [
       _createElementVNode("h1", null, "Hello Vue")
     ])
   }

   __default__.render = render;
   __default__.__scopeId = "data-v-7a7a37b1";
   __default__.__file = "/src/App.vue";

   export default __default__;
   ```

## 与 Rspack 配置

确保 Rspack 配置支持 CSS 导入：

```javascript
{
  module: {
    rules: [
      {
        test: /\.css$/,
        type: 'css',  // 使用 Rspack 的 CSS 支持
      },
      // 或者使用 loader
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  experiments: {
    css: true  // 启用实验性 CSS 支持
  }
}
```

## 优势

### 与旧方式对比

#### 旧方式（DOM 注入）
```javascript
const __style0__ = document.createElement('style');
__style0__.textContent = ".app { color: red; }";
document.head.appendChild(__style0__);
```

**缺点：**
- 样式在运行时注入，可能导致 FOUC
- 无法被 CSS loader 处理（压缩、autoprefixer 等）
- 无法利用 CSS 模块系统
- 难以调试

#### 新方式（MemFS + Import）
```javascript
import '/src/App.vue.0.css';
```

**优点：**
- ✅ 样式作为模块被正确处理
- ✅ 可以被 CSS loader 链处理
- ✅ 支持 HMR（如果配置了）
- ✅ 更好的开发体验
- ✅ 符合标准的模块导入方式

## 调试

### 查看写入的样式文件

```javascript
import { builtinMemFs } from '@rspack/browser';

// 列出所有 .css 文件
const files = builtinMemFs.volume.toJSON();
Object.keys(files)
  .filter(path => path.endsWith('.css'))
  .forEach(path => {
    console.log(path, files[path]);
  });
```

### Loader 日志

Loader 会输出详细日志：

```
Vue Loader - Processing: /src/App.vue
Vue Loader - Style written to memfs: /src/App.vue.0.css
Vue Loader - Style written to memfs: /src/App.vue.1.css
Vue Loader - Style files written: ['/src/App.vue.0.css', '/src/App.vue.1.css']
```

## 限制

目前的简化实现：

1. **不支持预处理器**
   ```vue
   <!-- ❌ 暂不支持 -->
   <style lang="scss"></style>
   ```
   需要额外配置 SCSS loader

2. **简化的 scoped 处理**
   使用正则替换添加属性选择器，可能在复杂选择器中失效

3. **不支持 CSS Modules**
   ```vue
   <!-- ❌ 暂不支持 -->
   <style module></style>
   ```

## 扩展建议

如需支持预处理器，可以在 genStyleCode 中添加：

```javascript
if (style.lang === 'scss') {
  // 使用 sass.js 编译
  content = compileSass(content);
}
```

然后将编译后的 CSS 写入 memfs。
