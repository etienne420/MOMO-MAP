import React, { useState } from 'react'
import { findRoute } from '../../../utils/routing'
import './RoutePanel.css'

export default function RoutePanel({ onSelectRoom = null, onRouteChange = null }) {
  const [depart, setDepart] = useState('')
  const [destination, setDestination] = useState('')
  const [status, setStatus] = useState(null) // { type: 'ok' | 'error', text }
  const [hasRoute, setHasRoute] = useState(false)

  // Calcule et affiche le trajet si les deux champs sont remplis
  const computeRoute = (from, to) => {
    const result = findRoute(from, to)
    if (result.error) {
      setStatus({ type: 'error', text: result.error })
      setHasRoute(false)
      onRouteChange?.(null)
      return
    }
    setStatus({ type: 'ok', text: `Trajet : ${result.fromId} → ${result.toId}` })
    setHasRoute(true)
    onRouteChange?.(result)
  }

  const clearRoute = () => {
    setStatus(null)
    setHasRoute(false)
    onRouteChange?.(null)
  }

  const handleSwap = () => {
    setDepart(destination)
    setDestination(depart)
    if (hasRoute && depart.trim() && destination.trim()) {
      computeRoute(destination, depart)
    }
  }

  const handleKeyDown = (e, val) => {
    if (e.key !== 'Enter') return
    if (depart.trim() && destination.trim()) {
      computeRoute(depart, destination)
    } else if (val.trim() && onSelectRoom) {
      // Un seul champ rempli : on centre simplement la carte sur ce local
      onSelectRoom(val.trim())
    }
  }

  const handleChange = (setter) => (e) => {
    setter(e.target.value)
    if (status?.type === 'error') setStatus(null)
  }

  return (
    <div className="route-card" role="region" aria-label="Recherche d'itinéraire">
      <div className="route-card__inputs">
        <input
          type="text"
          className="route-card__input"
          placeholder="Départ (ex. A-3133)"
          value={depart}
          onChange={handleChange(setDepart)}
          onKeyDown={(e) => handleKeyDown(e, depart)}
          aria-label="Point de départ"
        />
        <input
          type="text"
          className="route-card__input"
          placeholder="Destination (ex. B-3300)"
          value={destination}
          onChange={handleChange(setDestination)}
          onKeyDown={(e) => handleKeyDown(e, destination)}
          aria-label="Destination"
        />
      </div>

      <button
        type="button"
        className="route-card__swap-btn"
        onClick={handleSwap}
        aria-label="Inverser départ et destination"
        title="Inverser départ et destination"
      >
        <svg
          className="route-card__swap-icon"
          width="20"
          height="28"
          viewBox="0 0 20 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Left arrow pointing UP */}
          <path d="M5 23V5M2 8.5L5 5L8 8.5" />
          {/* Right arrow pointing DOWN */}
          <path d="M15 5V23M12 19.5L15 23L18 19.5" />
        </svg>
      </button>

      {status && (
        <div
          className={`route-card__status route-card__status--${status.type}`}
          role={status.type === 'error' ? 'alert' : 'status'}
        >
          <span>{status.text}</span>
          {hasRoute && (
            <button type="button" className="route-card__clear-btn" onClick={clearRoute}>
              Effacer
            </button>
          )}
        </div>
      )}
    </div>
  )
}
