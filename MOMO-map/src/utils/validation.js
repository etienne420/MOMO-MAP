/**
 * Validation utility functions for authentication
 */

export function isValidEmailFormat(email) {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

export function isInstitutionalEmail(email, domain = 'cmontmorency.qc.ca') {
  if (!isValidEmailFormat(email)) return false
  const cleanEmail = email.trim().toLowerCase()
  return cleanEmail.endsWith(`@${domain}`) || cleanEmail.endsWith(`.cmontmorency.qc.ca`)
}

export function validateLoginForm(formData) {
  const errors = {}

  if (!formData.email || !formData.email.trim()) {
    errors.email = 'Veuillez saisir votre adresse courriel.'
  } else if (!isValidEmailFormat(formData.email)) {
    errors.email = 'Format de courriel invalide.'
  }

  if (!formData.password) {
    errors.password = 'Veuillez saisir votre mot de passe.'
  } else if (formData.password.length < 6) {
    errors.password = 'Le mot de passe doit comporter au moins 6 caractères.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
