'use client'

import { NextUIProvider } from '@nextui-org/react'
import { ThemeProvider } from './contexts/theme-context'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <NextUIProvider>
        {children}
      </NextUIProvider>
    </ThemeProvider>
  )
}
