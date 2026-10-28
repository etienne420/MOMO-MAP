import React from 'react'
import './InputField.css'

export default function InputField({
  id,
  label,
  type = 'text',
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  helperText,
  rightElement,
  autoComplete,
  required = false,
  className = '',
}) {
  return (
    <div className={`input-field ${error ? 'input-field--has-error' : ''} ${className}`}>
      {label && (
        <label htmlFor={id} className="input-field__label">
          {label}
          {required && <span className="input-field__required">*</span>}
        </label>
      )}

      <div className="input-field__wrapper">
        <input
          id={id}
          name={name || id}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          className={`input-field__input ${rightElement ? 'input-field__input--has-right' : ''}`}
        />
        {rightElement && (
          <div className="input-field__right-element">{rightElement}</div>
        )}
      </div>

      {error ? (
        <p id={`${id}-error`} className="input-field__error" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="input-field__helper">
          {helperText}
        </p>
      ) : null}
    </div>
  )
}
