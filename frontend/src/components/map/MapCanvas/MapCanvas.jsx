import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react'
import mapFinalSvgRaw from '../../../assets/map/MAP-FINAL.svg?raw'
import momoRoomsData from '../../../assets/map/momo-main-rooms.json'
import './MapCanvas.css'

const MAP_WIDTH = momoRoomsData.viewBox.width // 5483
const MAP_HEIGHT = momoRoomsData.viewBox.height // 4446
const INSET_BOUNDS = momoRoomsData.insetBounds // { x: 1062.67, y: 1046.08, width: 3194, height: 2346 }
const BUILDING_BOUNDS = momoRoomsData.buildingBounds // { minX: 2067, minY: 1842, maxX: 3513, maxY: 2674, cx: 2790, cy: 2258 }

// Safe interior bounds of Layer 2 (<rect x="1062.67" y="1046.08" width="3194" height="2346" fill="white" />).
// Inset by 8px on each side so the seam/edge of Layer 1 is never visible once Layer 2 opens.
const SAFE_INSET = {
  minX: INSET_BOUNDS.x + 8, // 1070.67
  minY: INSET_BOUNDS.y + 8, // 1054.08
  width: INSET_BOUNDS.width - 16, // 3178
  height: INSET_BOUNDS.height - 16, // 2330
  maxX: INSET_BOUNDS.x + INSET_BOUNDS.width - 8, // 4248.67
  maxY: INSET_BOUNDS.y + INSET_BOUNDS.height - 8, // 3384.08
  cx: INSET_BOUNDS.x + INSET_BOUNDS.width / 2, // 2659.67
  cy: INSET_BOUNDS.y + INSET_BOUNDS.height / 2, // 2219.08
}

// Pre-index rooms and pins by ID for O(1) lookups
const ROOMS_BY_ID = new Map()
const ROOMS_BY_LOWER_ID = new Map()
for (const room of momoRoomsData.rooms) {
  if (room.id) {
    ROOMS_BY_ID.set(room.id, room)
    ROOMS_BY_LOWER_ID.set(room.id.toLowerCase(), room)
  }
}

const PINS_BY_ID = new Map()
for (const pin of momoRoomsData.pins || []) {
  if (pin.id) {
    PINS_BY_ID.set(pin.id, pin)
  }
}

function getRoomById(id) {
  if (!id) return null
  return ROOMS_BY_ID.get(id) || ROOMS_BY_LOWER_ID.get(id.toLowerCase()) || null
}

// Extract inner SVG contents
function extractInnerSvg(rawSvg) {
  const match = rawSvg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i)
  return match ? match[1] : rawSvg
}

// Deduplicate consecutive identical <path> elements
function deduplicatePaths(svgText) {
  const lines = svgText.split('\n')
  const result = []
  let prevLine = ''
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (trimmed && trimmed.startsWith('<path') && trimmed === prevLine) {
      continue
    }
    prevLine = trimmed
    result.push(lines[i])
  }
  return result.join('\n')
}

// Structure all layers directly from MAP-FINAL into controllable Russian-doll layers
function buildLayeredMainSvg(rawFinalSvg) {
  const inner = extractInnerSvg(rawFinalSvg)
  const insetStart = inner.indexOf('<rect x="1062.67" y="1046.08"')
  const roomsStart = inner.indexOf('<g opacity="0.78" id="momo-rooms-layer">')
  const borderStart = inner.indexOf('<path d="M5.33301 5.33331H5477.33V4440.5H5.33301V5.33331Z"')
  const defsStart = inner.indexOf('<defs>')

  if (insetStart === -1 || roomsStart === -1 || borderStart === -1 || defsStart === -1) {
    return {
      unzoomedMarkup: '',
      baseZoomedMarkup: deduplicatePaths(inner),
      roomsMarkup: '',
      defsMarkup: '',
    }
  }

  const rawUnzoomed = inner.slice(0, insetStart)
  const outerBorder =
    '<path d="M5.33301 5.33331H5477.33V4440.5H5.33301V5.33331Z" stroke-width="10.6667" stroke="black" fill="none" />'
  const insetPart = inner.slice(insetStart, roomsStart)
  const roomsGroup = inner.slice(roomsStart, borderStart)
  const rawDefsPart = inner.slice(defsStart)

  // Safeguard against any remaining blur filters so zoomed pan/zoom stays 60fps
  const cleanedUnzoomed = rawUnzoomed.replace(/\s*filter="url\(#filter\d+_d_120_7893\)"/g, '')
  const cleanedBase = insetPart.replace(/\s*filter="url\(#filter\d+_d_120_7893\)"/g, '')
  const buildingSilhouette = momoRoomsData.buildingOutlineD
    ? `<path class="momo-building-silhouette" d="${momoRoomsData.buildingOutlineD}" fill="#303030" fill-opacity="0.72" stroke="black" stroke-width="3.3814" />`
    : ''
  const cleanedDefs = rawDefsPart.replace(/<filter\b[^>]*>[\s\S]*?<\/filter>/gi, '')

  return {
    unzoomedMarkup: deduplicatePaths(cleanedUnzoomed) + outerBorder,
    baseZoomedMarkup: deduplicatePaths(cleanedBase) + buildingSilhouette,
    roomsMarkup: roomsGroup,
    defsMarkup: cleanedDefs,
  }
}

