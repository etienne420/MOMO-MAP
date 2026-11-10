import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthHeader from '../../components/auth/AuthHeader/AuthHeader'
import RoutePanel from '../../components/map/RoutePanel/RoutePanel'
import AmenitiesPanel from '../../components/map/AmenitiesPanel/AmenitiesPanel'
import MapCanvas from '../../components/map/MapCanvas/MapCanvas'
import { getCurrentUserId, fetchCurrentUser } from '../../services/auth'
import './MapPage.css'

export default function MapPage() {
  const [activeAmenityId, setActiveAmenityId] = useState(null)
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [theme, setTheme] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!getCurrentUserId()) return

    const load = () => {
      fetchCurrentUser()
        .then((u) => setTheme(u.themeActuel || null))
        .catch(() => setTheme(null))
    }

    load()
    window.addEventListener('focus', load)
    return () => window.removeEventListener('focus', load)
  }, [])

  return (
    <div className="map-page-screen">
      {/* Full viewport interactive Google Maps Grid canvas */}
      <MapCanvas
        theme={theme}
        activeAmenityId={activeAmenityId}
        selectedRoomId={selectedRoomId}
        onSelectRoom={setSelectedRoomId}
      />

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
        <RoutePanel onSelectRoom={setSelectedRoomId} />
        <AmenitiesPanel
          activeAmenityId={activeAmenityId}
          onSelectAmenity={setActiveAmenityId}
        />
      </aside>
    </div>
  )
}
