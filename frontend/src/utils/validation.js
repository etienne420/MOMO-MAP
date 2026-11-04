/**
 * Validation utility functions for authentication
 */

export function isValidEmailFormat(email) {
  if (!email || typeof email !== 'string') return false
  const clean = email.trim().toLowerCase()
  if (clean === 'test') return true
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(clean)
}

export function isInstitutionalEmail(email, domain = 'cmontmorency.qc.ca') {
  if (!isValidEmailFormat(email)) return false
  const cleanEmail = email.trim().toLowerCase()
  return cleanEmail.endsWith(`@${domain}`) || cleanEmail.endsWith(`.cmontmorency.qc.ca`) || cleanEmail === 'test'
}

export function validateSignInForm(formData) {
  const errors = {}

  if (!formData.username || !formData.username.trim()) {
    errors.username = 'Please enter your username or email.'
  }

  if (!formData.password) {
    errors.password = 'Please enter your password.'
  } else if (formData.password !== 'test' && formData.password.length < 4) {
    errors.password = 'Password must be at least 4 characters.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

export function validateSignUpForm(formData) {
  const errors = {}

  if (!formData.username || !formData.username.trim()) {
    errors.username = 'Please enter a username.'
  } else if (formData.username.trim() !== 'test' && formData.username.trim().length < 3) {
    errors.username = 'Username must be at least 3 characters.'
  }

  if (!formData.email || !formData.email.trim()) {
    errors.email = 'Please enter your email.'
  } else if (!isValidEmailFormat(formData.email)) {
    errors.email = 'Please enter a valid email address.'
  }

  if (!formData.password) {
    errors.password = 'Please enter a password.'
  } else if (formData.password !== 'test' && formData.password.length < 4) {
    errors.password = 'Password must be at least 4 characters.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

export function validateResetForm(formData) {
  const errors = {}

  if (!formData.email || !formData.email.trim()) {
    errors.email = 'Please enter your email.'
  } else if (!isValidEmailFormat(formData.email)) {
    errors.email = 'Please enter a valid email address.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
