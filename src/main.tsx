import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes';
import './styles.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    {  /* @ts-ignore */ }
    <BrowserRouter basename={__APP_BASE__}>
      <AppRoutes />
    </BrowserRouter>
  </React.StrictMode>
);

console.log('🚀 Rspack Browser Demo');
console.log('✅ 应用已启动');
