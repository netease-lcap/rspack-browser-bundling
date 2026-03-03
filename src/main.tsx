import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import './styles.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('🚀 Rspack Browser Demo (React + TypeScript + UnoCSS)');
console.log('✅ 应用已启动');
