import React from 'react'
import LoginPage from '../LoginPage/LoginPage'

export default function SignUpPage({ onLoginSuccess }) {
  return <LoginPage initialMode="signup" onLoginSuccess={onLoginSuccess} />
}
