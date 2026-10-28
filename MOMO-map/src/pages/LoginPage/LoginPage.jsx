import React, { useState } from 'react'
import AuthHero from '../../components/auth/AuthHero/AuthHero'
import AuthHeader from '../../components/auth/AuthHeader/AuthHeader'
import LoginCard from '../../components/auth/LoginCard/LoginCard'
import Button from '../../components/common/Button/Button'
import { clearAuthSession, getAuthToken } from '../../services/auth'
import './LoginPage.css'

export default function LoginPage({ onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('signup')
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(getAuthToken()),
  )

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
    if (onLoginSuccess) {
      onLoginSuccess()
    }
  }

  const handleLogout = () => {
    clearAuthSession()
    setIsAuthenticated(false)
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
            {isAuthenticated ? (
              <div className="login-page__session" role="status">
                <p>Votre session MOMO-MAP est active.</p>
                <Button variant="dark" fullWidth onClick={handleLogout}>
                  Sign out
                </Button>
              </div>
            ) : (
              <LoginCard
                mode={authMode}
                onModeChange={setAuthMode}
                onLoginSuccess={handleLoginSuccess}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
