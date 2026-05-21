import { createContext, useContext, useState } from 'react'
import { translations } from '../i18n/translations'

const LangContext = createContext(null)

export function LangProvider({ children, initialLang = 'ru' }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem('lang') || initialLang
  )

  const t = translations[lang] || translations['ru']

  function setLang(l) {
    setLangState(l)
    localStorage.setItem('lang', l)
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
