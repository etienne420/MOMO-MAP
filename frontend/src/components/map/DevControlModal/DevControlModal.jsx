import React, { useMemo, useRef, useState } from 'react'
import momoRoomsData from '../../../assets/map/momo-main-rooms.json'
import './DevControlModal.css'

const ROW_HEIGHT = 30
const VIEWPORT_HEIGHT = 250
const OVERSCAN = 4

const FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'stairs', label: 'Escaliers' },
  { id: 'bathrooms', label: 'Toilettes' },
  { id: 'rooms', label: 'Locaux' },
  { id: 'pins', label: 'Pins' },
]

function getRoomFilterGroup(type) {
  if (type === 'stairs') return 'stairs'
  if (type === 'wc-f' || type === 'wc-m') return 'bathrooms'
  return 'rooms'
}

function getCategoryTag(kind, type) {
  if (kind === 'pin') return 'Pin'
  if (type === 'stairs') return 'Escalier'
  if (type === 'wc-f') return 'WC ♀'
  if (type === 'wc-m') return 'WC ♂'
  return 'Local'
}

function normalizeHex(color) {
  if (typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color.trim())) {
    return color.trim()
  }
  if (typeof color === 'string' && color.trim().toLowerCase() === 'black') {
    return '#000000'
  }
  return '#303030'
}

const ALL_VECTOR_OBJECTS = [
  ...momoRoomsData.rooms
    .filter((room) => room.type !== 'wall' && room.id)
    .map((room) => ({
      key: `room:${room.id}`,
      kind: 'room',
      filterGroup: getRoomFilterGroup(room.type),
      id: room.id,
      defaultLabel: room.label || room.id,
      defaultColor: normalizeHex(room.color || '#303030'),
      categoryTag: getCategoryTag('room', room.type),
      cx: room.cx,
      cy: room.cy,
      rawType: room.type,
    })),
  ...(momoRoomsData.pins || []).map((pin) => ({
    key: `pin:${pin.id}`,
    kind: 'pin',
    filterGroup: 'pins',
    id: pin.id,
    roomId: pin.roomId || '',
    defaultLabel: pin.roomId ? `${pin.id} (${pin.roomId})` : pin.id,
    defaultColor: normalizeHex(pin.color || '#CBD5E1'),
    categoryTag: 'Pin',
    cx: pin.cx,
    cy: pin.cy,
    rawType: pin.category,
  })),
]

function DevEditCard({ item, override, onUpdate, onReset, onClose }) {
  const [nameInput, setNameInput] = useState(
    () => override?.label ?? item.defaultLabel,
  )
  const [colorInput, setColorInput] = useState(
    () => normalizeHex(override?.color ?? item.defaultColor),
  )

  const handleNameChange = (e) => {
    const val = e.target.value
    setNameInput(val)
    onUpdate(item, { label: val, color: colorInput })
  }

  const handleColorPicker = (e) => {
    const hex = e.target.value
    setColorInput(hex)
    onUpdate(item, { label: nameInput, color: hex })
  }

  const handleColorText = (e) => {
    const val = e.target.value
    setColorInput(val)
    if (/^#[0-9a-fA-F]{6}$/.test(val.trim())) {
      onUpdate(item, { label: nameInput, color: val.trim() })
    }
  }

  const handleResetItem = () => {
    setNameInput(item.defaultLabel)
    setColorInput(item.defaultColor)
    onReset(item)
  }

  return (
    <div className="dev-modal-card dev-edit-card" role="dialog" aria-label={`Modifier ${item.id}`}>
      <div className="dev-modal-card__header">
        <span className="dev-modal-card__title">
          {item.id} · {item.categoryTag}
        </span>
        <button
          type="button"
          className="dev-modal-card__close"
          onClick={onClose}
          aria-label="Fermer l'édition"
        >
          ×
        </button>
      </div>

      <label className="dev-edit-field">
        <span className="dev-edit-field__label">Nom</span>
        <input
          type="text"
          className="dev-modal-search"
          value={nameInput}
          onChange={handleNameChange}
        />
      </label>

      <label className="dev-edit-field">
        <span className="dev-edit-field__label">Couleur</span>
        <div className="dev-edit-color-row">
          <input
            type="color"
            className="dev-edit-color-picker"
            value={normalizeHex(colorInput)}
            onChange={handleColorPicker}
            aria-label="Sélecteur de couleur"
          />
          <input
            type="text"
            className="dev-modal-search dev-edit-color-hex"
            value={colorInput}
            onChange={handleColorText}
            maxLength={7}
          />
        </div>
      </label>

      <div className="dev-edit-actions">
        <button
          type="button"
          className="dev-modal-filter-btn"
          onClick={handleResetItem}
        >
          Réinitialiser
        </button>
        <button
          type="button"
          className="dev-modal-filter-btn is-active"
          onClick={onClose}
        >
          Fermer
        </button>
      </div>
    </div>
  )
}

