import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import App from './components/App'
import WebContainerPage from './components/WebContainer'

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/webcontainer" element={<WebContainerPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes
