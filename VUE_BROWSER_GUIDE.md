# Vue 在浏览器环境中的使用指南

## ⚠️ 问题说明

**vue-loader 无法在浏览器中运行**，因为它依赖 Node.js 特定的 API：
- 文件系统 (fs)
- 路径解析 (path)
- Node.js 模块系统
- 编译器工具链

## ✅ 解决方案

### 方案 1：使用 JavaScript 对象定义组件（推荐）

在 `files.js` 中直接使用 JavaScript 定义 Vue 组件：

```javascript
// files.js
export default {
  '/src/App.js': `
    import { defineComponent } from 'vue';
    
    export default defineComponent({
      name: 'App',
      template: \`
        <div id="app">
          <h1>{{ message }}</h1>
          <button @click="count++">Count: {{ count }}</button>
        </div>
      \`,
      setup() {
        const message = ref('Hello Vue!');
        const count = ref(0);
        
        return {
          message,
          count
        };
      }
    });
  `,
  
  '/src/main.ts': `
    import { createApp } from 'vue';
    import App from './App.js';
    
    const app = createApp(App);
    app.mount('#app');
  `
}
```

### 方案 2：使用预编译的渲染函数

如果你有 .vue 文件，可以预先编译成渲染函数：

```javascript
// files.js
export default {
  '/src/components/HelloWorld.js': `
    import { defineComponent, h } from 'vue';
    
    export default defineComponent({
      name: 'HelloWorld',
      props: {
        msg: String
      },
      render() {
        return h('div', { class: 'hello' }, [
          h('h1', this.msg),
          h('button', { 
            onClick: () => console.log('clicked') 
          }, 'Click me')
        ]);
      }
    });
  `
}
```

### 方案 3：使用 JSX/TSX（如果配置了）

```javascript
// files.js
export default {
  '/src/App.tsx': `
    import { defineComponent, ref } from 'vue';
    
    export default defineComponent({
      name: 'App',
      setup() {
        const count = ref(0);
        
        return () => (
          <div>
            <h1>Count: {count.value}</h1>
            <button onClick={() => count.value++}>
              Increment
            </button>
          </div>
        );
      }
    });
  `
}
```

### 方案 4：外部引入浏览器版 Vue 编译器（不推荐）

在 HTML 中使用包含编译器的 Vue 版本：

```html
<!-- index.html -->
<script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
```

然后在代码中使用 template 字符串：

```javascript
const app = Vue.createApp({
  template: `<div>{{ message }}</div>`,
  data() {
    return {
      message: 'Hello!'
    }
  }
});
```

## 📝 最佳实践

### 1. 组件结构

```javascript
// 推荐的组件定义方式
export default {
  '/src/components/Counter.js': `
    import { defineComponent, ref } from 'vue';
    
    export default defineComponent({
      name: 'Counter',
      
      props: {
        initialValue: {
          type: Number,
          default: 0
        }
      },
      
      emits: ['update'],
      
      setup(props, { emit }) {
        const count = ref(props.initialValue);
        
        const increment = () => {
          count.value++;
          emit('update', count.value);
        };
        
        return {
          count,
          increment
        };
      },
      
      template: \`
        <div class="counter">
          <p>Count: {{ count }}</p>
          <button @click="increment">+1</button>
        </div>
      \`
    });
  `
}
```

### 2. 样式处理

内联样式或使用 CSS 文件：

```javascript
export default {
  '/src/components/MyComponent.js': `
    import { defineComponent } from 'vue';
    import './MyComponent.css';  // CSS 导入
    
    export default defineComponent({
      name: 'MyComponent',
      template: \`
        <div class="my-component">
          <h1>Styled Component</h1>
        </div>
      \`
    });
  `,
  
  '/src/components/MyComponent.css': `
    .my-component {
      padding: 20px;
      background: #f5f5f5;
    }
    
    .my-component h1 {
      color: #42b983;
    }
  `
}
```

### 3. 组合式 API 推荐结构

```javascript
export default {
  '/src/composables/useCounter.js': `
    import { ref, computed } from 'vue';
    
    export function useCounter(initialValue = 0) {
      const count = ref(initialValue);
      const double = computed(() => count.value * 2);
      
      const increment = () => count.value++;
      const decrement = () => count.value--;
      const reset = () => count.value = initialValue;
      
      return {
        count,
        double,
        increment,
        decrement,
        reset
      };
    }
  `,
  
  '/src/components/CounterDisplay.js': `
    import { defineComponent } from 'vue';
    import { useCounter } from '../composables/useCounter.js';
    
    export default defineComponent({
      name: 'CounterDisplay',
      setup() {
        const { count, double, increment, decrement, reset } = useCounter(10);
        
        return {
          count,
          double,
          increment,
          decrement,
          reset
        };
      },
      template: \`
        <div>
          <p>Count: {{ count }}</p>
          <p>Double: {{ double }}</p>
          <button @click="increment">+</button>
          <button @click="decrement">-</button>
          <button @click="reset">Reset</button>
        </div>
      \`
    });
  `
}
```

## 🔧 Rspack 配置

当前配置已移除 vue-loader，.vue 文件被视为 asset/source：

```javascript
module: {
  rules: [
    {
      test: /\.vue$/,
      type: 'asset/source',  // 作为文本读取
    },
    // ... 其他规则
  ]
}
```

## 💡 迁移建议

如果你有现有的 .vue 文件需要迁移到浏览器环境：

1. **模板部分** → 转为 `template` 字符串或 `render` 函数
2. **脚本部分** → 保持不变（使用 `setup` 或 Options API）
3. **样式部分** → 提取到独立的 .css 文件

### 迁移示例

```vue
<!-- 原始 .vue 文件 -->
<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
  </div>
</template>

<script setup>
const msg = ref('Hello World');
</script>

<style scoped>
.hello { color: red; }
</style>
```

转换为：

```javascript
// files.js
export default {
  '/src/components/Hello.js': `
    import { defineComponent, ref } from 'vue';
    import './Hello.css';
    
    export default defineComponent({
      name: 'Hello',
      setup() {
        const msg = ref('Hello World');
        return { msg };
      },
      template: \`
        <div class="hello">
          <h1>{{ msg }}</h1>
        </div>
      \`
    });
  `,
  
  '/src/components/Hello.css': `
    .hello { color: red; }
  `
}
```

## 📚 相关资源

- [Vue 3 文档 - 渲染函数](https://cn.vuejs.org/guide/extras/render-function.html)
- [Vue 3 文档 - 组合式 API](https://cn.vuejs.org/guide/extras/composition-api-faq.html)
- [Rspack 文档](https://rspack.dev/)
