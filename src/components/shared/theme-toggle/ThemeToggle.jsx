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
import './ThemeToggle.scss'

export default function ThemeToggle() {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    // Détermination du thème initial
    const savedTheme =
      localStorage.getItem('theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light')

    document.documentElement.setAttribute('data-theme', savedTheme)
    setTheme(savedTheme)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
    setTheme(newTheme)
  }

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={
        theme === 'light' ? 'Activer le thème sombre' : 'Activer le thème clair'
      }
      title={
        theme === 'light' ? 'Activer le thème sombre' : 'Activer le thème clair'
      }
    >
      {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
    </button>
  )
}

// PropTypes pour le composant ThemeToggle
ThemeToggle.propTypes = {
  // Aucune prop pour ce composant
}
