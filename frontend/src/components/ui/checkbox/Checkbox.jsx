import PropTypes from 'prop-types'
import './Checkbox.scss'

export default function Checkbox({
  id,
  label,
  checked,
  onChange,
  error = '',
  className = '',
  ...rest
}) {
  return (
    <div className={`checkbox-field ${className}`}>
      <input
        type="checkbox"
        id={id}
        className="checkbox-field__input"
        checked={checked}
        onChange={onChange}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      />
      {label && (
        <label htmlFor={id} className="checkbox-field__label">
          {label}
        </label>
      )}
      {error && (
        <p id={`${id}-error`} className="checkbox-field__error">
          {error}
        </p>
      )}
    </div>
  )
}

Checkbox.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  className: PropTypes.string,
}
