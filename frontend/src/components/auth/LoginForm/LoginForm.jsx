import React, { useState } from 'react'
import InputField from '../../common/InputField/InputField'
import Button from '../../common/Button/Button'
import {
  validateSignInForm,
  validateSignUpForm,
} from '../../../utils/validation'
import { signIn, signUp } from '../../../services/auth'
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

export default function LoginForm({
  mode = 'signup',
  onModeChange,
  onSubmitSuccess,
}) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [authFeedback, setAuthFeedback] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
    if (authFeedback) {
      setAuthFeedback(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validationResult =
      mode === 'signup'
        ? validateSignUpForm(formData)
        : validateSignInForm(formData)

    if (!validationResult.isValid) {
      setErrors(validationResult.errors)
      return
    }

    setIsLoading(true)
    setAuthFeedback(null)

    try {
      const credentials =
        mode === 'signup'
          ? {
              username: formData.username.trim(),
              email: formData.email.trim(),
              password: formData.password,
            }
          : {
              username: formData.username.trim(),
              password: formData.password,
            }

      if (mode === 'signup') {
        await signUp(credentials)
      } else {
        await signIn(credentials)
      }

      if (onSubmitSuccess) {
        onSubmitSuccess()
      }
    } catch (error) {
      setAuthFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Une erreur inconnue est survenue. Veuillez réessayer.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modern-auth-form">
      {authFeedback && (
        <div
          className={`modern-auth-form__alert modern-auth-form__alert--${authFeedback.type}`}
          role="alert"
        >
          {authFeedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* ===================== SIGN UP MODE ===================== */}
        {mode === 'signup' && (
          <>
            <div className="modern-auth-form__fields">
              <InputField
                id="signup-username"
                name="username"
                type="text"
                label="Username"
                value={formData.username}
                onChange={handleChange}
                error={errors.username}
                autoComplete="username"
                required
              />

              <InputField
                id="signup-email"
                name="email"
                type="email"
                label="Email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                autoComplete="email"
                required
              />

              <InputField
                id="signup-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                label="Password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                autoComplete="new-password"
                required
                rightElement={
                  <button
                    type="button"
                    className="modern-auth-form__toggle-pw"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                }
              />
            </div>

            <Button
              type="submit"
              variant="dark"
              fullWidth
              isLoading={isLoading}
              className="modern-auth-form__submit-btn"
            >
              Sign up
            </Button>

            <div className="modern-auth-form__footer">
              <span className="modern-auth-form__footer-text">
                You have an account?{' '}
                <button
                  type="button"
                  className="modern-auth-form__switch-link"
                  onClick={() => {
                    setAuthFeedback(null)
                    onModeChange('signin')
                  }}
                >
                  Sign in
                </button>
              </span>
            </div>

            <p className="auth-terms-notice">
              By sign up, you're agreeing to our{' '}
              <a href="#terms" onClick={(e) => e.preventDefault()}>Terms of Use</a>,{' '}
              <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
            </p>
          </>
        )}

        {/* ===================== SIGN IN MODE ===================== */}
        {mode === 'signin' && (
          <>
            <div className="modern-auth-form__fields">
              <InputField
                id="signin-username"
                name="username"
                type="text"
                label="Username"
                value={formData.username}
                onChange={handleChange}
                error={errors.username}
                autoComplete="username"
                required
              />

              <InputField
                id="signin-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                label="Password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                autoComplete="current-password"
                required
                rightElement={
                  <button
                    type="button"
                    className="modern-auth-form__toggle-pw"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                }
              />
            </div>

            <Button
              type="submit"
              variant="dark"
              fullWidth
              isLoading={isLoading}
              className="modern-auth-form__submit-btn"
            >
              Sign in
            </Button>

            <div className="modern-auth-form__footer">
              <span className="modern-auth-form__footer-text">
                You don't have an account yet?{' '}
                <button
                  type="button"
                  className="modern-auth-form__switch-link"
                  onClick={() => {
                    setAuthFeedback(null)
                    onModeChange('signup')
                  }}
                >
                  Sign up
                </button>
              </span>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
