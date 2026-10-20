import React, { useState } from 'react'
import InputField from '../../common/InputField/InputField'
import Checkbox from '../../common/Checkbox/Checkbox'
import Button from '../../common/Button/Button'
import { BRANDING } from '../../../constants/branding'
import { validateLoginForm } from '../../../utils/validation'
import './LoginForm.css'

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

export default function LoginForm({ onSubmitSuccess, onForgotPassword }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [authFeedback, setAuthFeedback] = useState(null)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))

    // Clear field-level error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
    if (authFeedback) {
      setAuthFeedback(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const { isValid, errors: validationErrors } = validateLoginForm(formData)
    if (!isValid) {
      setErrors(validationErrors)
      return
    }

    setIsLoading(true)
    setAuthFeedback(null)

    // Simulate login API call with realistic latency
    try {
      await new Promise((resolve) => setTimeout(resolve, 600))
      setAuthFeedback({
        type: 'success',
        message: 'Connexion réussie ! Bienvenue sur MOMO-MAP.',
      })
      if (onSubmitSuccess) {
        onSubmitSuccess(formData)
      }
    } catch {
      setAuthFeedback({
        type: 'error',
        message: 'Une erreur est survenue lors de la connexion.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      {authFeedback && (
        <div
          className={`login-form__alert login-form__alert--${authFeedback.type}`}
          role="alert"
        >
          {authFeedback.message}
        </div>
      )}

      <div className="login-form__fields">
        <InputField
          id="login-email"
          name="email"
          type="email"
          label={BRANDING.emailLabel}
          placeholder={BRANDING.emailPlaceholder}
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          autoComplete="email"
          required
        />

        <InputField
          id="login-password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          label={BRANDING.passwordLabel}
          placeholder={BRANDING.passwordPlaceholder}
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          autoComplete="current-password"
          required
          rightElement={
            <button
              type="button"
              className="login-form__toggle-password"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          }
        />
      </div>

      <div className="login-form__options-row">
        <Checkbox
          id="remember-me"
          name="rememberMe"
          checked={formData.rememberMe}
          onChange={handleChange}
          label={BRANDING.rememberMeLabel}
        />

        <button
          type="button"
          onClick={onForgotPassword}
          className="login-form__forgot-link"
        >
          {BRANDING.forgotPasswordText}
        </button>
      </div>

      <Button
        type="submit"
        variant="primary"
        fullWidth
        isLoading={isLoading}
        iconRight={<ArrowRightIcon />}
        className="login-form__submit-btn"
      >
        {BRANDING.submitButtonText}
      </Button>
    </form>
  )
}
