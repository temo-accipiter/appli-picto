import { createContext, useContext, useState, useEffect } from 'react'
import PropTypes from 'prop-types'

const DisplayContext = createContext()

export function DisplayProvider({ children }) {
  // ✅ Train
  const [showTrain, setShowTrain] = useState(() => {
    return localStorage.getItem('showTrain') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('showTrain', showTrain ? 'true' : 'false')
  }, [showTrain])

  // ✅ Autre (réservé pour plus tard)
  const [showAutre, setShowAutre] = useState(() => {
    return localStorage.getItem('showAutre') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('showAutre', showAutre ? 'true' : 'false')
  }, [showAutre])

  // ✅ Récompense
  const [showRecompense, setShowRecompense] = useState(() => {
    return localStorage.getItem('showRecompense') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('showRecompense', showRecompense ? 'true' : 'false')
  }, [showRecompense])

  return (
    <DisplayContext.Provider
      value={{
        showTrain,
        setShowTrain,
        showAutre,
        setShowAutre,
        showRecompense,
        setShowRecompense,
      }}
    >
      {children}
    </DisplayContext.Provider>
  )
}

DisplayProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export function useDisplay() {
  return useContext(DisplayContext)
}
