import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { RoleProvider } from './components/RoleContext.jsx'

createRoot(document.getElementById('root')).render(
  <RoleProvider>
    <App />
  </RoleProvider>
)
