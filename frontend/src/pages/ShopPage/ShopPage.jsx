import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchShopCatalog,
  purchaseItem,
  equipItem,
  getCurrentUserId,
  fetchCurrentUser,
} from '../../services/auth'
import './ShopPage.css'

export default function ShopPage() {
  const navigate = useNavigate()
  const [uid, setUid] = useState(() => getCurrentUserId())
  const [catalog, setCatalog] = useState({ themes: [], avatars: [] })
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    const currentUid = getCurrentUserId()
    if (!currentUid) {
      navigate('/login', { replace: true })
      return
    }
    setUid(currentUid)

    fetchShopCatalog().then(setCatalog).catch((e) => setError(e.message))
    fetchCurrentUser().then(setUser).catch((e) => setError(e.message))
  }, [navigate])

  const handlePurchase = async (kind, itemId) => {
    const currentUid = getCurrentUserId()
    if (!currentUid) {
      navigate('/login', { replace: true })
      return
    }
    setBusyId(itemId)
    setError('')
    try {
      const { user: updated } = await purchaseItem(currentUid, kind, itemId)
      setUser(updated)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleEquip = async (kind, itemId) => {
    const currentUid = getCurrentUserId()
    if (!currentUid) {
      navigate('/login', { replace: true })
      return
    }
    setBusyId(itemId)
    setError('')
    try {
      const { user: updated } = await equipItem(currentUid, kind, itemId)
      setUser(updated)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusyId(null)
    }
  }

  const owned = (kind, id) => {
    const list = kind === 'theme' ? user?.ownedThemes : user?.ownedAvatars
    return Array.isArray(list) && list.some((x) => (x._id || x) === id)
  }

  const equipped = (kind, id) => {
    const current = kind === 'theme' ? user?.themeActuel : user?.avatarActuel
    return (current?._id || current) === id
  }

  const renderSection = (title, kind, items) => (
    <section className="shop-section">
      <h2 className="shop-section__title">{title}</h2>
      <div className="shop-grid">
        {items.map((item) => {
          const isOwned = owned(kind, item._id)
          const isEquipped = equipped(kind, item._id)
          return (
            <article key={item._id} className="shop-card">
              <div className="shop-card__image" style={{ backgroundImage: `url(${item.image})` }} />
              <h3 className="shop-card__name">{item.nom}</h3>
              <p className="shop-card__price">{item.prix} jetons</p>
              {isEquipped ? (
                <button className="shop-card__btn is-equipped" disabled>Équipé</button>
              ) : isOwned ? (
                <button
                  className="shop-card__btn"
                  disabled={busyId === item._id}
                  onClick={() => handleEquip(kind, item._id)}
                >
                  Équiper
                </button>
              ) : (
                <button
                  className="shop-card__btn"
                  disabled={busyId === item._id}
                  onClick={() => handlePurchase(kind, item._id)}
                >
                  Acheter
                </button>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )

  return (
    <div className="shop-page">
      <header className="shop-page__header">
        <button className="shop-page__back" onClick={() => navigate('/map')}>← Carte</button>
        <h1>Boutique</h1>
        {user && <span className="shop-page__tokens">{user.tokens} jetons</span>}
      </header>
      {error && <p className="shop-page__error">{error}</p>}
      {renderSection('Thèmes de carte', 'theme', catalog.themes)}
      {renderSection('Avatars', 'avatar', catalog.avatars)}
    </div>
  )
}
