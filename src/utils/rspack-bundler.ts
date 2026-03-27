import { rspack, builtinMemFs, BrowserRequirePlugin, DefinePlugin, HtmlRspackPlugin } from '@rspack/browser';
// @ts-ignore - JS module without types
import CustomVueLoader from '../rspack/loaders/vue';
// @ts-ignore - JS module without types
import LcapPlugin from '../rspack/plugins/lcap';
// @ts-ignore - JS module without types
import MissingCssFallbackPlugin from '../rspack/plugins/missing-css-fallback';
// @ts-ignore - JS module without types
import MissingFileFallbackPlugin from '../rspack/plugins/missing-file-fallback';
import type { FileSystem, BuildStats } from '../types';

export interface BundleOptions {
  files: FileSystem;
  onProgress?: (message: string) => void;
}

export interface BundleResult {
  distFiles: Record<string, string>;
  buildStats: BuildStats;
  bundledCode: string;
  outputFiles: Record<string, string>;
}

/**
 * 清理文件系统中的 dist 文件
 */
function cleanDistFiles(files: FileSystem): FileSystem {
  const cleanedFiles = { ...files };
  Object.keys(cleanedFiles).forEach((path) => {
    if (path.startsWith('/dist/')) {
      delete cleanedFiles[path];
    }
  });
  return cleanedFiles;
}

/**
 * 准备必要的虚拟文件
 */
function prepareVirtualFiles(files: FileSystem): FileSystem {
  const preparedFiles = { ...files };
  
  // 添加必要的 loader 文件
  preparedFiles['/LOADER/rspack-vue-loader.js'] = '';

  return preparedFiles;
}

/**
 * 生成 Rspack 配置
 */
function createRspackConfig(files: FileSystem) {
  return {
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
        isDev: true,
        isIncremental: false,
        lastResource: {
          chunksMap: '',
        },
        extra: files['/client-lazyload-template.js']
          ? new Function(
              files['/client-lazyload-template.js'].replace('module.exports =', 'return')
            )()
          : {},
      }),
      new MissingCssFallbackPlugin({
        pattern: /\/dist-theme\/index\.css$/,
        fallbackContent: '/* CSS theme file not found, using empty fallback */',
      }),
      // new MissingFileFallbackPlugin(),
      new BrowserRequirePlugin({
        modules: {
          '/LOADER/rspack-vue-loader.js': CustomVueLoader,
        },
      }),
    ],
    optimization: {
      minimize: false,
      runtimeChunk: 'single' as const,
      splitChunks: {
        chunks: 'all' as const,
        minSize: 0,
        cacheGroups: {
          page: {
            test: /src[\\/]pages[\\/]/,
            name: (module: any, _chunks: any, cacheGroupKey: string) => {
              const { resource } = module;
              const match = /[\\/]pages[\\/](.*)\.vue?/.exec(resource);
              const moduleName = match ? match[1].split(/[\\/]/g).join('_') : 'unknown';
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
}

/**
 * 执行 Rspack 编译
 */
async function executeCompile(compiler: any): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    compiler.run((err: Error | null, stats: any) => {
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
}

/**
 * 处理打包输出文件
 */
function processOutputFiles(outputFiles: Record<string, string>) {
  const distPaths = Object.keys(outputFiles).filter((path) => path.startsWith('/dist/'));

  if (distPaths.length === 0) {
    throw new Error('打包完成但未找到输出文件');
  }

  // 缓存打包产物
  const distFilesCache = distPaths.reduce((acc: Record<string, string>, path) => {
    acc[path] = outputFiles[path];
    return acc;
  }, {});

  // 查找主文件
  const mainFile =
    distPaths.find((f) => f.includes('runtime')) ||
    distPaths.find((f) => f.includes('main')) ||
    distPaths[0];

  const bundledCode = outputFiles[mainFile] || '';

  // 计算总大小
  const totalSize = distPaths.reduce((sum, path) => {
    return sum + new Blob([outputFiles[path]]).size;
  }, 0);

  return {
    distFiles: distFilesCache,
    distPaths,
    bundledCode,
    totalSize,
  };
}

/**
 * 主打包函数
 * @param options 打包选项
 * @returns 打包结果
 */
export async function bundleWithRspack(options: BundleOptions): Promise<BundleResult> {
  const { files, onProgress } = options;
  const startTime = performance.now();

  try {
    onProgress?.('正在清理旧文件...');
    
    // 1. 清理旧的 dist 文件
    const cleanedFiles = cleanDistFiles(files);
    
    // 2. 准备必要的虚拟文件
    const preparedFiles = prepareVirtualFiles(cleanedFiles);

    // 3. 写入内存文件系统
    onProgress?.('正在写入虚拟文件系统...');
    builtinMemFs.volume.fromJSON(preparedFiles);
    console.log('Input File System Contents:', preparedFiles);

    // 4. 生成 Rspack 配置
    onProgress?.('正在生成 Rspack 配置...');
    const config = createRspackConfig(preparedFiles);
    console.log('Rspack Config:', config);

    // 5. 创建编译器
    onProgress?.('正在创建编译器...');
    const compiler = rspack(config);

    // 6. 执行编译
    onProgress?.('正在使用 Rspack 编译...');
    await executeCompile(compiler);

    // 7. 读取打包结果
    onProgress?.('正在读取打包结果...');
    const outputFiles = builtinMemFs.volume.toJSON() as Record<string, string>;
    
    // 8. 处理输出文件
    const { distFiles, distPaths, bundledCode, totalSize } = processOutputFiles(outputFiles);

    // 9. 计算统计信息
    const endTime = performance.now();
    const buildTime = (endTime - startTime).toFixed(2);

    const buildStats: BuildStats = {
      buildTime,
      outputSize: totalSize.toString(),
      moduleCount: distPaths.length,
    };

    console.log('Dist Files:', distPaths.map((f) => ({ key: f, content: outputFiles[f] })));
    onProgress?.('✅ 打包完成！');

    return {
      distFiles,
      buildStats,
      bundledCode,
      outputFiles,
    };
  } catch (error) {
    console.error('打包错误:', error);
    throw error;
  }
}

/**
 * 获取打包配置的可读字符串（用于调试）
 */
export function getConfigString(files: FileSystem): string {
  const config = createRspackConfig(files);
  return JSON.stringify(config, null, 2);
}
