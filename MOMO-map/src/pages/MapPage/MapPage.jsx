import React from 'react'
import { Link } from 'react-router-dom'
import './MapPage.css'

export default function MapPage() {
  return (
    <main className="map-page bg-dot-pattern">
      <div className="map-page__card">
        <h1 className="map-page__title">map page</h1>
        <p className="map-page__subtitle">MOMO-MAP • Collège Montmorency</p>
        <div className="map-page__links">
          <Link to="/login" className="map-page__nav-link">
            Connexion (Sign In)
          </Link>
          <span className="map-page__link-divider">•</span>
          <Link to="/signup" className="map-page__nav-link">
            Inscription (Sign Up)
          </Link>
        </div>
      </div>
    </main>
  )
}
