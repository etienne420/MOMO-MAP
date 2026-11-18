import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  updateUserSettings,
  getCurrentUserId,
  fetchCurrentUser,
  getSessionRole,
  getDevModeSetting,
  setDevModeSetting,
} from '../../services/auth'
import './SettingsPage.css'

const TOGGLES = [
  { key: 'turnByTurnGuidance', label: 'Guidage pas à pas' },
  { key: 'showSchoolInsights', label: 'Afficher les infos du collège' },
  { key: 'reducedMotion', label: 'Réduire les animations' },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(() => getSessionRole() === 'admin')
  const [settings, setSettings] = useState(() => ({
    turnByTurnGuidance: true,
    showSchoolInsights: true,
    reducedMotion: false,
    devMode: getDevModeSetting(),
  }))
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!getCurrentUserId()) {
      navigate('/login', { replace: true })
      return
    }
    fetchCurrentUser()
      .then((u) => {
        const adminRole = u.role === 'admin' || getSessionRole() === 'admin'
        setIsAdmin(adminRole)
        if (u.settings) {
          const merged = {
            ...u.settings,
            devMode: adminRole ? Boolean(u.settings.devMode) : false,
          }
          if (adminRole && typeof u.settings.devMode === 'boolean') {
            setDevModeSetting(u.settings.devMode)
          }
          setSettings((prev) => ({ ...prev, ...merged }))
        }
      })
      .catch((e) => setStatus(e.message))
  }, [navigate])

  const toggle = async (key) => {
    const currentUid = getCurrentUserId()
    if (!currentUid) {
      navigate('/login', { replace: true })
      return
    }
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    if (key === 'devMode' && isAdmin) {
      setDevModeSetting(next.devMode)
    }
    setStatus('Enregistrement…')
    try {
      const payload = isAdmin ? next : { ...next, devMode: undefined }
      await updateUserSettings(currentUid, payload)
      setStatus('Enregistré')
    } catch (e) {
      setStatus(e.message)
    }
  }

  const visibleToggles = isAdmin
    ? [...TOGGLES, { key: 'devMode', label: 'Mode développeur' }]
    : TOGGLES

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <button className="settings-page__back" onClick={() => navigate('/map')}>← Carte</button>
        <h1>Paramètres</h1>
      </header>

      <section className="settings-section">
        <h2>Préférences</h2>
        {visibleToggles.map(({ key, label }) => (
          <label key={key} className="settings-row">
            <span>{label}</span>
            <input
              type="checkbox"
              checked={!!settings[key]}
              onChange={() => toggle(key)}
            />
          </label>
        ))}
        {status && <p className="settings-status">{status}</p>}
      </section>
    </div>
  )
}
