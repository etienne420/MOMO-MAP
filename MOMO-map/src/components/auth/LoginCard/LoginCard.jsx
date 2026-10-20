import React from 'react'
import LoginForm from '../LoginForm/LoginForm'
import { BRANDING } from '../../../constants/branding'
import './LoginCard.css'

export default function LoginCard({
  title = BRANDING.welcomeTitle,
  subtitle = BRANDING.welcomeSubtitle,
  onCreateAccount,
  onForgotPassword,
  onLoginSuccess,
}) {
  return (
    <div className="login-card">
      <div className="login-card__header">
        <h2 className="login-card__title">{title}</h2>
        {subtitle && <p className="login-card__subtitle">{subtitle}</p>}
      </div>

      <div className="login-card__body">
        <LoginForm
          onSubmitSuccess={onLoginSuccess}
          onForgotPassword={onForgotPassword}
        />
      </div>

      <div className="login-card__footer">
        <span className="login-card__footer-text">{BRANDING.newToAppText}</span>
        <button
          type="button"
          onClick={onCreateAccount}
          className="login-card__register-link"
        >
          {BRANDING.createAccountText}
        </button>
      </div>
    </div>
  )
}
