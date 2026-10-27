import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type Theme } from './theme-context'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem('streamx-theme') === 'light' ? 'light' : 'dark')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('streamx-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => setTheme((current) => current === 'dark' ? 'light' : 'dark'), [])
  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
