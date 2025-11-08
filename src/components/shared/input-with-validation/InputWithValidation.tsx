import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { Input } from '@/components'

type ValidationRule = (value: string) => string

interface InputWithValidationProps {
  id: string
  value: string
  onValid: (value: string) => void
  rules: ValidationRule[]
  ariaLabel?: string
  successDuration?: number
  onChange?: (value: string) => void
  onBlur?: (value: string) => void
  label?: string
  placeholder?: string
  type?: string
}

export interface InputWithValidationRef {
  validateNow: () => void
}

const InputWithValidation = forwardRef<
  InputWithValidationRef,
  InputWithValidationProps
>(function InputWithValidation(
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

  const validate = (text: string): string => {
    for (const rule of rules) {
      const message = rule(text)
      if (message) return message
    }
    return ''
  }

  const handleBlur = (): void => {
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

export default InputWithValidation
