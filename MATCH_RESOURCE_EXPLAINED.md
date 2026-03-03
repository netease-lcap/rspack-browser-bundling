# Vue Loader Match Resource 机制详解

## 问题背景

当处理 `.vue` 文件时，Vue Loader 需要：
1. 将单文件组件拆分为 script、template、style 等部分
2. 让每个部分使用对应的 loader 处理（如 TypeScript、SCSS）
3. 不创建物理文件的情况下完成这个过程

## Match Resource 语法

格式：`虚拟路径!=!实际加载路径`

例如：
```
./App.vue.ts?vue&type=script&lang=ts!=!rspack-vue-loader.js!./App.vue?vue&type=script&lang=ts
```

## 解析过程

### 步骤 1: 分离两部分

Webpack/Rspack 会将 `!=!` 作为分隔符：

- **左边（Match Resource）**: `./App.vue.ts?vue&type=script&lang=ts`
  - 用于**匹配规则**
  - 文件不需要真实存在
  
- **右边（Actual Resource）**: `rspack-vue-loader.js!./App.vue?vue&type=script&lang=ts`
  - 实际读取的资源
  - 真实的文件路径和 loader 链

### 步骤 2: 规则匹配

使用左边的虚拟路径去匹配 webpack 配置中的规则：

```javascript
// 你的 webpack 配置可能有这样的规则：
{
  test: /\.ts$/,
  loader: 'ts-loader'
}
```

因为左边是 `App.vue.ts`，所以会匹配到 TypeScript 规则！

### 步骤 3: 实际加载

但实际读取时，使用右边的路径：
1. 读取 `App.vue` 文件
2. 通过 vue-loader 提取 script 部分
3. 然后应用匹配到的 ts-loader

## 完整示例

假设有这个 Vue 文件：

```vue
<script setup lang="ts">
import { ref } from 'vue'
const count = ref<number>(0)
</script>
```

### 处理流程：

1. **第一次经过 vue-loader**
   - 读取 `App.vue`
   - 识别到 `<script lang="ts">`
   - 生成 import：
   ```javascript
   import script from './App.vue.ts?vue&type=script&lang=ts!=!vue-loader!./App.vue?vue&type=script&lang=ts'
   ```

2. **Match Resource 匹配**
   - 路径：`./App.vue.ts?vue&type=script&lang=ts`
   - 匹配规则：`/\.ts$/` → 应用 `ts-loader`

3. **实际加载**
   - 读取：`./App.vue`
   - 经过：`vue-loader` → 提取 script 块
   - 经过：`ts-loader` → 编译 TypeScript
   - 输出：编译后的 JavaScript

## 关键代码

### genMatchResource 函数

```javascript
function genMatchResource(context, resourcePath, resourceQuery, lang) {
    const loaders = [...]; // 当前 loader 链
    const loaderString = loaders.join('!');
    
    // 格式：虚拟路径(带扩展名)!=!loader链!真实路径
    return `${resourcePath}${lang ? `.${lang}` : ''}${resourceQuery}!=!${loaderString}!${resourcePath}${resourceQuery}`;
}
```

### 在 index.js 中的使用

```javascript
if (enableInlineMatchResource) {
    // 生成: App.vue.ts?query!=!loaders!App.vue?query
    scriptRequest = stringifyRequest(
        genMatchResource(this, src, query, lang || 'js')
    );
} else {
    // 传统方式: App.vue?query
    scriptRequest = stringifyRequest(src + query);
}

scriptImport = `import script from ${scriptRequest}`;
```

## 优势

1. **不需要创建临时文件** - App.vue.ts 不需要真实存在
2. **复用现有规则** - 自动应用项目中配置的 TypeScript/JavaScript 规则
3. **保持一致性** - Vue 组件的代码块和独立文件使用相同的处理流程

## 启用方式

在 Vue Loader 选项中：

```javascript
{
  loader: 'rspack-vue-loader',
  options: {
    experimentalInlineMatchResource: true  // 启用这个特性
  }
}
```

## 浏览器环境的挑战

在浏览器中运行 bundler 时，这个机制需要：
- 虚拟文件系统支持
- 正确的路径解析
- Loader 运行时环境

这就是为什么你可能需要额外的 polyfill 和配置来支持这个特性。
