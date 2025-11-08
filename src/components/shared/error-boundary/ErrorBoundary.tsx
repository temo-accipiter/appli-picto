import React, { Component, ErrorInfo, ReactNode } from 'react'
import './ErrorBoundary.scss'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * ErrorBoundary - Composant qui attrape les erreurs React non gérées
 *
 * Ce composant empêche l'écran blanc en cas de crash et affiche
 * un fallback UI apaisant (TSA-friendly) avec option de rechargement.
 *
 * @example
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
    // Bind methods pour garder le contexte 'this'
    this.handleReload = this.handleReload.bind(this)
    this.handleReset = this.handleReset.bind(this)
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Mise à jour de l'état pour afficher le fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log de l'erreur pour debug
    console.error('🚨 ErrorBoundary a attrapé une erreur:', {
      error,
      errorInfo,
      componentStack: errorInfo?.componentStack,
    })

    // Stocker les détails de l'erreur dans l'état
    this.setState({
      error,
      errorInfo,
    })

    // Optionnel : Envoyer à un service de monitoring (Sentry, etc.)
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, { contexts: { react: errorInfo } })
    // }
  }

  handleReload(): void {
    // Recharger la page pour réinitialiser l'app
    window.location.reload()
  }

  handleReset(): void {
    // Réinitialiser l'état pour réessayer sans recharger
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Fallback UI personnalisé ou par défaut
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary__content">
            <div className="error-boundary__icon">😔</div>
            <h1 className="error-boundary__title">
              Oups, quelque chose s&apos;est mal passé
            </h1>
            <p className="error-boundary__message">
              Une erreur inattendue est survenue. Ne t&apos;inquiète pas, tes
              données sont en sécurité.
            </p>

            <div className="error-boundary__actions">
              <button
                className="error-boundary__button error-boundary__button--primary"
                onClick={this.handleReload}
              >
                Recharger la page
              </button>
              <button
                className="error-boundary__button error-boundary__button--secondary"
                onClick={this.handleReset}
              >
                Réessayer
              </button>
            </div>

            {/* Détails de l'erreur (visible en DEV uniquement) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="error-boundary__details">
                <summary className="error-boundary__details-summary">
                  Détails techniques (dev)
                </summary>
                <pre className="error-boundary__details-content">
                  <strong>Message:</strong> {this.state.error.toString()}
                  {'\n\n'}
                  <strong>Stack:</strong>
                  {'\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
