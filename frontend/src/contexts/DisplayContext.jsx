import { createContext, useContext, useState, useEffect } from 'react'
import PropTypes from 'prop-types'

const DisplayContext = createContext()

export function DisplayProvider({ children }) {
  const [showTrain, setShowTrain] = useState(() => {
    return localStorage.getItem('showTrain') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('showTrain', showTrain ? 'true' : 'false')
  }, [showTrain])

  const [showAutre, setShowAutre] = useState(() => {
    return localStorage.getItem('showAutre') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('showAutre', showAutre ? 'true' : 'false')
  }, [showAutre])

  return (
    <DisplayContext.Provider
      value={{
        showTrain,
        setShowTrain,
        showAutre,
        setShowAutre,
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
