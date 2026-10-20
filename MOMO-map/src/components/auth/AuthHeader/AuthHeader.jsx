import React from 'react'
import { BRANDING } from '../../../constants/branding'
import './AuthHeader.css'

export default function AuthHeader({
  appName = BRANDING.appName,
  presentedBy = BRANDING.presentedBy,
  institutionName = BRANDING.institutionName,
}) {
  return (
    <header className="auth-header">
      <h1 className="auth-header__title">{appName}</h1>
      <div className="auth-header__subtitle">
        <span className="auth-header__caption">{presentedBy}</span>
        <span className="auth-header__institution">{institutionName}</span>
      </div>
    </header>
  )
}