export default function DevControlModal({
  isOpen,
  onClose,
  roomOverrides = null,
  pinOverrides = null,
  onUpdateOverride = null,
  onResetOverride = null,
  onSelectVector = null,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [scrollTop, setScrollTop] = useState(0)
  const [selectedItemKey, setSelectedItemKey] = useState(null)
  const listRef = useRef(null)

  const enrichedObjects = useMemo(() => {
    return ALL_VECTOR_OBJECTS.map((item) => {
      const ov = item.kind === 'room' ? roomOverrides?.[item.id] : pinOverrides?.[item.id]
      return {
        ...item,
        displayLabel: ov?.label ?? item.defaultLabel,
        displayColor: ov?.color ?? item.defaultColor,
      }
    })
  }, [roomOverrides, pinOverrides])

  const filteredObjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return enrichedObjects.filter((item) => {
      if (activeFilter !== 'all' && item.filterGroup !== activeFilter) {
        return false
      }
      if (!q) return true
      return (
        item.id.toLowerCase().includes(q) ||
        item.displayLabel.toLowerCase().includes(q) ||
        (item.roomId && item.roomId.toLowerCase().includes(q))
      )
    })
  }, [enrichedObjects, activeFilter, searchQuery])

  const selectedItem = useMemo(() => {
    if (!selectedItemKey) return null
    return ALL_VECTOR_OBJECTS.find((item) => item.key === selectedItemKey) || null
  }, [selectedItemKey])

  if (!isOpen) return null

  const totalHeight = filteredObjects.length * ROW_HEIGHT
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2
  const endIndex = Math.min(filteredObjects.length, startIndex + visibleCount)
  const visibleItems = filteredObjects.slice(startIndex, endIndex)

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
    setScrollTop(0)
    if (listRef.current) listRef.current.scrollTop = 0
  }

  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId)
    setScrollTop(0)
    if (listRef.current) listRef.current.scrollTop = 0
  }

  const handleSelectRow = (item) => {
    setSelectedItemKey(item.key)
    onSelectVector?.(item)
  }

  const activeOverride = selectedItem
    ? selectedItem.kind === 'room'
      ? roomOverrides?.[selectedItem.id]
      : pinOverrides?.[selectedItem.id]
    : null

  return (
    <div className="dev-modal-dock" role="dialog" aria-label="Panneau développeur">
      <div className="dev-modal-card">
        <div className="dev-modal-card__header">
          <span className="dev-modal-card__title">Dev ({filteredObjects.length})</span>
          <button
            type="button"
            className="dev-modal-card__close"
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <input
          type="search"
          className="dev-modal-search"
          placeholder="Rechercher un objet..."
          value={searchQuery}
          onChange={handleSearchChange}
          aria-label="Rechercher un objet vectoriel"
        />

        <div className="dev-modal-filters" role="tablist" aria-label="Filtrer par catégorie">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={activeFilter === f.id}
              className={`dev-modal-filter-btn ${activeFilter === f.id ? 'is-active' : ''}`}
              onClick={() => handleFilterChange(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div
          ref={listRef}
          className="dev-modal-lazy-list"
          style={{ height: `${VIEWPORT_HEIGHT}px` }}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        >
          {filteredObjects.length === 0 ? (
            <p className="dev-modal-empty">Aucun objet trouvé.</p>
          ) : (
            <div className="dev-modal-lazy-spacer" style={{ height: `${totalHeight}px` }}>
              <div
                className="dev-modal-lazy-window"
                style={{ transform: `translateY(${startIndex * ROW_HEIGHT}px)` }}
              >
                {visibleItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`dev-modal-row ${selectedItemKey === item.key ? 'is-selected' : ''}`}
                    style={{ height: `${ROW_HEIGHT}px` }}
                    onClick={() => handleSelectRow(item)}
                  >
                    <span
                      className="dev-modal-row__swatch"
                      style={{ backgroundColor: item.displayColor }}
                      aria-hidden="true"
                    />
                    <span className="dev-modal-row__name">{item.displayLabel}</span>
                    <span className="dev-modal-row__tag">{item.categoryTag}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedItem && (
        <DevEditCard
          key={selectedItem.key}
          item={selectedItem}
          override={activeOverride}
          onUpdate={onUpdateOverride}
          onReset={onResetOverride}
          onClose={() => setSelectedItemKey(null)}
        />
      )}
    </div>
  )
}
