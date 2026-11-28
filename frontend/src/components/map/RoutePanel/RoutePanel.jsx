import React, { useState, useEffect } from 'react'
import { findRoute } from '../../../utils/routing'
import './RoutePanel.css'

function CursorPickIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m4 4 7.07 17 2.51-7.39L21 11.07z" />
    </svg>
  )
}

export default function RoutePanel({
  onSelectRoom = null,
  onRouteChange = null,
  onSearchStart = null,
  pickingField = null,
  onTogglePick = null,
  pickedRoom = null,
}) {
  const [depart, setDepart] = useState('')
  const [destination, setDestination] = useState('')
  const [status, setStatus] = useState(null) // { type: 'ok' | 'error', text }
  const [hasRoute, setHasRoute] = useState(false)
  const [swapCount, setSwapCount] = useState(0)

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
    setSwapCount((c) => c + 1)
    setDepart(destination)
    setDestination(depart)
    if (hasRoute && depart.trim() && destination.trim()) {
      computeRoute(destination, depart)
    }
  }

  const handleKeyDown = (e, val) => {
    if (e.key !== 'Enter') return
    onSearchStart?.()
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

  useEffect(() => {
    if (!pickedRoom?.roomId || !pickedRoom?.field) return
    const nextDepart = pickedRoom.field === 'depart' ? pickedRoom.roomId : depart
    const nextDest = pickedRoom.field === 'destination' ? pickedRoom.roomId : destination
    if (pickedRoom.field === 'depart') {
      setDepart(pickedRoom.roomId)
    } else {
      setDestination(pickedRoom.roomId)
    }
    if (nextDepart.trim() && nextDest.trim()) {
      computeRoute(nextDepart, nextDest)
    } else if (status?.type === 'error') {
      setStatus(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedRoom])

  return (
    <div className="route-card" role="region" aria-label="Recherche d'itinéraire">
      <div className="route-card__inputs">
        <div className="route-card__input-wrap">
          <input
            type="text"
            className="route-card__input"
            placeholder="Départ (A-3133)"
            value={depart}
            onFocus={() => onSearchStart?.()}
            onChange={handleChange(setDepart)}
            onKeyDown={(e) => handleKeyDown(e, depart)}
            aria-label="Point de départ"
          />
          {onTogglePick && (
            <button
              type="button"
              className={`route-card__pick-btn ${pickingField === 'depart' ? 'is-active' : ''}`}
              onClick={() => onTogglePick('depart')}
              aria-pressed={pickingField === 'depart'}
              aria-label="Choisir le départ sur la carte"
              title="Choisir sur la carte"
            >
              <CursorPickIcon />
            </button>
          )}
        </div>
        <div className="route-card__input-wrap">
          <input
            type="text"
            className="route-card__input"
            placeholder="Destination (B-3300)"
            value={destination}
            onFocus={() => onSearchStart?.()}
            onChange={handleChange(setDestination)}
            onKeyDown={(e) => handleKeyDown(e, destination)}
            aria-label="Destination"
          />
          {onTogglePick && (
            <button
              type="button"
              className={`route-card__pick-btn ${pickingField === 'destination' ? 'is-active' : ''}`}
              onClick={() => onTogglePick('destination')}
              aria-pressed={pickingField === 'destination'}
              aria-label="Choisir la destination sur la carte"
              title="Choisir sur la carte"
            >
              <CursorPickIcon />
            </button>
          )}
        </div>
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
          style={{ transform: `rotate(${swapCount * 180}deg)` }}
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
