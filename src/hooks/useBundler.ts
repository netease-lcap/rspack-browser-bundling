/**
 * useBundler React Hook
 * 
 * Encapsulates HMR logic for React components.
 * Manages Worker communication and state updates.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  WorkerMessageType,
  MainThreadMessageType,
} from '../types/hmr';
import type {
  HMRStatus,
  BuildEndPayload,
  BuildErrorPayload,
  UseHMROptions,
  UseHMRResult,
  WorkerMessage,
} from '../types/hmr';
import type { FileSystem } from '../types';

interface HMRBridgeInstance {
  worker: Worker | null;
  isReady: boolean;
  postMessage: (message: { type: MainThreadMessageType; payload?: unknown }) => void;
  terminate: () => void;
}

export function useBundler(options: UseHMROptions & { initialFiles: FileSystem }): UseHMRResult {
  // State
  const [status, setStatus] = useState<HMRStatus>('idle');
  const [isWatchMode, setIsWatchMode] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [lastError, setLastError] = useState<BuildErrorPayload | null>(null);

  // Refs
  const bridgeRef = useRef<HMRBridgeInstance | null>(null);
  const callbacksRef = useRef({
    onBuildEnd: options.onBuildEnd,
    onHMRUpdate: options.onHMRUpdate,
    onError: options.onError,
  });

  // Keep callbacks ref up to date
  useEffect(() => {
    callbacksRef.current = {
      onBuildEnd: options.onBuildEnd,
      onHMRUpdate: options.onHMRUpdate,
      onError: options.onError,
    };
  }, [options.onBuildEnd, options.onHMRUpdate, options.onError]);

  // Handle Worker messages
  const handleWorkerMessage = useCallback((event: MessageEvent<WorkerMessage>) => {
    const { type, payload } = event.data;

    switch (type) {
      case WorkerMessageType.INIT:
        if (bridgeRef.current) {
          bridgeRef.current.isReady = true;
        }
        break;

      case WorkerMessageType.BUILD_END:
        setIsCompiling(false);
        setStatus('idle');
        callbacksRef.current.onBuildEnd?.(payload as BuildEndPayload);
        break;

      case WorkerMessageType.ERROR:
        setIsCompiling(false);
        setStatus('error');
        setLastError(payload as BuildErrorPayload);
        console.error('[HMR Worker Error]', payload);
        callbacksRef.current.onError?.(payload as BuildErrorPayload);
        break;

      case WorkerMessageType.FILE_CHANGE:
        setStatus('building');
        setIsCompiling(true);
        break;

      default:
        console.warn('Unknown Worker message type:', type);
    }
  }, []);

  // Start watching
  const startWatch = useCallback(async () => {
    if (bridgeRef.current?.isReady) {
      console.warn('HMR is already watching');
      return;
    }

    try {
      // Create Worker
      const worker = new Worker(new URL('../workers/rspack.worker.ts', import.meta.url), {
        type: 'module',
      });

      // Initialize bridge
      bridgeRef.current = {
        worker,
        isReady: false,
        postMessage: (message) => {
          worker.postMessage(message);
        },
        terminate: () => {
          worker.terminate();
        },
      };

      // Set up message handler
      worker.addEventListener('message', handleWorkerMessage);

      // Wait for Worker to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Worker initialization timeout'));
        }, 10000);

        const checkReady = (event: MessageEvent<WorkerMessage>) => {
          if (event.data.type === WorkerMessageType.INIT) {
            clearTimeout(timeout);
            worker.removeEventListener('message', checkReady);
            resolve();
          }
        };

        worker.addEventListener('message', checkReady);
      });

      // Send initial files and start watch
      bridgeRef.current.postMessage({
        type: MainThreadMessageType.START_WATCH,
        payload: {
          files: options.initialFiles,
        },
      });

      setIsWatchMode(true);
      setStatus('idle');
    } catch (error) {
      const errorDetails = {
        message: error instanceof Error ? error.message : 'Failed to start HMR watch',
        stack: error instanceof Error ? error.stack : undefined,
        error,
      };
      console.error('[HMR Start Watch Error]', errorDetails);
      setStatus('error');
      setLastError(errorDetails);
      throw error;
    }
  }, [options.initialFiles, handleWorkerMessage]);

  // Stop watching
  const stopWatch = useCallback(() => {
    if (bridgeRef.current) {
      bridgeRef.current.postMessage({
        type: MainThreadMessageType.STOP_WATCH,
      });
      bridgeRef.current.terminate();
      bridgeRef.current = null;
    }
    setIsWatchMode(false);
    setStatus('idle');
    setIsCompiling(false);
  }, []);

  // Update file
  const updateFile = useCallback((path: string, content: string) => {
    console.log('[useBundler] updateFile called:', path, 'isReady:', bridgeRef.current?.isReady);
    if (!bridgeRef.current?.isReady) {
      console.warn('Cannot update file: HMR is not ready');
      return;
    }

    bridgeRef.current.postMessage({
      type: MainThreadMessageType.UPDATE_FILE,
      payload: {
        path,
        content,
      },
    });
    console.log('[useBundler] UPDATE_FILE message sent to worker');
  }, []);

  // Refresh (trigger rebuild)
  const refresh = useCallback(() => {
    if (!bridgeRef.current?.isReady) {
      console.warn('Cannot refresh: HMR is not ready');
      return;
    }

    setStatus('building');
    setIsCompiling(true);
    // Trigger rebuild by sending an update with same content
    bridgeRef.current.postMessage({
      type: MainThreadMessageType.UPDATE_FILE,
      payload: {
        path: '__refresh__',
        content: '',
      },
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (bridgeRef.current) {
        bridgeRef.current.terminate();
        bridgeRef.current = null;
      }
    };
  }, []);

  return {
    status,
    isWatchMode,
    isCompiling,
    lastError,
    startWatch,
    stopWatch,
    updateFile,
    refresh,
  };
}

export default useBundler;
