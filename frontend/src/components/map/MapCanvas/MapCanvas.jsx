import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import mapSatSvgRaw from '../../../assets/map/MAP-SAT.svg?raw'
import mapMainSvgRaw from '../../../assets/map/MAP-MAIN.svg?raw'
import momoRoomsData from '../../../assets/map/momo-main-rooms.json'
import './MapCanvas.css'

const MAP_WIDTH = momoRoomsData.viewBox.width // 5483
const MAP_HEIGHT = momoRoomsData.viewBox.height // 4446
const INSET_BOUNDS = momoRoomsData.insetBounds // { x: 1062.67, y: 1046.08, width: 3194, height: 2346 }
const BUILDING_BOUNDS = momoRoomsData.buildingBounds // { minX: 2184, minY: 1870, maxX: 3501, maxY: 2664, cx: 2842.5, cy: 2267 }

// Extract inner SVG contents and structure MAP-MAIN into controllable Russian-doll layers
function extractInnerSvg(rawSvg) {
  const match = rawSvg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i)
  return match ? match[1] : rawSvg
}

function buildLayeredMainSvg(rawMainSvg) {
  const inner = extractInnerSvg(rawMainSvg)
  // In MAP-MAIN.svg:
  // - Everything before <rect x="1062.67" y="1046.08"...> is identical to MAP-SAT.svg (the outer unzoomed map).
  // - From <rect x="1062.67" y="1046.08"...> to <g opacity="0.78" id="momo-rooms-layer"> + <g filter="url(#filter2_d_120_7893)"> is the zoomed campus inset map.
  // - <g opacity="0.78" id="momo-rooms-layer"> ... </g> is the building rooms layer.
  // - <defs>...</defs> contains filters and masks.
  const insetStart = inner.indexOf('<rect x="1062.67" y="1046.08"')
  const roomsStart = inner.indexOf('<g opacity="0.78" id="momo-rooms-layer">')
  const filter2Start = inner.indexOf('<g filter="url(#filter2_d_120_7893)">')
  const borderStart = inner.indexOf('<path d="M5.33301 5.33331H5477.33V4440.5H5.33301V5.33331Z"')
  const defsStart = inner.indexOf('<defs>')

  if (insetStart === -1 || roomsStart === -1 || filter2Start === -1 || borderStart === -1 || defsStart === -1) {
    return { baseZoomedMarkup: inner, roomsMarkup: '', defsMarkup: '' }
  }

  const insetPart1 = inner.slice(insetStart, roomsStart)
  const roomsGroup = inner.slice(roomsStart, filter2Start)
  const insetPart2 = inner.slice(filter2Start, borderStart)
  const defsPart = inner.slice(defsStart)

  return {
    baseZoomedMarkup: insetPart1 + insetPart2,
    roomsMarkup: roomsGroup,
    defsMarkup: defsPart,
  }
}

const SAT_INNER_MARKUP = extractInnerSvg(mapSatSvgRaw)
const {
  baseZoomedMarkup: MAIN_BASE_MARKUP,
  roomsMarkup: MAIN_ROOMS_MARKUP,
  defsMarkup: MAIN_DEFS_MARKUP,
} = buildLayeredMainSvg(mapMainSvgRaw)

// Zoom thresholds (relative to initial minZoom = 1.0x where the SVG covers the whole viewport)
// The user requested:
// - Start the most unzoomed possible, with the whole grid covered by the map so you can't unzoom outside the SVG
// - Only need to zoom a couple of times to progress through the Russian-doll stages:
//   * Stage 1 (1.0x): Unzoomed outer map fills the entire screen
//   * Stage 2 (>= 1.35x, ~1 zoom step in): Zoomed campus inset map appears with smooth transition animation
//   * Stage 3 (>= 2.1x, ~2-3 zoom steps in): Building rooms appear
//   * Stage 4 (>= 3.4x, ~4-5 zoom steps in): Specific room vector names appear
const ZOOMED_MAP_THRESHOLD = 1.35
const ROOMS_VISIBLE_THRESHOLD = 2.1
const ROOM_NAMES_THRESHOLD = 3.4
const MAX_RELATIVE_ZOOM = 12

