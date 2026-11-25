import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import RoutePanel from './RoutePanel'

// Ces tests utilisent le vrai calcul d'itinéraire (utils/routing.js) sur le plan MAP-FINAL.svg.
// A-3133 et B-3300 sont deux locaux reliés par le réseau de couloirs.

afterEach(cleanup)

function renderPanel(props = {}) {
  const onRouteChange = vi.fn()
  const onSelectRoom = vi.fn()
  render(<RoutePanel onRouteChange={onRouteChange} onSelectRoom={onSelectRoom} {...props} />)
  return {
    onRouteChange,
    onSelectRoom,
    depart: screen.getByLabelText('Point de départ'),
    destination: screen.getByLabelText('Destination'),
  }
}

function pressEnter(input) {
  fireEvent.keyDown(input, { key: 'Enter' })
}

describe('RoutePanel', () => {
  it('affiche les champs départ et destination et le bouton pour les inverser', () => {
    const { depart, destination } = renderPanel()
    expect(depart.value).toBe('')
    expect(destination.value).toBe('')
    expect(screen.getByRole('button', { name: 'Inverser départ et destination' })).toBeTruthy()
  })

  it('inverse le départ et la destination', () => {
    const { depart, destination } = renderPanel()
    fireEvent.change(depart, { target: { value: 'A-3133' } })
    fireEvent.change(destination, { target: { value: 'B-3300' } })

    fireEvent.click(screen.getByRole('button', { name: 'Inverser départ et destination' }))

    expect(depart.value).toBe('B-3300')
    expect(destination.value).toBe('A-3133')
  })

  it('calcule un itinéraire quand les deux champs sont remplis et qu’on appuie sur Entrée', () => {
    const { depart, destination, onRouteChange } = renderPanel()
    fireEvent.change(depart, { target: { value: 'A-3133' } })
    fireEvent.change(destination, { target: { value: 'B-3300' } })
    pressEnter(destination)

    expect(onRouteChange).toHaveBeenCalledTimes(1)
    const route = onRouteChange.mock.calls[0][0]
    expect(route.fromId).toBe('A-3133')
    expect(route.toId).toBe('B-3300')
    expect(route.points.length).toBeGreaterThanOrEqual(2)
    expect(route.length).toBeGreaterThan(0)
    expect(screen.getByRole('status').textContent).toContain('A-3133 → B-3300')
  })

  it('accepte les numéros de local écrits sans tiret ni majuscule', () => {
    const { depart, destination, onRouteChange } = renderPanel()
    fireEvent.change(depart, { target: { value: 'a3133' } })
    fireEvent.change(destination, { target: { value: ' b-3300 ' } })
    pressEnter(depart)

    const route = onRouteChange.mock.calls[0][0]
    expect(route.fromId).toBe('A-3133')
    expect(route.toId).toBe('B-3300')
  })

  it('affiche une erreur si un local est introuvable', () => {
    const { depart, destination, onRouteChange } = renderPanel()
    fireEvent.change(depart, { target: { value: 'A-3133' } })
    fireEvent.change(destination, { target: { value: 'ZZ-0000' } })
    pressEnter(destination)

    expect(screen.getByRole('alert').textContent).toContain('Local introuvable : ZZ-0000')
    expect(onRouteChange).toHaveBeenCalledWith(null)
  })

  it('affiche une erreur si le départ et la destination sont le même local', () => {
    const { depart, destination } = renderPanel()
    fireEvent.change(depart, { target: { value: 'A-3133' } })
    fireEvent.change(destination, { target: { value: 'a-3133' } })
    pressEnter(destination)

    expect(screen.getByRole('alert').textContent).toContain('même local')
  })

  it('efface le message d’erreur dès que l’utilisateur modifie un champ', () => {
    const { depart, destination } = renderPanel()
    fireEvent.change(depart, { target: { value: 'A-3133' } })
    fireEvent.change(destination, { target: { value: 'ZZ-0000' } })
    pressEnter(destination)
    expect(screen.queryByRole('alert')).not.toBeNull()

    fireEvent.change(destination, { target: { value: 'B-3300' } })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('centre la carte sur le local quand un seul champ est rempli', () => {
    const { depart, onSelectRoom, onRouteChange } = renderPanel()
    fireEvent.change(depart, { target: { value: ' A-3133 ' } })
    pressEnter(depart)

    expect(onSelectRoom).toHaveBeenCalledWith('A-3133')
    expect(onRouteChange).not.toHaveBeenCalled()
  })

  it('efface le trajet avec le bouton Effacer', () => {
    const { depart, destination, onRouteChange } = renderPanel()
    fireEvent.change(depart, { target: { value: 'A-3133' } })
    fireEvent.change(destination, { target: { value: 'B-3300' } })
    pressEnter(destination)

    fireEvent.click(screen.getByRole('button', { name: 'Effacer' }))

    expect(onRouteChange).toHaveBeenLastCalledWith(null)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('recalcule le trajet inversé quand on inverse après un calcul', () => {
    const { depart, destination, onRouteChange } = renderPanel()
    fireEvent.change(depart, { target: { value: 'A-3133' } })
    fireEvent.change(destination, { target: { value: 'B-3300' } })
    pressEnter(destination)

    fireEvent.click(screen.getByRole('button', { name: 'Inverser départ et destination' }))

    const route = onRouteChange.mock.calls.at(-1)[0]
    expect(route.fromId).toBe('B-3300')
    expect(route.toId).toBe('A-3133')
  })
})
