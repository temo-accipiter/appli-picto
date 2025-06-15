import { createContext, useContext, useState } from 'react'

const TableauContext = createContext(null)

export function TableauProvider({ children }) {
  const [ligne, setLigneState] = useState(
    () => localStorage.getItem('ligne') || '1'
  )
  const [done, setDone] = useState(0)
  const [total, setTotal] = useState(0)
  const [onReset, setOnReset] = useState(() => {})

  const setLigne = (value) => {
    setLigneState(value)
    localStorage.setItem('ligne', value)
  }

  return (
    <TableauContext.Provider
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
    </TableauContext.Provider>
  )
}

export function useTableau() {
  return useContext(TableauContext)
}
