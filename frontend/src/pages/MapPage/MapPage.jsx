import React, { useState } from 'react'
import AuthHeader from '../../components/auth/AuthHeader/AuthHeader'
import RoutePanel from '../../components/map/RoutePanel/RoutePanel'
import AmenitiesPanel from '../../components/map/AmenitiesPanel/AmenitiesPanel'
import MapCanvas from '../../components/map/MapCanvas/MapCanvas'
import './MapPage.css'

export default function MapPage() {
  const [activeAmenityId, setActiveAmenityId] = useState(null)

  return (
    <div className="map-page-screen">
      {/* Full viewport interactive Google Maps Grid canvas */}
      <MapCanvas />

      {/* Floating Navigation Sidebar */}
      <aside className="map-page-sidebar" aria-label="Navigation et commodités">
        <AuthHeader className="map-page-sidebar__logo" showSubtitle={false} />
        <RoutePanel />
        <AmenitiesPanel
          activeAmenityId={activeAmenityId}
          onSelectAmenity={setActiveAmenityId}
        />
      </aside>
    </div>
  )
}
