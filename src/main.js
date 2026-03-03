/**
 * Rspack Browser Demo - 主入口文件
 * 在浏览器中使用 @rspack/browser 进行实时打包
 */

import { rspack, builtinMemFs, BrowserRequirePlugin, DefinePlugin, HtmlRspackPlugin, BrowserHttpImportEsmPlugin } from '@rspack/browser';

import LcapPlugin from './rspack/plugins/lcap';
import MissingCssFallbackPlugin from './rspack/plugins/missing-css-fallback';
import MissingFileFallbackPlugin from './rspack/plugins/missing-file-fallback';
import CustomVueLoader from './rspack/loaders/vue';

import files from './files';

// 存储打包结果
let bundledCode = null;
let compiler = null;
let distFilesCache = null; // 缓存打包产物

// 获取 DOM 元素
const bundleBtn = document.getElementById('bundleBtn');
const runBtn = document.getElementById('runBtn');
const downloadBtn = document.getElementById('downloadBtn');
const outputEl = document.getElementById('output');
const messageEl = document.getElementById('message');
const statsEl = document.getElementById('stats');
const filesListEl = document.getElementById('filesList');
const runOutputEl = document.getElementById('runOutput');
const runOutputSection = document.getElementById('runOutputSection');

// 统计信息元素
const buildTimeEl = document.getElementById('buildTime');
const outputSizeEl = document.getElementById('outputSize');
const moduleCountEl = document.getElementById('moduleCount');

/**
 * 显示消息
 */
function showMessage(message, type = 'success') {
  messageEl.innerHTML = `<div class="${type}">${message}</div>`;
  setTimeout(() => {
    messageEl.innerHTML = '';
  }, 5000);
}

/**
 * 格式化字节大小
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 获取文件图标
 */
function getFileIcon(filename) {
  if (filename.endsWith('.js')) return '📜';
  if (filename.endsWith('.css')) return '🎨';
  if (filename.endsWith('.html')) return '📄';
  if (filename.endsWith('.json')) return '📋';
  return '📁';
}

/**
 * 下载单个文件
 */
function downloadSingleFile(path) {
  if (!distFilesCache || !distFilesCache[path]) {
    showMessage('❌ 文件不存在', 'error');
    return;
  }
  
  const filename = path.split('/').pop();
  const content = distFilesCache[path];
  downloadFile(filename, content);
  showMessage(`✅ 已下载: ${filename}`, 'success');
}

/**
 * 查看文件内容
 */
function viewFileContent(path) {
  if (!distFilesCache || !distFilesCache[path]) {
    showMessage('❌ 文件不存在', 'error');
    return;
  }
  
  const content = distFilesCache[path];
  outputEl.textContent = content;
  showMessage(`📄 正在查看: ${path}`, 'success');
}

/**
 * 渲染文件列表
 */
