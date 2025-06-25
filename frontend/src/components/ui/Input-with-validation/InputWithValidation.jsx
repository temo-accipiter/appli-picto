import PropTypes from 'prop-types'
import { useState } from 'react'
import { Input } from '@/components'

export default function InputWithValidation({
  id,
  value,
  onValid,
  rules,
  ariaLabel = 'Champ',
  successDuration = 600,
  onChange,
}) {
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const validate = (text) => {
    for (const rule of rules) {
      const message = rule(text)
      if (message) return message
    }
    return ''
  }

  const handleBlur = () => {
    const error = validate(draft)
    if (error) {
      setError(error)
    } else {
      onValid(draft)
      setError('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), successDuration)
    }
  }

  return (
    <Input
      id={id} // ✅ id passé en prop
      value={draft}
      onChange={(e) => {
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
}

InputWithValidation.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onValid: PropTypes.func.isRequired,
  rules: PropTypes.arrayOf(PropTypes.func).isRequired,
  ariaLabel: PropTypes.string,
  successDuration: PropTypes.number,
  onChange: PropTypes.func,
}
