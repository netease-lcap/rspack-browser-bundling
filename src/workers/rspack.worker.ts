/**
 * Rspack Web Worker
 * 
 * This Worker runs Rspack compiler in the background to avoid blocking the UI.
 * It handles HMR (Hot Module Replacement) functionality by watching files
 * and sending updates back to the main thread.
 */

import { rspack, builtinMemFs, BrowserRequirePlugin, DefinePlugin, HtmlRspackPlugin } from '@rspack/browser';
import type { Configuration as RspackConfig } from '@rspack/browser';
// @ts-ignore - JS module without types
import CustomVueLoader from '../rspack/loaders/vue';
// @ts-ignore - JS module without types
import LcapPlugin from '../rspack/plugins/lcap';
// @ts-ignore - JS module without types
import MissingCssFallbackPlugin from '../rspack/plugins/missing-css-fallback';
import {
  WorkerMessageType,
  MainThreadMessageType,
} from '../types/hmr';
import type {
  MainThreadMessage,
  WorkerMessage,
  BuildEndPayload,
  BuildErrorPayload,
  InitPayload,
  UpdateFilePayload,
} from '../types/hmr';
import type { FileSystem } from '../types';
// @ts-ignore - This is a virtual module provided by the dev server
import DevServerCode from '../rspack/dev-server/client';

// ============================================================================
// Type Definitions for Worker Context
// ============================================================================

interface CompilerInstance {
  watch: (options: any, callback: (err: Error | null, stats: any) => void) => any;
  run: (callback: (err: Error | null, stats: any) => void) => void;
  close: (callback: () => void) => void;
}

// ============================================================================
// Worker State
// ============================================================================

let compiler: CompilerInstance | null = null;
let watching: any = null;
let currentFiles: FileSystem = {};
let lastHash: string | null = null;
let isInitialized = false;

// ============================================================================
// Message Helpers
// ============================================================================

/**
 * Send message to main thread
 */
function postMessageToMain(type: WorkerMessageType, payload: unknown): void {
  const message: WorkerMessage = { type, payload };
  self.postMessage(message);
}

/**
 * Send error message to main thread
 */
function postError(message: string, details?: string, stack?: string): void {
  const payload: BuildErrorPayload = { message, details, stack };
  postMessageToMain(WorkerMessageType.ERROR, payload);
}

/**
 * Send build end message to main thread
 */
function postBuildEnd(
  distFiles: Record<string, string>,
  stats: BuildEndPayload['stats']
): void {
  const payload: BuildEndPayload = { distFiles, stats };
  postMessageToMain(WorkerMessageType.BUILD_END, payload);
}

/**
 * Send init complete message to main thread
 */
function postInit(ready: boolean, version?: string): void {
  const payload: InitPayload = { ready, version };
  postMessageToMain(WorkerMessageType.INIT, payload);
}

// ============================================================================
// File System Helpers
// ============================================================================

/**
 * Clean dist files from file system
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
 * Prepare virtual files for Rspack
 */
function prepareVirtualFiles(files: FileSystem): FileSystem {
  const preparedFiles = { ...files };
  // Add necessary loader files
  preparedFiles['/LOADER/rspack-vue-loader.js'] = '';
  // Add dev-server client
  preparedFiles['/DEVSERVER/client.js'] = DevServerCode;
  return preparedFiles;
}

/**
 * Update file in memory file system
 */
function updateFileInMemfs(path: string, content: string): void {
  try {
    builtinMemFs.volume.writeFileSync(path, content);
    console.log(`[Worker] Updated file in memfs: ${path}`);
  } catch (error: any) {
    console.error('Failed to write file to memfs:', error);
    // If file doesn't exist, try to create it
    try {
      const dir = path.substring(0, path.lastIndexOf('/'));
      if (dir && dir !== '/') {
        builtinMemFs.volume.mkdirSync(dir, { recursive: true });
      }
      builtinMemFs.volume.writeFileSync(path, content);
    } catch (mkdirError: any) {
      console.error('Failed to create directory and write file:', mkdirError);
      throw mkdirError;
    }
  }
}

