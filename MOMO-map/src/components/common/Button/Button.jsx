import React from 'react'
import './Button.css'

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  isLoading = false,
  iconRight,
  onClick,
  className = '',
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`btn btn--${variant} ${fullWidth ? 'btn--full' : ''} ${isLoading ? 'btn--loading' : ''} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <span className="btn__spinner" aria-hidden="true" />
      ) : (
        <>
          <span className="btn__text">{children}</span>
          {iconRight && <span className="btn__icon-right">{iconRight}</span>}
        </>
      )}
    </button>
  )
}
