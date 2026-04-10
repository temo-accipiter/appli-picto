'use client'

/**
 * Composant : ThemeToggle
 *
 * Rôle :
 *   Permet de basculer entre les thèmes clair et sombre pour l'application.
 *   • Récupère le thème enregistré en localStorage ou utilise la préférence système.
 *   • Applique le thème en ajoutant l'attribut `data-theme` à la balise `<html>`.
 *   • Propose un bouton affichant l'icône correspondante (🌙 ou ☀️).
 *
 * Hooks & bibliothèques utilisés :
 *   • useState, useEffect (React)
 *   • Sun, Moon (lucide-react) – icônes pour clair / sombre
 *
 * Props :
 *   (aucune)
 *
 * Exemple d'utilisation :
 *   <ThemeToggle />
 */

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components'
import './ThemeToggle.scss'

type Theme = 'light' | 'dark'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    // Détermination du thème initial
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

  return (
    <Button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={
        theme === 'light' ? 'Activer le thème sombre' : 'Activer le thème clair'
      }
    >
      {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
    </Button>
  )
}
