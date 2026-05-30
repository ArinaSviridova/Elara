import { createContext, useContext, useState, useEffect } from 'react'

const baseThemes = {
  silver: {
    name: 'Серебро',
    '--bg': '#0a0a0a', '--bg2': '#141414', '--bg3': '#1e1e1e',
    '--border': 'rgba(255,255,255,0.08)', '--text': '#f0f0f0',
    '--text2': '#888888', '--text3': '#555555',
    '--accent': '#c0c0c0', '--accent-soft': 'rgba(192,192,192,0.12)', '--self': '#a78bfa',
  },
  rose: {
    name: 'Розовый люкс',
    '--bg': '#0d090c', '--bg2': '#180f14', '--bg3': '#221520',
    '--border': 'rgba(255,182,193,0.1)', '--text': '#fce7ef',
    '--text2': '#b07080', '--text3': '#6b3a4a',
    '--accent': '#f4a7b9', '--accent-soft': 'rgba(244,167,185,0.12)', '--self': '#f472b6',
  },
  midnight: {
    name: 'Полночь',
    '--bg': '#06080f', '--bg2': '#0e1220', '--bg3': '#161d30',
    '--border': 'rgba(99,144,255,0.1)', '--text': '#e8ecff',
    '--text2': '#6070a0', '--text3': '#3a4060',
    '--accent': '#7b96f5', '--accent-soft': 'rgba(123,150,245,0.12)', '--self': '#818cf8',
  },
  sage: {
    name: 'Шалфей',
    '--bg': '#080c0a', '--bg2': '#0f1a13', '--bg3': '#162019',
    '--border': 'rgba(134,200,150,0.1)', '--text': '#e6f0e8',
    '--text2': '#5a8060', '--text3': '#334d38',
    '--accent': '#86c896', '--accent-soft': 'rgba(134,200,150,0.12)', '--self': '#34d399',
  },
  sand: {
    name: 'Золотой песок',
    '--bg': '#0c0a07', '--bg2': '#1a1508', '--bg3': '#221c0e',
    '--border': 'rgba(220,180,100,0.1)', '--text': '#f5eed8',
    '--text2': '#907040', '--text3': '#554020',
    '--accent': '#d4a853', '--accent-soft': 'rgba(212,168,83,0.12)', '--self': '#f59e0b',
  },
  teen_pink: {
    name: '🌸 Розовый мир', teen: true,
    '--bg': '#1a0d12', '--bg2': '#261218', '--bg3': '#321820',
    '--border': 'rgba(255,150,180,0.15)', '--text': '#ffe8f0',
    '--text2': '#d4809a', '--text3': '#8a4a5a',
    '--accent': '#ff8fab', '--accent-soft': 'rgba(255,143,171,0.15)', '--self': '#ff6b9d',
  },
  teen_lavender: {
    name: '💜 Лаванда', teen: true,
    '--bg': '#0f0d1a', '--bg2': '#181426', '--bg3': '#221c32',
    '--border': 'rgba(180,150,255,0.15)', '--text': '#f0ecff',
    '--text2': '#9080c0', '--text3': '#504070',
    '--accent': '#c4a8ff', '--accent-soft': 'rgba(196,168,255,0.15)', '--self': '#b090ff',
  },
  teen_mint: {
    name: '🌿 Мятный', teen: true,
    '--bg': '#0a1410', '--bg2': '#102018', '--bg3': '#162820',
    '--border': 'rgba(100,220,180,0.15)', '--text': '#e8fff8',
    '--text2': '#50b090', '--text3': '#2a6050',
    '--accent': '#7de8c8', '--accent-soft': 'rgba(125,232,200,0.15)', '--self': '#5cd6b0',
  },
  teen_sky: {
    name: '☁️ Небо', teen: true,
    '--bg': '#0a0f1a', '--bg2': '#101826', '--bg3': '#162030',
    '--border': 'rgba(100,180,255,0.15)', '--text': '#e8f4ff',
    '--text2': '#5090c0', '--text3': '#2a5070',
    '--accent': '#80c8ff', '--accent-soft': 'rgba(128,200,255,0.15)', '--self': '#60b8ff',
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

const DEFAULT_CUSTOM_THEME = {
  name: 'Моя тема',
  custom: true,
  '--bg': '#09090b',
  '--bg2': '#141316',
  '--bg3': '#211f24',
  '--border': 'rgba(255,255,255,0.10)',
  '--text': '#f5f3f7',
  '--text2': '#aaa3b5',
  '--text3': '#6f6878',
  '--accent': '#d8b4fe',
  '--accent-soft': 'rgba(216,180,254,0.14)',
  '--self': '#f472b6',
}

function safeReadCustomTheme() {
  try {
    const raw = localStorage.getItem('elara_custom_theme')
    if (!raw) return DEFAULT_CUSTOM_THEME
    return { ...DEFAULT_CUSTOM_THEME, ...JSON.parse(raw), custom: true }
  } catch {
    return DEFAULT_CUSTOM_THEME
  }
}

function hexToSoft(hex, alpha = 0.14) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return DEFAULT_CUSTOM_THEME['--accent-soft']
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},${alpha})`
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [customTheme, setCustomThemeState] = useState(safeReadCustomTheme)
  const [themeKey, setThemeKeyState] = useState(() => localStorage.getItem('theme') || 'silver')
  const themes = { ...baseThemes, custom: customTheme }
  const theme = themes[themeKey] || themes.silver

  function setThemeKey(key) {
    setThemeKeyState(key)
    localStorage.setItem('theme', key)
  }

  function saveCustomTheme(next) {
    const normalized = {
      ...DEFAULT_CUSTOM_THEME,
      ...next,
      custom: true,
      '--accent-soft': next['--accent-soft'] || hexToSoft(next['--accent']),
    }
    setCustomThemeState(normalized)
    localStorage.setItem('elara_custom_theme', JSON.stringify(normalized))
    setThemeKey('custom')
    return normalized
  }

  function resetCustomTheme() {
    setCustomThemeState(DEFAULT_CUSTOM_THEME)
    localStorage.setItem('elara_custom_theme', JSON.stringify(DEFAULT_CUSTOM_THEME))
    setThemeKey('custom')
  }

  useEffect(() => {
    const root = document.documentElement
    const t = themes[themeKey] || themes.silver
    Object.entries(t).forEach(([k, v]) => {
      if (k.startsWith('--')) root.style.setProperty(k, v)
    })
  }, [themeKey, customTheme])

  return (
    <ThemeContext.Provider value={{ themeKey, setThemeKey, themes, theme, customTheme, saveCustomTheme, resetCustomTheme, FRIEND_COLORS, hexToSoft }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
