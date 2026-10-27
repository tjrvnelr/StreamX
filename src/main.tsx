import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './components/auth/auth-provider'
import { ThemeProvider } from './components/ui/theme-provider'
import { ToastProvider } from './components/ui/toast-provider'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter><App /></BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
