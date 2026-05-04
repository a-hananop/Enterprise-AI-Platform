import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useStore } from './store'

import AppLayout    from './components/layout/AppLayout'
import LoginPage    from './pages/LoginPage'
import SignupPage   from './pages/SignupPage'
import Dashboard    from './pages/Dashboard'
import DataHub      from './pages/DataHub'
import AIAssistant  from './pages/AIAssistant'
import Predictions  from './pages/Predictions'
import TextAnalysis from './pages/TextAnalysis'
import Automation   from './pages/Automation'
import Analytics    from './pages/Analytics'
import Documents    from './pages/Documents'
import MarketingAI  from './pages/MarketingAI'
import RiskDetect   from './pages/RiskDetect'
import Reports      from './pages/Reports'
import SettingsPage from './pages/SettingsPage'

function Guard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  const { isAuthenticated, loadUser } = useStore()

  useEffect(() => {
    if (isAuthenticated) loadUser()
  }, [])

  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#111428',
            color: '#eef0f8',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            fontSize: 13,
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          },
          success: { iconTheme: { primary: '#22d3a5', secondary: 'transparent' } },
          error:   { iconTheme: { primary: '#ff5c7a', secondary: 'transparent' } },
        }}
      />

      <Routes>
        {/* Public routes */}
        <Route path="/login"  element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}  />
        <Route path="/signup" element={isAuthenticated ? <Navigate to="/" replace /> : <SignupPage />} />

        {/* Protected routes */}
        <Route path="/" element={<Guard><AppLayout /></Guard>}>
          <Route index            element={<Dashboard />} />
          <Route path="data"      element={<DataHub />} />
          <Route path="assistant" element={<AIAssistant />} />
          <Route path="predict"   element={<Predictions />} />
          <Route path="text"      element={<TextAnalysis />} />
          <Route path="automate"  element={<Automation />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="documents" element={<Documents />} />
          <Route path="marketing" element={<MarketingAI />} />
          <Route path="risk"      element={<RiskDetect />} />
          <Route path="reports"   element={<Reports />} />
          <Route path="settings"  element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
