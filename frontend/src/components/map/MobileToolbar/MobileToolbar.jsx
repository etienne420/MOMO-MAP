import React, { useState } from 'react'
import './MobileToolbar.css'

function LocateIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
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

function ShopIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7v1H4v-1Z" />
    </svg>
  )
}

// Barre d'outils flottante de la carte sur mobile (au-dessus du panneau des commodités)
export default function MobileToolbar({
  onLocate,
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
        <button type="button" className="mobile-toolbar__btn mobile-toolbar__btn--tinted" onClick={onLocate} aria-label="Ma position" title="Ma position">
          <LocateIcon />
        </button>
        <button type="button" className="mobile-toolbar__btn mobile-toolbar__btn--tinted" onClick={onOpenSettings} aria-label="Paramètres" title="Paramètres">
          <GearIcon />
        </button>
      </div>

      <div className="mobile-toolbar__group">
        <button type="button" className="mobile-toolbar__btn mobile-toolbar__btn--tinted" onClick={onOpenShop} aria-label="Boutique" title="Boutique">
          <ShopIcon />
        </button>
        <button type="button" className="mobile-toolbar__btn mobile-toolbar__avatar" onClick={onOpenProfile} aria-label={avatarLabel} title={avatarLabel}>
          {showAvatar ? (
            <img src={avatarUrl} alt="" onError={() => setAvatarFailed(true)} />
          ) : (
            <UserIcon />
          )}
        </button>
      </div>

      {devButton && <div className="mobile-toolbar__group">{devButton}</div>}
    </nav>
  )
}
