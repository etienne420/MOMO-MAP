import React, { useState, useRef, useEffect, useCallback } from 'react'
import './MapCanvas.css'

export default function MapCanvas() {
  const containerRef = useRef(null)

  // Pan and Zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)

  const dragStartRef = useRef({ x: 0, y: 0 })
  const currentPanRef = useRef({ x: 0, y: 0 })
  const initialTouchDistanceRef = useRef(null)
  const initialTouchZoomRef = useRef(1)

  useEffect(() => {
    currentPanRef.current = pan
  }, [pan])

  // Mouse Drag Handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return // Only primary click
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX - currentPanRef.current.x,
      y: e.clientY - currentPanRef.current.y,
    }
  }

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      })
    },
    [isDragging]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch Handlers (single touch pan, pinch-to-zoom)
  const handleTouchStart = (e) => {
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
      setPan({
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y,
      })
    } else if (e.touches.length === 2 && initialTouchDistanceRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const factor = dist / initialTouchDistanceRef.current
      const nextZoom = Math.min(Math.max(initialTouchZoomRef.current * factor, 0.4), 3.5)
      setZoom(parseFloat(nextZoom.toFixed(2)))
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

  // Mouse Wheel Zoom centered at cursor
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheel = (e) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top

      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89

      setZoom((prevZoom) => {
        const nextZoom = Math.min(Math.max(prevZoom * zoomFactor, 0.4), 3.5)
        const scaleRatio = nextZoom / prevZoom

        setPan((prevPan) => ({
          x: cursorX - (cursorX - prevPan.x) * scaleRatio,
          y: cursorY - (cursorY - prevPan.y) * scaleRatio,
        }))

        return parseFloat(nextZoom.toFixed(2))
      })
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  // Floating Controls Zoom In/Out
  const handleZoomIn = () => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    setZoom((prevZoom) => {
      const nextZoom = Math.min(prevZoom * 1.25, 3.5)
      const scaleRatio = nextZoom / prevZoom
      setPan((prevPan) => ({
        x: centerX - (centerX - prevPan.x) * scaleRatio,
        y: centerY - (centerY - prevPan.y) * scaleRatio,
      }))
      return parseFloat(nextZoom.toFixed(2))
    })
  }

  const handleZoomOut = () => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    setZoom((prevZoom) => {
      const nextZoom = Math.max(prevZoom * 0.8, 0.4)
      const scaleRatio = nextZoom / prevZoom
      setPan((prevPan) => ({
        x: centerX - (centerX - prevPan.x) * scaleRatio,
        y: centerY - (centerY - prevPan.y) * scaleRatio,
      }))
      return parseFloat(nextZoom.toFixed(2))
    })
  }

  const handleReset = () => {
    setPan({ x: 0, y: 0 })
    setZoom(1)
  }

  return (
    <div
      ref={containerRef}
      className={`map-canvas-container ${isDragging ? 'is-dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="application"
      aria-label="Grille cartographique interactive"
    >
      {/* Infinite Google Maps Grid Plane */}
      <svg className="map-canvas-svg" width="100%" height="100%">
        <defs>
          {/* Minor Subgrid Pattern (20px) */}
          <pattern
            id="google-subgrid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="rgba(60, 64, 67, 0.08)"
              strokeWidth="0.8"
            />
          </pattern>

          {/* Major Tile Grid Pattern (100px) with Crosshairs */}
          <pattern
            id="google-major-grid"
            width="100"
            height="100"
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
          >
            <rect width="100" height="100" fill="url(#google-subgrid)" />
            {/* Tile border */}
            <path
              d="M 100 0 L 0 0 0 100"
              fill="none"
              stroke="#dadce0"
              strokeWidth="1"
            />
            {/* Crosshair at vertex (+) */}
            <line x1="-5" y1="0" x2="5" y2="0" stroke="#9aa0a6" strokeWidth="1.2" />
            <line x1="0" y1="-5" x2="0" y2="5" stroke="#9aa0a6" strokeWidth="1.2" />
          </pattern>
        </defs>

        {/* Fill whole screen with infinite grid */}
        <rect width="100%" height="100%" fill="url(#google-major-grid)" />
      </svg>

      {/* Floating Google Maps Zoom & Reset Controls - Centered Vertically */}
      <div className="google-maps-controls-right">
        {/* Recenter button */}
        <button
          type="button"
          className="google-maps-ctrl-btn-single"
          onClick={handleReset}
          title="Recentrer la grille"
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
