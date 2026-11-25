import React, { useState } from 'react'
import './MobileToolbar.css'

function LayersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="13" height="13" rx="3" />
      <rect x="8" y="8" width="13" height="13" rx="3" fill="#ffffff" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.2 2.8 11a1 1 0 0 0 1.3 1.5l.9-.8V20a1 1 0 0 0 1 1h4v-5.5h4V21h4a1 1 0 0 0 1-1v-8.3l.9.8A1 1 0 0 0 21.2 11L12 3.2Z" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.6 2.5h-3.2l-.5 2.6a7.6 7.6 0 0 0-1.9 1.1l-2.5-.9-1.6 2.8 2 1.7a7.7 7.7 0 0 0 0 2.2l-2 1.7 1.6 2.8 2.5-.9c.6.5 1.2.8 1.9 1.1l.5 2.6h3.2l.5-2.6c.7-.3 1.3-.6 1.9-1.1l2.5.9 1.6-2.8-2-1.7a7.7 7.7 0 0 0 0-2.2l2-1.7-1.6-2.8-2.5.9a7.6 7.6 0 0 0-1.9-1.1l-.5-2.6ZM12 8.6a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8Z" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="8.5" cy="7.5" r="3.5" />
      <circle cx="16.5" cy="8.5" r="3" />
      <path d="M1.5 19c0-3.6 3.1-6 7-6s7 2.4 7 6v1h-14v-1Z" />
      <path d="M16 20v-1c0-2-.8-3.7-2.2-4.9.8-.4 1.7-.6 2.7-.6 3.3 0 6 2 6 5.2V20H16Z" />
    </svg>
  )
}

// Barre d'outils flottante de la carte sur mobile (au-dessus du panneau des commodités)
export default function MobileToolbar({
  onChangeView,
  onRecenter,
  onOpenSettings,
  onOpenShop,
  onOpenProfile,
  avatarUrl = null,
  avatarLabel = 'Mon profil',
  devButton = null,
}) {
  const [avatarFailed, setAvatarFailed] = useState(false)
  const showAvatar = Boolean(avatarUrl) && !avatarFailed

  return (
    <nav className="mobile-toolbar" aria-label="Outils de la carte">
      <div className="mobile-toolbar__group">
        <button type="button" className="mobile-toolbar__btn" onClick={onChangeView} aria-label="Changer de vue" title="Changer de vue">
          <LayersIcon />
        </button>
        <button type="button" className="mobile-toolbar__btn mobile-toolbar__btn--tinted" onClick={onRecenter} aria-label="Recentrer la carte" title="Recentrer la carte">
          <HomeIcon />
        </button>
        <button type="button" className="mobile-toolbar__btn mobile-toolbar__btn--tinted" onClick={onOpenSettings} aria-label="Paramètres" title="Paramètres">
          <GearIcon />
        </button>
      </div>

      <div className="mobile-toolbar__group">
        <button type="button" className="mobile-toolbar__btn mobile-toolbar__btn--tinted" onClick={onOpenShop} aria-label="Boutique" title="Boutique">
          <PeopleIcon />
        </button>
        <button type="button" className="mobile-toolbar__btn mobile-toolbar__avatar" onClick={onOpenProfile} aria-label={avatarLabel} title={avatarLabel}>
          {showAvatar && (
            <img src={avatarUrl} alt="" onError={() => setAvatarFailed(true)} />
          )}
        </button>
      </div>

      {devButton && <div className="mobile-toolbar__group">{devButton}</div>}
    </nav>
  )
}
