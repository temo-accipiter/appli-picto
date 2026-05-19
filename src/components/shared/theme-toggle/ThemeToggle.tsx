'use client'

import { useEffect, useState } from 'react'
import './ThemeToggle.scss'

type Theme = 'light' | 'dark'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const savedTheme =
      (localStorage.getItem('theme') as Theme) ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light')
    document.documentElement.setAttribute('data-theme', savedTheme)
    setTheme(savedTheme)
  }, [])

  const toggleTheme = () => {
    const newTheme: Theme = theme === 'light' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
    setTheme(newTheme)
  }

  const isDark = theme === 'dark'

  return (
    <button
      className="theme-toggle-pill"
      role="switch"
      aria-checked={isDark}
      onClick={toggleTheme}
      aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}
    >
      <svg
        className="theme-toggle-pill__stars"
        width="76"
        height="38"
        aria-hidden="true"
      >
        <circle cx="14" cy="12" r="1" fill="currentColor" />
        <circle cx="22" cy="22" r="0.8" fill="currentColor" />
        <circle cx="32" cy="10" r="0.6" fill="currentColor" />
      </svg>

      <span className="theme-toggle-pill__knob" aria-hidden="true">
        <svg
          className="theme-toggle-pill__icon theme-toggle-pill__icon--sun"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" fill="currentColor" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
            <rect
              key={angle}
              x="11"
              y="2"
              width="2"
              height="3"
              fill="currentColor"
              transform={`rotate(${angle} 12 12)`}
              rx="1"
            />
          ))}
        </svg>

        <svg
          className="theme-toggle-pill__icon theme-toggle-pill__icon--moon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"
            fill="currentColor"
          />
        </svg>
      </span>
    </button>
  )
}
