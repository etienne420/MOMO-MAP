import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateUserSettings, getCurrentUserId } from '../../services/auth'
import './SettingsPage.css'

const TOGGLES = [
  { key: 'turnByTurnGuidance', label: 'Guidage pas à pas' },
  { key: 'showSchoolInsights', label: 'Afficher les infos du collège' },
  { key: 'reducedMotion', label: 'Réduire les animations' },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const uid = getCurrentUserId()
  const [settings, setSettings] = useState({
    turnByTurnGuidance: true,
    showSchoolInsights: true,
    reducedMotion: false,
  })
  const [status, setStatus] = useState('')

  const toggle = async (key) => {
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    setStatus('Enregistrement…')
    try {
      await updateUserSettings(uid, next)
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
