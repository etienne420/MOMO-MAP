import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthHeader from '../../components/auth/AuthHeader/AuthHeader'
import RoutePanel from '../../components/map/RoutePanel/RoutePanel'
import AmenitiesPanel from '../../components/map/AmenitiesPanel/AmenitiesPanel'
import MapCanvas from '../../components/map/MapCanvas/MapCanvas'
import { getCurrentUserId } from '../../services/auth'
import './MapPage.css'

export default function MapPage() {
  const [activeAmenityId, setActiveAmenityId] = useState(null)
  const [theme, setTheme] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const uid = getCurrentUserId()
    if (!uid) return
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/${uid}`)
      .then((r) => r.json())
      .then((u) => setTheme(u.themeActuel || null))
      .catch(() => {})
  }, [])

  return (
    <div className="map-page-screen">
      {/* Full viewport interactive Google Maps Grid canvas */}
      <MapCanvas theme={theme} />

      {/* Floating Navigation Sidebar */}
      <aside className="map-page-sidebar" aria-label="Navigation et commodités">
        <AuthHeader className="map-page-sidebar__logo" showSubtitle={false} />
        <div className="map-page-sidebar__nav">
          <button type="button" className="map-page-nav-btn" onClick={() => navigate('/shop')}>
            Boutique
          </button>
          <button type="button" className="map-page-nav-btn" onClick={() => navigate('/settings')}>
            Paramètres
          </button>
        </div>
        <RoutePanel />
        <AmenitiesPanel
          activeAmenityId={activeAmenityId}
          onSelectAmenity={setActiveAmenityId}
        />
      </aside>
    </div>
  )
}
