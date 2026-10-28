import React, { useId, useState } from 'react'
import './LocalSearchBar.css'

function SearchIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  )
}

export default function LocalSearchBar({
  onSearch,
  placeholder = 'Rechercher un local (ex. : B-220)',
}) {
  const inputId = useId()
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim()

  const handleSubmit = (event) => {
    event.preventDefault()
    if (normalizedQuery) {
      onSearch?.(normalizedQuery)
    }
  }

  const handleClear = () => {
    setQuery('')
  }

  return (
    <form
      className="local-search"
      role="search"
      onSubmit={handleSubmit}
      aria-label="Recherche de local"
    >
      <label className="local-search__label" htmlFor={inputId}>
        Rechercher un local
      </label>
      <div className="local-search__control">
        <span className="local-search__icon">
          <SearchIcon />
        </span>
        <input
          id={inputId}
          className="local-search__input"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {query && (
          <button
            className="local-search__clear"
            type="button"
            onClick={handleClear}
            aria-label="Effacer la recherche"
          >
            Effacer
          </button>
        )}
        <button
          className="local-search__submit"
          type="submit"
          disabled={!normalizedQuery}
        >
          Rechercher
        </button>
      </div>
    </form>
  )
}
