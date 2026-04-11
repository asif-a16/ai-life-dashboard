'use client'

import { useState } from 'react'

export function useTheme() {
  // Lazy initializer reads the class applied by the FOUC-prevention script.
  // Guarded against SSR where document is undefined.
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  })

  function toggle() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      // ignore
    }
  }

  return { isDark, toggle }
}
