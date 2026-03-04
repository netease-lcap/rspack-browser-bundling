import React, { useState, useCallback, useRef } from 'react';

import FileTree from './FileTree';
import MonacoEditor from './MonacoEditor';
import OperationPanel from './OperationPanel';

import filesData from '../files';
import { bundleWithRspack } from '../utils/rspack-bundler';
import type { FileSystem, BuildStats, MonacoEditorInstance } from '../types';

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
    setIsBundling(true);
    setBuildOutput('正在打包...');
    setBuildStats(null);
    setDistFiles(null);
    setMessage(null);

    try {
      // 使用 rspack-bundler 工具进行打包
      const result = await bundleWithRspack({
        files,
        onProgress: (message) => {
          setBuildOutput(message);
        },
      });

      // 更新状态
      setDistFiles(result.distFiles);
      setBuildStats(result.buildStats);
      setBuildOutput(result.bundledCode);

      // 将 dist 文件添加到文件系统（用于文件树显示）
      setFiles((prev) => ({
        ...prev,
        ...result.distFiles,
      }));

      showMessage('✅ 打包成功！', 'success');
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
