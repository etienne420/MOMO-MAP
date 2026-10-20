import React from 'react'
import studentsImg from '../../../assets/images/students-hero.jpg'
import './AuthHero.css'

export default function AuthHero({ alt = 'Étudiants du Collège Montmorency' }) {
  return (
    <div className="auth-hero">
      <div className="auth-hero__wrapper">
        <div className="auth-hero__image-container">
          <img
            src={studentsImg}
            alt={alt}
            className="auth-hero__image"
            loading="eager"
          />
        </div>
      </div>
    </div>
  )
}
