'use client'

import { useI18n, useAccountPreferences, useIsVisitor } from '@/hooks'
import { useToast } from '@/contexts'
import { Toggle } from '@/components'
import './TrainThemeSelector.scss'

const DEFAULT_PROGRESS_STYLE = 'train-soleil'

interface ThemeEntry {
  /** Valeur persistée en DB (account_preferences.progress_style). */
  style: string
  /** Clé i18n du libellé. */
  labelKey: string
  /** false = vignette « Bientôt », jamais sélectionnable ni persistée. */
  available: boolean
}

// Catalogue extensible. Les entrées available:false sont des jalons de
// roadmap pour les accompagnants — visibles mais inertes.
const THEMES: ThemeEntry[] = [
  {
    style: 'train-soleil',
    labelKey: 'trainTheme.themeSoleil',
    available: true,
  },
  { style: 'train-foret', labelKey: 'trainTheme.themeForet', available: true },
  { style: 'train-ocean', labelKey: 'trainTheme.themeOcean', available: true },
  {
    style: 'theme-montgolfiere',
    labelKey: 'trainTheme.themeMontgolfiere',
    available: false,
  },
  { style: 'theme-arbre', labelKey: 'trainTheme.themeArbre', available: false },
]

/**
 * TrainThemeSelector — configuration du train de progression.
 *
 * Composant UNIQUE regroupant :
 *  - le toggle d'activation (account_preferences.train_progress_enabled)
 *  - la grille de vignettes de thème (account_preferences.progress_style)
 *
 * Écriture DB immédiate via useAccountPreferences. Lecture seule pour le
 * Visitor (= Demo en V1) : toggle et vignettes désactivés, thème figé sur
 * 'train-soleil'. Destiné au panneau Paramètres de la page Édition.
 */
export default function TrainThemeSelector() {
  const { t } = useI18n()
  const { preferences, updatePreferences } = useAccountPreferences()
  const { isVisitor } = useIsVisitor()
  const { show } = useToast()

  // Visitor = Demo en V1 : lecture seule, aucune écriture DB possible.
  // TODO: brancher l'upsell modal global quand il sera défini pour l'app
  const isReadOnly = isVisitor

  // Activé par défaut : la barre s'affiche tant que la préférence n'est
  // pas explicitement false (cohérent avec le fallback Visitor).
  const trainEnabled = isVisitor
    ? true
    : preferences?.train_progress_enabled !== false

  const selectedStyle = isVisitor
    ? DEFAULT_PROGRESS_STYLE
    : (preferences?.progress_style ?? DEFAULT_PROGRESS_STYLE)

  const handleToggle = async (next: boolean) => {
    if (isReadOnly) return
    const result = await updatePreferences({ train_progress_enabled: next })
    if (!result.ok) show(t('errors.generic'), 'error')
  }

  const handleSelectTheme = async (style: string) => {
    if (isReadOnly || !trainEnabled) return
    const result = await updatePreferences({ progress_style: style })
    if (!result.ok) show(t('errors.generic'), 'error')
  }

  return (
    <div className="train-theme-selector">
      <div className="train-theme-selector__toggle-row">
        <Toggle
          id="train-progress-toggle"
          checked={trainEnabled}
          onChange={handleToggle}
          disabled={isReadOnly}
          aria-label={t('trainTheme.toggleLabel')}
        />
        <span className="train-theme-selector__toggle-label">
          {t('trainTheme.toggleLabel')}
        </span>
      </div>

      {isReadOnly && (
        <p className="train-theme-selector__visitor-hint">
          {t('trainTheme.visitorHint')}
        </p>
      )}

      <h3 className="train-theme-selector__heading">
        {t('trainTheme.themeHeading')}
      </h3>

      <div
        className={`train-theme-selector__grid${
          trainEnabled ? '' : ' train-theme-selector__grid--disabled'
        }`}
        role="group"
        aria-label={t('trainTheme.themeHeading')}
      >
        {THEMES.map(theme => {
          const label = t(theme.labelKey)
          const isSelected = theme.available && theme.style === selectedStyle
          const isDisabled = isReadOnly || !trainEnabled || !theme.available

          return (
            <button
              key={theme.style}
              type="button"
              className={`train-theme-vignette${
                isSelected ? ' train-theme-vignette--selected' : ''
              }${theme.available ? '' : ' train-theme-vignette--soon'}`}
              data-progress-style={theme.available ? theme.style : undefined}
              aria-pressed={theme.available ? isSelected : undefined}
              disabled={isDisabled}
              aria-label={
                theme.available
                  ? t('trainTheme.selectThemeAria', { theme: label })
                  : t('trainTheme.soonThemeAria', { theme: label })
              }
              onClick={
                theme.available
                  ? () => handleSelectTheme(theme.style)
                  : undefined
              }
            >
              {/* PLACEHOLDER géométrique V1 — mini-rail + train arrondi
                  dans la couleur du thème. À remplacer par l'asset
                  illustrateur définitif. */}
              <svg
                className="train-theme-vignette__preview"
                viewBox="0 0 64 28"
                aria-hidden="true"
                focusable="false"
              >
                <line
                  x1="6"
                  y1="20"
                  x2="58"
                  y2="20"
                  className="train-theme-vignette__rail"
                />
                <rect
                  x="20"
                  y="7"
                  width="24"
                  height="14"
                  rx="4"
                  ry="4"
                  className="train-theme-vignette__train"
                />
              </svg>

              <span className="train-theme-vignette__label">{label}</span>

              {!theme.available && (
                <span className="train-theme-vignette__badge">
                  {t('trainTheme.soonBadge')}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
