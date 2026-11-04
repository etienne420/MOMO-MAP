import React from 'react'
import LoginForm from '../LoginForm/LoginForm'
import './LoginCard.css'

export default function LoginCard({
  mode = 'signup',
  onModeChange,
  onLoginSuccess,
}) {
  const title = mode === 'signin' ? 'Sign in' : 'Create an account'

  return (
    <div className="login-card">
      <div className="login-card__header">
        <h2 className="login-card__title">{title}</h2>
      </div>

      <div className="login-card__body">
        <LoginForm
          mode={mode}
          onModeChange={onModeChange}
          onSubmitSuccess={onLoginSuccess}
        />
      </div>
    </div>
  )
}
