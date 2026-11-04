import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthHero from '../../components/auth/AuthHero/AuthHero'
import AuthHeader from '../../components/auth/AuthHeader/AuthHeader'
import LoginCard from '../../components/auth/LoginCard/LoginCard'
import './LoginPage.css'

export default function LoginPage({ initialMode = 'signin', onLoginSuccess }) {
  const [authMode, setAuthMode] = useState(initialMode)
  const navigate = useNavigate()

  const handleModeChange = (newMode) => {
    setAuthMode(newMode)
    navigate(newMode === 'signin' ? '/login' : '/signup')
  }

  const handleLoginSuccess = (formData) => {
    if (onLoginSuccess) {
      onLoginSuccess(formData)
    } else {
      navigate('/map')
    }
  }

  return (
    <div className="login-page bg-dot-pattern">
      <main className="login-page__container">
        {/* Left Column: Campus Student Visual */}
        <section className="login-page__hero-section" aria-label="Présentation du campus">
          <AuthHero />
        </section>

        {/* Right Column: Branding Header and Auth Card */}
        <section className="login-page__form-section" aria-label="Authentification">
          <div className="login-page__form-wrapper">
            <AuthHeader />
            <LoginCard
              mode={authMode}
              onModeChange={handleModeChange}
              onLoginSuccess={handleLoginSuccess}
            />
          </div>
        </section>
      </main>
    </div>
  )
}
