import { useEffect, useState } from 'react'

// Écran mobile : même seuil que les @media (max-width: 640px) des fichiers CSS
export const MOBILE_QUERY = '(max-width: 640px)'

function matches(query) {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(query).matches
}

// Retourne true tant que la media query correspond (se met à jour au redimensionnement)
export default function useMediaQuery(query) {
  const [isMatch, setIsMatch] = useState(() => matches(query))

  useEffect(() => {
    if (!window.matchMedia) return undefined
    const mql = window.matchMedia(query)
    const handleChange = () => setIsMatch(mql.matches)
    handleChange()
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [query])

  return isMatch
}