// ============================================================================
// Rspack Configuration
// ============================================================================

/**
 * Create Rspack configuration with HMR enabled
 */
function createRspackConfig(files: FileSystem): RspackConfig {
  return {
    mode: 'development',
    devtool: false,
    context: '/',
    entry: {
      main: [
        '/DEVSERVER/client.js',
        '/src/main.ts',
      ],
    },
    output: {
      path: '/dist',
      // Ensure this matches the service worker scope
      publicPath: `${__APP_BASE__}preview/`,
      filename: '[name].[chunkhash:8].js',
      chunkFilename: '[name].[chunkhash:8].js',
      hotUpdateChunkFilename: '[id].[fullhash].hot-update.js',
      hotUpdateMainFilename: '[runtime].[fullhash].hot-update.json',
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
      'vue/compiler-sfc': 'VueCompilerSFC',
      lodash: 'Lodash',
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
                compiler: 'vue/compiler-sfc',
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
      new BrowserRequirePlugin({
        modules: {
          '/LOADER/rspack-vue-loader.js': CustomVueLoader,
        },
      }),
      new rspack.HotModuleReplacementPlugin(),
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

// ============================================================================
// Build Processing
// ============================================================================

/**
 * Process build output and extract dist files
 */
function processBuildOutput(): {
  distFiles: Record<string, string>;
  distPaths: string[];
  bundledCode: string;
  totalSize: number;
  hash: string;
} {
  const outputFiles = builtinMemFs.volume.toJSON() as Record<string, string>;
  const distPaths = Object.keys(outputFiles).filter((path) => path.startsWith('/dist/'));

  if (distPaths.length === 0) {
    throw new Error('Build completed but no output files found');
  }

  // Cache dist files
  const distFiles = distPaths.reduce((acc: Record<string, string>, path) => {
    acc[path] = outputFiles[path];
    return acc;
  }, {});

  // Find main file (prefer runtime, then main)
  const mainFile =
    distPaths.find((f) => f.includes('runtime')) ||
    distPaths.find((f) => f.includes('main')) ||
    distPaths[0];

  const bundledCode = outputFiles[mainFile] || '';

  // Calculate total size
  const totalSize = distPaths.reduce((sum, path) => {
    return sum + new Blob([outputFiles[path]]).size;
  }, 0);

  // Generate hash from dist paths
  const hash = distPaths.sort().join('|');

  return {
    distFiles,
    distPaths,
    bundledCode,
    totalSize,
    hash,
  };
}

/**
 * Handle build completion
 */
function handleBuildComplete(stats: any, startTime: number): void {
  try {
    const { distFiles } = processBuildOutput();
    const endTime = performance.now();
    const buildTime = Math.round(endTime - startTime);
    const distPaths = Object.keys(distFiles);

    const hash = stats.hash;
    const isHmrUpdate = lastHash !== null;

    console.log('[Worker] Build complete. hash:', hash, 'lastHash:', lastHash, 'isHMR:', isHmrUpdate);
    postBuildEnd(distFiles, {
      hash,
      lastHash,
      buildTime,
      moduleCount: distPaths.length,
      isHmrUpdate,
    });

    lastHash = hash;
  } catch (error: any) {
    postError('Failed to process build output', error.message, error.stack);
  }
}

/**
 * Handle build errors
 */
function handleBuildError(err: Error | null, stats: any): void {
  if (err) {
    console.error('[Worker Build Error]', err);
    postError('Build failed', err.message, err.stack);
    return;
  }

  if (stats.hasErrors()) {
    const errors = stats.toJson().errors;
    console.error('[Worker Build Stats Errors]', errors);
    const errorMessages = errors.map((e: any) => e.message || e.toString()).join('\n');
    postError('Build errors', errorMessages);
  }
}

// ============================================================================
// Watch Mode
// ============================================================================

/**
 * Initialize compiler and start watch mode
 */
async function initWatch(files: FileSystem): Promise<void> {
  try {
    // Clean and prepare files
    const cleanedFiles = cleanDistFiles(files);
    const preparedFiles = prepareVirtualFiles(cleanedFiles);
    currentFiles = preparedFiles;

    // Write to memory file system
    builtinMemFs.volume.fromJSON(preparedFiles);

    // Create Rspack configuration
    const config = createRspackConfig(preparedFiles);

    // Create compiler
    compiler = rspack(config);

    // Start watching - this will also perform the initial build
    const startTime = performance.now();
    try {
      watching = compiler.watch(
        {
          poll: false,
          // Exclude the output directory so that rspack writing /dist/* files
          // after a build does not trigger another watch cycle immediately.
          ignored: /\/(dist|node_modules)\//,
        },
        (err: Error | null, stats: any) => {
          if (err || (stats && stats.hasErrors())) {
            handleBuildError(err, stats);
            return;
          }
          handleBuildComplete(stats, startTime);
        }
      );
      console.log('[Worker] Watch mode started, waiting for initial build...');
    } catch (watchError) {
      console.error('[Worker] Failed to start watch mode:', watchError);
    }

    isInitialized = true;
    postInit(true, '1.0.0');
  } catch (error: any) {
    console.error('[Worker Init Error]', error);
    postError('Failed to initialize watch mode', error.message, error.stack);
    postInit(false);
  }
}

/**
 * Stop watch mode and clean up
 */
function stopWatch(): void {
  if (watching) {
    watching.close(() => {
      console.log('Watch mode stopped');
    });
    watching = null;
  }

  if (compiler) {
    compiler.close(() => {
      console.log('Compiler closed');
    });
    compiler = null;
  }

  isInitialized = false;
  lastHash = null;
  currentFiles = {};
}

/**
 * Update file and trigger recompilation
 */
function updateFile(path: string, content: string): void {
  if (!isInitialized) {
    postError('Worker not initialized', 'Cannot update file before initialization');
    return;
  }

  try {
    console.log(`[Worker] Updating file: ${path}`);

    // Update in-memory file system
    updateFileInMemfs(path, content);

    // Update current files tracking
    currentFiles[path] = content;

    // Notify that file has changed
    postMessageToMain(WorkerMessageType.FILE_CHANGE, { path });

    // builtinMemFs polls the virtual FS automatically (poll: 1000),
    // so no manual invalidate() is needed.
  } catch (error: any) {
    postError('Failed to update file', error.message, error.stack);
  }
}

// ============================================================================
// Message Handlers
// ============================================================================

/**
 * Handle messages from main thread
 */
function handleMessage(event: MessageEvent<MainThreadMessage>): void {
  const { type, payload } = event.data;

  console.log('[Worker] Received message:', type, payload);

  switch (type) {
    case MainThreadMessageType.START_WATCH:
      if (payload && typeof payload === 'object' && 'files' in payload) {
        const { files } = payload as { files: FileSystem };
        initWatch(files);
      } else {
        postError('Invalid START_WATCH message', 'Missing files in payload');
      }
      break;

    case MainThreadMessageType.STOP_WATCH:
      stopWatch();
      break;

    case MainThreadMessageType.UPDATE_FILE:
      if (payload && typeof payload === 'object') {
        const { path, content } = payload as UpdateFilePayload;
        if (path !== undefined && content !== undefined) {
          updateFile(path, content);
        } else {
          postError('Invalid UPDATE_FILE message', 'Missing path or content');
        }
      } else {
        postError('Invalid UPDATE_FILE message', 'Invalid payload format');
      }
      break;

    default:
      console.warn('Unknown message type:', type);
      postError('Unknown message type', `Received unknown message type: ${type}`);
  }
}

// ============================================================================
// Worker Entry Point
// ============================================================================

/**
 * Initialize worker
 */
function init(): void {
  // Set up message handler
  self.onmessage = handleMessage;

  // Send INIT message immediately to signal worker is ready to receive messages
  postInit(true, '1.0.0');

  // Log initialization
  console.log('Rspack Worker initialized and ready');
}

// Start the worker
init();

// Export empty object to make this a module
export {};
