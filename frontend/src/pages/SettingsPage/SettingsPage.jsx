import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateUserSettings, getCurrentUserId, fetchCurrentUser } from '../../services/auth'
import './SettingsPage.css'

const TOGGLES = [
  { key: 'turnByTurnGuidance', label: 'Guidage pas à pas' },
  { key: 'showSchoolInsights', label: 'Afficher les infos du collège' },
  { key: 'reducedMotion', label: 'Réduire les animations' },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState({
    turnByTurnGuidance: true,
    showSchoolInsights: true,
    reducedMotion: false,
  })
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!getCurrentUserId()) {
      navigate('/login', { replace: true })
      return
    }
    fetchCurrentUser()
      .then((u) => {
        if (u.settings) setSettings((prev) => ({ ...prev, ...u.settings }))
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
    setStatus('Enregistrement…')
    try {
      await updateUserSettings(currentUid, next)
      setStatus('Enregistré')
    } catch (e) {
      setStatus(e.message)
    }
  }

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <button className="settings-page__back" onClick={() => navigate('/map')}>← Carte</button>
        <h1>Paramètres</h1>
      </header>

      <section className="settings-section">
        <h2>Préférences</h2>
        {TOGGLES.map(({ key, label }) => (
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
