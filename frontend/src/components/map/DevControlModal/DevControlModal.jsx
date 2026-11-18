import React from 'react'
import './DevControlModal.css'

export default function DevControlModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="dev-modal-dock" role="dialog" aria-label="Panneau développeur">
      <div className="dev-modal-card">
        <div className="dev-modal-card__header">
          <span className="dev-modal-card__title">Dev — Objets de la carte</span>
          <button
            type="button"
            className="dev-modal-card__close"
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
        <div className="dev-modal-card__body">
          <p className="dev-modal-card__hint">Sélectionnez un vecteur pour l’inspecter.</p>
        </div>
      </div>
    </div>
  )
}
