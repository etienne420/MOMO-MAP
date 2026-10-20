import React from 'react'
import AuthHero from '../../components/auth/AuthHero/AuthHero'
import AuthHeader from '../../components/auth/AuthHeader/AuthHeader'
import LoginCard from '../../components/auth/LoginCard/LoginCard'
import './LoginPage.css'

export default function LoginPage({ onLoginSuccess }) {
  const handleLoginSuccess = (formData) => {
    if (onLoginSuccess) {
      onLoginSuccess(formData)
    }
  }

  const handleForgotPassword = () => {
    alert('Fonctionnalité de réinitialisation du mot de passe bientôt disponible.')
  }

  const handleCreateAccount = () => {
    alert("Redirection vers la page d'inscription institutionnelle.")
  }

  return (
    <div className="login-page bg-dot-pattern">
      <main className="login-page__container">
        {/* Left Column: Campus Student Visual */}
        <section className="login-page__hero-section" aria-label="Présentation du campus">
          <AuthHero />
        </section>

        {/* Right Column: Branding Header and Login Card */}
        <section className="login-page__form-section" aria-label="Connexion à votre compte">
          <div className="login-page__form-wrapper">
            <AuthHeader />
            <LoginCard
              onLoginSuccess={handleLoginSuccess}
              onForgotPassword={handleForgotPassword}
              onCreateAccount={handleCreateAccount}
            />
          </div>
        </section>
      </main>
    </div>
  )
}
