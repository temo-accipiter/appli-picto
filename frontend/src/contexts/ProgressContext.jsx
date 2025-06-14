import { createContext, useContext, useState } from 'react'

const ProgressContext = createContext({
  ligne: '1',
  setLigne: () => {},
  done: 0,
  setDone: () => {},
  total: 0,
  setTotal: () => {},
  onReset: () => {},
  setOnReset: () => {},
})

export function ProgressProvider({ children }) {
  const [ligne, setLigneState] = useState(
    () => localStorage.getItem('ligne') || '1'
  )
  const [done, setDone] = useState(0)
  const [total, setTotal] = useState(0)
  const [onReset, setOnReset] = useState(() => () => {})

  const setLigne = (value) => {
    setLigneState(value)
    localStorage.setItem('ligne', value)
  }

  return (
    <ProgressContext.Provider
      value={{
        ligne,
        setLigne,
        done,
        setDone,
        total,
        setTotal,
        onReset,
        setOnReset,
      }}
    >
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgress() {
  return useContext(ProgressContext)
}
