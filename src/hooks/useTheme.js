import { useState, useCallback } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') || 'light'
  )

  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('momento_theme', next)
    setTheme(next)
  }, [theme])

  return { theme, toggle }
}