const {
  unzoomedMarkup: MAIN_UNZOOMED_MARKUP,
  baseZoomedMarkup: MAIN_BASE_MARKUP,
  roomsMarkup: MAIN_ROOMS_MARKUP,
  defsMarkup: MAIN_DEFS_MARKUP,
} = buildLayeredMainSvg(mapFinalSvgRaw)

const MAX_RELATIVE_ZOOM = 12

// Memoized subcomponents for static SVG layers so React avoids reconciling 1,500+ path nodes
const SvgDefs = React.memo(function SvgDefs() {
  return <g dangerouslySetInnerHTML={{ __html: MAIN_DEFS_MARKUP }} />
})

const UnzoomedLayer = React.memo(function UnzoomedLayer({ isCovered }) {
  return (
    <g
      id="momo-unzoomed-layer"
      className={`momo-layer momo-layer--unzoomed ${isCovered ? 'is-covered' : ''}`}
      dangerouslySetInnerHTML={{ __html: MAIN_UNZOOMED_MARKUP }}
    />
  )
})

const ZoomedInsetLayer = React.memo(function ZoomedInsetLayer({ isOpen }) {
  return (
    <g
      id="momo-zoomed-inset-layer"
      className={`momo-layer momo-layer--zoomed-inset ${isOpen ? 'is-open' : 'is-closed'}`}
      dangerouslySetInnerHTML={{ __html: MAIN_BASE_MARKUP }}
    />
  )
})

const BuildingRoomsLayer = React.memo(function BuildingRoomsLayer({
  wrapperRef,
  isOpen,
  amenityFilterClass,
  showPins,
  showCorridorPath,
}) {
  const hidePinsClass = showPins ? '' : 'hide-pins'
  const hidePathClass = showCorridorPath ? '' : 'hide-corridor-path'
  return (
    <g
      ref={wrapperRef}
      id="momo-building-rooms-wrapper"
      className={`momo-layer momo-layer--rooms ${isOpen ? 'is-open' : 'is-closed'} ${amenityFilterClass} ${hidePinsClass} ${hidePathClass}`}
      dangerouslySetInnerHTML={{ __html: MAIN_ROOMS_MARKUP }}
    />
  )
})

