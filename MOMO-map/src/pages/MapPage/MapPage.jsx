import React from 'react'
import AuthHeader from '../../components/auth/AuthHeader/AuthHeader'
import RoutePanel from '../../components/map/RoutePanel/RoutePanel'
import AmenitiesPanel from '../../components/map/AmenitiesPanel/AmenitiesPanel'
import './MapPage.css'

export default function MapPage() {
  return (
    <div className="map-page-screen bg-dot-pattern">
      <div className="map-page-sidebar">
        <AuthHeader className="map-page-sidebar__logo" showSubtitle={false} />
        <RoutePanel />
        <AmenitiesPanel />
      </div>
    </div>
  )
}
