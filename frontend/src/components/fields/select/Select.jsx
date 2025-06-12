import PropTypes from 'prop-types'
import './Select.scss'

export default function Select({
  id,
  label,
  value,
  onChange,
  options = [],
  error = '',
  ...rest
}) {
  return (
    <div className="select-field">
      {label && (
        <label htmlFor={id} className="select-field__label">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`select-field__select${error ? ' select-field__select--error' : ''}`}
        value={value}
        onChange={onChange}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      >
        <option value="">— Sélectionner —</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="select-field__error">
          {error}
        </p>
      )}
    </div>
  )
}

Select.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
        .isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  error: PropTypes.string,
}
