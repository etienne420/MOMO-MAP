import React from 'react'
import { BRANDING } from '../../../constants/branding'
import './AuthHeader.css'

export default function AuthHeader({
  appName = BRANDING.appName,
  presentedBy = BRANDING.presentedBy,
  institutionName = BRANDING.institutionName,
  showSubtitle = true,
  className = '',
}) {
  return (
    <header className={`auth-header ${className}`}>
      <h1 className="auth-header__title">{appName}</h1>
      {showSubtitle && (
        <div className="auth-header__subtitle">
          <span className="auth-header__caption">{presentedBy}</span>
          <span className="auth-header__institution">{institutionName}</span>
        </div>
      )}
    </header>
  )
}
