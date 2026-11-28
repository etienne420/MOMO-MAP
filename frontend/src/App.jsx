import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { getAuthToken } from './services/auth'
import { applyUiTheme } from './utils/theme'
import usePageZoomLock from './hooks/usePageZoomLock'
import LoginPage from './pages/LoginPage/LoginPage'
import SignUpPage from './pages/SignUpPage/SignUpPage'
import MapPage from './pages/MapPage/MapPage'
import ShopPage from './pages/ShopPage/ShopPage'
import SettingsPage from './pages/SettingsPage/SettingsPage'
import './App.css'

function LoginRoute() {
  const navigate = useNavigate()
  return (
    <LoginPage
      key="signin"
      initialMode="signin"
      onLoginSuccess={() => {
        navigate('/map')
      }}
    />
  )
}

function SignUpRoute() {
  const navigate = useNavigate()
  return (
    <SignUpPage
      key="signup"
      onLoginSuccess={() => {
        navigate('/map')
      }}
    />
  )
}

function RequireAuth({ children }) {
  const navigate = useNavigate()
  const authed = !!getAuthToken()
  useEffect(() => {
    if (!authed) {
      // Retire un éventuel thème sombre/coloré avant d'afficher la page de connexion
      applyUiTheme(null)
      navigate('/login', { replace: true })
    }
  }, [authed, navigate])
  return authed ? children : null
}

function App() {
  usePageZoomLock(true)
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/signin" element={<Navigate to="/login" replace />} />
        <Route path="/signup" element={<SignUpRoute />} />
        <Route path="/register" element={<Navigate to="/signup" replace />} />
        <Route path="/map" element={<RequireAuth><MapPage /></RequireAuth>} />
        <Route path="/shop" element={<RequireAuth><ShopPage /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

