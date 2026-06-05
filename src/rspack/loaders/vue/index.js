/**
 * 兼容浏览器端@rspack/browser的vue-loader
 */
import { builtinMemFs } from '@rspack/browser'; 
import * as compiler from 'vue/compiler-sfc'

function genScriptCode(descriptor, scopeId, options, hasTemplate) {
  if (!descriptor.script && !descriptor.scriptSetup) {
    return 'const __default__ = {}';
  }

  try {
    // 使用 compileScript 编译 script 和 script setup
    // 关键：当有 template 时，不使用 inlineTemplate
    const script = compiler.compileScript(descriptor, {
      id: scopeId,
      isProd: options.isProd || false,
      inlineTemplate: false, // 始终分开编译，以便我们控制组装
      templateOptions: hasTemplate ? {
        id: scopeId,
        scoped: descriptor.styles.some(s => s.scoped),
        slotted: descriptor.slotted,
      } : undefined,
    });

    // compileScript 返回的 content 包含所有必要的代码
    let content = script.content;
    
    // 对于 script setup，content 会包含 setup() 函数定义
    // 我们需要确保正确导出这个定义
    
    // 替换 export default 为变量赋值
    content = content.replace(/\nexport default\s+/, '\nconst __default__ = ');
    
    // 确保有 __default__ 定义
    if (!content.includes('const __default__')) {
      content += '\nconst __default__ = {};';
    }
    
    console.log('Vue Loader - Compiled script preview:', content.substring(0, 500));
    
    return content;
  } catch (e) {
    console.error('Script compilation error:', e);
    return 'const __default__ = {}';
  }
}

function genTemplateCode(descriptor, scopeId, options) {
  if (!descriptor.template) {
    return '';
  }

  try {
    // 编译 template 成 render 函数
    const templateResult = compiler.compileTemplate({
      source: descriptor.template.content,
      filename: descriptor.filename,
      id: scopeId,
      scoped: descriptor.styles.some(s => s.scoped),
      slotted: descriptor.slotted,
      isProd: options.isProd || false,
      compilerOptions: {
        mode: 'module',
        ...options.compilerOptions,
      },
    });

    if (templateResult.errors && templateResult.errors.length) {
      console.error('Template compilation errors:', templateResult.errors);
      templateResult.errors.forEach(err => {
        console.error('  -', err);
      });
    }

    if (templateResult.tips && templateResult.tips.length) {
      templateResult.tips.forEach(tip => {
        console.warn('Template tip:', tip);
      });
    }

    return templateResult.code;
  } catch (e) {
    console.error('Template compilation error:', e);
    return '';
  }
}

function genStyleCode(descriptor, scopeId, filename, loaderContext) {
  if (!descriptor.styles || descriptor.styles.length === 0) {
    return { imports: [], files: [] };
  }

  const imports = [];
  const files = [];

  descriptor.styles.forEach((style, i) => {
    const scoped = style.scoped ? `[data-v-${scopeId}]` : '';
    let content = style.content;
    
    // 如果是 scoped，需要添加属性选择器（简化版）
    if (scoped) {
      content = content.replace(/([^\r\n,{}]+)(,(?=[^}]*{)|\s*{)/g, `$1${scoped}$2`);
    }
    
    // 生成样式文件名
    const ext = style.lang || 'css';
    const styleFilename = `${filename}.${i}.${ext}`;
    
    // 写入 memfs
    try {
      builtinMemFs.volume.writeFileSync(styleFilename, content);
    } catch (e) {
      console.error(`Vue Loader - Failed to write style to memfs:`, e);
    }
    
    // 生成 import 语句
    imports.push(`import '${styleFilename}';`);
    files.push({ filename: styleFilename, content });
  });

  return { imports, files };
}

export default function loader(source) {
  let options = this.getOptions() || {};

  const filename = this.resourcePath.replace(/\?.*$/, '');
  const { descriptor, errors } = compiler.parse(source, {
    filename,
    sourceMap: false,
    templateParseOptions: options.compilerOptions || {},
  })
  
  if (errors.length) {
    console.error("Vue Loader - Parse errors:", errors);
    errors.forEach(err => this.emitError(err));
    return '';
  }

  // 生成唯一的 scope id
  const scopeId = 'data-v-' + hashCode(filename);
  
  const hasTemplate = !!descriptor.template;
  const hasScriptSetup = !!descriptor.scriptSetup;

  // 对于 script setup + template，使用 inlineTemplate 选项
  // 让 compileScript 自动处理模板编译
  let code = '';
  
  // 添加注释说明
  code += `/* Vue Component compiled by browser vue-loader */\n`;
  code += `/* Source: ${filename} */\n\n`;

  // 先处理样式
  const styleResult = genStyleCode(descriptor, scopeId, filename, this);
  if (styleResult.imports.length > 0) {
    code += styleResult.imports.join('\n') + '\n\n';
  }

  if (hasScriptSetup && hasTemplate) {
    // Script Setup + Template: 使用 inlineTemplate 让 compileScript 处理一切
    try {
      const script = compiler.compileScript(descriptor, {
        id: scopeId,
        isProd: options.isProd || false,
        inlineTemplate: true, // 自动内联模板编译
        templateOptions: {
          scoped: descriptor.styles.some(s => s.scoped),
          compilerOptions: options.compilerOptions || {},
        },
      });

      // 转换 export default 为变量赋值
      let content = script.content;
      content = content.replace(/\nexport default\s+/, '\nconst __default__ = ');
      if (!content.includes('const __default__')) {
        content += '\nconst __default__ = {};';
      }

      code += content + '\n\n';
      code += `__default__.__scopeId = "${scopeId}";\n`;
      code += `__default__.__file = ${JSON.stringify(filename)};\n\n`;
      code += genHmrCode(scopeId) + '\n\n';
      code += `export default __default__;\n`;
      
    } catch (e) {
      console.error('Script compilation with inline template error:', e);
      code += 'export default {};\n';
    }
  } else {
    // 传统方式：分别编译 script 和 template
    const scriptCode = genScriptCode(descriptor, scopeId, options, hasTemplate);
    const templateCode = genTemplateCode(descriptor, scopeId, options);

    code += scriptCode + '\n\n';
    if (templateCode) {
      code += templateCode + '\n\n';
    }

    // 组装组件
    if (templateCode) {
      code += `
// 组装组件
__default__.render = render;
__default__.__scopeId = "${scopeId}";
__default__.__file = ${JSON.stringify(filename)};
${genHmrCode(scopeId)}

export default __default__;
`;
    } else {
      code += `
__default__.__scopeId = "${scopeId}";
__default__.__file = ${JSON.stringify(filename)};
${genHmrCode(scopeId)}

export default __default__;
`;
    }
  }
  
  return code;
}

// HMR 注入代码
function genHmrCode(hmrId) {
  return `
  if (module.hot) {
    __default__.__hmrId = "${hmrId}";
    const __hmr_api__ = typeof globalThis !== 'undefined' ? globalThis.__VUE_HMR_RUNTIME__ : undefined;
    if (__hmr_api__) {
      if (!module.hot.data) {
        __hmr_api__.createRecord("${hmrId}", __default__);
      } else {
        __hmr_api__.reload("${hmrId}", __default__);
      }
    } else {
      console.error('[HMR] Vue HMR runtime is not available.');
    }
    module.hot.accept();
    module.hot.dispose(function(data) { data.reload = true; });
  }`;
}

// 简单的 hash 函数
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}