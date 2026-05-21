import { createContext, useContext, useState, useEffect } from 'react'

const themes = {
  silver: {
    name: 'Серебро',
    '--bg': '#0a0a0a',
    '--bg2': '#141414',
    '--bg3': '#1e1e1e',
    '--border': 'rgba(255,255,255,0.08)',
    '--text': '#f0f0f0',
    '--text2': '#888',
    '--text3': '#555',
    '--accent': '#c0c0c0',
    '--accent-soft': 'rgba(192,192,192,0.12)',
    '--self': '#a78bfa',
  },
  rose: {
    name: 'Розовый люкс',
    '--bg': '#0d090c',
    '--bg2': '#180f14',
    '--bg3': '#221520',
    '--border': 'rgba(255,182,193,0.1)',
    '--text': '#fce7ef',
    '--text2': '#b07080',
    '--text3': '#6b3a4a',
    '--accent': '#f4a7b9',
    '--accent-soft': 'rgba(244,167,185,0.12)',
    '--self': '#f472b6',
  },
  midnight: {
    name: 'Полночь',
    '--bg': '#06080f',
    '--bg2': '#0e1220',
    '--bg3': '#161d30',
    '--border': 'rgba(99,144,255,0.1)',
    '--text': '#e8ecff',
    '--text2': '#6070a0',
    '--text3': '#3a4060',
    '--accent': '#7b96f5',
    '--accent-soft': 'rgba(123,150,245,0.12)',
    '--self': '#818cf8',
  },
  sage: {
    name: 'Шалфей',
    '--bg': '#080c0a',
    '--bg2': '#0f1a13',
    '--bg3': '#162019',
    '--border': 'rgba(134,200,150,0.1)',
    '--text': '#e6f0e8',
    '--text2': '#5a8060',
    '--text3': '#334d38',
    '--accent': '#86c896',
    '--accent-soft': 'rgba(134,200,150,0.12)',
    '--self': '#34d399',
  },
  sand: {
    name: 'Золотой песок',
    '--bg': '#0c0a07',
    '--bg2': '#1a1508',
    '--bg3': '#221c0e',
    '--border': 'rgba(220,180,100,0.1)',
    '--text': '#f5eed8',
    '--text2': '#907040',
    '--text3': '#554020',
    '--accent': '#d4a853',
    '--accent-soft': 'rgba(212,168,83,0.12)',
    '--self': '#f59e0b',
  },
}

const FRIEND_COLORS = [
  { value: '#f472b6', label: 'Роза' },
  { value: '#fb923c', label: 'Персик' },
  { value: '#facc15', label: 'Лимон' },
  { value: '#4ade80', label: 'Мята' },
  { value: '#22d3ee', label: 'Лазурь' },
  { value: '#a78bfa', label: 'Лаванда' },
  { value: '#f87171', label: 'Коралл' },
  { value: '#94a3b8', label: 'Серебро' },
]

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKey] = useState(() => localStorage.getItem('theme') || 'silver')
  const theme = themes[themeKey]

  useEffect(() => {
    const root = document.documentElement
    Object.entries(theme).forEach(([k, v]) => {
      if (k.startsWith('--')) root.style.setProperty(k, v)
    })
    localStorage.setItem('theme', themeKey)
  }, [themeKey, theme])

  return (
    <ThemeContext.Provider value={{ themeKey, setThemeKey, themes, theme, FRIEND_COLORS }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
