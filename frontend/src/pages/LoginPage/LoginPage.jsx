import React, { useEffect, useState } from 'react'
import AuthHero from '../../components/auth/AuthHero/AuthHero'
import AuthHeader from '../../components/auth/AuthHeader/AuthHeader'
import LoginCard from '../../components/auth/LoginCard/LoginCard'
import Button from '../../components/common/Button/Button'
import {
  clearAuthSession,
  getAuthSession,
  getSessionRole,
} from '../../services/auth'
import './LoginPage.css'

export default function LoginPage({ onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('signup')
  const [initialSession] = useState(() => getAuthSession())
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    Boolean(initialSession.token),
  )
  const [sessionRole, setSessionRole] = useState(() => getSessionRole())
  const [sessionExpired, setSessionExpired] = useState(initialSession.expired)

  useEffect(() => {
    if (initialSession.expired) {
      clearAuthSession()
    }
  }, [initialSession.expired])

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined
    }

    let expirationTimer
    const checkSession = () => {
      window.clearTimeout(expirationTimer)
      const session = getAuthSession()
      if (!session.token) {
        if (session.expired) {
          clearAuthSession()
        }
        setIsAuthenticated(false)
        setSessionRole(null)
        setSessionExpired(session.expired)
        return
      }

      expirationTimer = window.setTimeout(
        checkSession,
        Math.max(0, session.expiresAt - Date.now()),
      )
    }

    checkSession()
    document.addEventListener('visibilitychange', checkSession)
    window.addEventListener('focus', checkSession)
    return () => {
      window.clearTimeout(expirationTimer)
      document.removeEventListener('visibilitychange', checkSession)
      window.removeEventListener('focus', checkSession)
    }
  }, [isAuthenticated])

  const handleLoginSuccess = () => {
    setSessionExpired(false)
    setIsAuthenticated(true)
    setSessionRole(getSessionRole())
    if (onLoginSuccess) {
      onLoginSuccess()
    }
  }

  const handleLogout = () => {
    clearAuthSession()
    setIsAuthenticated(false)
    setSessionRole(null)
    setSessionExpired(false)
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
            {sessionExpired && (
              <p className="login-page__session-expired" role="alert">
                Votre session a expiré. Veuillez vous reconnecter.
              </p>
            )}
            {isAuthenticated ? (
              <div className="login-page__session" role="status">
                <p>Votre session MOMO-MAP est active.</p>
                <p className="login-page__role">
                  Rôle :{' '}
                  {sessionRole === 'admin'
                    ? 'Administrateur'
                    : sessionRole === 'user'
                      ? 'Utilisateur'
                      : 'non défini'}
                </p>
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
