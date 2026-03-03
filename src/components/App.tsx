import React, { useState, useCallback, useRef, useEffect } from 'react';
import { rspack, builtinMemFs, BrowserRequirePlugin, DefinePlugin, HtmlRspackPlugin } from '@rspack/browser';

import FileTree from './FileTree';
import MonacoEditor from './MonacoEditor';
import OperationPanel from './OperationPanel';

import filesData from '../files';
import CustomVueLoader from '../rspack/loaders/vue';
import LcapPlugin from '../rspack/plugins/lcap';
import MissingCssFallbackPlugin from '../rspack/plugins/missing-css-fallback';
import MissingFileFallbackPlugin from '../rspack/plugins/missing-file-fallback';

import type { FileSystem, BuildStats, DistFile, MonacoEditorInstance } from '../types';

const App: React.FC = () => {
  // 状态管理
  const [files, setFiles] = useState<FileSystem>({ ...filesData });
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [distFiles, setDistFiles] = useState<Record<string, string> | null>(null);
  const [buildStats, setBuildStats] = useState<BuildStats | null>(null);
  const [buildOutput, setBuildOutput] = useState<string>('');
  const [runOutput, setRunOutput] = useState<string>('');
  const [isRunOutputVisible, setIsRunOutputVisible] = useState<boolean>(false);
  const [isBundling, setIsBundling] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Refs
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const compilerRef = useRef<any>(null);

  // 显示消息
  const showMessage = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  // 处理文件选择
  const handleFileSelect = useCallback((path: string) => {
    setCurrentFile(path);
  }, []);

  // 处理文件保存
  const handleFileSave = useCallback((path: string, content: string) => {
    setFiles((prev) => ({
      ...prev,
      [path]: content,
    }));
    showMessage(`✅ 已保存: ${path}`, 'success');
  }, [showMessage]);

  // 打包代码
  const handleBundle = useCallback(async () => {
    const startTime = performance.now();

    setIsBundling(true);
    setBuildOutput('正在打包...');
    setBuildStats(null);
    setDistFiles(null);
    setMessage(null);

    try {
      // 清理之前的 dist 文件
      const cleanedFiles = { ...files };
      Object.keys(cleanedFiles).forEach((path) => {
        if (path.startsWith('/dist/')) {
          delete cleanedFiles[path];
        }
      });

      // 准备必要的文件
      cleanedFiles['/LOADER/rspack-vue-loader.js'] = '';
      cleanedFiles['/src/App.vue.ts'] = 'console.log("Hello from App.vue");';

      // 写入内存文件系统
      builtinMemFs.volume.fromJSON(cleanedFiles);

      console.log('Input File System Contents:', cleanedFiles);

      // Rspack 配置
      const config = {
        mode: 'production' as const,
        context: '/',
        entry: {
          main: '/src/main.ts',
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
          vue: 'Vue',
          'vue-router': 'VueRouter',
          pinia: 'Pinia',
          'vue-i18n': 'VueI18n',
          lodash: '_',
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
                },
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
          ],
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
            extra: new Function(
              cleanedFiles['/client-lazyload-template.js'].replace('module.exports =', 'return')
            )(),
          }),
          new MissingCssFallbackPlugin({
            pattern: /\/dist-theme\/index\.css$/,
            fallbackContent: '/* CSS theme file not found, using empty fallback */',
          }),
          new MissingFileFallbackPlugin(),
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
            chunks: 'all' as const,
            minSize: 0,
            cacheGroups: {
              page: {
                test: /src[\\/]pages[\\/]/,
                name: (module: any, chunks: any, cacheGroupKey: string) => {
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
      };

      setBuildOutput('正在使用 Rspack 编译...\n配置: ' + JSON.stringify(config, null, 2));

      // 创建 compiler 并执行打包
      compilerRef.current = rspack(config);

      await new Promise<void>((resolve, reject) => {
        compilerRef.current.run((err: Error | null, stats: any) => {
          if (err) {
            reject(err);
            return;
          }

          if (stats.hasErrors()) {
            const errors = stats.toJson().errors;
            reject(new Error(errors.map((e: any) => e.message).join('\n')));
            return;
          }

          resolve();
        });
      });

      // 从内存文件系统读取打包结果
      const outputFiles = builtinMemFs.volume.toJSON();
      const distPaths = Object.keys(outputFiles).filter((path) => path.startsWith('/dist/'));

      if (distPaths.length === 0) {
        throw new Error('打包完成但未找到输出文件');
      }

      // 缓存打包产物
      const distFilesCache = distPaths.reduce((acc: Record<string, string>, path) => {
        acc[path] = outputFiles[path];
        return acc;
      }, {});

      setDistFiles(distFilesCache);

      // 将 dist 文件添加到文件系统（用于文件树显示）
      setFiles((prev) => {
        const newFiles = { ...prev };
        distPaths.forEach((path) => {
          newFiles[path] = outputFiles[path];
        });
        return newFiles;
      });

      // 读取主代码
      const mainFile =
        distPaths.find((f) => f.includes('runtime')) ||
        distPaths.find((f) => f.includes('main')) ||
        distPaths[0];
      const bundledCode = outputFiles[mainFile] || '';

      const endTime = performance.now();
      const buildTime = (endTime - startTime).toFixed(2);

      // 统计信息
      const totalSize = distPaths.reduce((sum, path) => {
        return sum + new Blob([outputFiles[path]]).size;
      }, 0);

      setBuildStats({
        buildTime,
        outputSize: totalSize,
        moduleCount: distPaths.length,
      });

      setBuildOutput(bundledCode);
      showMessage('✅ 打包成功！', 'success');

      console.log('Dist Files:', distPaths.map((f) => ({ key: f, content: outputFiles[f] })));
    } catch (error: any) {
      console.error('打包错误:', error);
      setBuildOutput('打包失败\n\n' + error.message + '\n\n' + (error.stack || ''));
      showMessage('❌ 打包失败: ' + error.message, 'error');
    } finally {
      setIsBundling(false);
    }
  }, [files, showMessage]);

  // 运行打包后的代码
  const handleRun = useCallback(() => {
    if (!buildOutput || !distFiles) {
      showMessage('❌ 没有可运行的代码，请先打包', 'error');
      return;
    }

    setIsRunOutputVisible(true);
    setRunOutput('正在运行...\n');

    // 捕获 console 输出
    const originalLog = console.log;
    const originalError = console.error;
    const logs: string[] = [];

    console.log = (...args: any[]) => {
      logs.push(
        '[LOG] ' +
          args
            .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
            .join(' ')
      );
      originalLog.apply(console, args);
    };

    console.error = (...args: any[]) => {
      logs.push(
        '[ERROR] ' +
          args
            .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
            .join(' ')
      );
      originalError.apply(console, args);
    };

    try {
      const result = eval(buildOutput);
      logs.push(
        '\n[RESULT] ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result))
      );
      setRunOutput(logs.join('\n'));
      showMessage('✅ 代码运行成功！', 'success');
    } catch (error: any) {
      logs.push('\n[RUNTIME ERROR] ' + error.message + '\n' + error.stack);
      setRunOutput(logs.join('\n'));
      showMessage('❌ 运行错误: ' + error.message, 'error');
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  }, [buildOutput, distFiles, showMessage]);

  // 下载产物
  const handleDownload = useCallback(async () => {
    if (!distFiles) {
      showMessage('❌ 没有可下载的产物，请先打包', 'error');
      return;
    }

    try {
      const fileEntries = Object.entries(distFiles);
      const fileCount = fileEntries.length;

      console.log(`准备下载 ${fileCount} 个文件:`, fileEntries.map(([path]) => path));

      if (fileCount === 1) {
        const [path, content] = fileEntries[0];
        const filename = path.split('/').pop() || 'output.js';
        const blob = new Blob([content], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage(`✅ 文件已下载: ${filename}`, 'success');
      } else {
        let downloaded = 0;

        for (const [path, content] of fileEntries) {
          const filename = path.replace('/dist/', '');

          if (downloaded > 0) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }

          const blob = new Blob([content], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          downloaded++;
          showMessage(`⏳ 下载中... (${downloaded}/${fileCount})`, 'success');
        }

        showMessage(
          `✅ 已触发 ${fileCount} 个文件下载。如果浏览器阻止了部分下载，请在地址栏允许多个下载。`,
          'success'
        );
      }
    } catch (error: any) {
      console.error('下载错误:', error);
      showMessage('❌ 下载失败: ' + error.message, 'error');
    }
  }, [distFiles, showMessage]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      {/* 顶部标题栏 */}
      <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-6 py-4">
        <h1 className="text-3xl font-bold text-center">🚀 Rspack Browser Bundling</h1>
        <p className="text-center text-sm opacity-90 mt-1">在浏览器中实时打包 JavaScript 代码</p>
      </div>

      {/* 消息提示 */}
      {message && (
        <div
          className={`fixed top-20 right-4 z-50 px-4 py-2 rounded shadow-lg ${
            message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 主容器 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧文件树 */}
        <div className="w-80 border-r border-gray-300 flex flex-col overflow-hidden bg-white">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">📁 项目文件</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <FileTree files={files} onFileSelect={handleFileSelect} currentFile={currentFile} />
          </div>
        </div>

        {/* 中间编辑器 */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <MonacoEditor
            ref={editorRef}
            files={files}
            currentFile={currentFile}
            onSave={handleFileSave}
          />
        </div>

        {/* 右侧操作面板 */}
        <div className="w-96 border-l border-gray-300 flex flex-col overflow-hidden bg-gray-50">
          <OperationPanel
            onBundle={handleBundle}
            onRun={handleRun}
            onDownload={handleDownload}
            isBundling={isBundling}
            buildStats={buildStats}
            distFiles={distFiles}
            buildOutput={buildOutput}
            runOutput={runOutput}
            isRunOutputVisible={isRunOutputVisible}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
