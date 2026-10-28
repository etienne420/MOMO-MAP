import React, { useState, useEffect, useRef, useCallback } from 'react'
import hero1 from '../../../assets/images/hero/hero-1.jpg'
import hero2 from '../../../assets/images/hero/hero-2.jpg'
import hero3 from '../../../assets/images/hero/hero-3.jpg'
import hero4 from '../../../assets/images/hero/hero-4.jpg'
import './AuthHero.css'

const HERO_IMAGES = [
  { id: 'hero-1', src: hero1, alt: 'Campus Montmorency 1' },
  { id: 'hero-2', src: hero2, alt: 'Campus Montmorency 2' },
  { id: 'hero-3', src: hero3, alt: 'Campus Montmorency 3' },
  { id: 'hero-4', src: hero4, alt: 'Campus Montmorency 4' },
]

const SLIDE_INTERVAL = 5000 // 5 seconds per slide
const PROXIMITY_THRESHOLD = 65 // Pixels distance to trigger hover reaction

export default function AuthHero({
  images = HERO_IMAGES,
  brandText = 'Montmorency',
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [nearestIndex, setNearestIndex] = useState(null)
  const dotRefs = useRef([])

  const handleNext = useCallback(() => {
    if (images.length === 0) return
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }, [images.length])

  const goToSlide = (idx) => {
    setCurrentIndex(idx)
  }

  // Handle cursor proximity near dots
  const handleZoneMouseMove = (e) => {
    if (!dotRefs.current || dotRefs.current.length === 0) return

    let closestIdx = null
    let minDistance = Infinity

    dotRefs.current.forEach((el, idx) => {
      if (!el) return
      const rect = el.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY)

      if (dist < minDistance) {
        minDistance = dist
        closestIdx = idx
      }
    })

    // If within proximity threshold, react like hover
    if (minDistance <= PROXIMITY_THRESHOLD) {
      setNearestIndex(closestIdx)
    } else {
      setNearestIndex(null)
    }
  }

  const handleZoneMouseLeave = () => {
    setNearestIndex(null)
  }

  const handleZoneClick = () => {
    if (nearestIndex !== null && nearestIndex !== currentIndex) {
      goToSlide(nearestIndex)
    }
  }

  // Auto-advance loop (pauses when hovered)
  useEffect(() => {
    if (isHovered || images.length <= 1) return

    const timer = setInterval(() => {
      handleNext()
    }, SLIDE_INTERVAL)

    return () => clearInterval(timer)
  }, [isHovered, images.length, handleNext])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (images.length <= 1) return
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev + 1) % images.length)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [images.length])

  if (images.length === 0) return null

  return (
    <div
      className="auth-hero"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setNearestIndex(null)
      }}
      role="region"
      aria-label="Galerie photos du campus"
    >
      <div className="auth-hero__wrapper">
        <div className="auth-hero__image-container">
          {/* Photos Slides with Crossfade */}
          {images.map((item, idx) => {
            const isActive = idx === currentIndex

            return (
              <div
                key={item.id}
                className={`auth-hero__slide ${isActive ? 'auth-hero__slide--active' : ''}`}
                aria-hidden={!isActive}
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  className="auth-hero__image"
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />
              </div>
            )
          })}

          {/* Top Brand Watermark in Pacifico font */}
          {brandText && (
            <div className="auth-hero__brand-tag" aria-hidden="true">
              {brandText}
            </div>
          )}

          {/* Subtle Ambient Vignette / Scrim */}
          <div className="auth-hero__scrim" aria-hidden="true" />

          {/* Responsive & Magnetic Navigation Dots (no enclosing card) */}
          {images.length > 1 && (
            <div
              className="auth-hero__dots-zone"
              onMouseMove={handleZoneMouseMove}
              onMouseLeave={handleZoneMouseLeave}
              onClick={handleZoneClick}
              role="region"
              aria-label="Zone de navigation des photos"
            >
              <nav
                className="auth-hero__dots-container"
                aria-label="Navigation des photos"
              >
                {images.map((item, idx) => {
                  const isActive = idx === currentIndex
                  const isNear = nearestIndex === idx && !isActive

                  return (
                    <button
                      key={item.id}
                      ref={(el) => (dotRefs.current[idx] = el)}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        goToSlide(idx)
                      }}
                      className={`auth-hero__dot ${isActive ? 'auth-hero__dot--active' : ''} ${isNear ? 'auth-hero__dot--near' : ''}`}
                      aria-label={`Aller à la photo ${idx + 1}`}
                      aria-current={isActive ? 'true' : 'false'}
                    />
                  )
                })}
              </nav>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
