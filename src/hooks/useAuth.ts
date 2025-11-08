import { useContext } from 'react'
import type { AuthContextValue } from '@/types/contexts'
import { AuthContext } from '@/contexts'

export default function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
