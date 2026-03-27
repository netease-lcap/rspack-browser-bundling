import { rspack, HtmlRspackPlugin } from "@rspack/browser";
import lazyLoadCode from "./constant";

const plugin = "lcap-plugin";

export default class LcapPlugin {
  constructor(options) {
    this.options = options;
  }
  apply(compiler) {
    const { isDev, isIncremental, lastResource, extra } = this.options;

    // 增量发布
    if (isIncremental) {
      addIncrementalBuild(compiler, {
        lastResource,
      });

      return;
    }

    // 标准发布
    overrideRuntime(compiler, {
      isDev,
    });
    emitChunksMapResource(compiler, {
      isDev,
    });
    emitClientResource(compiler, {
      isDev,
      extra,
    });
  }
}

// 复写加载css\js chunk的函数
function overrideRuntime(compiler, options) {
  const { isDev } = options;

  if (!isDev) {
    return;
  }

  const { RuntimeGlobals } = compiler.webpack;

  // 复写__webpack_require__.k和__webpack_require__.u
  compiler.hooks.compilation.tap(plugin, (compilation) => {
    compilation.hooks.runtimeModule.tap(plugin, (module, chunk) => {
      if (module.name === "get javascript chunk filename" && chunk.name === "runtime") {
        module.source.source = `${RuntimeGlobals.getChunkScriptFilename} = (chunkId) => {
        return "" + window.lcapChunksNameMap[chunkId] + "." + window.lcapChunksHashMap[chunkId] + ".js"
      }\n`
      }

      if (module.name === "get css chunk filename" && chunk.name === "runtime") {
        module.source.source = `${RuntimeGlobals.getChunkCssFilename} = (chunkId) => {
        return "" + window.lcapChunksNameMap[chunkId] + "." + window.lcapChunksHashMap[chunkId] + ".css"
      }\n`
      }
    });
  });
}

// 增加chunkMap资源
function emitChunksMapResource(compiler, options) {
  const { isDev } = options;

  if (!isDev) {
    return;
  }

  compiler.hooks.emit.tapAsync(plugin, (compilation, callback) => {
    // 2、增加router.min.js asset
    const ChunksNameMap = {};
    const ChunksHashMap = {};

    compilation.chunks.forEach((chunk) => {
      const chunkId = chunk.id;
      const chunkName = chunk.name;
      const chunkHash = chunk.hash.substring(0, 8);

      ChunksNameMap[chunkId] = chunkName || chunkId;
      ChunksHashMap[chunkId] = chunkHash;
    });

    const { RawSource } = compiler.webpack.sources;

    const code = `window.lcapChunksNameMap = ${JSON.stringify(ChunksNameMap)};
window.lcapChunksHashMap = ${JSON.stringify(ChunksHashMap)};

var lcap_changed_chunks = [];

// lcap_changed_chunks placeholder

lcap_changed_chunks.forEach(item => {
  window.lcapChunksNameMap[item.id] = item.name;
  window.lcapChunksHashMap[item.id] = item.hash;
});`;

    compilation.emitAsset("router.min.js", new RawSource(code), {
      minimized: true,
    });

    callback();
  });
}

// 生成client.js
function emitClientResource(compiler, options) {
  const { isDev, extra } = options;
  compiler.hooks.compilation.tap(plugin, (compilation) => {
    HtmlRspackPlugin.getCompilationHooks(
      compilation,
    ).beforeAssetTagGeneration.tapPromise(plugin, async (data) => {
      const { assets } = data;
      const { publicPath, js, css } = assets;

      const allJS = [...(extra.preJS || []), ...js, ...(extra.postJS || [])];

      const allCSS = [
        ...(extra.preCSS || []),
        ...css,
        ...(extra.postCSS || []),
      ];

      const clientCode = `(function() {
          ${lazyLoadCode}

          function loadAssets() {
            // chunksMap
            ${isDev} && LazyLoad.js(["${publicPath}router.min.js"].map(item => {
              var timestamp = Date.now();
              return item + '?timestamp=' + timestamp;
            }));

            LazyLoad.js(${JSON.stringify(allJS)});
            LazyLoad.css(${JSON.stringify(allCSS)});
          }

          ${extra.entryCode}
        })();
        `;

      // 浏览器环境兼容：RawSource 直接支持字符串
      const source = new compiler.webpack.sources.RawSource(clientCode, {
        minimized: true,
      });
      compilation.emitAsset("client.js", source);

      data.assets.js = [`${publicPath}client.js?t=${Date.now()}`];
      data.assets.css = [];
    });
  });
}

// 增量构建
function addIncrementalBuild(compiler, options) {
  const { lastResource } = options;
  const { chunksMap: chunksMapCode } = lastResource;

  compiler.hooks.emit.tapAsync(plugin, (compilation, callback) => {
    // 只保留pages相关的chunk 资源
    const pagesAssets = [];
    const changedChunks = [];

    compilation.chunks.forEach((chunk) => {
      if (chunk.idHints?.has("page")) {
        chunk.files.forEach((file) => pagesAssets.push(file));
        changedChunks.push({
          id: chunk.id,
          name: chunk.name || chunk.id,
          hash: chunk.hash.substring(0, 8),
        });
      }
    });

    // 删除不需要的chunk(非页面相关的chunk)
    compilation.getAssets().forEach((asset) => {
      if (!pagesAssets.includes(asset.name)) {
        compilation.deleteAsset(asset.name);
      }
    });

    // 生成增量变更的chunks-map.js
    let code = chunksMapCode;

    const placeholderIdx = code.indexOf("// lcap_changed_chunks placeholder");
    // 前面插入代码
    if (placeholderIdx !== -1) {
      code =
        code.slice(0, placeholderIdx) +
        `lcap_changed_chunks.push(...${JSON.stringify(changedChunks)});\n` +
        code.slice(placeholderIdx);
    }

    const { RawSource } = compiler.webpack.sources;
    compilation.emitAsset("router.min.js", new RawSource(code), {
      minimized: true,
    });

    callback();
  });
}
