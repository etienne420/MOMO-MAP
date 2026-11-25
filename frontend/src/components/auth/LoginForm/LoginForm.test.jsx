import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import LoginForm from './LoginForm'
import { signIn, signUp } from '../../../services/auth'

// On remplace les appels au serveur : les tests ne doivent pas dépendre du backend
vi.mock('../../../services/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}))

afterEach(cleanup)

beforeEach(() => {
  signIn.mockReset()
  signUp.mockReset()
})

function renderForm(mode, props = {}) {
  const onModeChange = vi.fn()
  const onSubmitSuccess = vi.fn()
  render(
    <LoginForm
      mode={mode}
      onModeChange={onModeChange}
      onSubmitSuccess={onSubmitSuccess}
      {...props}
    />,
  )
  return { onModeChange, onSubmitSuccess }
}

function fill(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('LoginForm — connexion', () => {
  it('affiche les erreurs de validation et n’appelle pas le serveur si le formulaire est vide', () => {
    renderForm('signin')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(screen.getByText('Please enter your username or email.')).toBeTruthy()
    expect(screen.getByText('Please enter your password.')).toBeTruthy()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('refuse un mot de passe de moins de 4 caractères', () => {
    renderForm('signin')
    fill(/username/i, 'jdoe')
    fill(/^password/i, 'abc')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(screen.getByText('Password must be at least 4 characters.')).toBeTruthy()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('efface l’erreur d’un champ dès qu’on le modifie', () => {
    renderForm('signin')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.queryByText('Please enter your username or email.')).not.toBeNull()

    fill(/username/i, 'j')
    expect(screen.queryByText('Please enter your username or email.')).toBeNull()
  })

  it('envoie le nom d’utilisateur sans espaces et le mot de passe, puis signale le succès', async () => {
    signIn.mockResolvedValue({ token: 'x' })
    const { onSubmitSuccess } = renderForm('signin')
    fill(/username/i, '  jdoe  ')
    fill(/^password/i, 'secret123')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Connexion réussie ! Bienvenue sur MOMO-MAP.')).toBeTruthy()
    expect(signIn).toHaveBeenCalledWith({ username: 'jdoe', password: 'secret123' })
    expect(onSubmitSuccess).toHaveBeenCalledTimes(1)
  })

  it('affiche le message d’erreur renvoyé par le serveur', async () => {
    signIn.mockRejectedValue(new Error('Identifiants invalides.'))
    const { onSubmitSuccess } = renderForm('signin')
    fill(/username/i, 'jdoe')
    fill(/^password/i, 'mauvais')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Identifiants invalides.')).toBeTruthy()
    expect(onSubmitSuccess).not.toHaveBeenCalled()
  })

  it('affiche ou masque le mot de passe', () => {
    renderForm('signin')
    const password = screen.getByLabelText(/^password/i)
    expect(password.getAttribute('type')).toBe('password')

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password.getAttribute('type')).toBe('text')

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(password.getAttribute('type')).toBe('password')
  })

  it('passe au mode inscription avec le lien Sign up', () => {
    const { onModeChange } = renderForm('signin')
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(onModeChange).toHaveBeenCalledWith('signup')
  })
})

describe('LoginForm — inscription', () => {
  it('exige un courriel du domaine cmontmorency.qc.ca', () => {
    renderForm('signup')
    fill(/username/i, 'jdoe')
    fill(/email/i, 'jdoe@gmail.com')
    fill(/^password/i, 'motdepasse123')
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(screen.getByText('Please use a valid @cmontmorency.qc.ca email address.')).toBeTruthy()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('refuse un nom d’utilisateur trop court et un mot de passe de moins de 8 caractères', () => {
    renderForm('signup')
    fill(/username/i, 'jd')
    fill(/email/i, 'jdoe@cmontmorency.qc.ca')
    fill(/^password/i, 'court')
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(screen.getByText('Username must be at least 3 characters.')).toBeTruthy()
    expect(screen.getByText('Password must be at least 8 characters.')).toBeTruthy()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('crée le compte avec des données valides', async () => {
    signUp.mockResolvedValue({ token: 'x' })
    const { onSubmitSuccess } = renderForm('signup')
    fill(/username/i, ' jdoe ')
    fill(/email/i, ' jdoe@cmontmorency.qc.ca ')
    fill(/^password/i, 'motdepasse123')
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(await screen.findByText('Compte créé avec succès ! Bienvenue sur MOMO-MAP.')).toBeTruthy()
    expect(signUp).toHaveBeenCalledWith({
      username: 'jdoe',
      email: 'jdoe@cmontmorency.qc.ca',
      password: 'motdepasse123',
    })
    expect(onSubmitSuccess).toHaveBeenCalledWith({
      username: 'jdoe',
      email: 'jdoe@cmontmorency.qc.ca',
      password: 'motdepasse123',
    })
  })

  it('passe au mode connexion avec le lien Sign in', () => {
    const { onModeChange } = renderForm('signup')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(onModeChange).toHaveBeenCalledWith('signin')
  })
})