export default function MapCanvas({
  theme = null,
  activeAmenityId = null,
  selectedRoomId = null,
  onSelectRoom = null,
}) {
  const containerRef = useRef(null)

  const bgColor = theme?.backgroundColor || '#ffffff'
  const animate = theme?.animate && !theme?.reducedMotion

  // Min zoom is computed dynamically so the 5483x4446 SVG covers the entire viewport (cannot unzoom out of the SVG)
  const [minZoom, setMinZoom] = useState(0.35)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(0.35)
  const [isDragging, setIsDragging] = useState(false)
  const [isSmoothTransitioning, setIsSmoothTransitioning] = useState(false)
  const [hoveredRoomId, setHoveredRoomId] = useState(null)
  const [focusedRoomId, setFocusedRoomId] = useState(null)
  const [viewportSize, setViewportSize] = useState({ width: 1280, height: 800 })

  const hasInitializedRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const currentPanRef = useRef({ x: 0, y: 0 })
  const currentZoomRef = useRef(0.35)
  const minZoomRef = useRef(0.35)
  const viewportSizeRef = useRef({ width: 1280, height: 800 })
  const initialTouchDistanceRef = useRef(null)
  const initialTouchZoomRef = useRef(0.35)
  const transitionTimeoutRef = useRef(null)

  useEffect(() => {
    currentPanRef.current = pan
  }, [pan])

  useEffect(() => {
    currentZoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    minZoomRef.current = minZoom
  }, [minZoom])

  useEffect(() => {
    viewportSizeRef.current = viewportSize
  }, [viewportSize])

  // Clamp pan so the user can never pan or unzoom outside the 5483x4446 SVG map boundaries
  const clampPan = useCallback((candidatePan, targetZoom, vp = viewportSizeRef.current) => {
    const mapScreenW = MAP_WIDTH * targetZoom
    const mapScreenH = MAP_HEIGHT * targetZoom

    let minX = vp.width - mapScreenW
    let maxX = 0
    if (mapScreenW <= vp.width) {
      minX = (vp.width - mapScreenW) / 2
      maxX = minX
    }

    let minY = vp.height - mapScreenH
    let maxY = 0
    if (mapScreenH <= vp.height) {
      minY = (vp.height - mapScreenH) / 2
      maxY = minY
    }

    return {
      x: Math.min(Math.max(candidatePan.x, minX), maxX),
      y: Math.min(Math.max(candidatePan.y, minY), maxY),
    }
  }, [])

  // Compute cover scale so the SVG fills the entire screen ("the whole grid should be the map so you shouldnt be able to unzoom out the svg")
  const computeCoverView = useCallback((el) => {
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const w = rect.width || window.innerWidth
    const h = rect.height || window.innerHeight

    // Use Math.max so the SVG covers 100% of the viewport width and height with no outside space visible
    const coverScale = Math.max(w / MAP_WIDTH, h / MAP_HEIGHT)
    const computedMinZoom = parseFloat(coverScale.toFixed(5))

    const mapScreenW = MAP_WIDTH * computedMinZoom
    const mapScreenH = MAP_HEIGHT * computedMinZoom
    const centerX = (w - mapScreenW) / 2
    const centerY = (h - mapScreenH) / 2

    return {
      minZoom: computedMinZoom,
      pan: { x: centerX, y: centerY },
      viewport: { width: w, height: h },
    }
  }, [])

  // Initialize to most unzoomed cover view on mount & update on resize
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const applyCover = (resetPosition = false) => {
      const fit = computeCoverView(el)
      if (!fit) return
      setViewportSize(fit.viewport)
      viewportSizeRef.current = fit.viewport
      setMinZoom(fit.minZoom)
      minZoomRef.current = fit.minZoom

      if (!hasInitializedRef.current || resetPosition) {
        hasInitializedRef.current = true
        setZoom(fit.minZoom)
        setPan(fit.pan)
      } else {
        setZoom((prevZoom) => {
          const nextZoom = Math.max(prevZoom, fit.minZoom)
          setPan((prevPan) => clampPan(prevPan, nextZoom, fit.viewport))
          return nextZoom
        })
      }
    }

    applyCover(true)

    const handleResize = () => applyCover(false)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [computeCoverView, clampPan])

  const triggerSmoothCamera = useCallback((durationMs = 450) => {
    setIsSmoothTransitioning(true)
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current)
    }
    transitionTimeoutRef.current = setTimeout(() => {
      setIsSmoothTransitioning(false)
    }, durationMs)
  }, [])

  // Relative zoom ratio (1.0 = most unzoomed starting state)
  const relativeZoom = useMemo(() => {
    return minZoom > 0 ? zoom / minZoom : 1
  }, [zoom, minZoom])

  // Russian-doll stage states
  const isZoomedMapVisible = relativeZoom >= ZOOMED_MAP_THRESHOLD
  const isRoomsVisible = relativeZoom >= ROOMS_VISIBLE_THRESHOLD
  const isRoomNamesGlobalZoom = relativeZoom >= ROOM_NAMES_THRESHOLD

  // Calculate current viewport center and visible bounds in SVG world coordinates
  const visibleWorldBounds = useMemo(() => {
    const minX = -pan.x / zoom
    const minY = -pan.y / zoom
    const maxX = (viewportSize.width - pan.x) / zoom
    const maxY = (viewportSize.height - pan.y) / zoom
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    return { minX, minY, maxX, maxY, centerX, centerY }
  }, [pan, zoom, viewportSize])

  // Filter rooms that should display their vector name based on zoom level, screen size, hover, or focus
  const visibleRoomLabels = useMemo(() => {
    if (!isRoomsVisible) return []

    const pad = 120
    const { minX, minY, maxX, maxY, centerX, centerY } = visibleWorldBounds

    return momoRoomsData.rooms.filter((room) => {
      if (room.type === 'wall' || !room.id) return false

      const activeId = selectedRoomId || focusedRoomId
      if (room.id === hoveredRoomId || room.id === activeId) {
        return true
      }

      // Must be within current viewport bounds
      if (
        room.maxX < minX - pad ||
        room.minX > maxX + pad ||
        room.maxY < minY - pad ||
        room.minY > maxY + pad
      ) {
        return false
      }

      // Calculate how large this room is on screen (in pixels)
      const screenWidthPx = room.width * zoom
      const screenHeightPx = room.height * zoom

      // Distance from viewport center in screen pixels
      const distFromCenterPx = Math.hypot(
        (room.cx - centerX) * zoom,
        (room.cy - centerY) * zoom
      )
      const isNearViewportCenter =
        distFromCenterPx < Math.min(viewportSize.width, viewportSize.height) * 0.38

      // When zoomed in enough on a specific room (or past ROOM_NAMES_THRESHOLD):
      if (isRoomNamesGlobalZoom) {
        if (relativeZoom >= 5.5) {
          return screenWidthPx >= 22 && screenHeightPx >= 12
        }
        if (isNearViewportCenter && screenWidthPx >= 28 && screenHeightPx >= 15) {
          return true
        }
        return screenWidthPx >= 42 && screenHeightPx >= 22
      }

      // Between ROOMS_VISIBLE_THRESHOLD (2.1x) and ROOM_NAMES_THRESHOLD (3.4x):
      // Show label for large rooms near the center of the user's zoom
      if (relativeZoom >= 2.7 && isNearViewportCenter && screenWidthPx >= 64 && screenHeightPx >= 34) {
        return true
      }

      return false
    })
  }, [
    isRoomsVisible,
    isRoomNamesGlobalZoom,
    relativeZoom,
    visibleWorldBounds,
    zoom,
    viewportSize,
    hoveredRoomId,
    focusedRoomId,
    selectedRoomId,
  ])

  // Zoom to a specific SVG world coordinate (x, y) with a target relativeZoom
  const zoomToWorldPoint = useCallback(
    (worldX, worldY, targetRelZoom) => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const sidebarOffset = rect.width > 768 ? 260 : 0
      const targetScreenX = sidebarOffset + (rect.width - sidebarOffset) / 2
      const targetScreenY = rect.height / 2

      const clampedZoom = Math.min(
        Math.max(minZoomRef.current * targetRelZoom, minZoomRef.current),
        minZoomRef.current * MAX_RELATIVE_ZOOM
      )

      const rawPan = {
        x: targetScreenX - worldX * clampedZoom,
        y: targetScreenY - worldY * clampedZoom,
      }

      triggerSmoothCamera(480)
      setZoom(parseFloat(clampedZoom.toFixed(5)))
      setPan(clampPan(rawPan, clampedZoom, { width: rect.width, height: rect.height }))
    },
    [triggerSmoothCamera, clampPan]
  )

  // If parent selects a room (e.g., via search), smoothly zoom to that room
  const prevSelectedRoomRef = useRef(null)
  useEffect(() => {
    if (!selectedRoomId || selectedRoomId === prevSelectedRoomRef.current) return
    prevSelectedRoomRef.current = selectedRoomId
    const room = momoRoomsData.rooms.find(
      (r) => r.id.toLowerCase() === selectedRoomId.toLowerCase()
    )
    if (room) {
      zoomToWorldPoint(room.cx, room.cy, Math.max(relativeZoom, 5.2))
    }
  }, [selectedRoomId, relativeZoom, zoomToWorldPoint])

  // Mouse Drag Handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return // Only primary click
    setIsSmoothTransitioning(false)
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX - currentPanRef.current.x,
      y: e.clientY - currentPanRef.current.y,
    }
  }

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return
      const candidatePan = {
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      }
      setPan(clampPan(candidatePan, currentZoomRef.current))
    },
    [isDragging, clampPan]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Hover & click detection on room vectors inside #momo-rooms-layer
  const handleSvgMouseMove = useCallback(
    (e) => {
      if (!isRoomsVisible) {
        if (hoveredRoomId) setHoveredRoomId(null)
        return
      }
      const target = e.target.closest('[data-name]')
      if (target) {
        const rid = target.getAttribute('data-name')
        const rtype = target.getAttribute('data-type')
        if (rid && rtype !== 'wall') {
          if (hoveredRoomId !== rid) setHoveredRoomId(rid)
          return
        }
      }
      if (hoveredRoomId) setHoveredRoomId(null)
    },
    [isRoomsVisible, hoveredRoomId]
  )

  const handleSvgClick = useCallback(
    (e) => {
      if (isDragging) return
      const target = e.target.closest('[data-name]')
      if (target && isRoomsVisible) {
        const rid = target.getAttribute('data-name')
        const rtype = target.getAttribute('data-type')
        if (rid && rtype !== 'wall') {
          setFocusedRoomId(rid)
          onSelectRoom?.(rid)
          const room = momoRoomsData.rooms.find((r) => r.id === rid)
          if (room && relativeZoom < ROOM_NAMES_THRESHOLD * 1.3) {
            zoomToWorldPoint(room.cx, room.cy, Math.max(ROOM_NAMES_THRESHOLD * 1.4, 4.8))
          }
          return
        }
      }
    },
    [isDragging, isRoomsVisible, relativeZoom, onSelectRoom, zoomToWorldPoint]
  )

  // Touch Handlers (single touch pan, pinch-to-zoom)
  const handleTouchStart = (e) => {
    setIsSmoothTransitioning(false)
    if (e.touches.length === 1) {
      setIsDragging(true)
      const touch = e.touches[0]
      dragStartRef.current = {
        x: touch.clientX - currentPanRef.current.x,
        y: touch.clientY - currentPanRef.current.y,
      }
    } else if (e.touches.length === 2) {
      setIsDragging(false)
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      initialTouchDistanceRef.current = dist
      initialTouchZoomRef.current = zoom
    }
  }

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0]
      const candidatePan = {
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y,
      }
      setPan(clampPan(candidatePan, currentZoomRef.current))
    } else if (e.touches.length === 2 && initialTouchDistanceRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const factor = dist / initialTouchDistanceRef.current
      const maxZoom = minZoomRef.current * MAX_RELATIVE_ZOOM
      const nextZoom = Math.min(
        Math.max(initialTouchZoomRef.current * factor, minZoomRef.current),
        maxZoom
      )
      const roundedZoom = parseFloat(nextZoom.toFixed(5))
      setZoom(roundedZoom)
      setPan((prevPan) => clampPan(prevPan, roundedZoom))
    }
  }

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      initialTouchDistanceRef.current = null
    }
    if (e.touches.length === 0) {
      setIsDragging(false)
    }
  }

  // Mouse Wheel Zoom centered at cursor (stepped so only a couple of zooms reach each stage)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheel = (e) => {
      e.preventDefault()
      setIsSmoothTransitioning(false)
      const rect = el.getBoundingClientRect()
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top

      const zoomFactor = e.deltaY < 0 ? 1.28 : 0.78
      const minZ = minZoomRef.current
      const maxZ = minZ * MAX_RELATIVE_ZOOM

      setZoom((prevZoom) => {
        const nextZoom = Math.min(Math.max(prevZoom * zoomFactor, minZ), maxZ)
        const roundedZoom = parseFloat(nextZoom.toFixed(5))
        const scaleRatio = roundedZoom / prevZoom

        setPan((prevPan) => {
          const candidatePan = {
            x: cursorX - (cursorX - prevPan.x) * scaleRatio,
            y: cursorY - (cursorY - prevPan.y) * scaleRatio,
          }
          return clampPan(candidatePan, roundedZoom, {
            width: rect.width,
            height: rect.height,
          })
        })

        return roundedZoom
      })
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [clampPan])

  // Floating Controls Zoom In/Out (1 click -> zoomed map, 2 clicks -> building rooms, 3-4 clicks -> room names)
  const handleZoomIn = () => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const sidebarOffset = rect.width > 768 ? 260 : 0
    const centerX = sidebarOffset + (rect.width - sidebarOffset) / 2
    const centerY = rect.height / 2

    triggerSmoothCamera(280)
    setZoom((prevZoom) => {
      const maxZ = minZoomRef.current * MAX_RELATIVE_ZOOM
      const nextZoom = Math.min(prevZoom * 1.48, maxZ)
      const roundedZoom = parseFloat(nextZoom.toFixed(5))
      const scaleRatio = roundedZoom / prevZoom
      setPan((prevPan) =>
        clampPan(
          {
            x: centerX - (centerX - prevPan.x) * scaleRatio,
            y: centerY - (centerY - prevPan.y) * scaleRatio,
          },
          roundedZoom,
          { width: rect.width, height: rect.height }
        )
      )
      return roundedZoom
    })
  }

  const handleZoomOut = () => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const sidebarOffset = rect.width > 768 ? 260 : 0
    const centerX = sidebarOffset + (rect.width - sidebarOffset) / 2
    const centerY = rect.height / 2

    triggerSmoothCamera(280)
    setZoom((prevZoom) => {
      const minZ = minZoomRef.current
      const nextZoom = Math.max(prevZoom / 1.48, minZ)
      const roundedZoom = parseFloat(nextZoom.toFixed(5))
      const scaleRatio = roundedZoom / prevZoom
      setPan((prevPan) =>
        clampPan(
          {
            x: centerX - (centerX - prevPan.x) * scaleRatio,
            y: centerY - (centerY - prevPan.y) * scaleRatio,
          },
          roundedZoom,
          { width: rect.width, height: rect.height }
        )
      )
      return roundedZoom
    })
  }

  const handleReset = () => {
    if (!containerRef.current) return
    const fit = computeCoverView(containerRef.current)
    if (!fit) return
    triggerSmoothCamera(420)
    setFocusedRoomId(null)
    setHoveredRoomId(null)
    setZoom(fit.minZoom)
    setPan(fit.pan)
  }

  // Current Russian-doll stage badge info
  const currentStageInfo = useMemo(() => {
    if (isRoomNamesGlobalZoom) {
      return { step: 4, label: 'Locaux & Noms', detail: 'Noms des locaux affichés' }
    }
    if (isRoomsVisible) {
      return { step: 3, label: 'Intérieur du bâtiment', detail: 'Locaux visibles — zoomez sur un local pour son nom' }
    }
    if (isZoomedMapVisible) {
      return { step: 2, label: 'Plan du campus (Zoomé)', detail: 'Zoomez sur le bâtiment pour voir les locaux' }
    }
    return { step: 1, label: 'Vue générale (Dézoomée)', detail: 'Zoomez pour ouvrir le plan détaillé' }
  }, [isZoomedMapVisible, isRoomsVisible, isRoomNamesGlobalZoom])

  const amenityFilterClass = activeAmenityId ? `amenity-filter-${activeAmenityId}` : ''

  return (
    <div
      ref={containerRef}
      className={`map-canvas-container ${isDragging ? 'is-dragging' : ''} ${animate ? 'is-animated' : ''} ${isSmoothTransitioning ? 'is-smooth-camera' : ''}`}
      style={{ backgroundColor: bgColor }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="application"
      aria-label="Carte interactive MOMO-MAIN"
      data-zoom-stage={currentStageInfo.step}
      data-relative-zoom={relativeZoom.toFixed(2)}
    >
      {/* Crucial fill="none" on root <svg> so un-filled street/road strokes in MAP-SAT & MAP-MAIN do not default to solid black polygons */}
      <svg
        className="map-canvas-svg"
        width="100%"
        height="100%"
        fill="none"
        onMouseMove={handleSvgMouseMove}
        onClick={handleSvgClick}
      >
        {/* World Space Transform Group: The SVG map fills the entire canvas */}
        <g
          className="momo-world-camera"
          transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
        >
          {/* Shared Defs from MAP-MAIN */}
          <g dangerouslySetInnerHTML={{ __html: MAIN_DEFS_MARKUP }} />

          {/* DOLL 1: Unzoomed Outer Map (MAP-SAT base filling 0..5483 x 0..4446) */}
          <g
            id="momo-unzoomed-layer"
            className="momo-layer momo-layer--unzoomed"
            dangerouslySetInnerHTML={{ __html: SAT_INNER_MARKUP }}
          />

          {/* DOLL 2: Zoomed Campus Inset Map (Russian Doll 2 - opens with smooth transition animation) */}
          <g
            id="momo-zoomed-inset-layer"
            className={`momo-layer momo-layer--zoomed-inset ${isZoomedMapVisible ? 'is-open' : 'is-closed'}`}
            style={{
              transformOrigin: `${INSET_BOUNDS.x + INSET_BOUNDS.width / 2}px ${INSET_BOUNDS.y + INSET_BOUNDS.height / 2}px`,
            }}
            dangerouslySetInnerHTML={{ __html: MAIN_BASE_MARKUP }}
          />

          {/* DOLL 3: Building Rooms Vector Layer (Russian Doll 3 - appears when zooming in on the building) */}
          <g
            id="momo-building-rooms-wrapper"
            className={`momo-layer momo-layer--rooms ${isRoomsVisible ? 'is-open' : 'is-closed'} ${amenityFilterClass}`}
            style={{
              transformOrigin: `${BUILDING_BOUNDS.cx}px ${BUILDING_BOUNDS.cy}px`,
            }}
            dangerouslySetInnerHTML={{ __html: MAIN_ROOMS_MARKUP }}
          />

          {/* Highlight overlay for hovered or focused room */}
          {isRoomsVisible &&
            (hoveredRoomId || focusedRoomId || selectedRoomId) &&
            momoRoomsData.rooms
              .filter(
                (r) =>
                  r.id === hoveredRoomId ||
                  r.id === focusedRoomId ||
                  r.id === selectedRoomId
              )
              .map((room) => {
                const isSelected =
                  room.id === focusedRoomId || room.id === selectedRoomId
                const pts = room.polygon.map((p) => `${p[0]},${p[1]}`).join(' ')
                return (
                  <polygon
                    key={`highlight-${room.id}`}
                    points={pts}
                    className={`momo-room-highlight ${isSelected ? 'is-selected' : 'is-hovered'}`}
                    pointerEvents="none"
                  />
                )
              })}

          {/* DOLL 4: Room Vector Names Layer (Russian Doll 4 - shows room names when zoomed in on a room) */}
          <g
            id="momo-room-names-layer"
            className={`momo-layer momo-layer--labels ${isRoomsVisible ? 'is-active' : ''}`}
            pointerEvents="none"
          >
            {visibleRoomLabels.map((room) => {
              const isHighlighted =
                room.id === hoveredRoomId ||
                room.id === focusedRoomId ||
                room.id === selectedRoomId
              const displayText = room.label || room.id
              return (
                <g
                  key={`label-${room.id}`}
                  className={`momo-room-label-group ${isHighlighted ? 'is-highlighted' : ''}`}
                  transform={`translate(${room.cx}, ${room.cy})`}
                >
                  <text
                    x="0"
                    y="0"
                    fontSize={`${room.fontSize}px`}
                    className={`momo-room-label-text momo-room-label-text--${room.type}`}
                    data-room-label={room.id}
                  >
                    {displayText}
                  </text>
                </g>
              )
            })}
          </g>
        </g>
      </svg>

      {/* Russian-Doll Zoom Stage Indicator Pill (Bottom Center) */}
      <div className="momo-zoom-stage-bar" aria-live="polite">
        <div className="momo-zoom-stage-pill">
          <div className="momo-zoom-stage-dots" aria-hidden="true">
            {[1, 2, 3, 4].map((s) => (
              <span
                key={s}
                className={`momo-zoom-stage-dot ${currentStageInfo.step >= s ? 'is-active' : ''}`}
              />
            ))}
          </div>
          <div className="momo-zoom-stage-text">
            <span className="momo-zoom-stage-title">{currentStageInfo.label}</span>
            <span className="momo-zoom-stage-subtitle">
              {hoveredRoomId
                ? `Local : ${hoveredRoomId}`
                : focusedRoomId
                  ? `Local sélectionné : ${focusedRoomId}`
                  : currentStageInfo.detail}
            </span>
          </div>
          <div className="momo-zoom-quick-actions">
            {!isZoomedMapVisible && (
              <button
                type="button"
                className="momo-stage-jump-btn"
                onClick={() =>
                  zoomToWorldPoint(
                    INSET_BOUNDS.x + INSET_BOUNDS.width / 2,
                    INSET_BOUNDS.y + INSET_BOUNDS.height / 2,
                    1.55
                  )
                }
              >
                Ouvrir le campus
              </button>
            )}
            {isZoomedMapVisible && !isRoomsVisible && (
              <button
                type="button"
                className="momo-stage-jump-btn"
                onClick={() =>
                  zoomToWorldPoint(BUILDING_BOUNDS.cx, BUILDING_BOUNDS.cy, 2.4)
                }
              >
                Voir les locaux
              </button>
            )}
            {isRoomsVisible && !isRoomNamesGlobalZoom && (
              <button
                type="button"
                className="momo-stage-jump-btn"
                onClick={() =>
                  zoomToWorldPoint(BUILDING_BOUNDS.cx, BUILDING_BOUNDS.cy, 4.2)
                }
              >
                Voir les noms
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating Google Maps Zoom & Reset Controls - Centered Vertically */}
      <div className="google-maps-controls-right">
        {/* Recenter button */}
        <button
          type="button"
          className="google-maps-ctrl-btn-single"
          onClick={handleReset}
          title="Dézoomer au maximum (Vue initiale)"
          aria-label="Recentrer la grille"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="7" />
            <line x1="12" y1="1" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="1" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="23" y2="12" />
          </svg>
        </button>

        {/* Zoom In & Out Buttons */}
        <div className="google-maps-btn-stack">
          <button
            type="button"
            className="google-maps-ctrl-btn"
            onClick={handleZoomIn}
            title="Zoom avant"
            aria-label="Zoom avant"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            type="button"
            className="google-maps-ctrl-btn"
            onClick={handleZoomOut}
            title="Zoom arrière"
            aria-label="Zoom arrière"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
