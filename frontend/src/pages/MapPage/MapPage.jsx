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
import useMediaQuery, { MOBILE_QUERY } from '../../hooks/useMediaQuery'
import { applyUiTheme, getCachedTheme } from '../../utils/theme'
import './MapPage.css'

export default function MapPage() {
  const [activeAmenityId, setActiveAmenityId] = useState(null)
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [selectedPinId, setSelectedPinId] = useState(null)
  const [route, setRoute] = useState(null)
  const [theme, setTheme] = useState(() => getCachedTheme())
  const [reducedMotion, setReducedMotion] = useState(false)
  const [isDevMode, setIsDevMode] = useState(
    () => getSessionRole() === 'admin' && getDevModeSetting(),
  )
  const [isDevModalOpen, setIsDevModalOpen] = useState(false)
  const [vectorOverrides, setVectorOverrides] = useState(() => loadVectorOverrides())
  const navigate = useNavigate()

  // Sur mobile, la barre latérale devient un panneau rétractable (fermé par défaut)
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const [isPanelOpen, setIsPanelOpen] = useState(() => !isMobile)

  useEffect(() => {
    setIsPanelOpen(!isMobile)
  }, [isMobile])

  // Sur mobile, on referme le panneau quand un trajet est trouvé pour laisser voir la carte
  const handleRouteChange = useCallback(
    (nextRoute) => {
      setRoute(nextRoute)
      if (nextRoute && isMobile) setIsPanelOpen(false)
    },
    [isMobile],
  )

  const handleSelectRoomFromPanel = useCallback(
    (roomId) => {
      setSelectedRoomId(roomId)
      if (isMobile) setIsPanelOpen(false)
    },
    [isMobile],
  )

  useEffect(() => {
    if (!getCurrentUserId()) return

    const load = () => {
      fetchCurrentUser()
        .then((u) => {
          // themeActuel est peuplé par GET /api/users/:uid (objet Theme complet)
          const nextTheme = u.themeActuel && typeof u.themeActuel === 'object' ? u.themeActuel : null
          setTheme(nextTheme)
          applyUiTheme(nextTheme)
          setReducedMotion(Boolean(u.settings?.reducedMotion))
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
        .catch(() => {
          // Serveur injoignable : on garde le thème déjà affiché pour la session
        })
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
        reducedMotion={reducedMotion}
        activeAmenityId={activeAmenityId}
        selectedRoomId={selectedRoomId}
        selectedPinId={selectedPinId}
        onSelectRoom={setSelectedRoomId}
        roomOverrides={vectorOverrides.roomOverrides}
        pinOverrides={vectorOverrides.pinOverrides}
        route={route}
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
      <aside
        className={`map-page-sidebar ${isPanelOpen ? 'is-open' : 'is-collapsed'}`}
        aria-label="Navigation et commodités"
      >
        <div className="map-page-sidebar__header">
          <AuthHeader className="map-page-sidebar__logo" showSubtitle={false} />
          <button
            type="button"
            className="map-page-sidebar__toggle"
            onClick={() => setIsPanelOpen((prev) => !prev)}
            aria-expanded={isPanelOpen}
            aria-controls="map-page-sidebar-body"
            aria-label={isPanelOpen ? 'Replier le panneau' : 'Déplier le panneau'}
          >
            <span className="map-page-sidebar__toggle-text">
              {isPanelOpen ? 'Fermer' : 'Itinéraire'}
            </span>
            <svg
              className="map-page-sidebar__toggle-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
        <div
          id="map-page-sidebar-body"
          className="map-page-sidebar__body"
          hidden={isMobile && !isPanelOpen}
        >
          <div className="map-page-sidebar__nav">
            <button type="button" className="map-page-nav-btn" onClick={() => navigate('/shop')}>
              Boutique
            </button>
            <button type="button" className="map-page-nav-btn" onClick={() => navigate('/settings')}>
              Paramètres
            </button>
          </div>
          <RoutePanel onSelectRoom={handleSelectRoomFromPanel} onRouteChange={handleRouteChange} />
          <AmenitiesPanel
            activeAmenityId={activeAmenityId}
            onSelectAmenity={setActiveAmenityId}
          />
        </div>
      </aside>
    </div>
  )
}
