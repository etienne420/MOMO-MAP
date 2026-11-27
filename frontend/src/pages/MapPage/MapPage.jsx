import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthHeader from '../../components/auth/AuthHeader/AuthHeader'
import RoutePanel from '../../components/map/RoutePanel/RoutePanel'
import AmenitiesPanel from '../../components/map/AmenitiesPanel/AmenitiesPanel'
import MapCanvas from '../../components/map/MapCanvas/MapCanvas'
import DevControlModal from '../../components/map/DevControlModal/DevControlModal'
import MobileToolbar from '../../components/map/MobileToolbar/MobileToolbar'
import {
  getCurrentUserId,
  fetchCurrentUser,
  getSessionRole,
  getDevModeSetting,
  setDevModeSetting,
  getDevViewSettings,
  setDevViewSettings,
} from '../../services/auth'
import {
  loadVectorOverrides,
  saveVectorOverrides,
} from '../../utils/vectorOverrides'
import useMediaQuery, { MOBILE_QUERY } from '../../hooks/useMediaQuery'
import usePageZoomLock from '../../hooks/usePageZoomLock'
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
  const initialDevView = getDevViewSettings()
  const [devViewPath, setDevViewPath] = useState(() => initialDevView.devViewPath)
  const [devViewDoors, setDevViewDoors] = useState(() => initialDevView.devViewDoors)
  const [devViewNames, setDevViewNames] = useState(() => initialDevView.devViewNames)
  const [isDevModalOpen, setIsDevModalOpen] = useState(false)
  const [vectorOverrides, setVectorOverrides] = useState(() => loadVectorOverrides())
  const navigate = useNavigate()

  // Sur mobile : carte plein écran, itinéraire en haut, barre d'outils et commodités en bas
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const [isSheetOpen, setIsSheetOpen] = useState(true)

  // La carte a son propre zoom : on empêche le navigateur de zoomer toute la page
  usePageZoomLock()
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [viewportInsets, setViewportInsets] = useState({ top: 0, bottom: 0 })
  const mapControlsRef = useRef(null)
  const mobileTopRef = useRef(null)
  const mobileBottomRef = useRef(null)
  const sheetTouchStartRef = useRef(null)

  // Mesure l'espace couvert par l'interface mobile pour que la caméra centre la carte dans la zone libre
  useLayoutEffect(() => {
    if (!isMobile) {
      setViewportInsets({ top: 0, bottom: 0 })
      return undefined
    }
    const measure = () => {
      const topRect = mobileTopRef.current?.getBoundingClientRect()
      const bottomRect = mobileBottomRef.current?.getBoundingClientRect()
      setViewportInsets({
        top: topRect ? Math.round(topRect.bottom) : 0,
        bottom: bottomRect ? Math.round(window.innerHeight - bottomRect.top) : 0,
      })
    }
    measure()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (observer) {
      if (mobileTopRef.current) observer.observe(mobileTopRef.current)
      if (mobileBottomRef.current) observer.observe(mobileBottomRef.current)
    }
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [isMobile, isSheetOpen])

  // Glisser la poignée du panneau vers le bas le replie, vers le haut le déplie
  const handleSheetTouchStart = (e) => {
    sheetTouchStartRef.current = e.touches[0]?.clientY ?? null
  }
  const handleSheetTouchEnd = (e) => {
    const startY = sheetTouchStartRef.current
    sheetTouchStartRef.current = null
    const endY = e.changedTouches[0]?.clientY
    if (startY == null || endY == null) return
    const delta = endY - startY
    if (delta > 30) setIsSheetOpen(false)
    else if (delta < -30) setIsSheetOpen(true)
  }

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
          setAvatarUrl(
            u.avatarActuel && typeof u.avatarActuel === 'object' ? u.avatarActuel.image || null : null,
          )
          const adminRole = u.role === 'admin' || getSessionRole() === 'admin'
          if (adminRole) {
            const devEnabled =
              typeof u.settings?.devMode === 'boolean'
                ? u.settings.devMode
                : getDevModeSetting()
            setDevModeSetting(devEnabled)
            setIsDevMode(devEnabled)
            const cachedView = getDevViewSettings()
            const nextView = {
              devViewPath:
                typeof u.settings?.devViewPath === 'boolean'
                  ? u.settings.devViewPath
                  : cachedView.devViewPath,
              devViewDoors:
                typeof u.settings?.devViewDoors === 'boolean'
                  ? u.settings.devViewDoors
                  : cachedView.devViewDoors,
              devViewNames:
                typeof u.settings?.devViewNames === 'boolean'
                  ? u.settings.devViewNames
                  : cachedView.devViewNames,
            }
            setDevViewSettings(nextView)
            setDevViewPath(nextView.devViewPath)
            setDevViewDoors(nextView.devViewDoors)
            setDevViewNames(nextView.devViewNames)
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

  const devToggle = isDevMode && (
    <button
      type="button"
      className={`${isMobile ? 'mobile-toolbar__dev' : 'map-page-dev-btn'} ${isDevModalOpen ? 'is-open' : ''}`}
      onClick={() => setIsDevModalOpen((prev) => !prev)}
      aria-pressed={isDevModalOpen}
    >
      Dev
    </button>
  )

  return (
    <div className={`map-page-screen ${isMobile ? 'is-mobile' : ''}`}>
      {/* Carte interactive plein écran */}
      <MapCanvas
        theme={theme}
        reducedMotion={reducedMotion}
        showRoomNames={isDevMode && devViewNames}
        showPins={isDevMode && devViewDoors}
        showCorridorPath={isDevMode && devViewPath}
        activeAmenityId={activeAmenityId}
        selectedRoomId={selectedRoomId}
        selectedPinId={selectedPinId}
        onSelectRoom={setSelectedRoomId}
        roomOverrides={vectorOverrides.roomOverrides}
        pinOverrides={vectorOverrides.pinOverrides}
        route={route}
        hideOverlayControls={isMobile}
        viewportInsets={viewportInsets}
        controlRef={mapControlsRef}
      />

      {isDevMode && (
        <>
          {!isMobile && devToggle}
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

      {isMobile ? (
        <>
          {/* Haut : espace supérieur fondu + recherche d'itinéraire */}
          <header ref={mobileTopRef} className="map-mobile-top">
            <RoutePanel onSelectRoom={setSelectedRoomId} onRouteChange={setRoute} />
          </header>

          {/* Bas : barre d'outils + panneau des commodités */}
          <div ref={mobileBottomRef} className="map-mobile-bottom">
            <MobileToolbar
              onChangeView={() => mapControlsRef.current?.advanceStage()}
              onRecenter={() => mapControlsRef.current?.recenter()}
              onOpenSettings={() => navigate('/settings')}
              onOpenShop={() => navigate('/shop')}
              onOpenProfile={() => navigate('/settings')}
              avatarUrl={avatarUrl}
              devButton={devToggle || null}
            />
            <section
              className={`map-mobile-sheet ${isSheetOpen ? 'is-open' : 'is-collapsed'}`}
              aria-label="Commodités"
            >
              <button
                type="button"
                className="map-mobile-sheet__handle"
                onClick={() => setIsSheetOpen((prev) => !prev)}
                onTouchStart={handleSheetTouchStart}
                onTouchEnd={handleSheetTouchEnd}
                aria-expanded={isSheetOpen}
                aria-controls="map-mobile-sheet-body"
                aria-label={isSheetOpen ? 'Replier les commodités' : 'Afficher les commodités'}
              >
                <span className="map-mobile-sheet__grabber" aria-hidden="true" />
              </button>
              <div id="map-mobile-sheet-body" className="map-mobile-sheet__body" hidden={!isSheetOpen}>
                <AmenitiesPanel
                  layout="grid"
                  activeAmenityId={activeAmenityId}
                  onSelectAmenity={setActiveAmenityId}
                />
              </div>
            </section>
          </div>
        </>
      ) : (
        /* Ordinateur : barre latérale flottante à gauche */
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
          <RoutePanel onSelectRoom={setSelectedRoomId} onRouteChange={setRoute} />
          <AmenitiesPanel
            activeAmenityId={activeAmenityId}
            onSelectAmenity={setActiveAmenityId}
          />
        </aside>
      )}
    </div>
  )
}

// Logo du Collège Montmorency : placer le fichier officiel dans frontend/public/logo-montmorency.svg.
// Tant qu'il est absent, on affiche le nom du Collège en texte.
const LOGO_URL = '/logo.png'

function MapLogo() {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className="map-mobile-logo map-mobile-logo--text" aria-label="Collège Montmorency">
        <span>Collège</span>
        <span>Montmorency</span>
      </div>
    )
  }
  return (
    <img
      className="map-mobile-logo"
      src={LOGO_URL}
      alt="Collège Montmorency"
      onError={() => setFailed(true)}
    />
  )
}
