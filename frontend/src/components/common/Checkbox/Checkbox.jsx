import React from 'react'
import './Checkbox.css'

export default function Checkbox({
  id,
  name,
  checked,
  onChange,
  label,
  className = '',
}) {
  return (
    <label htmlFor={id} className={`checkbox-container ${className}`}>
      <input
        type="checkbox"
        id={id}
        name={name || id}
        checked={checked}
        onChange={onChange}
        className="checkbox-input"
      />
      <span className="checkbox-custom" aria-hidden="true">
        <svg
          viewBox="0 0 12 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="checkbox-icon"
        >
          <path
            d="M1.5 5L4.5 8L10.5 2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {label && <span className="checkbox-label">{label}</span>}
    </label>
  )
}
