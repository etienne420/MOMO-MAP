import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchShopCatalog,
  purchaseItem,
  equipItem,
  getCurrentUserId,
  fetchCurrentUser,
} from '../../services/auth'
import { applyUiTheme, resolveTheme } from '../../utils/theme'
import './ShopPage.css'

export default function ShopPage() {
  const navigate = useNavigate()
  const [catalog, setCatalog] = useState({ themes: [], avatars: [] })
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [tab, setTab] = useState('boutique')

  useEffect(() => {
    const currentUid = getCurrentUserId()
    if (!currentUid) {
      navigate('/login', { replace: true })
      return
    }

    fetchShopCatalog().then(setCatalog).catch((e) => setError(e.message))
    fetchCurrentUser()
      .then((u) => {
        setUser(u)
        // Applique le thème équipé même après un rechargement direct de la boutique
        applyUiTheme(
          u.themeActuel && typeof u.themeActuel === 'object' ? u.themeActuel : null,
        )
      })
      .catch((e) => setError(e.message))
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
      if (kind === 'theme') {
        // equip renvoie seulement l'id du thème : on prend l'objet complet dans le catalogue
        applyUiTheme(resolveTheme(updated?.themeActuel, catalog.themes))
      }
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

  const ownedThemes = catalog.themes.filter((t) => owned('theme', t._id))
  const ownedAvatars = catalog.avatars.filter((a) => owned('avatar', a._id))

  const renderCard = (kind, item) => {
    const isOwned = owned(kind, item._id)
    const isEquipped = equipped(kind, item._id)
    return (
      <article key={item._id} className="shop-card">
        <div
          className="shop-card__image"
          style={{ backgroundImage: `url("${item.image}")` }}
        />
        <div className="shop-card__heading">
          <h3 className="shop-card__name">{item.nom}</h3>
          {isEquipped && <span className="shop-card__badge">Équipé</span>}
        </div>
        <p className="shop-card__price">{item.prix} jetons</p>
        {isEquipped ? (
          <button
            className="shop-card__btn is-equipped"
            disabled={busyId === item._id}
            onClick={() => handleEquip(kind, null)}
          >
            Retirer
          </button>
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
  }

  const renderSection = (title, kind, items, emptyText) => (
    <section className="shop-section">
      <h2 className="shop-section__title">{title}</h2>
      {items.length === 0 ? (
        <p className="shop-section__empty">{emptyText}</p>
      ) : (
        <div className="shop-grid">{items.map((item) => renderCard(kind, item))}</div>
      )}
    </section>
  )

  const inventoryEmpty = ownedThemes.length === 0 && ownedAvatars.length === 0

  return (
    <div className="shop-page">
      <header className="shop-page__header">
        <button className="shop-page__back" onClick={() => navigate('/map')}>
          ← Carte
        </button>
        <h1>Boutique</h1>
        {user && <span className="shop-page__tokens">{user.tokens} jetons</span>}
      </header>

      <nav className="shop-tabs" aria-label="Sections de la boutique">
        <button
          type="button"
          className={`shop-tab ${tab === 'boutique' ? 'is-active' : ''}`}
          aria-pressed={tab === 'boutique'}
          onClick={() => setTab('boutique')}
        >
          Boutique
        </button>
        <button
          type="button"
          className={`shop-tab ${tab === 'inventaire' ? 'is-active' : ''}`}
          aria-pressed={tab === 'inventaire'}
          onClick={() => setTab('inventaire')}
        >
          Inventaire
        </button>
      </nav>

      {error && <p className="shop-page__error">{error}</p>}

      {tab === 'boutique' ? (
        <>
          {renderSection(
            'Thèmes de carte',
            'theme',
            catalog.themes,
            'Aucun thème disponible pour le moment.',
          )}
          {renderSection(
            'Avatars',
            'avatar',
            catalog.avatars,
            'Aucun avatar disponible pour le moment.',
          )}
        </>
      ) : inventoryEmpty ? (
        <p className="shop-section__empty">
          Votre inventaire est vide. Achetez des thèmes ou des avatars dans l’onglet Boutique.
        </p>
      ) : (
        <>
          {ownedThemes.length > 0 &&
            renderSection('Mes thèmes', 'theme', ownedThemes, '')}
          {ownedAvatars.length > 0 &&
            renderSection('Mes avatars', 'avatar', ownedAvatars, '')}
        </>
      )}
    </div>
  )
}