const RoomHighlightLayer = React.memo(function RoomHighlightLayer({
  activeRooms,
  focusedRoomId,
  selectedRoomId,
}) {
  return (
    <>
      {activeRooms.map((room) => {
        const isSelected = room.id === focusedRoomId || room.id === selectedRoomId
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
    </>
  )
})

const RoomLabelsLayer = React.memo(function RoomLabelsLayer({
  isRoomsVisible,
  visibleRoomLabels,
  hoveredRoomId,
  focusedRoomId,
  selectedRoomId,
  roomOverrides,
}) {
  return (
    <g
      id="momo-room-names-layer"
      className={`momo-layer momo-layer--labels ${isRoomsVisible ? 'is-active' : ''}`}
      pointerEvents="none"
    >
      {visibleRoomLabels.map((room) => {
        const override = roomOverrides?.[room.id]
        const isHighlighted =
          room.id === hoveredRoomId ||
          room.id === focusedRoomId ||
          room.id === selectedRoomId
        const displayText = override?.label ?? (room.label || room.id)
        const fontSize = override?.fontSize ?? room.fontSize
        const textStyle = override?.textColor ? { fill: override.textColor } : undefined
        return (
          <g
            key={`label-${room.id}`}
            className={`momo-room-label-group ${isHighlighted ? 'is-highlighted' : ''}`}
            transform={`translate(${room.cx}, ${room.cy})`}
          >
            <text
              x="0"
              y="0"
              fontSize={`${fontSize}px`}
              style={textStyle}
              className={`momo-room-label-text momo-room-label-text--${room.type}`}
              data-room-label={room.id}
            >
              {displayText}
            </text>
          </g>
        )
      })}
    </g>
  )
})

export default function MapCanvas({
  theme = null,
  activeAmenityId = null,
  selectedRoomId = null,
  selectedPinId = null,
  onSelectRoom = null,
  showRoomNames = true,
  showPins = true,
  showCorridorPath = true,
  roomOverrides = null,
  pinOverrides = null,
}) {
  const containerRef = useRef(null)
  const cameraSvgRef = useRef(null)
  const movingTimeoutRef = useRef(null)
  const buildingRoomsWrapperRef = useRef(null)

  const bgColor = theme?.backgroundColor || '#ffffff'
  const animate = theme?.animate && !theme?.reducedMotion

  // Min zoom is computed dynamically so the 5483x4446 SVG covers the entire viewport (cannot unzoom out of the SVG)
  const [minZoom, setMinZoom] = useState(0.35)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(0.35)
  const [isDragging, setIsDragging] = useState(false)
  const [hoveredRoomId, setHoveredRoomId] = useState(null)
  const [hoveredPinId, setHoveredPinId] = useState(null)
  const [focusedRoomId, setFocusedRoomId] = useState(null)
  const [viewportSize, setViewportSize] = useState({ width: 1280, height: 800 })

  const hoveredRoomIdRef = useRef(null)
  const hoveredPinIdRef = useRef(null)
  const roomOverridesRef = useRef(roomOverrides)
  const pinOverridesRef = useRef(pinOverrides)
  useEffect(() => {
    hoveredRoomIdRef.current = hoveredRoomId
  }, [hoveredRoomId])
  useEffect(() => {
    hoveredPinIdRef.current = hoveredPinId
  }, [hoveredPinId])
  useEffect(() => {
    roomOverridesRef.current = roomOverrides
  }, [roomOverrides])
  useEffect(() => {
    pinOverridesRef.current = pinOverrides
  }, [pinOverrides])

  const hasInitializedRef = useRef(false)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const currentPanRef = useRef({ x: 0, y: 0 })
  const currentZoomRef = useRef(0.35)
  const targetPanRef = useRef({ x: 0, y: 0 })
  const targetZoomRef = useRef(0.35)
  const rafIdRef = useRef(null)
  const lastFrameTimeRef = useRef(0)
  const minZoomRef = useRef(0.35)
  const viewportSizeRef = useRef({ width: 1280, height: 800 })
  const currentStageRef = useRef(1)
  const isRoomsVisibleRef = useRef(false)
  const lastThrottledSyncRef = useRef(0)

  const initialTouchDistanceRef = useRef(null)
  const initialTouchZoomRef = useRef(0.35)
  const initialTouchCenterRef = useRef({ x: 0, y: 0 })
  const initialTouchPanRef = useRef({ x: 0, y: 0 })
  const wheelGestureRef = useRef({
    lastTime: 0,
    screenX: 0,
    screenY: 0,
    worldX: 0,
    worldY: 0,
  })

  // Direct DOM transform updater - applies the camera as a CSS transform on the <svg> element.
  // A CSS transform lets the browser composite the map on the GPU instead of re-rasterizing
  // every SVG path on each frame (big win on older / integrated GPUs).
  const applyCameraTransform = useCallback((p, z) => {
    if (cameraSvgRef.current) {
      cameraSvgRef.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) scale(${z})`
    }
  }, [])

  // While the camera moves, promote the SVG to its own GPU layer (will-change) so it is scaled
  // as a cached bitmap. Once motion stops, drop the layer so the browser redraws it crisp.
  const setMoving = useCallback((moving) => {
    const svg = cameraSvgRef.current
    if (!svg) return
    if (movingTimeoutRef.current) {
      clearTimeout(movingTimeoutRef.current)
      movingTimeoutRef.current = null
    }
    if (moving) {
      svg.classList.add('is-moving')
    } else {
      movingTimeoutRef.current = setTimeout(() => {
        svg.classList.remove('is-moving')
        movingTimeoutRef.current = null
      }, 150)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (movingTimeoutRef.current) clearTimeout(movingTimeoutRef.current)
    }
  }, [])

  // Prevent React re-renders (e.g. room hover/label sync) from briefly resetting the 60fps RAF camera transform
  useLayoutEffect(() => {
    applyCameraTransform(currentPanRef.current, currentZoomRef.current)
  })

  // Imperatively apply control-panel overrides (color, stroke, visibility) without re-rendering SVG markup
  useEffect(() => {
    const wrapper = buildingRoomsWrapperRef.current
    if (!wrapper) return

    const roomEls = wrapper.querySelectorAll('#momo-rooms-vectors [data-name]')
    roomEls.forEach((el) => {
      const rid = el.getAttribute('data-name')
      const baseColor = el.getAttribute('data-color')
      const ov = roomOverrides?.[rid]
      if (ov?.color) {
        el.setAttribute('fill', ov.color)
      } else if (baseColor) {
        el.setAttribute('fill', baseColor)
      }
      if (ov?.stroke) {
        if (!el.hasAttribute('data-base-stroke')) {
          el.setAttribute('data-base-stroke', el.getAttribute('stroke') || '')
        }
        el.setAttribute('stroke', ov.stroke)
      } else if (el.hasAttribute('data-base-stroke')) {
        const baseStroke = el.getAttribute('data-base-stroke')
        if (baseStroke) {
          el.setAttribute('stroke', baseStroke)
        } else {
          el.removeAttribute('stroke')
        }
        el.removeAttribute('data-base-stroke')
      }
      el.style.display = ov?.visible === false ? 'none' : ''
    })

    const pinEls = wrapper.querySelectorAll('#momo-pins-layer [data-pin-id]')
    pinEls.forEach((el) => {
      const pid = el.getAttribute('data-pin-id')
      const cat = el.getAttribute('data-pin-category')
      const baseColor = el.getAttribute('data-color')
      const ov = pinOverrides?.[pid] || pinOverrides?.[cat]
      if (ov?.color) {
        el.setAttribute('fill', ov.color)
      } else if (baseColor) {
        el.setAttribute('fill', baseColor)
      }
      el.style.display = ov?.visible === false ? 'none' : ''
    })
  }, [roomOverrides, pinOverrides])

  const updateDataAttributes = useCallback((z, stage) => {
    if (containerRef.current) {
      const minZ = minZoomRef.current
      if (minZ > 0) {
        containerRef.current.setAttribute('data-relative-zoom', (z / minZ).toFixed(2))
      }
      if (stage !== undefined) {
        containerRef.current.setAttribute('data-zoom-stage', String(stage))
      }
    }
  }, [])

  // Russian-doll stage step calculator
  const getStageStep = useCallback((z, vp = viewportSizeRef.current) => {
    const minZ = minZoomRef.current
    const relZ = minZ > 0 ? z / minZ : 1
    const insetCoverZ = Math.max(vp.width / SAFE_INSET.width, vp.height / SAFE_INSET.height)
    const isZoomed = z >= insetCoverZ * 0.998
    const insetCoverRel = minZ > 0 ? insetCoverZ / minZ : 1.73
    const roomsVisThresh = Math.max(insetCoverRel * 1.35, 2.4)
    const roomNamesThresh = Math.max(insetCoverRel * 2.05, 3.6)

    if (relZ >= roomNamesThresh) return 4
    if (relZ >= roomsVisThresh) return 3
    if (isZoomed) return 2
    return 1
  }, [])

  // Clamp pan so:
  // 1) At minZoom (1.0x), the user cannot pan or unzoom outside the 5483x4446 Layer 1 boundaries.
  // 2) As zoom approaches insetCoverZoom, the allowed bounds smoothly converge to SAFE_INSET
  const clampPan = useCallback((candidatePan, targetZoom, vp = viewportSizeRef.current) => {
    const outerCoverZoom = Math.max(vp.width / MAP_WIDTH, vp.height / MAP_HEIGHT)
    const insetCoverZoom = Math.max(vp.width / SAFE_INSET.width, vp.height / SAFE_INSET.height)

    const zoomSpan = Math.max(insetCoverZoom - outerCoverZoom, 0.0001)
    const t = Math.min(Math.max((targetZoom - outerCoverZoom) / zoomSpan, 0), 1)

    const worldMinX = SAFE_INSET.minX * t
    const worldMaxX = MAP_WIDTH + (SAFE_INSET.maxX - MAP_WIDTH) * t
    const worldMinY = SAFE_INSET.minY * t
    const worldMaxY = MAP_HEIGHT + (SAFE_INSET.maxY - MAP_HEIGHT) * t

    const boxScreenW = (worldMaxX - worldMinX) * targetZoom
    const boxScreenH = (worldMaxY - worldMinY) * targetZoom

    let minX = vp.width - worldMaxX * targetZoom
    let maxX = -worldMinX * targetZoom
    if (boxScreenW <= vp.width) {
      const worldCenterX = (worldMinX + worldMaxX) / 2
      minX = vp.width / 2 - worldCenterX * targetZoom
      maxX = minX
    }

    let minY = vp.height - worldMaxY * targetZoom
    let maxY = -worldMinY * targetZoom
    if (boxScreenH <= vp.height) {
      const worldCenterY = (worldMinY + worldMaxY) / 2
      minY = vp.height / 2 - worldCenterY * targetZoom
      maxY = minY
    }

    return {
      x: Math.min(Math.max(candidatePan.x, minX), maxX),
      y: Math.min(Math.max(candidatePan.y, minY), maxY),
    }
  }, [])

  const stopCameraAnimation = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    lastFrameTimeRef.current = 0
  }, [])

  // Smooth 60fps requestAnimationFrame camera interpolation loop for silky trackpad & button zooming
  // Direct DOM updates bypass React re-renders during interpolation
  const startCameraAnimation = useCallback(() => {
    setMoving(true)
    if (rafIdRef.current !== null) return

    const step = (now) => {
      const dt = lastFrameTimeRef.current ? Math.min((now - lastFrameTimeRef.current) / 1000, 0.05) : 1 / 60
      lastFrameTimeRef.current = now

      // Frame-rate independent exponential damping (~0.18 per frame at 60fps)
      const alpha = 1 - Math.exp(-12 * dt)

      const curZ = currentZoomRef.current
      const tgtZ = targetZoomRef.current
      const curP = currentPanRef.current
      const tgtP = targetPanRef.current

      const zoomDiff = tgtZ - curZ
      const panDiffX = tgtP.x - curP.x
      const panDiffY = tgtP.y - curP.y

      // Snap to target when very close
      if (Math.abs(zoomDiff) < 0.00015 && Math.hypot(panDiffX, panDiffY) < 0.25) {
        const finalPan = clampPan(tgtP, tgtZ, viewportSizeRef.current)
        currentZoomRef.current = tgtZ
        currentPanRef.current = finalPan
        targetPanRef.current = finalPan

        applyCameraTransform(finalPan, tgtZ)
        const finalStage = getStageStep(tgtZ)
        updateDataAttributes(tgtZ, finalStage)
        currentStageRef.current = finalStage

        setZoom(tgtZ)
        setPan(finalPan)
        rafIdRef.current = null
        lastFrameTimeRef.current = 0
        setMoving(false)
        return
      }

      const nextZ = curZ + zoomDiff * alpha
      const nextP = clampPan(
        {
          x: curP.x + panDiffX * alpha,
          y: curP.y + panDiffY * alpha,
        },
        nextZ,
        viewportSizeRef.current
      )

      currentZoomRef.current = nextZ
      currentPanRef.current = nextP

      // Zero-re-render direct DOM update
      applyCameraTransform(nextP, nextZ)
      const stageNow = getStageStep(nextZ)

      // Commit React state only when crossing a stage threshold. Room labels are refreshed once
      // the zoom settles, so the map isn't re-rendered (and re-rasterized) mid-animation.
      if (stageNow !== currentStageRef.current) {
        currentStageRef.current = stageNow
        updateDataAttributes(nextZ, stageNow)
        setZoom(nextZ)
        setPan(nextP)
      }

      rafIdRef.current = requestAnimationFrame(step)
    }

    rafIdRef.current = requestAnimationFrame(step)
  }, [clampPan, applyCameraTransform, updateDataAttributes, getStageStep, setMoving])

  useEffect(() => {
    return () => stopCameraAnimation()
  }, [stopCameraAnimation])

  // Compute cover scale so the SVG fills the entire screen
  const computeCoverView = useCallback((el) => {
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const w = rect.width || window.innerWidth
    const h = rect.height || window.innerHeight

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
        stopCameraAnimation()
        currentZoomRef.current = fit.minZoom
        targetZoomRef.current = fit.minZoom
        currentPanRef.current = fit.pan
        targetPanRef.current = fit.pan
        applyCameraTransform(fit.pan, fit.minZoom)
        const stage = getStageStep(fit.minZoom, fit.viewport)
        currentStageRef.current = stage
        updateDataAttributes(fit.minZoom, stage)
        setZoom(fit.minZoom)
        setPan(fit.pan)
      } else {
        const nextZoom = Math.max(targetZoomRef.current, fit.minZoom)
        const nextPan = clampPan(targetPanRef.current, nextZoom, fit.viewport)
        currentZoomRef.current = nextZoom
        targetZoomRef.current = nextZoom
        currentPanRef.current = nextPan
        targetPanRef.current = nextPan
        applyCameraTransform(nextPan, nextZoom)
        const stage = getStageStep(nextZoom, fit.viewport)
        currentStageRef.current = stage
        updateDataAttributes(nextZoom, stage)
        setZoom(nextZoom)
        setPan(nextPan)
      }
    }

    applyCover(true)

    const handleResize = () => applyCover(false)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [computeCoverView, clampPan, stopCameraAnimation, applyCameraTransform, updateDataAttributes, getStageStep])

  // Relative zoom ratio (1.0 = most unzoomed starting state)
  const relativeZoom = useMemo(() => {
    return minZoom > 0 ? zoom / minZoom : 1
  }, [zoom, minZoom])

  // Exact zoom level where Layer 2 (SAFE_INSET: 3178x2330) fills 100% of the viewport
  // so 0 pixels of Layer 1 can be seen around it.
  const insetCoverZoom = useMemo(() => {
    return Math.max(
      viewportSize.width / SAFE_INSET.width,
      viewportSize.height / SAFE_INSET.height
    )
  }, [viewportSize])

  const insetCoverRelZoom = useMemo(() => {
    return minZoom > 0 ? insetCoverZoom / minZoom : 1.73
  }, [insetCoverZoom, minZoom])

  const roomsVisibleThreshold = useMemo(() => {
    return Math.max(insetCoverRelZoom * 1.35, 2.4)
  }, [insetCoverRelZoom])

  const roomNamesThreshold = useMemo(() => {
    return Math.max(insetCoverRelZoom * 2.05, 3.6)
  }, [insetCoverRelZoom])

  // Russian-doll stage states:
  const isZoomedMapVisible = zoom >= insetCoverZoom * 0.998
  const isRoomsVisible = relativeZoom >= roomsVisibleThreshold
  const isRoomNamesGlobalZoom = relativeZoom >= roomNamesThreshold

  // Keep refs in sync with render state
  useEffect(() => {
    isRoomsVisibleRef.current = isRoomsVisible
  }, [isRoomsVisible])

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
    if (!isRoomsVisible || !showRoomNames) return []

    const pad = 120
    const { minX, minY, maxX, maxY, centerX, centerY } = visibleWorldBounds

    return momoRoomsData.rooms.filter((room) => {
      if (room.type === 'wall' || !room.id) return false
      if (roomOverrides?.[room.id]?.visible === false) return false

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

      // Between ROOMS_VISIBLE_THRESHOLD and ROOM_NAMES_THRESHOLD:
      // Show label for large rooms near the center of the user's zoom
      if (relativeZoom >= 2.7 && isNearViewportCenter && screenWidthPx >= 64 && screenHeightPx >= 34) {
        return true
      }

      return false
    })
  }, [
    isRoomsVisible,
    showRoomNames,
    roomOverrides,
    isRoomNamesGlobalZoom,
    relativeZoom,
    visibleWorldBounds,
    zoom,
    viewportSize,
    hoveredRoomId,
    focusedRoomId,
    selectedRoomId,
  ])

  // Active rooms for highlight polygon overlay
  const activeRooms = useMemo(() => {
    const ids = [hoveredRoomId, focusedRoomId, selectedRoomId].filter(Boolean)
    if (ids.length === 0) return []
    const seen = new Set()
    const result = []
    for (const id of ids) {
      const room = getRoomById(id)
      if (room && !seen.has(room.id)) {
        seen.add(room.id)
        result.push(room)
      }
    }
    return result
  }, [hoveredRoomId, focusedRoomId, selectedRoomId])

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

      const nextZoom = parseFloat(clampedZoom.toFixed(5))
      const nextPan = clampPan(rawPan, nextZoom, { width: rect.width, height: rect.height })

      targetZoomRef.current = nextZoom
      targetPanRef.current = nextPan
      startCameraAnimation()
    },
    [clampPan, startCameraAnimation]
  )

  // If parent selects a room (e.g., via search or dev panel), smoothly zoom to that room
  const prevSelectedRoomRef = useRef(null)
  useEffect(() => {
    if (!selectedRoomId || selectedRoomId === prevSelectedRoomRef.current) return
    prevSelectedRoomRef.current = selectedRoomId
    const room = getRoomById(selectedRoomId)
    if (room) {
      const curRelZoom = minZoomRef.current > 0 ? currentZoomRef.current / minZoomRef.current : 1
      zoomToWorldPoint(room.cx, room.cy, Math.max(curRelZoom, 5.2))
    }
  }, [selectedRoomId, zoomToWorldPoint])

  // If parent selects a specific pin (e.g., via dev panel), smoothly zoom to that pin
  const prevSelectedPinRef = useRef(null)
  useEffect(() => {
    if (!selectedPinId || selectedPinId === prevSelectedPinRef.current) return
    prevSelectedPinRef.current = selectedPinId
    const pin = PINS_BY_ID.get(selectedPinId)
    if (pin) {
      const curRelZoom = minZoomRef.current > 0 ? currentZoomRef.current / minZoomRef.current : 1
      zoomToWorldPoint(pin.cx, pin.cy, Math.max(curRelZoom, 5.6))
    }
  }, [selectedPinId, zoomToWorldPoint])

  // Mouse Drag Handlers with direct DOM transform updates
  const handleMouseDown = (e) => {
    if (e.button !== 0) return // Only primary click
    stopCameraAnimation()
    isDraggingRef.current = true
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX - currentPanRef.current.x,
      y: e.clientY - currentPanRef.current.y,
    }
  }

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDraggingRef.current) return
      const candidatePan = {
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      }
      const clamped = clampPan(candidatePan, currentZoomRef.current)
      currentPanRef.current = clamped
      targetPanRef.current = clamped
      setMoving(true)

      // Direct DOM transform update without React re-render
      applyCameraTransform(clamped, currentZoomRef.current)

      if (isRoomsVisibleRef.current) {
        const now = performance.now()
        if (now - lastThrottledSyncRef.current > 120) {
          lastThrottledSyncRef.current = now
          setPan(clamped)
        }
      }
    },
    [clampPan, applyCameraTransform, setMoving]
  )

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      setIsDragging(false)
      setMoving(false)
      setPan(currentPanRef.current)
      setZoom(currentZoomRef.current)
    }
  }, [setMoving])

  // Hover & click detection on room vectors and door pins inside #momo-rooms-layer
  const handleSvgMouseMove = useCallback((e) => {
    if (isDraggingRef.current) return
    if (!isRoomsVisibleRef.current) {
      if (hoveredRoomIdRef.current) setHoveredRoomId(null)
      if (hoveredPinIdRef.current) setHoveredPinId(null)
      return
    }

    const pinTarget = e.target.closest('[data-pin-id]')
    if (pinTarget) {
      const pid = pinTarget.getAttribute('data-pin-id')
      const pcat = pinTarget.getAttribute('data-pin-category')
      const rid = pinTarget.getAttribute('data-room-id')
      const pinHidden = pinOverridesRef.current?.[pid]?.visible === false || pinOverridesRef.current?.[pcat]?.visible === false
      if (pid && !pinHidden) {
        if (hoveredPinIdRef.current !== pid) setHoveredPinId(pid)
        if (rid && roomOverridesRef.current?.[rid]?.visible !== false) {
          if (hoveredRoomIdRef.current !== rid) setHoveredRoomId(rid)
        }
        return
      }
    }
    if (hoveredPinIdRef.current) setHoveredPinId(null)

    const target = e.target.closest('[data-name]')
    if (target) {
      const rid = target.getAttribute('data-name')
      const rtype = target.getAttribute('data-type')
      if (rid && rtype !== 'wall' && roomOverridesRef.current?.[rid]?.visible !== false) {
        if (hoveredRoomIdRef.current !== rid) setHoveredRoomId(rid)
        return
      }
    }
    if (hoveredRoomIdRef.current) setHoveredRoomId(null)
  }, [])

  const handleSvgClick = useCallback(
    (e) => {
      if (isDraggingRef.current) return
      if (!isRoomsVisibleRef.current) return

      const pinTarget = e.target.closest('[data-pin-id]')
      if (pinTarget) {
        const pid = pinTarget.getAttribute('data-pin-id')
        const rid = pinTarget.getAttribute('data-room-id')
        if (rid) {
          setFocusedRoomId(rid)
          onSelectRoom?.(rid)
          const room = getRoomById(rid)
          const pin = PINS_BY_ID.get(pid)
          const curRelZoom = minZoomRef.current > 0 ? currentZoomRef.current / minZoomRef.current : 1
          const targetX = room?.cx ?? pin?.cx
          const targetY = room?.cy ?? pin?.cy
          if (targetX != null && targetY != null && curRelZoom < roomNamesThreshold * 1.3) {
            zoomToWorldPoint(targetX, targetY, Math.max(roomNamesThreshold * 1.4, 4.8))
          }
          return
        }
      }

      const target = e.target.closest('[data-name]')
      if (target) {
        const rid = target.getAttribute('data-name')
        const rtype = target.getAttribute('data-type')
        if (rid && rtype !== 'wall') {
          setFocusedRoomId(rid)
          onSelectRoom?.(rid)
          const room = getRoomById(rid)
          const curRelZoom = minZoomRef.current > 0 ? currentZoomRef.current / minZoomRef.current : 1
          if (room && curRelZoom < roomNamesThreshold * 1.3) {
            zoomToWorldPoint(room.cx, room.cy, Math.max(roomNamesThreshold * 1.4, 4.8))
          }
          return
        }
      }
    },
    [roomNamesThreshold, onSelectRoom, zoomToWorldPoint]
  )

  // Touch Handlers (single touch pan, pinch-to-zoom anchored at pinch midpoint)
  const handleTouchStart = (e) => {
    stopCameraAnimation()
    if (e.touches.length === 1) {
      isDraggingRef.current = true
      setIsDragging(true)
      const touch = e.touches[0]
      dragStartRef.current = {
        x: touch.clientX - currentPanRef.current.x,
        y: touch.clientY - currentPanRef.current.y,
      }
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false
      setIsDragging(false)
      const rect = containerRef.current?.getBoundingClientRect()
      const offsetX = rect ? rect.left : 0
      const offsetY = rect ? rect.top : 0
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - offsetX
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - offsetY
      initialTouchDistanceRef.current = dist
      initialTouchZoomRef.current = currentZoomRef.current
      initialTouchCenterRef.current = { x: centerX, y: centerY }
      initialTouchPanRef.current = { ...currentPanRef.current }
    }
  }

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const touch = e.touches[0]
      const candidatePan = {
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y,
      }
      const clamped = clampPan(candidatePan, currentZoomRef.current)
      currentPanRef.current = clamped
      targetPanRef.current = clamped
      setMoving(true)

      applyCameraTransform(clamped, currentZoomRef.current)

      if (isRoomsVisibleRef.current) {
        const now = performance.now()
        if (now - lastThrottledSyncRef.current > 120) {
          lastThrottledSyncRef.current = now
          setPan(clamped)
        }
      }
    } else if (e.touches.length === 2 && initialTouchDistanceRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const rawFactor = dist / initialTouchDistanceRef.current
      const factor = Math.pow(rawFactor, 0.75)
      const maxZoom = minZoomRef.current * MAX_RELATIVE_ZOOM
      const nextZoom = Math.min(
        Math.max(initialTouchZoomRef.current * factor, minZoomRef.current),
        maxZoom
      )
      const roundedZoom = parseFloat(nextZoom.toFixed(5))
      const scaleRatio = roundedZoom / initialTouchZoomRef.current
      const { x: cx, y: cy } = initialTouchCenterRef.current
      const candidatePan = {
        x: cx - (cx - initialTouchPanRef.current.x) * scaleRatio,
        y: cy - (cy - initialTouchPanRef.current.y) * scaleRatio,
      }
      const clamped = clampPan(candidatePan, roundedZoom)
      currentZoomRef.current = roundedZoom
      targetZoomRef.current = roundedZoom
      currentPanRef.current = clamped
      targetPanRef.current = clamped

      setMoving(true)
      applyCameraTransform(clamped, roundedZoom)
      const stageNow = getStageStep(roundedZoom)

      // Labels refresh when the pinch ends (see handleTouchEnd)
      if (stageNow !== currentStageRef.current) {
        currentStageRef.current = stageNow
        updateDataAttributes(roundedZoom, stageNow)
        setZoom(roundedZoom)
        setPan(clamped)
      }
    }
  }

  const handleTouchEnd = (e) => {
    const wasPinching = initialTouchDistanceRef.current !== null
    if (e.touches.length < 2) {
      initialTouchDistanceRef.current = null
      if (wasPinching) {
        setPan(currentPanRef.current)
        setZoom(currentZoomRef.current)
      }
      if (e.touches.length === 1) {
        // Transition remaining single touch to drag
        isDraggingRef.current = true
        setIsDragging(true)
        const touch = e.touches[0]
        dragStartRef.current = {
          x: touch.clientX - currentPanRef.current.x,
          y: touch.clientY - currentPanRef.current.y,
        }
      }
    }
    if (e.touches.length === 0) {
      setMoving(false)
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        setIsDragging(false)
        setPan(currentPanRef.current)
        setZoom(currentZoomRef.current)
      }
    }
  }

  // Smooth, slow Laptop Trackpad & Mouse Wheel Zoom anchored stably at the cursor
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheel = (e) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top
      const now = performance.now()

      let rawDelta = e.deltaY
      if (e.deltaMode === 1) rawDelta *= 16
      else if (e.deltaMode === 2) rawDelta *= 100

      const maxDelta = e.ctrlKey ? 18 : 28
      const clampedDelta = Math.max(-maxDelta, Math.min(maxDelta, rawDelta))

      const sensitivity = e.ctrlKey ? 0.0042 : 0.0018
      const zoomFactor = Math.exp(-clampedDelta * sensitivity)

      const minZ = minZoomRef.current
      const maxZ = minZ * MAX_RELATIVE_ZOOM

      const gesture = wheelGestureRef.current
      const cursorMoved = Math.hypot(cursorX - gesture.screenX, cursorY - gesture.screenY) > 6
      const gestureExpired = now - gesture.lastTime > 180

      if (gestureExpired || cursorMoved) {
        gesture.screenX = cursorX
        gesture.screenY = cursorY
        gesture.worldX = (cursorX - currentPanRef.current.x) / currentZoomRef.current
        gesture.worldY = (cursorY - currentPanRef.current.y) / currentZoomRef.current
      }
      gesture.lastTime = now

      const nextTargetZoom = parseFloat(
        Math.min(Math.max(targetZoomRef.current * zoomFactor, minZ), maxZ).toFixed(5)
      )

      const idealTargetPan = {
        x: gesture.screenX - gesture.worldX * nextTargetZoom,
        y: gesture.screenY - gesture.worldY * nextTargetZoom,
      }

      const clampedPan = clampPan(idealTargetPan, nextTargetZoom, {
        width: rect.width,
        height: rect.height,
      })

      gesture.worldX = (gesture.screenX - clampedPan.x) / nextTargetZoom
      gesture.worldY = (gesture.screenY - clampedPan.y) / nextTargetZoom

      targetZoomRef.current = nextTargetZoom
      targetPanRef.current = clampedPan

      startCameraAnimation()
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [clampPan, startCameraAnimation])

  // Floating Controls Zoom In/Out
  const handleZoomIn = () => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const sidebarOffset = rect.width > 768 ? 260 : 0
    const centerX = sidebarOffset + (rect.width - sidebarOffset) / 2
    const centerY = rect.height / 2

    const maxZ = minZoomRef.current * MAX_RELATIVE_ZOOM
    const nextZoom = parseFloat(Math.min(targetZoomRef.current * 1.38, maxZ).toFixed(5))
    const scaleRatio = nextZoom / targetZoomRef.current
    const rawPan = {
      x: centerX - (centerX - targetPanRef.current.x) * scaleRatio,
      y: centerY - (centerY - targetPanRef.current.y) * scaleRatio,
    }

    targetZoomRef.current = nextZoom
    targetPanRef.current = clampPan(rawPan, nextZoom, { width: rect.width, height: rect.height })
    startCameraAnimation()
  }

  const handleZoomOut = () => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const sidebarOffset = rect.width > 768 ? 260 : 0
    const centerX = sidebarOffset + (rect.width - sidebarOffset) / 2
    const centerY = rect.height / 2

    const minZ = minZoomRef.current
    const nextZoom = parseFloat(Math.max(targetZoomRef.current / 1.38, minZ).toFixed(5))
    const scaleRatio = nextZoom / targetZoomRef.current
    const rawPan = {
      x: centerX - (centerX - targetPanRef.current.x) * scaleRatio,
      y: centerY - (centerY - targetPanRef.current.y) * scaleRatio,
    }

    targetZoomRef.current = nextZoom
    targetPanRef.current = clampPan(rawPan, nextZoom, { width: rect.width, height: rect.height })
    startCameraAnimation()
  }

  const handleReset = () => {
    if (!containerRef.current) return
    const fit = computeCoverView(containerRef.current)
    if (!fit) return
    setFocusedRoomId(null)
    setHoveredRoomId(null)
    setHoveredPinId(null)
    targetZoomRef.current = fit.minZoom
    targetPanRef.current = fit.pan
    startCameraAnimation()
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

  useEffect(() => {
    currentStageRef.current = currentStageInfo.step
  }, [currentStageInfo.step])

  const amenityFilterClass = activeAmenityId ? `amenity-filter-${activeAmenityId}` : ''

  return (
    <div
      ref={containerRef}
      className={`map-canvas-container ${isDragging ? 'is-dragging' : ''} ${animate ? 'is-animated' : ''}`}
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
      <svg
        ref={cameraSvgRef}
        className="map-canvas-svg"
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        fill="none"
        style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` }}
        onMouseMove={handleSvgMouseMove}
        onClick={handleSvgClick}
      >
        {/* World Space group: the camera is a CSS transform on the <svg> (see applyCameraTransform) */}
        <g className="momo-world-camera">
          {/* Shared Defs from MAP-FINAL */}
          <SvgDefs />

          {/* DOLL 1: Unzoomed Outer Map (restyled Layer 1 from MAP-FINAL filling 0..5483 x 0..4446) */}
          <UnzoomedLayer isCovered={isZoomedMapVisible} />

          {/* DOLL 2: Zoomed Campus Inset Map */}
          <ZoomedInsetLayer isOpen={isZoomedMapVisible} />

          {/* DOLL 3: Building Rooms, Corridor Path & Door Pins Layer */}
          <BuildingRoomsLayer
            wrapperRef={buildingRoomsWrapperRef}
            isOpen={isRoomsVisible}
            amenityFilterClass={amenityFilterClass}
            showPins={showPins}
            showCorridorPath={showCorridorPath}
          />

          {/* Highlight overlay for hovered or focused room & selected/hovered pin */}
          {isRoomsVisible && (
            <>
              <RoomHighlightLayer
                activeRooms={activeRooms}
                focusedRoomId={focusedRoomId}
                selectedRoomId={selectedRoomId}
              />
              {(hoveredPinId || selectedPinId) && (() => {
                const pin = PINS_BY_ID.get(hoveredPinId || selectedPinId)
                if (!pin) return null
                return (
                  <ellipse
                    cx={pin.cx}
                    cy={pin.cy}
                    rx={(pin.rx || 3.66) + 2.4}
                    ry={(pin.ry || 3.59) + 2.4}
                    transform={pin.transform || undefined}
                    className="momo-pin-highlight"
                    pointerEvents="none"
                  />
                )
              })()}
            </>
          )}

          {/* DOLL 4: Room Vector Names Layer */}
          {showRoomNames && (
            <RoomLabelsLayer
              isRoomsVisible={isRoomsVisible}
              visibleRoomLabels={visibleRoomLabels}
              hoveredRoomId={hoveredRoomId}
              focusedRoomId={focusedRoomId}
              selectedRoomId={selectedRoomId}
              roomOverrides={roomOverrides}
            />
          )}
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
                ? `${hoveredPinId ? `${pinOverrides?.[hoveredPinId]?.label ?? hoveredPinId} · ` : ''}Local : ${roomOverrides?.[hoveredRoomId]?.label ?? hoveredRoomId}`
                : focusedRoomId
                  ? `Local sélectionné : ${roomOverrides?.[focusedRoomId]?.label ?? focusedRoomId}`
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
                    SAFE_INSET.cx,
                    SAFE_INSET.cy,
                    insetCoverRelZoom * 1.05
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
                  zoomToWorldPoint(BUILDING_BOUNDS.cx, BUILDING_BOUNDS.cy, roomsVisibleThreshold * 1.08)
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
                  zoomToWorldPoint(BUILDING_BOUNDS.cx, BUILDING_BOUNDS.cy, roomNamesThreshold * 1.15)
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
