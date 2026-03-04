# 浏览器端 Vue Loader

这是一个为 `@rspack/browser` 定制的简化版 Vue Loader，用于在浏览器环境中编译 Vue 单文件组件（SFC）。

## 工作原理

### 1. 解析 Vue 文件

使用 `vue/compiler-sfc` 的 `parse` 函数将 `.vue` 文件解析为 descriptor：

```javascript
const { descriptor, errors } = compiler.parse(source, {
  filename,
  sourceMap: false,
  templateParseOptions: options.compilerOptions || {},
})
```

Descriptor 包含：
- `script` - `<script>` 块
- `scriptSetup` - `<script setup>` 块
- `template` - `<template>` 块
- `styles` - `<style>` 块数组

### 2. 编译 Script

使用 `compileScript` 编译 script 和 script setup：

```javascript
const script = compiler.compileScript(descriptor, {
  id: scopeId,
  isProd: false,
  inlineTemplate: false,
});
```

处理输出：
- 将 `export default` 替换为 `const __default__ =`
- 移除其他 export 语句

### 3. 编译 Template

使用 `compileTemplate` 将模板编译为 render 函数：

```javascript
const templateResult = compiler.compileTemplate({
  source: descriptor.template.content,
  filename: descriptor.filename,
  id: scopeId,
  scoped: descriptor.styles.some(s => s.scoped),
  compilerOptions: {
    mode: 'module',
  },
});
```

输出包含：
- `render` 函数
- 必要的 Vue runtime helpers 导入

### 4. 处理样式

简化版样式处理：
- 提取 `<style>` 内容
- 如果是 scoped，添加属性选择器（简化版）
- 注入到 `<head>` 中

### 5. 组装组件

最终生成的代码结构：

```javascript
/* Vue Component compiled by browser vue-loader */
/* Source: /src/App.vue */

// 1. Script 部分（包含 imports 和组件定义）
import { ref } from 'vue'
const __default__ = {
  setup() {
    const count = ref(0)
    return { count }
  }
}

// 2. Template 编译后的 render 函数
import { createElementVNode as _createElementVNode } from "vue"
export function render(_ctx, _cache) {
  return _createElementVNode("div", null, _ctx.count)
}

// 3. 样式注入
const __style0__ = document.createElement('style');
__style0__.textContent = ".button[data-v-xxx] { color: red; }";
document.head.appendChild(__style0__);

// 4. 组装并导出
__default__.render = render;
__default__.__scopeId = "data-v-xxx";
__default__.__file = "/src/App.vue";

export default __default__;
```

## 使用示例

### Rspack 配置

```javascript
{
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: '/src/rspack/loaders/vue/index.js',
        options: {
          isProd: false,
          compilerOptions: {
            // Vue 模板编译器选项
          }
        }
      }
    ]
  }
}
```

### Vue 组件示例

```vue
<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <button @click="count++">Count: {{ count }}</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const msg = 'Hello Vue in Browser!'
const count = ref(0)
</script>

<style scoped>
.hello {
  color: #42b983;
}
</style>
```

## 与官方 vue-loader 的区别

### 简化之处

1. **不支持 source map** - 浏览器环境简化
2. **简化的样式处理** - 不支持预处理器（SCSS/LESS）
3. **不支持自定义块** - 只处理 script/template/style
4. **简化的 scoped 样式** - 使用简单的正则替换

### 保留的核心功能

1. ✅ `<script setup>` 语法
2. ✅ Template 编译为 render 函数
3. ✅ Scoped styles（简化版）
4. ✅ 组件 hot reload metadata

## 限制

1. **不支持 src imports**
   ```vue
   <!-- ❌ 不支持 -->
   <template src="./template.html"></template>
   ```

2. **不支持预处理器**
   ```vue
   <!-- ❌ 不支持 -->
   <style lang="scss"></style>
   ```

3. **不支持自定义块**
   ```vue
   <!-- ❌ 不支持 -->
   <i18n></i18n>
   ```

## 调试

Loader 会输出详细的日志：

```javascript
console.log("Vue Loader - Processing:", this.resourcePath);
console.log("Vue Loader - Parsed descriptor:", {...});
console.log("Vue Loader - Generated code preview:", ...);
```

在浏览器控制台查看这些日志以调试编译过程。

## 技术细节

### Scope ID 生成

使用简单的 hash 函数生成唯一的 scope id：

```javascript
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}
```

### Template 编译选项

```javascript
compilerOptions: {
  mode: 'module',  // 生成 ES module 导入
}
```

这确保生成的 render 函数使用 ES module 导入 Vue runtime helpers。
