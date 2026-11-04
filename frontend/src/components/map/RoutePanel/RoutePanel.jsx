import React, { useState } from 'react'
import './RoutePanel.css'

export default function RoutePanel() {
  const [depart, setDepart] = useState('')
  const [destination, setDestination] = useState('')

  const handleSwap = () => {
    setDepart(destination)
    setDestination(depart)
  }

  return (
    <div className="route-card" role="region" aria-label="Recherche d'itinéraire">
      <div className="route-card__inputs">
        <input
          type="text"
          className="route-card__input"
          placeholder="Départ"
          value={depart}
          onChange={(e) => setDepart(e.target.value)}
          aria-label="Point de départ"
        />
        <input
          type="text"
          className="route-card__input"
          placeholder="Destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
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
    </div>
  )
}
