import { useState } from 'react'
import PropTypes from 'prop-types'
import './Input.scss'

export default function Input({
  id,
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  error = '',
  className = '',
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  const inputClass = [
    'input-field__input',
    error && 'input-field__input--error',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="input-field">
      {label && (
        <label htmlFor={id} className="input-field__label">
          {label}
        </label>
      )}

      <div className="input-field__container">
        <input
          id={id}
          name={id}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={inputClass}
          {...rest}
        />

        {isPassword && (
          <button
            type="button"
            className="input-field__toggle"
            onClick={() => setShowPassword(prev => !prev)}
            aria-label={
              showPassword
                ? 'Masquer le mot de passe'
                : 'Afficher le mot de passe'
            }
            title={showPassword ? 'Masquer' : 'Afficher'}
          >
            {showPassword ? '🙈' : '👁'}
          </button>
        )}
      </div>

      <p id={`${id}-error`} className="input-field__error">
        {error}
      </p>
    </div>
  )
}

Input.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  type: PropTypes.string,
  error: PropTypes.string,
  className: PropTypes.string,
}
