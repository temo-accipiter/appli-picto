import { Input } from '@/components'
import PropTypes from 'prop-types'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

const InputWithValidation = forwardRef(function InputWithValidation(
  {
    id,
    value,
    onValid,
    rules,
    ariaLabel = 'Champ',
    successDuration = 600,
    onChange,
    onBlur,
    /* ➕ pass-through */
    label,
    placeholder,
    type = 'text',
  },
  ref
) {
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setDraft(value)
  }, [value])

  const validate = text => {
    for (const rule of rules) {
      const message = rule(text)
      if (message) return message
    }
    return ''
  }

  const handleBlur = () => {
    const err = validate(draft)
    if (err) {
      setError(err)
    } else {
      onValid(draft)
      setError('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), successDuration)
    }
    if (onBlur) onBlur(draft)
  }

  useImperativeHandle(ref, () => ({
    validateNow: () => handleBlur(),
  }))

  return (
    <Input
      id={id}
      label={label}
      placeholder={placeholder}
      type={type}
      value={draft}
      onChange={e => {
        const val = e.target.value
        setDraft(val)
        setError('')
        if (onChange) onChange(val)
      }}
      onBlur={handleBlur}
      error={error}
      className={
        error
          ? 'input-field__input--error'
          : success
            ? 'input-field__input--success'
            : ''
      }
      aria-label={ariaLabel}
    />
  )
})

InputWithValidation.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onValid: PropTypes.func.isRequired,
  rules: PropTypes.arrayOf(PropTypes.func).isRequired,
  ariaLabel: PropTypes.string,
  successDuration: PropTypes.number,
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  type: PropTypes.string,
}

export default InputWithValidation
