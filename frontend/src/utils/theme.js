// utils/theme.js
// Application du thème choisi par l'utilisateur (modèle Theme du backend) à la carte et à l'interface.
//
// Champs du thème utilisés :
//   backgroundColor -> sol de la carte (fond blanc du plan)
//   gridColor       -> blocs et bâtiments du plan (#D9D9D9 dans MAP-FINAL.svg)
//   crosshairColor  -> rues et chemins (#B9B9BE)
//   subgridColor    -> contours des rues (#646464)
//   greenColor      -> (optionnel) espaces verts (#358838)
//   primaryColor    -> (optionnel) couleur principale de l'interface (boutons, focus, tracé)
//   animate         -> active les animations décoratives de la carte
// Sans thème équipé, la carte et l'interface gardent leurs couleurs d'origine.

const CACHE_KEY = 'momo-map.theme'

// Variables CSS de l'interface pilotées par primaryColor (voir styles/variables.css)
const UI_VARS = [
  '--color-primary',
  '--color-primary-hover',
  '--color-primary-active',
  '--color-primary-light',
  '--color-primary-ring',
  '--color-border-focus',
  '--color-dark-btn-hover',
]

// N'accepte que des couleurs CSS valides (évite d'injecter n'importe quoi dans le style)
export function sanitizeColor(value) {
  if (typeof value !== 'string') return null
  const color = value.trim()
  if (!color || color.length > 64 || /[;{}<>]/.test(color)) return null
  if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function') {
    return CSS.supports('color', color) ? color : null
  }
  return /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla)\([\d\s.,%/-]+\)|[a-z]+)$/i.test(color) ? color : null
}

// Variables CSS appliquées au conteneur de la carte (MapCanvas)
export function getMapThemeVars(theme) {
  if (!theme || typeof theme !== 'object') return {}
  const vars = {}
  const map = {
    '--map-ground': theme.backgroundColor,
    '--map-block': theme.gridColor,
    '--map-road': theme.crosshairColor,
    '--map-road-outline': theme.subgridColor,
    '--map-green': theme.greenColor,
    '--map-accent': theme.primaryColor,
  }
  for (const [name, value] of Object.entries(map)) {
    const color = sanitizeColor(value)
    if (color) vars[name] = color
  }
  return vars
}

// Applique (ou retire) la couleur principale du thème sur toute l'interface
export function applyUiTheme(theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const primary = sanitizeColor(theme?.primaryColor)

  if (!primary) {
    UI_VARS.forEach((name) => root.style.removeProperty(name))
    root.removeAttribute('data-theme')
  } else {
    root.style.setProperty('--color-primary', primary)
    root.style.setProperty('--color-primary-hover', `color-mix(in srgb, ${primary} 82%, black)`)
    root.style.setProperty('--color-primary-active', `color-mix(in srgb, ${primary} 66%, black)`)
    root.style.setProperty('--color-primary-light', `color-mix(in srgb, ${primary} 10%, white)`)
    root.style.setProperty('--color-primary-ring', `color-mix(in srgb, ${primary} 15%, transparent)`)
    root.style.setProperty('--color-border-focus', primary)
    root.style.setProperty('--color-dark-btn-hover', primary)
    root.setAttribute('data-theme', theme?.nom ? String(theme.nom) : 'custom')
  }

  try {
    if (theme && typeof theme === 'object') {
      window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(theme))
    } else {
      window.sessionStorage.removeItem(CACHE_KEY)
    }
  } catch {
    // stockage indisponible : le thème sera rechargé depuis le serveur
  }
}

// Thème mémorisé pendant la session (affiché tout de suite, avant la réponse du serveur)
export function getCachedTheme() {
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY)
    const theme = raw ? JSON.parse(raw) : null
    return theme && typeof theme === 'object' ? theme : null
  } catch {
    return null
  }
}

// Retrouve l'objet thème complet : themeActuel peut être un objet (populate) ou un simple id
export function resolveTheme(themeActuel, catalogThemes = []) {
  if (!themeActuel) return null
  if (typeof themeActuel === 'object') return themeActuel
  return catalogThemes.find((t) => t._id === themeActuel) || null
}
