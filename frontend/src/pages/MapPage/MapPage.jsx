import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthHeader from '../../components/auth/AuthHeader/AuthHeader'
import RoutePanel from '../../components/map/RoutePanel/RoutePanel'
import AmenitiesPanel from '../../components/map/AmenitiesPanel/AmenitiesPanel'
import MapCanvas from '../../components/map/MapCanvas/MapCanvas'
import DevControlModal from '../../components/map/DevControlModal/DevControlModal'
import {
  getCurrentUserId,
  fetchCurrentUser,
  getSessionRole,
  getDevModeSetting,
  setDevModeSetting,
} from '../../services/auth'
import {
  loadVectorOverrides,
  saveVectorOverrides,
} from '../../utils/vectorOverrides'
import './MapPage.css'

export default function MapPage() {
  const [activeAmenityId, setActiveAmenityId] = useState(null)
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [selectedPinId, setSelectedPinId] = useState(null)
  const [theme, setTheme] = useState(null)
  const [isDevMode, setIsDevMode] = useState(
    () => getSessionRole() === 'admin' && getDevModeSetting(),
  )
  const [isDevModalOpen, setIsDevModalOpen] = useState(false)
  const [vectorOverrides, setVectorOverrides] = useState(() => loadVectorOverrides())
  const navigate = useNavigate()

  useEffect(() => {
    if (!getCurrentUserId()) return

    const load = () => {
      fetchCurrentUser()
        .then((u) => {
          setTheme(u.themeActuel || null)
          const adminRole = u.role === 'admin' || getSessionRole() === 'admin'
          if (adminRole) {
            const devEnabled =
              typeof u.settings?.devMode === 'boolean'
                ? u.settings.devMode
                : getDevModeSetting()
            setDevModeSetting(devEnabled)
            setIsDevMode(devEnabled)
          } else {
            setIsDevMode(false)
            setIsDevModalOpen(false)
          }
        })
        .catch(() => setTheme(null))
    }

    load()
    window.addEventListener('focus', load)
    return () => window.removeEventListener('focus', load)
  }, [])

  const handleUpdateOverride = useCallback((item, patch) => {
    setVectorOverrides((prev) => {
      const bucketKey = item.kind === 'pin' ? 'pinOverrides' : 'roomOverrides'
      const next = {
        ...prev,
        [bucketKey]: {
          ...prev[bucketKey],
          [item.id]: {
            ...prev[bucketKey][item.id],
            ...patch,
          },
        },
      }
      saveVectorOverrides(next)
      return next
    })
  }, [])

  const handleResetOverride = useCallback((item) => {
    setVectorOverrides((prev) => {
      const bucketKey = item.kind === 'pin' ? 'pinOverrides' : 'roomOverrides'
      const updatedBucket = { ...prev[bucketKey] }
      delete updatedBucket[item.id]
      const next = { ...prev, [bucketKey]: updatedBucket }
      saveVectorOverrides(next)
      return next
    })
  }, [])

  const handleSelectVector = useCallback((item) => {
    if (item.kind === 'pin') {
      setSelectedPinId(item.id)
      if (item.roomId) setSelectedRoomId(item.roomId)
    } else {
      setSelectedPinId(null)
      setSelectedRoomId(item.id)
    }
  }, [])

  return (
    <div className="map-page-screen">
      {/* Full viewport interactive Google Maps Grid canvas */}
      <MapCanvas
        theme={theme}
        activeAmenityId={activeAmenityId}
        selectedRoomId={selectedRoomId}
        selectedPinId={selectedPinId}
        onSelectRoom={setSelectedRoomId}
        roomOverrides={vectorOverrides.roomOverrides}
        pinOverrides={vectorOverrides.pinOverrides}
      />

      {isDevMode && (
        <>
          <button
            type="button"
            className={`map-page-dev-btn ${isDevModalOpen ? 'is-open' : ''}`}
            onClick={() => setIsDevModalOpen((prev) => !prev)}
          >
            Dev
          </button>
          <DevControlModal
            isOpen={isDevModalOpen}
            onClose={() => setIsDevModalOpen(false)}
            roomOverrides={vectorOverrides.roomOverrides}
            pinOverrides={vectorOverrides.pinOverrides}
            onUpdateOverride={handleUpdateOverride}
            onResetOverride={handleResetOverride}
            onSelectVector={handleSelectVector}
          />
        </>
      )}

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