function renderFilesList() {
  if (!distFilesCache || Object.keys(distFilesCache).length === 0) {
    filesListEl.style.display = 'none';
    return;
  }

  filesListEl.style.display = 'block';
  filesListEl.innerHTML = '';

  Object.entries(distFilesCache).forEach(([path, content]) => {
    const filename = path.replace('/dist/', '');
    const size = new Blob([content]).size;
    
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
      <div class="file-info">
        <span class="file-icon">${getFileIcon(filename)}</span>
        <div class="file-details">
          <div class="file-name">${filename}</div>
          <div class="file-size">${formatBytes(size)}</div>
        </div>
      </div>
      <div class="file-actions">
        <button class="btn-small btn-view" onclick="viewFileContent('${path}')">👁️ 查看</button>
        <button class="btn-small btn-download" onclick="downloadSingleFile('${path}')">💾 下载</button>
      </div>
    `;
    filesListEl.appendChild(fileItem);
  });
}

/**
 * 执行打包
 */
async function bundleCode() {
  const startTime = performance.now();
  
  // 更新 UI
  bundleBtn.disabled = true;
  bundleBtn.innerHTML = '<span class="loading"></span> 打包中...';
  outputEl.textContent = '正在打包...';
  runBtn.disabled = true;
  downloadBtn.disabled = true;
  messageEl.innerHTML = '';
  statsEl.style.display = 'none';
  filesListEl.style.display = 'none';
  distFilesCache = null;

  try {
    files['/LOADER/rspack-vue-loader.js'] = '';
    files['/src/App.vue.ts'] = 'console.log("Hello from App.vue");';

    // 将文件内容写入内存文件系统
    builtinMemFs.volume.fromJSON(files);

    console.log('Input File System Contents:', files);

    // 配置 Rspack
    const config = {
      mode: 'production',
      context: '/',
      entry: {
        main: '/src/main.ts',
        // main: '/src/meta-data.ts'
      },
      output: {
        path: '/dist',
        publicPath: '/',
        filename: '[name].[chunkhash:8].js',
        chunkFilename: '[name].[chunkhash:8].js',
      },
      resolve: {
        extensions: ['...', '.mjs', '.ts', '.vue'],
        alias: {
          '@': '/src',
        },
      },
      externals: {
        'vue': 'Vue',
        'vue-router': 'VueRouter',

        'pinia': 'Pinia',
        'vue-i18n': 'VueI18n',
        'lodash': '_',
        'vue/compiler-sfc': 'VueCompilerSfc',
        '@lcap/vant': 'LcapVant',
      },
      module: {
        rules: [
          {
            test: /\.vue$/,
            use: [
              {
                loader: 'builtin:swc-loader',
                options: {
                  jsc: {
                    parser: {
                      syntax: 'typescript',
                    },
                  },
                },
              },
              {
                loader: '/LOADER/rspack-vue-loader.js',
                options: {
                  experimentalInlineMatchResource: true,
                },
              }
            ],
            
          },
          {
            test: /\.ts$/,
            use: {
              loader: 'builtin:swc-loader',
              options: {
                jsc: {
                  parser: {
                    syntax: 'typescript',
                  },
                },
              },
            },
          },
          {
            test: /\.[mc]?js$/,
            type: 'javascript/auto',
            use: [
              {
                loader: 'builtin:swc-loader',
                options: {
                  jsc: {
                    parser: {
                      syntax: 'ecmascript',
                    },
                  },
                },
              },
            ],
          },
        ]
      },
      plugins: [
        new DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify('development'),
          'process.env.BASE_URL': JSON.stringify('/'),
        }),
        new HtmlRspackPlugin({
          template: '/index.html',
          publicPath: '/',
          inject: 'body',
        }),
        new LcapPlugin({
          isDev: false,
          isIncremental: false,
          lastResource: {
            chunksMap: '',
          },
          extra: new Function(files['/client-lazyload-template.js'].replace('module.exports =', 'return'))(),
        }),
        new MissingCssFallbackPlugin({
          pattern: /\/dist-theme\/index\.css$/,
          fallbackContent: '/* CSS theme file not found, using empty fallback */',
        }),
        new MissingFileFallbackPlugin(),
        // new BrowserHttpImportEsmPlugin({ 
        //   domain: 'https://esm.sh',
        //   dependencyUrl(resolvedRequest) {
        //     console.log('BrowserHttpImportEsmPlugin resolving:', resolvedRequest);
        //     // 遇到以 "@/” 开头的请求时，直接返回原请求，跳过插件的重写逻辑
        //     if (resolvedRequest.request.startsWith('@/')) {
              
        //       return resolvedRequest.request;
        //     }
        //     // /src/
        //     if (resolvedRequest.request.startsWith('/src/')) {
        //       return resolvedRequest.request;
        //     }
        //   },
        // }),
        new BrowserRequirePlugin({
          modules: {
            '/LOADER/rspack-vue-loader.js': CustomVueLoader,
          },
        }),
      ],
      optimization: {
        minimize: false,
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          minSize: 0,

          cacheGroups: {
            page: {
              test: /src[\\/]pages[\\/]/,
              name: (module, chunks, cacheGroupKey) => {
                const { resource } = module;
                const moduleName = /[\\/]pages[\\/](.*)\.vue?/.exec(resource)[1].split(/[\\/]/g).join('_');
                return `${cacheGroupKey}_${moduleName}`;
              },
              enforce: true,
              priority: 5,
            },
            routes: {
              test: /src[\\/]router\.ts/,
              name: 'routes',
              enforce: true,
              priority: 4,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              enforce: true,
              priority: 2,
            },
            source: {
              test: /[\\/]src[\\/]/,
              name: 'source',
              enforce: true,
              priority: 1,
            },
          },
        },
      },
      experiments: {
        css: true,
        buildHttp: {
          allowedUris: ['https://'],
        },
      },
    }

    // 打包提示
    outputEl.textContent = '正在使用 Rspack 编译...\n配置: ' + JSON.stringify(config, null, 2);

    // 创建 compiler 并执行打包
    compiler = rspack(config);

    // 执行打包
    await new Promise((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (stats.hasErrors()) {
          const errors = stats.toJson().errors;
          reject(new Error(errors.map(e => e.message).join('\n')));
          return;
        }

        resolve(stats);
      });
    });

    // 从内存文件系统读取打包结果
    const outputFiles = builtinMemFs.volume.toJSON();
    // 收集dist 目录下的文件
    const distFiles = Object.keys(outputFiles).filter(path => path.startsWith('/dist/'));
    if (distFiles.length === 0) {
      throw new Error('打包完成但未找到输出文件');
    }

    // 缓存打包产物
    distFilesCache = distFiles.reduce((acc, path) => {
      acc[path] = outputFiles[path];
      return acc;
    }, {});

    // 输出distFiles
    console.log('Dist Files:', distFiles.map(f => ({
      key: f,
      content: outputFiles[f]
    })));
    
    // 读取主入口文件（通常是 runtime 或包含 main 的文件）
    const mainFile = distFiles.find(f => f.includes('runtime')) || distFiles.find(f => f.includes('main')) || distFiles[0];
    bundledCode = outputFiles[mainFile] || '';
    
    // 如果有多个文件，合并所有 JS 文件
    if (distFiles.length > 1) {
      bundledCode = distFiles
        .filter(f => f.endsWith('.js'))
        .map(f => outputFiles[f])
        .join('\n\n');
    }
    
    const endTime = performance.now();
    const buildTime = (endTime - startTime).toFixed(2);

    // 更新统计信息
    buildTimeEl.textContent = buildTime + ' ms';
    outputSizeEl.textContent = formatBytes(bundledCode.length);
    moduleCountEl.textContent = distFiles.length;
    statsEl.style.display = 'grid';

    // 渲染文件列表
    renderFilesList();

    // 显示打包结果
    outputEl.textContent = bundledCode;
    showMessage('✅ 打包成功！', 'success');
    runBtn.disabled = false;
    downloadBtn.disabled = false;

  } catch (error) {
    console.error('打包错误:', error);
    outputEl.textContent = '打包失败\n\n' + error.message + '\n\n' + (error.stack || '');
    showMessage('❌ 打包失败: ' + error.message, 'error');
    runBtn.disabled = true;
  } finally {
    bundleBtn.disabled = false;
    bundleBtn.innerHTML = '🔨 打包代码';
  }
}

/**
 * 下载单个文件
 */
function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 下载打包产物
 */
async function downloadDistFiles() {
  if (!distFilesCache) {
    showMessage('❌ 没有可下载的产物，请先打包', 'error');
    return;
  }

  try {
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = '<span class="loading"></span> 下载中...';

    const fileEntries = Object.entries(distFilesCache);
    const fileCount = fileEntries.length;
    
    console.log(`准备下载 ${fileCount} 个文件:`, fileEntries.map(([path]) => path));
    
    if (fileCount === 1) {
      // 只有一个文件，直接下载
      const [path, content] = fileEntries[0];
      const filename = path.split('/').pop();
      downloadFile(filename, content);
      showMessage(`✅ 文件已下载: ${filename}`, 'success');
    } else {
      // 多个文件，逐个下载（延迟避免浏览器阻止）
      let downloaded = 0;
      
      for (const [path, content] of fileEntries) {
        const filename = path.replace('/dist/', '');
        
        console.log(`下载文件 ${downloaded + 1}/${fileCount}: ${filename}`);
        
        // 第一个文件立即下载，后续文件延迟
        if (downloaded > 0) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        downloadFile(filename, content);
        downloaded++;
        
        showMessage(`⏳ 下载中... (${downloaded}/${fileCount})`, 'success');
      }
      
      console.log(`所有文件下载完成: ${downloaded}/${fileCount}`);
      showMessage(`✅ 已触发 ${fileCount} 个文件下载。如果浏览器阻止了部分下载，请在地址栏允许多个下载。`, 'success');
    }

  } catch (error) {
    console.error('下载错误:', error);
    showMessage('❌ 下载失败: ' + error.message, 'error');
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.innerHTML = '💾 下载产物';
  }
}

/**
 * 运行打包后的代码
 */
function runBundledCode() {
  if (!bundledCode) {
    showMessage('❌ 没有可运行的代码，请先打包', 'error');
    return;
  }

  runOutputSection.style.display = 'block';
  runOutputEl.textContent = '正在运行...\n';

  // 捕获 console.log 输出
  const originalLog = console.log;
  const originalError = console.error;
  const logs = [];

  console.log = (...args) => {
    logs.push('[LOG] ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' '));
    originalLog.apply(console, args);
  };

  console.error = (...args) => {
    logs.push('[ERROR] ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' '));
    originalError.apply(console, args);
  };

  try {
    // 在新的作用域中执行代码
    const result = eval(bundledCode);
    logs.push('\n[RESULT] ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)));
    runOutputEl.textContent = logs.join('\n');
    showMessage('✅ 代码运行成功！', 'success');
  } catch (error) {
    logs.push('\n[RUNTIME ERROR] ' + error.message + '\n' + error.stack);
    runOutputEl.textContent = logs.join('\n');
    showMessage('❌ 运行错误: ' + error.message, 'error');
  } finally {
    // 恢复原始的 console 方法
    console.log = originalLog;
    console.error = originalError;
  }
}

// 绑定事件
bundleBtn.addEventListener('click', bundleCode);
runBtn.addEventListener('click', runBundledCode);
downloadBtn.addEventListener('click', downloadDistFiles);

// 暴露函数到全局对象，供 HTML onclick 使用
window.downloadSingleFile = downloadSingleFile;
window.viewFileContent = viewFileContent;

// 初始化提示
console.log('🚀 Rspack Browser Demo initialized');
console.log('使用 @rspack/browser 和 builtinMemFs 进行浏览器端打包');
console.log('准备就绪！');
