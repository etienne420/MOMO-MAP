import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { getAuthToken } from './services/auth'
import { applyUiTheme, getCachedTheme } from './utils/theme'

// Réapplique tout de suite le thème de la session (avant la réponse du serveur)
applyUiTheme(getAuthToken() ? getCachedTheme() : null)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
