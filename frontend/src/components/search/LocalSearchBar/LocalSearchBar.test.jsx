import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import LocalSearchBar from './LocalSearchBar'

afterEach(cleanup)

function renderSearch(props = {}) {
  const onSearch = vi.fn()
  render(<LocalSearchBar onSearch={onSearch} {...props} />)
  return {
    onSearch,
    input: screen.getByLabelText('Rechercher un local'),
    submit: screen.getByRole('button', { name: 'Rechercher' }),
  }
}

describe('LocalSearchBar', () => {
  it('relie le libellé au champ de recherche', () => {
    const { input } = renderSearch()
    expect(input.tagName).toBe('INPUT')
    expect(input.getAttribute('placeholder')).toBe('Rechercher un local (ex. : B-220)')
  })

  it('accepte un texte indicatif personnalisé', () => {
    const { input } = renderSearch({ placeholder: 'Chercher…' })
    expect(input.getAttribute('placeholder')).toBe('Chercher…')
  })

  it('désactive le bouton Rechercher tant que le champ est vide ou ne contient que des espaces', () => {
    const { input, submit } = renderSearch()
    expect(submit.disabled).toBe(true)

    fireEvent.change(input, { target: { value: '   ' } })
    expect(submit.disabled).toBe(true)

    fireEvent.change(input, { target: { value: 'B-220' } })
    expect(submit.disabled).toBe(false)
  })

  it('envoie la recherche sans les espaces autour', () => {
    const { input, submit, onSearch } = renderSearch()
    fireEvent.change(input, { target: { value: '  B-220  ' } })
    fireEvent.click(submit)

    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith('B-220')
  })

  it('envoie la recherche avec la touche Entrée (soumission du formulaire)', () => {
    const { input, onSearch } = renderSearch()
    fireEvent.change(input, { target: { value: 'A-3133' } })
    fireEvent.submit(screen.getByRole('search'))

    expect(onSearch).toHaveBeenCalledWith('A-3133')
  })

  it('n’envoie rien si le champ est vide', () => {
    const { onSearch } = renderSearch()
    fireEvent.submit(screen.getByRole('search'))
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('affiche le bouton Effacer seulement quand il y a du texte, et vide le champ', () => {
    const { input } = renderSearch()
    expect(screen.queryByRole('button', { name: 'Effacer la recherche' })).toBeNull()

    fireEvent.change(input, { target: { value: 'B-220' } })
    fireEvent.click(screen.getByRole('button', { name: 'Effacer la recherche' }))

    expect(input.value).toBe('')
    expect(screen.queryByRole('button', { name: 'Effacer la recherche' })).toBeNull()
  })
})
