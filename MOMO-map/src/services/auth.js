const SESSION_TOKEN_KEY = 'momo-map.access-token'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim()

function getApiUrl(path) {
  if (!API_BASE_URL) {
    throw new Error(
      'Le service d’authentification n’est pas configuré. Définissez VITE_API_BASE_URL.',
    )
  }

  return `${API_BASE_URL.replace(/\/+$/, '')}${path}`
}

function getTokenExpiration(token) {
  const payload = token.split('.')[1]
  const base64Payload = payload.replace(/-/g, '+').replace(/_/g, '/')
  const paddedPayload =
    base64Payload + '='.repeat((4 - (base64Payload.length % 4)) % 4)

  try {
    const claims = JSON.parse(window.atob(paddedPayload))
    if (!Number.isFinite(claims.exp)) {
      throw new Error()
    }
    return claims.exp * 1000
  } catch {
    throw new Error('Le JWT retourné par le serveur est invalide ou sans expiration.')
  }
}

async function requestAuth(path, credentials) {
  let response
  try {
    response = await fetch(getApiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        'Impossible de joindre le serveur d’authentification. Vérifiez son adresse et réessayez.',
      )
    }
    throw error
  }

  const responseText = await response.text()
  let result = {}

  if (responseText) {
    try {
      const parsedResult = JSON.parse(responseText)
      result =
        parsedResult && typeof parsedResult === 'object' ? parsedResult : {}
    } catch {
      if (response.ok) {
        throw new Error('Le serveur a retourné une réponse invalide.')
      }
    }
  }

  if (!response.ok) {
    throw new Error(
      result.message ||
        result.error ||
        `Le serveur a refusé la demande (HTTP ${response.status}).`,
    )
  }

  const token = result.accessToken || result.token
  if (
    typeof token !== 'string' ||
    token.split('.').length !== 3 ||
    token.split('.').some((part) => !part)
  ) {
    throw new Error('Le serveur n’a pas retourné de jeton JWT valide.')
  }
  if (getTokenExpiration(token) <= Date.now()) {
    throw new Error('Le serveur a retourné un jeton JWT déjà expiré.')
  }

  try {
    window.sessionStorage.setItem(SESSION_TOKEN_KEY, token)
  } catch {
    throw new Error(
      'La session a été créée, mais le navigateur ne permet pas de la conserver.',
    )
  }

  return result
}

export function signIn(credentials) {
  return requestAuth('/auth/login', credentials)
}

export function signUp(credentials) {
  return requestAuth('/auth/register', credentials)
}

export function getAuthToken() {
  const token = window.sessionStorage.getItem(SESSION_TOKEN_KEY)
  if (!token) {
    return null
  }

  try {
    if (getTokenExpiration(token) > Date.now()) {
      return token
    }
  } catch {
    clearAuthSession()
    return null
  }

  clearAuthSession()
  return null
}

export function clearAuthSession() {
  window.sessionStorage.removeItem(SESSION_TOKEN_KEY)
}
