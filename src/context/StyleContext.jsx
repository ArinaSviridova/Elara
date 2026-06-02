import { createContext, useContext, useMemo } from 'react'
import { useAuth } from './AuthContext'

// ─── Стиль медицинских формулировок ─────────────────────────────────────
// address_style values:
//   'classic'  — обычные мед. термины: месячные, овуляция, грудь
//   'neutral'  — нейтральные тела: кровотечение, телесный цикл, грудная клетка
//   'minimal'  — минимум слов, больше значков
//   'auto'     — авто по языку/местоимениям (default)

const TERM_MAPS = {
  // classic → neutral
  neutral: {
    'месячные':      'кровотечение',
    'месячных':      'кровотечения',
    'менструация':   'цикловое кровотечение',
    'менструации':   'цикловые кровотечения',
    'менструального': 'циклового',
    'менструальный': 'цикловый',
    'месячный':      'цикловый',
    'грудь':         'грудная клетка',
    'груди':         'грудной клетки',
    'овуляция':      'фертильное окно',
    'овуляции':      'фертильного окна',
    'овуляционный':  'фертильный',
    'матка':         'детородный орган',
    'матки':         'детородного органа',
    'влагалище':     'нижний канал',
    'шейка матки':   'нижний отдел',
    'цервикальный':  'нижний',
    'ПМС':           'предциклический синдром',
    'либидо':        'сексуальное желание',
  },
  minimal: {
    'месячные':    '🩸',
    'менструация': '🩸',
    'овуляция':    '✨',
    'грудь':       '💜',
    'ПМС':         '🌊',
    'либидо':      '🌹',
    'симптомы':    '⚡',
    'настроение':  '🌙',
  },
}

const StyleContext = createContext({ style: 'auto', term: (t) => t })

export function StyleProvider({ children }) {
  const { profile } = useAuth()
  const style = profile?.address_style || 'auto'

  const term = useMemo(() => {
    const effectiveStyle = style === 'auto' ? 'classic' : style
    const map = TERM_MAPS[effectiveStyle] || {}
    return (text) => {
      if (!text || effectiveStyle === 'classic') return text
      let result = text
      for (const [from, to] of Object.entries(map)) {
        // Регулярка с границами слова, регистронезависимо
        const re = new RegExp(`\\b${from}\\b`, 'gi')
        result = result.replace(re, (match) => {
          // Сохраняем капитализацию
          if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
            return to.charAt(0).toUpperCase() + to.slice(1)
          }
          return to
        })
      }
      return result
    }
  }, [style])

  return <StyleContext.Provider value={{ style, term }}>{children}</StyleContext.Provider>
}

/**
 * Hook для стилизации терминов
 * Пример: const { term } = useStyle()
 *         <span>{term('месячные')}</span>  → 'кровотечение' если neutral
 */
export function useStyle() {
  return useContext(StyleContext)
}
