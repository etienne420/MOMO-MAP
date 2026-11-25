import { useEffect } from 'react'

// Bloque le zoom du navigateur (pincement, double toucher) tant que le composant est affiché.
// Utilisé sur la page de la carte : la carte gère son propre zoom, et sans ce verrou le pincement
// zoomait aussi toute la page. Les autres pages restent zoomables (accessibilité).
const LOCKED_VIEWPORT = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'

export default function usePageZoomLock(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined

    const meta = document.querySelector('meta[name="viewport"]')
    const previousViewport = meta?.getAttribute('content')
    meta?.setAttribute('content', LOCKED_VIEWPORT)
    document.documentElement.classList.add('is-zoom-locked')

    // Safari iOS ignore user-scalable=no : on bloque ses gestes de zoom propriétaires
    const preventGesture = (e) => e.preventDefault()
    // Pincement à deux doigts n'importe où sur la page (Chrome Android, Safari iOS)
    const preventPinch = (e) => {
      if (e.touches && e.touches.length > 1) e.preventDefault()
    }

    document.addEventListener('gesturestart', preventGesture, { passive: false })
    document.addEventListener('gesturechange', preventGesture, { passive: false })
    document.addEventListener('touchmove', preventPinch, { passive: false })

    return () => {
      if (meta && previousViewport != null) meta.setAttribute('content', previousViewport)
      document.documentElement.classList.remove('is-zoom-locked')
      document.removeEventListener('gesturestart', preventGesture)
      document.removeEventListener('gesturechange', preventGesture)
      document.removeEventListener('touchmove', preventPinch)
    }
  }, [enabled])
}
