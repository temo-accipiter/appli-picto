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
  ...rest
}) {
  return (
    <div className="input-field">
      {label && (
        <label htmlFor={id} className="input-field__label">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        className={`input-field__input${error ? ' input-field__input--error' : ''}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} className="input-field__error">
          {error}
        </p>
      )}
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
}
