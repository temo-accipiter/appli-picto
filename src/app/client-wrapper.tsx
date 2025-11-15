'use client'

import { Providers } from './providers'

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>
}
