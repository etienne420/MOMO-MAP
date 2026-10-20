import React, { useState, useEffect, useCallback } from 'react'
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

export default function AuthHero({
  images = HERO_IMAGES,
  brandText = 'Montmorency',
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  const handleNext = useCallback(() => {
    if (images.length === 0) return
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }, [images.length])

  const goToSlide = (idx) => {
    setCurrentIndex(idx)
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
      onMouseLeave={() => setIsHovered(false)}
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

          {/* Modern Navigation Dots at the Bottom */}
          {images.length > 1 && (
            <nav
              className="auth-hero__dots-container"
              aria-label="Navigation des photos"
            >
              {images.map((item, idx) => {
                const isActive = idx === currentIndex
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goToSlide(idx)}
                    className={`auth-hero__dot ${isActive ? 'auth-hero__dot--active' : ''}`}
                    aria-label={`Aller à la photo ${idx + 1}`}
                    aria-current={isActive ? 'true' : 'false'}
                  />
                )
              })}
            </nav>
          )}
        </div>
      </div>
    </div>
  )
}
