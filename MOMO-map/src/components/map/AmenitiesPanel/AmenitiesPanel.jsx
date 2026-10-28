import React from 'react'
import './AmenitiesPanel.css'

const AMENITIES = [
  {
    id: 'toilettes',
    label: 'Toilettes',
    bgColor: '#2563EB',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
        {/* Male figure */}
        <circle cx="7" cy="4.5" r="2" />
        <path d="M5.5 8h3a1 1 0 0 1 1 1v5.5H8V20.5H6V14.5H4.5V9a1 1 0 0 1 1-1z" />
        {/* Female figure */}
        <circle cx="17" cy="4.5" r="2" />
        <path d="M14.5 8h5a1 1 0 0 1 1 1l-1 5.5h-1V20.5h-2V14.5h-1L14.5 9a1 1 0 0 1 1-1z" />
      </svg>
    ),
  },
  {
    id: 'ccti',
    label: 'CCTI',
    bgColor: '#7C3AED',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5.5" y="2.5" width="13" height="19" rx="3.5" fill="#FFFFFF" />
        <rect x="10.75" y="6" width="2.5" height="7.5" rx="1.25" fill="#7C3AED" />
        <circle cx="12" cy="17" r="1.4" fill="#7C3AED" />
      </svg>
    ),
  },
  {
    id: 'ascenseur',
    label: 'Ascenseur',
    bgColor: '#047857',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
        <polygon points="12,3.5 5.5,10.5 18.5,10.5" />
        <polygon points="12,20.5 5.5,13.5 18.5,13.5" />
      </svg>
    ),
  },
  {
    id: 'saa',
    label: 'SAA',
    bgColor: '#B45309',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
        <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
        <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
      </svg>
    ),
  },
  {
    id: 'cafeteria',
    label: 'Cafétéria',
    bgColor: '#EF4444',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
        <path d="M12.5 2c.6 1.4 1.6 1.9 2.5 1.9-.5-1.4-1.5-1.9-2.5-1.9z" />
        <path d="M18.7 18.8c-.8 1.2-1.7 2.4-3 2.4-1.3 0-1.8-.8-3.3-.8s-2 .8-3.3.8c-1.3 0-2.3-1.3-3.1-2.5C4.3 16.3 3 11.8 4.7 8.8c.9-1.5 2.4-2.5 4.1-2.5 1.3 0 2.5.9 3.3.9.8 0 2.2-1.1 3.8-.9.7 0 2.5.3 3.6 2-.1.1-2.2 1.3-2.1 3.8 0 3 2.6 4 2.7 4-.1.1-.4 1.4-1.4 2.7z" />
      </svg>
    ),
  },
  {
    id: 'subway',
    label: 'Subway',
    bgColor: '#8B5CF6',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5.5 15.5h11l-3 3.5" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18.5 8.5H7.5l3-3.5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export default function AmenitiesPanel() {
  return (
    <div className="amenities-card" role="region" aria-label="Commodités">
      <div className="amenities-card__list">
        {AMENITIES.map((amenity) => (
          <button
            key={amenity.id}
            type="button"
            className="amenity-row"
            aria-label={amenity.label}
          >
            <div
              className="amenity-row__icon-tile"
              style={{ backgroundColor: amenity.bgColor }}
            >
              {amenity.icon}
            </div>
            <span className="amenity-row__label">{amenity.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
